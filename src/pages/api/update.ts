import { NextApiRequest, NextApiResponse } from "next";

import { changeFanSpeedSchema } from "../../schemas/changeFanSpeed";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const body = await changeFanSpeedSchema.validate(req.body);

        res.send(body);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export default handler;
