import type { NextApiRequest, NextApiResponse } from "next";

import { fetchFans } from "../../lib/iloClient";

export const getData = fetchFans;

const handler = async (_req: NextApiRequest, res: NextApiResponse) => {
    try {
        const fans = await fetchFans();
        return res.status(200).json({ fans });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return res.status(500).json({ message });
    }
};

export default handler;
