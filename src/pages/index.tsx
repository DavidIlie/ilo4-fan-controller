import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { Formik, Form } from "formik";

import Fan from "../components/Fan";
import type { FanObject } from "../types/Fan";
import { changeFanSpeedSchema } from "../schemas/changeFanSpeed";
import toast from "react-hot-toast";

interface Props {
    fans: FanObject[];
}

const Home = ({ fans }: Props): JSX.Element => {
    let fanArray = [];
    let ogArray = [];

    fans.forEach(
        (fan) =>
            fanArray.push(fan.CurrentReading) &&
            ogArray.push(fan.CurrentReading)
    );

    const [editAll, setEditAll] = useState<boolean>(false);

    const [unlocking, setUnlocking] = useState<boolean>();

    const router = useRouter();

    const HandleUnlock = async () => {
        setUnlocking(true);
        const r = await fetch(`${router.basePath}/api/unlock`);
        const response = await r.json();

        if (r.status === 200) {
            toast.success("Updated successfully!");
        } else {
            toast.error(response.message);
        }
        setUnlocking(false);
    };

    return (
        <div className="h-screen bg-gray-800 flex justify-center items-center text-white">
            <div className="bg-gray-900 border-2 border-gray-700 shadow-xl duration-150 pt-6 pb-4 sm:px-12 sm:max-w-2xl w-full rounded container">
                <div className="flex gap-4 items-center justify-center mb-6">
                    <img src="/ilo-logo.png" />
                    <h1 className="text-xl font-semibold">
                        ILO Fan Controller
                    </h1>
                </div>

                <label
                    className="flex items-center cursor-pointer w-fit sm:mx-11 mx-[3.25rem] my-3"
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
                        <div className="dot absolute w-6 h-6 bg-gray-500 rounded-full shadow -left-1 -top-1 transition"></div>
                    </div>
                    <div className="ml-3 text-white font-medium">Edit All</div>
                </label>

                <Formik
                    validateOnChange={false}
                    validateOnBlur={false}
                    validationSchema={changeFanSpeedSchema}
                    initialValues={{
                        fans: fanArray,
                    }}
                    onSubmit={async (data, { setSubmitting }) => {
                        setSubmitting(true);

                        const r = await fetch(`${router.basePath}/api/update`, {
                            method: "POST",
                            body: JSON.stringify(data),
                            headers: { "Content-Type": "application/json" },
                        });
                        const response = await r.json();

                        if (r.status === 200) {
                            toast.success("Updated successfully!");
                        } else {
                            toast.error(response.message);
                        }

                        setSubmitting(false);
                    }}
                >
                    {({ errors, isSubmitting, values, setFieldValue }) => (
                        <Form className="flex justify-center flex-wrap">
                            {fans.map((fan, index) => (
                                <div
                                    className={`${
                                        index !== values.fans.length - 1 &&
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
                            <div className="mt-6 flex items-center sm:gap-4 gap-2 justify-center w-full sm:px-0 px-4">
                                <button
                                    className="sm:w-auto disabled:bg-gray-500 disabled:cursor-not-allowed w-full bg-emerald-600 hover:bg-emerald-700 duration-150 font-semibold text-emerald-50 py-2 px-10 rounded"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Updating" : "Update"}
                                </button>
                                <button
                                    className="sm:w-auto w-full bg-cyan-600 hover:bg-cyan-700 duration-150 font-semibold text-blue-50 py-2 px-10 rounded"
                                    onClick={() =>
                                        setFieldValue("fans", ogArray)
                                    }
                                    type="button"
                                >
                                    Reset All
                                </button>
                                <button
                                    className="sm:w-auto w-full bg-sky-800 hover:bg-sky-900 disabled:bg-gray-500 disabled:cursor-not-allowed duration-150 font-semibold text-gray-50 py-2 px-10 rounded"
                                    type="button"
                                    onClick={HandleUnlock}
                                    disabled={unlocking}
                                >
                                    {unlocking ? "Unlocking" : "Unlock"}
                                </button>
                            </div>
                            {errors.fans && (
                                <h1 className="text-red-500 font-semibold text-lg mt-2">
                                    {errors.fans}
                                </h1>
                            )}
                        </Form>
                    )}
                </Formik>
            </div>
        </div>
    );
};

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const baseUrl = req ? `${protocol}://${req.headers.host}` : "";

    const r = await fetch(`${baseUrl}/api/temps`);
    const response = await r.json();

    return {
        props: {
            fans: response,
        },
    };
};

export default Home;
