import type { NextApiRequest, NextApiResponse } from "next";
import https from "https";
import base64 from "base-64";

export const getData = async () => {
    const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
    });

    const r = await fetch(
        `https://${process.env.ILO_HOST}/redfish/v1/chassis/1/Thermal`,
        {
            headers: {
                Authorization: `Basic ${base64.encode(
                    `${process.env.ILO_USERNAME}:${process.env.ILO_PASSWORD}`
                )}`,
            },
            //@ts-ignore
            agent: httpsAgent,
        }
    );

    const response = await r.json();

    return response.Fans;
};

const handler = async (_req: NextApiRequest, res: NextApiResponse) => {
    try {
        const fans = await getData();
        return res.send(fans);
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export default handler;
