import type { GetServerSideProps } from "next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Formik, Form } from "formik";
import toast from "react-hot-toast";
import { Fade } from "react-awesome-reveal";

import Fan from "../components/Fan";
import FanCurveChart from "../components/FanCurveChart";
import type { FanObject, TemperatureSummary } from "../types/Fan";
import { changeFanSpeedSchema } from "../schemas/changeFanSpeed";
import { fetchFans } from "../lib/iloClient";

interface ModeState {
    mode: "auto" | "manual";
    currentSpeed: number;
    lastDecision: {
        cpuTemp: number | null;
        cpuSpeed: number;
        hdTemp: number | null;
        hdSpeed: number;
        ambientTemp: number | null;
        ambientFloor: number;
        rawTarget: number;
        finalTarget: number;
    } | null;
    lastPollTime: number | null;
    error: string | null;
}

interface Props {
    fans: FanObject[];
    fail?: boolean;
}

// Color code a temperature based on its proximity to the caution threshold
function tempColor(temp: number | null, caution: number): string {
    if (temp === null) return "text-gray-500";
    const ratio = temp / caution;
    if (ratio >= 0.95) return "text-red-500";
    if (ratio >= 0.8) return "text-yellow-500";
    return "text-green-500";
}

const Home = ({ fans, fail }: Props): JSX.Element => {
    if (fail)
        return (
            <div className="h-screen px-2 pt-4 text-white bg-gray-800 sm:flex sm:justify-center sm:items-center sm:pt-0">
                <div className="text-center">
                    <Fade direction="up" triggerOnce cascade duration={400}>
                        <h1 className="mb-4 text-5xl font-semibold text-red-500">
                            Oops! Couldn't talk to iLO
                        </h1>
                        <p className="mb-2 text-xl">
                            Looks like you haven't configured your{" "}
                            <span className="font-mono text-yellow-500">
                                environment variables
                            </span>{" "}
                            correctly.
                        </p>
                        <p className="text-lg">
                            You can follow the guide{" "}
                            <a
                                href="https://github.com/davidilie/ilo4-fan-controller"
                                target="_blank"
                                className="text-blue-400 duration-150 hover:text-blue-500 hover:underline"
                            >
                                here
                            </a>
                            .
                        </p>
                    </Fade>
                </div>
            </div>
        );

    const initialFanSpeeds = useMemo(
        () => fans.map((fan) => fan.CurrentReading),
        [fans]
    );

    const [baselineSpeeds, setBaselineSpeeds] =
        useState<number[]>(initialFanSpeeds);
    const [editAll, setEditAll] = useState<boolean>(false);
    const [unlocking, setUnlocking] = useState<boolean>(false);
    const [presetLoading, setPresetLoading] = useState<number>(0);

    // New state for auto mode
    const [modeState, setModeState] = useState<ModeState>({
        mode: "auto",
        currentSpeed: 0,
        lastDecision: null,
        lastPollTime: null,
        error: null,
    });
    const [temps, setTemps] = useState<TemperatureSummary | null>(null);
    const [modeSwitching, setModeSwitching] = useState(false);

    const isAuto = modeState.mode === "auto";

    useEffect(() => {
        setBaselineSpeeds(initialFanSpeeds);
    }, [initialFanSpeeds]);

    // Poll mode and temps every 15 seconds
    const pollData = useCallback(async () => {
        try {
            const [modeRes, tempsRes] = await Promise.all([
                fetch("/api/mode"),
                fetch("/api/temps"),
            ]);
            if (modeRes.ok) {
                const data = await modeRes.json();
                setModeState(data);
            }
            if (tempsRes.ok) {
                const data = await tempsRes.json();
                setTemps(data);
            }
        } catch {
            // Silently fail — will retry next interval
        }
    }, []);

    useEffect(() => {
        pollData();
        const interval = setInterval(pollData, 15_000);
        return () => clearInterval(interval);
    }, [pollData]);

    const handleModeToggle = async () => {
        const newMode = isAuto ? "manual" : "auto";
        setModeSwitching(true);
        try {
            const response = await fetch("/api/mode", {
                method: "POST",
                body: JSON.stringify({ mode: newMode }),
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setModeState((prev) => ({ ...prev, mode: data.mode }));
                toast.success(`Switched to ${newMode} mode`);
                // Refresh data after mode switch
                setTimeout(pollData, 1000);
            } else {
                toast.error("Failed to switch mode");
            }
        } catch {
            toast.error("Failed to switch mode");
        }
        setModeSwitching(false);
    };

    const handleUnlock = async () => {
        setUnlocking(true);
        const response = await fetch(`/api/fans/unlock`, { method: "POST" });
        const payload = await response.json();

        if (response.status === 200) {
            toast.success("Fans unlocked successfully!");
        } else {
            toast.error(payload.message);
        }
        setUnlocking(false);
    };

    const handlePreset = async (
        speed: number,
        update: (
            field: string,
            value: unknown,
            shouldValidate?: boolean
        ) => void,
        preset: 1 | 2 | 3
    ) => {
        setPresetLoading(preset);
        const speeds = fans.map(() => speed);

        const response = await fetch(`/api/fans`, {
            method: "POST",
            body: JSON.stringify({ fans: speeds }),
            headers: { "Content-Type": "application/json" },
        });
        const payload = await response.json();

        if (response.status === 200) {
            toast.success("Configured successfully!");
            setBaselineSpeeds(speeds);
            update("fans", speeds);
            // This will have switched to manual mode
            setModeState((prev) => ({ ...prev, mode: "manual" }));
        } else {
            toast.error(payload.message);
        }
        setPresetLoading(0);
    };

    const decision = modeState.lastDecision;

    return (
        <div className="min-h-screen px-2 py-4 text-white bg-gray-800 sm:flex sm:justify-center sm:items-center sm:py-8">
            <Fade direction="left" triggerOnce>
                <div className="container w-full pt-6 pb-4 duration-150 bg-gray-900 border-2 border-gray-700 rounded shadow-xl sm:px-12 sm:max-w-2xl">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <img src="/ilo-logo.png" />
                        <h1 className="text-xl font-semibold">
                            iLO Fan Controller
                        </h1>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <span className={`text-sm font-medium ${!isAuto ? "text-cyan-400" : "text-gray-400"}`}>
                            Manual
                        </span>
                        <button
                            type="button"
                            onClick={handleModeToggle}
                            disabled={modeSwitching}
                            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                                isAuto ? "bg-emerald-600" : "bg-gray-600"
                            } ${modeSwitching ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${
                                    isAuto ? "translate-x-8" : "translate-x-1"
                                }`}
                            />
                        </button>
                        <span className={`text-sm font-medium ${isAuto ? "text-emerald-400" : "text-gray-400"}`}>
                            Auto
                        </span>
                    </div>

                    {/* Temperature Display */}
                    {temps && (
                        <div className="grid grid-cols-2 gap-2 px-4 py-3 mx-4 mb-4 bg-gray-800 rounded-lg sm:grid-cols-4 sm:mx-0">
                            <div className="text-center">
                                <div className="text-xs text-gray-400">CPU 1</div>
                                <div className={`text-lg font-mono font-bold ${tempColor(temps.cpu1, 70)}`}>
                                    {temps.cpu1 !== null ? `${temps.cpu1}°C` : "N/A"}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-gray-400">CPU 2</div>
                                <div className={`text-lg font-mono font-bold ${tempColor(temps.cpu2, 70)}`}>
                                    {temps.cpu2 !== null ? `${temps.cpu2}°C` : "N/A"}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-gray-400">HD Max</div>
                                <div className={`text-lg font-mono font-bold ${tempColor(temps.hdMax, 60)}`}>
                                    {temps.hdMax !== null ? `${temps.hdMax}°C` : "N/A"}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-gray-400">Inlet</div>
                                <div className={`text-lg font-mono font-bold ${tempColor(temps.inletAmbient, 42)}`}>
                                    {temps.inletAmbient !== null ? `${temps.inletAmbient}°C` : "N/A"}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Auto Mode Status Line */}
                    {isAuto && decision && (
                        <div className="px-4 py-2 mx-4 mb-4 text-xs text-center bg-gray-800 rounded-lg sm:mx-0">
                            <span className="text-emerald-400 font-medium">AUTO</span>
                            <span className="text-gray-400 mx-1">—</span>
                            <span className="text-gray-300">
                                CPU: {decision.cpuTemp ?? "?"}°C → {decision.cpuSpeed}%
                            </span>
                            <span className="text-gray-500 mx-1">|</span>
                            <span className="text-gray-300">
                                HD: {decision.hdTemp ?? "?"}°C → {decision.hdSpeed}%
                            </span>
                            <span className="text-gray-500 mx-1">|</span>
                            <span className="font-medium text-white">
                                Fan: {decision.finalTarget}%
                            </span>
                        </div>
                    )}

                    {/* Fan Curve Chart */}
                    <FanCurveChart
                        currentTemps={
                            decision
                                ? {
                                      cpuTemp: decision.cpuTemp,
                                      hdTemp: decision.hdTemp,
                                      ambientTemp: decision.ambientTemp ?? null,
                                      cpuSpeed: decision.cpuSpeed,
                                      hdSpeed: decision.hdSpeed,
                                      ambientFloor: decision.ambientFloor,
                                      finalTarget: decision.finalTarget,
                                  }
                                : null
                        }
                    />

                    {/* Error display */}
                    {modeState.error && (
                        <div className="px-4 py-2 mx-4 mb-4 text-sm text-center text-red-400 bg-red-900/30 rounded-lg sm:mx-0">
                            {modeState.error}
                        </div>
                    )}

                    <Formik
                        validateOnChange={false}
                        validateOnBlur={false}
                        validationSchema={changeFanSpeedSchema}
                        initialValues={{
                            fans: initialFanSpeeds,
                        }}
                        enableReinitialize
                        onSubmit={async (data, { setSubmitting }) => {
                            setSubmitting(true);

                            const response = await fetch(`/api/fans`, {
                                method: "POST",
                                body: JSON.stringify(data),
                                headers: { "Content-Type": "application/json" },
                            });
                            const payload = await response.json();

                            if (response.status === 200) {
                                toast.success("Updated successfully!");
                                setBaselineSpeeds(data.fans);
                                setModeState((prev) => ({ ...prev, mode: "manual" }));
                            } else {
                                toast.error(payload.message);
                            }

                            setSubmitting(false);
                        }}
                    >
                        {({ errors, isSubmitting, values, setFieldValue }) => (
                            <Form>
                                <div className="mx-8 my-3 mb-6 sm:flex sm:items-center sm:justify-between sm:mx-1 sm:mb-4">
                                    <label
                                        className={`flex items-center mx-auto mb-4 cursor-pointer w-fit sm:mx-0 sm:mb-0 ${isAuto ? "opacity-50 pointer-events-none" : ""}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (!isAuto) setEditAll(!editAll);
                                        }}
                                    >
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={editAll}
                                                readOnly
                                            />
                                            <div className="w-10 h-4 bg-gray-800 rounded-full shadow-inner"></div>
                                            <div className="absolute w-6 h-6 transition bg-gray-500 rounded-full shadow dot -left-1 -top-1"></div>
                                        </div>
                                        <div className="ml-3 font-medium text-white">
                                            Edit All
                                        </div>
                                    </label>
                                    <div className={`flex items-center w-full gap-2 sm:w-fit ${isAuto ? "opacity-50 pointer-events-none" : ""}`}>
                                        <button
                                            type="button"
                                            className="w-full px-6 py-2 font-semibold duration-150 rounded sm:w-auto disabled:bg-gray-500 disabled:cursor-not-allowed bg-cyan-600 hover:bg-cyan-700 text-cyan-50"
                                            disabled={presetLoading === 1 || isAuto}
                                            onClick={() =>
                                                handlePreset(
                                                    32,
                                                    setFieldValue,
                                                    1
                                                )
                                            }
                                            title="32% Fan Speed"
                                        >
                                            Quiet
                                        </button>
                                        <button
                                            type="button"
                                            className="w-full px-6 py-2 font-semibold duration-150 rounded sm:w-auto disabled:bg-gray-500 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700 text-emerald-50"
                                            disabled={presetLoading === 2 || isAuto}
                                            onClick={() =>
                                                handlePreset(
                                                    60,
                                                    setFieldValue,
                                                    2
                                                )
                                            }
                                            title="60% Fan Speed"
                                        >
                                            Normal
                                        </button>
                                        <button
                                            type="button"
                                            className="w-full px-6 py-2 font-semibold duration-150 bg-red-500 rounded sm:w-auto disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-red-600 text-red-50"
                                            disabled={presetLoading === 3 || isAuto}
                                            onClick={() =>
                                                handlePreset(
                                                    90,
                                                    setFieldValue,
                                                    3
                                                )
                                            }
                                            title="90% Fan Speed"
                                        >
                                            Turbo
                                        </button>
                                    </div>
                                </div>
                                <div className={`flex flex-wrap justify-center ${isAuto ? "opacity-50 pointer-events-none" : ""}`}>
                                    {fans.map((fan, index) => (
                                        <div
                                            className={`${
                                                index !==
                                                    values.fans.length - 1 &&
                                                "mb-4"
                                            }`}
                                            key={index}
                                        >
                                            <Fan
                                                data={fan}
                                                index={index}
                                                values={values.fans}
                                                update={setFieldValue}
                                                editAll={editAll}
                                            />
                                        </div>
                                    ))}
                                    <div className="flex flex-wrap items-center justify-center w-full gap-2 px-4 mt-6 sm:gap-4 sm:px-0">
                                        <button
                                            className="block w-full px-10 py-2 font-semibold duration-150 rounded sm:hidden sm:w-auto disabled:bg-gray-500 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700 text-emerald-50"
                                            disabled={isSubmitting || isAuto}
                                            title="Update fans to specified speed"
                                        >
                                            {isSubmitting
                                                ? "Updating"
                                                : "Update"}
                                        </button>
                                        <div className="flex items-center justify-center w-full gap-2">
                                            <button
                                                className="hidden w-full px-10 py-2 font-semibold duration-150 rounded sm:block sm:w-auto disabled:bg-gray-500 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700 text-emerald-50"
                                                disabled={isSubmitting || isAuto}
                                                title="Update fans to specified speed"
                                            >
                                                {isSubmitting
                                                    ? "Updating"
                                                    : "Update"}
                                            </button>
                                            <button
                                                className="w-full px-10 py-2 font-semibold duration-150 rounded sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-blue-50 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                                onClick={() =>
                                                    setFieldValue(
                                                        "fans",
                                                        baselineSpeeds
                                                    )
                                                }
                                                type="button"
                                                disabled={isAuto}
                                                title="Reset fans to initial speed"
                                            >
                                                Reset
                                            </button>
                                            <button
                                                className="w-full px-10 py-2 font-semibold duration-150 rounded sm:w-auto bg-sky-800 hover:bg-sky-900 disabled:bg-gray-500 disabled:cursor-not-allowed text-gray-50"
                                                type="button"
                                                onClick={handleUnlock}
                                                disabled={unlocking || isAuto}
                                                title="Unlock fans to their default speed"
                                            >
                                                {unlocking
                                                    ? "Unlocking"
                                                    : "Unlock"}
                                            </button>
                                        </div>
                                    </div>
                                    {errors.fans && (
                                        <h1 className="mt-2 text-lg font-semibold text-red-500">
                                            {errors.fans}
                                        </h1>
                                    )}
                                </div>
                            </Form>
                        )}
                    </Formik>
                </div>
            </Fade>
        </div>
    );
};

export const getServerSideProps: GetServerSideProps = async () => {
    try {
        const fans = await fetchFans();
        return {
            props: {
                fans,
            },
        };
    } catch (error) {
        return {
            props: {
                fail: true,
                fans: [],
            },
        };
    }
};

export default Home;
