import type { GetServerSideProps } from "next";
import type { FanObject } from "../types/Fan";

interface Props {
    fans: FanObject[];
}

const Home = ({ fans }: Props): JSX.Element => {
    return (
        <div className="h-screen bg-gray-800 flex justify-center items-center text-white">
            <div className="bg-gray-900 border-2 border-gray-700 shadow-xl hover:shadow-2xl duration-150 py-2 px-4 rounded">
                {fans.map((fan, index) => (
                    <h1 key={index}>{fan.FanName}</h1>
                ))}
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
