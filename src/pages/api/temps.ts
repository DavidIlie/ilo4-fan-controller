import type { NextApiRequest, NextApiResponse } from "next";
import { fetchTemperatures } from "../../lib/iloClient";

const handler = async (_req: NextApiRequest, res: NextApiResponse) => {
    try {
        const temps = await fetchTemperatures();
        return res.status(200).json(temps);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return res.status(500).json({ message });
    }
};

export default handler;
