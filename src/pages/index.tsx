import type { GetServerSideProps } from "next";
import { Formik, Form } from "formik";

import Fan from "../components/Fan";
import type { FanObject } from "../types/Fan";
import { changeFanSpeedSchema } from "../schemas/changeFanSpeed";

interface Props {
    fans: FanObject[];
}

const Home = ({ fans }: Props): JSX.Element => {
    let fanArray = [];
    fans.forEach((fan) => fanArray.push(fan.CurrentReading));

    return (
        <div className="h-screen bg-gray-800 flex justify-center items-center text-white">
            <div className="bg-gray-900 border-2 border-gray-700 shadow-xl hover:shadow-2xl duration-150 py-6 px-12 sm:max-w-xl w-full rounded container">
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
                    onSubmit={async (data, { setSubmitting, resetForm }) => {
                        console.log(data);
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
                                >
                                    <Fan
                                        data={fan}
                                        key={index}
                                        index={index}
                                        values={values.fans}
                                        update={setFieldValue}
                                    />
                                </div>
                            ))}
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
