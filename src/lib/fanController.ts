import { fetchTemperatures, fetchFans, setAllFanSpeed } from "./iloClient";
import { calculateFanSpeed, resetHysteresis, type CurveDecision } from "./fanCurve";
import type { TemperatureSummary } from "../types/Fan";

export type ControllerMode = "auto" | "manual";

export interface ControllerState {
    mode: ControllerMode;
    currentSpeed: number;
    fanCount: number;
    lastTemps: TemperatureSummary | null;
    lastDecision: CurveDecision | null;
    lastPollTime: number | null;
    consecutiveErrors: number;
    error: string | null;
}

const DEFAULT_POLL_INTERVAL = 15_000; // 15 seconds
const DEFAULT_MIN_SPEED = 25;
const SAFETY_SPEED = 80;
const MAX_CONSECUTIVE_ERRORS = 3;

class FanController {
    private state: ControllerState = {
        mode: "auto",
        currentSpeed: 0,
        fanCount: 7,
        lastTemps: null,
        lastDecision: null,
        lastPollTime: null,
        consecutiveErrors: 0,
        error: null,
    };

    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private polling = false;

    getState(): ControllerState {
        return { ...this.state };
    }

    getMode(): ControllerMode {
        return this.state.mode;
    }

    async setMode(mode: ControllerMode): Promise<void> {
        if (mode === this.state.mode) return;

        this.state.mode = mode;

        if (mode === "auto") {
            resetHysteresis();
            this.state.consecutiveErrors = 0;
            this.state.error = null;
            // Run one cycle immediately, then resume polling
            await this.tick();
            this.startPolling();
        } else {
            this.stopPolling();
        }
    }

    start(): void {
        const startupMode = (process.env.FAN_CURVE_MODE ?? "auto") as ControllerMode;
        this.state.mode = startupMode;

        if (startupMode === "auto") {
            // Delay first tick slightly to let the app finish initializing
            setTimeout(() => {
                this.tick().then(() => this.startPolling());
            }, 2000);
        }

        console.log(`[FanController] Started in ${startupMode} mode`);
    }

    stop(): void {
        this.stopPolling();
        console.log("[FanController] Stopped");
    }

    private startPolling(): void {
        this.stopPolling();
        const interval = parseInt(process.env.FAN_CURVE_POLL_INTERVAL ?? "", 10) * 1000 || DEFAULT_POLL_INTERVAL;
        this.pollTimer = setInterval(() => this.tick(), interval);
    }

    private stopPolling(): void {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    private async tick(): Promise<void> {
        if (this.state.mode !== "auto") return;
        if (this.polling) return; // Prevent overlapping ticks

        this.polling = true;
        try {
            // Fetch current temperatures
            const temps = await fetchTemperatures();
            this.state.lastTemps = temps;
            this.state.lastPollTime = Date.now();
            this.state.consecutiveErrors = 0;
            this.state.error = null;

            // Discover fan count on first successful poll
            try {
                const fans = await fetchFans();
                if (fans.length > 0) {
                    this.state.fanCount = fans.length;
                }
            } catch {
                // Non-critical — keep previous fanCount
            }

            // Calculate target speed
            const decision = calculateFanSpeed(temps, this.state.currentSpeed);
            this.state.lastDecision = decision;

            // Only send SSH command if speed actually changed
            if (decision.finalTarget !== this.state.currentSpeed) {
                await setAllFanSpeed(decision.finalTarget, this.state.fanCount);
                this.state.currentSpeed = decision.finalTarget;
                console.log(
                    `[FanController] Speed: ${decision.finalTarget}% ` +
                    `(CPU: ${decision.cpuTemp}°C→${decision.cpuSpeed}% | ` +
                    `HD: ${decision.hdTemp}°C→${decision.hdSpeed}% | ` +
                    `Ambient: ${decision.ambientTemp}°C→${decision.ambientFloor}%)`
                );
            }
        } catch (err) {
            this.state.consecutiveErrors++;
            this.state.error = err instanceof Error ? err.message : "Unknown error";
            console.error(`[FanController] Poll error (${this.state.consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, this.state.error);

            // Safety: if too many consecutive errors, ramp fans up
            if (this.state.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                console.warn(`[FanController] ${MAX_CONSECUTIVE_ERRORS} consecutive errors — ramping fans to ${SAFETY_SPEED}%`);
                try {
                    await setAllFanSpeed(SAFETY_SPEED, this.state.fanCount);
                    this.state.currentSpeed = SAFETY_SPEED;
                } catch (safetyErr) {
                    console.error("[FanController] Failed to set safety speed:", safetyErr);
                }
            }
        } finally {
            this.polling = false;
        }
    }
}

// Singleton instance
let instance: FanController | null = null;

export function getFanController(): FanController {
    if (!instance) {
        instance = new FanController();
    }
    return instance;
}
