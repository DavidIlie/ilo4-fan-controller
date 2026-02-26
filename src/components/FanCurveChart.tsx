import { useEffect, useState } from "react";

interface CurvePoint {
    temp: number;
    speed: number;
}

interface CurveData {
    cpu: [number, number][];
    hd: [number, number][];
    ambient: [number, number][];
    absoluteMin: number;
}

interface CurrentTemps {
    cpuTemp: number | null;
    hdTemp: number | null;
    ambientTemp: number | null;
    cpuSpeed: number;
    hdSpeed: number;
    ambientFloor: number;
    finalTarget: number;
}

// Chart dimensions
const W = 520;
const H = 280;
const PAD = { top: 20, right: 20, bottom: 40, left: 45 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

// Axis ranges
const TEMP_MIN = 15;
const TEMP_MAX = 75;
const SPEED_MIN = 0;
const SPEED_MAX = 105;

function toX(temp: number): number {
    return PAD.left + ((temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * PLOT_W;
}

function toY(speed: number): number {
    return PAD.top + PLOT_H - ((speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * PLOT_H;
}

function curvePath(points: [number, number][]): string {
    return points
        .map(([t, s], i) => `${i === 0 ? "M" : "L"}${toX(t)},${toY(s)}`)
        .join(" ");
}

// Extend curve lines to the edges
function extendedPath(points: [number, number][]): string {
    if (points.length === 0) return "";
    const first = points[0];
    const last = points[points.length - 1];
    const extended: [number, number][] = [
        [TEMP_MIN, first[1]],
        ...points,
        [TEMP_MAX, last[1]],
    ];
    return curvePath(extended);
}

export default function FanCurveChart({ currentTemps }: { currentTemps: CurrentTemps | null }) {
    const [curves, setCurves] = useState<CurveData | null>(null);

    useEffect(() => {
        fetch("/api/curve")
            .then((r) => r.json())
            .then((data) => setCurves(data))
            .catch(() => {});
    }, []);

    if (!curves) return null;

    // Grid lines
    const tempTicks = [20, 30, 40, 50, 60, 70];
    const speedTicks = [0, 25, 50, 75, 100];

    return (
        <div className="px-4 mx-4 mb-4 sm:mx-0">
            <div className="bg-gray-800 rounded-lg p-3">
                <h3 className="text-sm font-medium text-gray-400 text-center mb-2">
                    Fan Curve
                </h3>
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className="w-full"
                    style={{ maxWidth: W }}
                >
                    {/* Background */}
                    <rect
                        x={PAD.left}
                        y={PAD.top}
                        width={PLOT_W}
                        height={PLOT_H}
                        fill="#1a1a2e"
                        rx={4}
                    />

                    {/* Grid lines - horizontal (speed) */}
                    {speedTicks.map((s) => (
                        <g key={`speed-${s}`}>
                            <line
                                x1={PAD.left}
                                y1={toY(s)}
                                x2={PAD.left + PLOT_W}
                                y2={toY(s)}
                                stroke="#333"
                                strokeWidth={0.5}
                            />
                            <text
                                x={PAD.left - 6}
                                y={toY(s) + 4}
                                textAnchor="end"
                                fill="#888"
                                fontSize={11}
                            >
                                {s}%
                            </text>
                        </g>
                    ))}

                    {/* Grid lines - vertical (temp) */}
                    {tempTicks.map((t) => (
                        <g key={`temp-${t}`}>
                            <line
                                x1={toX(t)}
                                y1={PAD.top}
                                x2={toX(t)}
                                y2={PAD.top + PLOT_H}
                                stroke="#333"
                                strokeWidth={0.5}
                            />
                            <text
                                x={toX(t)}
                                y={PAD.top + PLOT_H + 16}
                                textAnchor="middle"
                                fill="#888"
                                fontSize={11}
                            >
                                {t}°C
                            </text>
                        </g>
                    ))}

                    {/* Axis labels */}
                    <text
                        x={PAD.left + PLOT_W / 2}
                        y={H - 4}
                        textAnchor="middle"
                        fill="#aaa"
                        fontSize={12}
                    >
                        Temperature
                    </text>
                    <text
                        x={12}
                        y={PAD.top + PLOT_H / 2}
                        textAnchor="middle"
                        fill="#aaa"
                        fontSize={12}
                        transform={`rotate(-90, 12, ${PAD.top + PLOT_H / 2})`}
                    >
                        Fan %
                    </text>

                    {/* Minimum speed line */}
                    <line
                        x1={PAD.left}
                        y1={toY(curves.absoluteMin)}
                        x2={PAD.left + PLOT_W}
                        y2={toY(curves.absoluteMin)}
                        stroke="#555"
                        strokeWidth={1}
                        strokeDasharray="4,3"
                    />
                    <text
                        x={PAD.left + PLOT_W - 2}
                        y={toY(curves.absoluteMin) - 4}
                        textAnchor="end"
                        fill="#666"
                        fontSize={9}
                    >
                        min {curves.absoluteMin}%
                    </text>

                    {/* Ambient curve */}
                    <path
                        d={extendedPath(curves.ambient)}
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.7}
                    />
                    {/* Curve points */}
                    {curves.ambient.map(([t, s], i) => (
                        <circle
                            key={`amb-${i}`}
                            cx={toX(t)}
                            cy={toY(s)}
                            r={3}
                            fill="#60a5fa"
                            opacity={0.7}
                        />
                    ))}

                    {/* HD curve */}
                    <path
                        d={extendedPath(curves.hd)}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {curves.hd.map(([t, s], i) => (
                        <circle
                            key={`hd-${i}`}
                            cx={toX(t)}
                            cy={toY(s)}
                            r={3}
                            fill="#fbbf24"
                        />
                    ))}

                    {/* CPU curve */}
                    <path
                        d={extendedPath(curves.cpu)}
                        fill="none"
                        stroke="#f87171"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {curves.cpu.map(([t, s], i) => (
                        <circle
                            key={`cpu-${i}`}
                            cx={toX(t)}
                            cy={toY(s)}
                            r={3}
                            fill="#f87171"
                        />
                    ))}

                    {/* Current operating points */}
                    {currentTemps && currentTemps.cpuTemp !== null && (
                        <g>
                            <circle
                                cx={toX(currentTemps.cpuTemp)}
                                cy={toY(currentTemps.cpuSpeed)}
                                r={6}
                                fill="none"
                                stroke="#f87171"
                                strokeWidth={2}
                            />
                            <circle
                                cx={toX(currentTemps.cpuTemp)}
                                cy={toY(currentTemps.cpuSpeed)}
                                r={2.5}
                                fill="#f87171"
                            />
                        </g>
                    )}
                    {currentTemps && currentTemps.hdTemp !== null && (
                        <g>
                            <circle
                                cx={toX(currentTemps.hdTemp)}
                                cy={toY(currentTemps.hdSpeed)}
                                r={6}
                                fill="none"
                                stroke="#fbbf24"
                                strokeWidth={2}
                            />
                            <circle
                                cx={toX(currentTemps.hdTemp)}
                                cy={toY(currentTemps.hdSpeed)}
                                r={2.5}
                                fill="#fbbf24"
                            />
                        </g>
                    )}
                    {currentTemps && currentTemps.ambientTemp !== null && (
                        <g>
                            <circle
                                cx={toX(currentTemps.ambientTemp)}
                                cy={toY(currentTemps.ambientFloor)}
                                r={6}
                                fill="none"
                                stroke="#60a5fa"
                                strokeWidth={2}
                            />
                            <circle
                                cx={toX(currentTemps.ambientTemp)}
                                cy={toY(currentTemps.ambientFloor)}
                                r={2.5}
                                fill="#60a5fa"
                            />
                        </g>
                    )}

                    {/* Final target line */}
                    {currentTemps && (
                        <line
                            x1={PAD.left}
                            y1={toY(currentTemps.finalTarget)}
                            x2={PAD.left + PLOT_W}
                            y2={toY(currentTemps.finalTarget)}
                            stroke="#10b981"
                            strokeWidth={1.5}
                            strokeDasharray="6,3"
                            opacity={0.8}
                        />
                    )}

                    {/* Legend */}
                    <g transform={`translate(${PAD.left + 8}, ${PAD.top + 8})`}>
                        <rect x={0} y={0} width={120} height={68} rx={4} fill="#111827" opacity={0.85} />
                        {/* CPU */}
                        <line x1={8} y1={14} x2={22} y2={14} stroke="#f87171" strokeWidth={2.5} />
                        <text x={28} y={18} fill="#f87171" fontSize={11}>CPU</text>
                        {/* HD */}
                        <line x1={8} y1={30} x2={22} y2={30} stroke="#fbbf24" strokeWidth={2.5} />
                        <text x={28} y={34} fill="#fbbf24" fontSize={11}>HD Max</text>
                        {/* Ambient */}
                        <line x1={8} y1={46} x2={22} y2={46} stroke="#60a5fa" strokeWidth={2} opacity={0.7} />
                        <text x={28} y={50} fill="#60a5fa" fontSize={11} opacity={0.7}>Ambient</text>
                        {/* Target */}
                        {currentTemps && (
                            <>
                                <line x1={8} y1={62} x2={22} y2={62} stroke="#10b981" strokeWidth={1.5} strokeDasharray="4,2" />
                                <text x={28} y={66} fill="#10b981" fontSize={11}>Target {currentTemps.finalTarget}%</text>
                            </>
                        )}
                    </g>
                </svg>
            </div>
        </div>
    );
}
