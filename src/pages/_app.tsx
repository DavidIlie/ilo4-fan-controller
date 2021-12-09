import { AppProps } from "next/app";

import "tailwindcss/tailwind.css";

function ILOController({ Component, pageProps }: AppProps) {
    return <Component {...pageProps} />;
}

export default ILOController;
