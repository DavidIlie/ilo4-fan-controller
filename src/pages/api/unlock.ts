import { NextApiRequest, NextApiResponse } from "next";
import { NodeSSH } from "node-ssh";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const ssh = new NodeSSH();

        await ssh.connect({
            host: process.env.ILO_HOST,
            username: process.env.ILO_USERNAME,
            password: process.env.ILO_PASSWORD,
            algorithms: {
                kex: ["diffie-hellman-group14-sha1"],
            },
        });

        await ssh.execCommand(`fan p global unlock`);
        res.send("OK");
        ssh.dispose();
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export default handler;
