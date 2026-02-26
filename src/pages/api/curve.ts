import type { NextApiRequest, NextApiResponse } from "next";
import { getCurveDefinitions } from "../../lib/fanCurve";

const handler = async (_req: NextApiRequest, res: NextApiResponse) => {
    return res.status(200).json(getCurveDefinitions());
};

export default handler;
