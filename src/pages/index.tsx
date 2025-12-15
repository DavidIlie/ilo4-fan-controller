import type { GetServerSideProps } from "next";
import { useEffect, useMemo, useState } from "react";
import { Formik, Form } from "formik";
import toast from "react-hot-toast";
import { Fade } from "react-awesome-reveal";

import Fan from "../components/Fan";
import type { FanObject } from "../types/Fan";
import { changeFanSpeedSchema } from "../schemas/changeFanSpeed";
import { fetchFans } from "../lib/iloClient";

interface Props {
    fans: FanObject[];
    fail?: boolean;
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

    useEffect(() => {
        setBaselineSpeeds(initialFanSpeeds);
    }, [initialFanSpeeds]);

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
        } else {
            toast.error(payload.message);
        }
        setPresetLoading(0);
    };

    return (
        <div className="h-screen px-2 pt-4 text-white bg-gray-800 sm:flex sm:justify-center sm:items-center sm:pt-0">
            <Fade direction="left" triggerOnce>
                <div className="container w-full pt-6 pb-4 duration-150 bg-gray-900 border-2 border-gray-700 rounded shadow-xl sm:px-12 sm:max-w-2xl">
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <img src="/ilo-logo.png" />
                        <h1 className="text-xl font-semibold">
                            iLO Fan Controller
                        </h1>
                    </div>
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
                                        className="flex items-center mx-auto mb-4 cursor-pointer w-fit sm:mx-0 sm:mb-0"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setEditAll(!editAll);
                                        }}
                                    >
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={editAll}
                                            />
                                            <div className="w-10 h-4 bg-gray-800 rounded-full shadow-inner"></div>
                                            <div className="absolute w-6 h-6 transition bg-gray-500 rounded-full shadow dot -left-1 -top-1"></div>
                                        </div>
                                        <div className="ml-3 font-medium text-white">
                                            Edit All
                                        </div>
                                    </label>
                                    <div className="flex items-center w-full gap-2 sm:w-fit">
                                        <button
                                            className="w-full px-6 py-2 font-semibold duration-150 rounded sm:w-auto disabled:bg-gray-500 disabled:cursor-not-allowed bg-cyan-600 hover:bg-cyan-700 text-cyan-50"
                                            disabled={presetLoading === 1}
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
                                            className="w-full px-6 py-2 font-semibold duration-150 rounded sm:w-auto disabled:bg-gray-500 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700 text-emerald-50"
                                            disabled={presetLoading === 2}
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
                                            className="w-full px-6 py-2 font-semibold duration-150 bg-red-500 rounded sm:w-auto disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-red-600 text-red-50"
                                            disabled={presetLoading === 3}
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
                                <div className="flex flex-wrap justify-center">
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
                                            disabled={isSubmitting}
                                            title="Update fans to specified speed"
                                        >
                                            {isSubmitting
                                                ? "Updating"
                                                : "Update"}
                                        </button>
                                        <div className="flex items-center justify-center w-full gap-2">
                                            <button
                                                className="hidden w-full px-10 py-2 font-semibold duration-150 rounded sm:block sm:w-auto disabled:bg-gray-500 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700 text-emerald-50"
                                                disabled={isSubmitting}
                                                title="Update fans to specified speed"
                                            >
                                                {isSubmitting
                                                    ? "Updating"
                                                    : "Update"}
                                            </button>
                                            <button
                                                className="w-full px-10 py-2 font-semibold duration-150 rounded sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-blue-50"
                                                onClick={() =>
                                                    setFieldValue(
                                                        "fans",
                                                        baselineSpeeds
                                                    )
                                                }
                                                type="button"
                                                title="Reset fans to initial speed"
                                            >
                                                Reset
                                            </button>
                                            <button
                                                className="w-full px-10 py-2 font-semibold duration-150 rounded sm:w-auto bg-sky-800 hover:bg-sky-900 disabled:bg-gray-500 disabled:cursor-not-allowed text-gray-50"
                                                type="button"
                                                onClick={handleUnlock}
                                                disabled={unlocking}
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
            },
        };
    }
};

export default Home;
