import type { NextApiRequest, NextApiResponse } from "next";

const handler = (_req: NextApiRequest, res: NextApiResponse) => {
    res.json({ message: "hello world" });
};

export default handler;
