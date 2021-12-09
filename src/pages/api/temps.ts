import type { NextApiRequest, NextApiResponse } from "next";
import https from "https";
import base64 from "base-64";

const handler = async (_req: NextApiRequest, res: NextApiResponse) => {
    const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
    });

    try {
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
        return res.send(response.Fans);
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export default handler;
