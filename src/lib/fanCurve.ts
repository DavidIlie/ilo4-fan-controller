import type { TemperatureSummary } from "../types/Fan";

// --- Curve Definitions ---

type CurvePoint = [number, number]; // [temp °C, fan speed %]

const CPU_CURVE: CurvePoint[] = [
    [40, 25],
    [45, 30],
    [50, 35],
    [55, 40],
    [60, 50],
    [65, 65],
    [68, 80],
    [70, 100],
];

const HD_CURVE: CurvePoint[] = [
    [42, 25],
    [48, 27],
    [52, 30],
    [55, 40],
    [57, 60],
    [59, 85],
    [60, 100],
];

const AMBIENT_CURVE: CurvePoint[] = [
    [22, 25],
    [25, 28],
    [30, 35],
    [35, 45],
    [40, 60],
];

const ABSOLUTE_MIN_SPEED = 25;
const HYSTERESIS_DOWN = 2; // °C — temp must drop this much below the point that raised speed before lowering
const MAX_RATE_CHANGE = 5; // max % change per cycle (except emergency)

// --- Interpolation ---

function interpolate(curve: CurvePoint[], temp: number): number {
    if (temp <= curve[0][0]) return curve[0][1];
    if (temp >= curve[curve.length - 1][0]) return curve[curve.length - 1][1];

    for (let i = 0; i < curve.length - 1; i++) {
        const [t0, s0] = curve[i];
        const [t1, s1] = curve[i + 1];
        if (temp >= t0 && temp <= t1) {
            const ratio = (temp - t0) / (t1 - t0);
            return s0 + ratio * (s1 - s0);
        }
    }

    return curve[curve.length - 1][1];
}

// --- Curve Decision ---

export interface CurveDecision {
    cpuTemp: number | null;
    cpuSpeed: number;
    hdTemp: number | null;
    hdSpeed: number;
    ambientTemp: number | null;
    ambientFloor: number;
    rawTarget: number;
    finalTarget: number;
    previousSpeed: number;
}

// Tracks hysteresis state — the effective temp for each sensor,
// which only drops when the real temp falls below (effective - hysteresis)
let effectiveCpuTemp = 0;
let effectiveHdTemp = 0;
let effectiveAmbientTemp = 0;

function applyHysteresis(realTemp: number | null, effective: number): number {
    if (realTemp === null) return effective;
    if (realTemp >= effective) {
        // Temp rising or same — track it
        return realTemp;
    }
    if (realTemp < effective - HYSTERESIS_DOWN) {
        // Temp dropped enough — allow decrease
        return realTemp;
    }
    // In hysteresis zone — keep the higher effective temp
    return effective;
}

export function calculateFanSpeed(
    temps: TemperatureSummary,
    previousSpeed: number
): CurveDecision {
    // Pick the hotter CPU
    const cpuTemp =
        temps.cpu1 !== null && temps.cpu2 !== null
            ? Math.max(temps.cpu1, temps.cpu2)
            : temps.cpu1 ?? temps.cpu2;

    // Apply hysteresis
    effectiveCpuTemp = applyHysteresis(cpuTemp, effectiveCpuTemp);
    effectiveHdTemp = applyHysteresis(temps.hdMax, effectiveHdTemp);
    effectiveAmbientTemp = applyHysteresis(temps.inletAmbient, effectiveAmbientTemp);

    // Calculate each curve's contribution
    const cpuSpeed = cpuTemp !== null ? interpolate(CPU_CURVE, effectiveCpuTemp) : ABSOLUTE_MIN_SPEED;
    const hdSpeed = temps.hdMax !== null ? interpolate(HD_CURVE, effectiveHdTemp) : ABSOLUTE_MIN_SPEED;
    const ambientFloor = temps.inletAmbient !== null ? interpolate(AMBIENT_CURVE, effectiveAmbientTemp) : ABSOLUTE_MIN_SPEED;

    // Take the maximum of all drivers
    const rawTarget = Math.max(cpuSpeed, hdSpeed, ambientFloor, ABSOLUTE_MIN_SPEED);

    // Rate limiting — allow immediate ramp to 100% for emergencies
    let finalTarget: number;
    if (rawTarget >= 100) {
        finalTarget = 100;
    } else if (previousSpeed === 0) {
        // First run — go directly to target
        finalTarget = rawTarget;
    } else {
        const delta = rawTarget - previousSpeed;
        if (Math.abs(delta) <= MAX_RATE_CHANGE) {
            finalTarget = rawTarget;
        } else {
            finalTarget = previousSpeed + Math.sign(delta) * MAX_RATE_CHANGE;
        }
    }

    finalTarget = Math.round(Math.max(ABSOLUTE_MIN_SPEED, finalTarget));

    return {
        cpuTemp,
        cpuSpeed: Math.round(cpuSpeed),
        hdTemp: temps.hdMax,
        hdSpeed: Math.round(hdSpeed),
        ambientTemp: temps.inletAmbient,
        ambientFloor: Math.round(ambientFloor),
        rawTarget: Math.round(rawTarget),
        finalTarget,
        previousSpeed,
    };
}

export function resetHysteresis(): void {
    effectiveCpuTemp = 0;
    effectiveHdTemp = 0;
    effectiveAmbientTemp = 0;
}

// Return curve definitions for the UI visualization endpoint
export function getCurveDefinitions() {
    return {
        cpu: CPU_CURVE,
        hd: HD_CURVE,
        ambient: AMBIENT_CURVE,
        absoluteMin: ABSOLUTE_MIN_SPEED,
        hysteresisDown: HYSTERESIS_DOWN,
        maxRateChange: MAX_RATE_CHANGE,
    };
}
