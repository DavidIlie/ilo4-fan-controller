import { NextApiRequest, NextApiResponse } from "next";
import { NodeSSH } from "node-ssh";

import { changeFanSpeedSchema } from "../../schemas/changeFanSpeed";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const body = await changeFanSpeedSchema.validate(req.body);

        const ssh = new NodeSSH();

        ssh.connect({
            host: process.env.ILO_HOST,
            username: process.env.ILO_USERNAME,
            password: process.env.ILO_PASSWORD,
            algorithms: {
                kex: ["diffie-hellman-group14-sha1"],
            },
        }).then(async () => {
            // for (let i = 0; i < body.fans.length; i++) {
            //     const fanID = i + 1;
            //     const value = body.fans[i];

            //     const speed = ((value as any as number) / 100) * 255;

            //     const command = await ssh.execCommand(`fan p ${fanID} min 25`);

            //     const command2 = await ssh.execCommand(
            //         `fan p ${fanID} max ${speed}`
            //     );

            //     console.log(command, command2);
            // }

            const speed = (body.fans[0] / 100) * 255;

            const command = await ssh.execCommand(`fan p global lock ${speed}`);

            console.log(command);

            ssh.dispose();
        });

        res.send(body);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export default handler;
