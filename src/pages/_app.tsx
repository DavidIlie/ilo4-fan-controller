import { AppProps } from "next/app";
import Head from "next/head";
import { Toaster } from "react-hot-toast";

import "tailwindcss/tailwind.css";
import "../styles/global.css";

function ILOController({ Component, pageProps }: AppProps) {
    return (
        <>
            <Head>
                <title>iLO Fan Controller</title>
            </Head>
            <Toaster position="top-center" />
            <Component {...pageProps} />
        </>
    );
}

export default ILOController;
