import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { Formik, Form } from "formik";

import Fan from "../components/Fan";
import type { FanObject } from "../types/Fan";
import { changeFanSpeedSchema } from "../schemas/changeFanSpeed";

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

    const router = useRouter();

    return (
        <div className="h-screen bg-gray-800 flex justify-center items-center text-white">
            <div className="bg-gray-900 border-2 border-gray-700 shadow-xl duration-150 pt-6 pb-4 sm:px-12 sm:max-w-2xl w-full rounded container">
                <div className="flex gap-4 items-center justify-center mb-6">
                    <img src="/ilo-logo.png" />
                    <h1 className="text-xl font-semibold">
                        ILO Fan Controller
                    </h1>
                </div>
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

                        console.log(response);

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
                                    className="sm:w-auto w-full bg-blue-600 hover:bg-blue-700 duration-150 font-semibold text-blue-50 py-2 px-10 rounded"
                                    onClick={() =>
                                        setFieldValue("fans", ogArray)
                                    }
                                    type="button"
                                >
                                    Reset
                                </button>
                                <button
                                    className={`sm:w-auto w-full bg-${
                                        editAll ? "red" : "gray"
                                    }-600 hover:bg-${
                                        editAll ? "red" : "gray"
                                    }-700 duration-150 font-semibold text-gray-50 py-2 px-10 rounded`}
                                    onClick={() => setEditAll(!editAll)}
                                    type="button"
                                >
                                    Edit All
                                </button>
                                <button className="sm:w-auto w-full bg-green-600 hover:bg-green-700 duration-150 font-semibold text-green-50 py-2 px-10 rounded">
                                    {isSubmitting ? "Updating" : "Update"}
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
