import { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";

import "tailwindcss/tailwind.css";
import "../styles/global.css";

function ILOController({ Component, pageProps }: AppProps) {
    return (
        <>
            <Toaster position="top-center" />
            <Component {...pageProps} />
        </>
    );
}

export default ILOController;
