import type { NextApiRequest, NextApiResponse } from "next";

import { setFanSpeeds } from "../../lib/iloClient";
import type { ChangeFanSpeedInput } from "../../schemas/changeFanSpeed";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    try {
        const payload = req.body as ChangeFanSpeedInput;
        await setFanSpeeds(payload);
        return res.status(200).json({ message: "ok" });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update fans";
        return res.status(400).json({ message });
import { NextApiRequest, NextApiResponse } from "next";
import { NodeSSH } from "node-ssh";
import { changeFanSpeedSchema } from "../../schemas/changeFanSpeed";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const ssh = new NodeSSH();

  try {
    // Establish SSH connection once for both GET and POST
    await ssh.connect({
      host: process.env.ILO_HOST,
      username: process.env.ILO_USERNAME,
      password: process.env.ILO_PASSWORD,
      algorithms: {
        kex: ["diffie-hellman-group14-sha1"],
      },
    });

    if (req.method === "GET") {
      // Iterate fan1..fan8, pulling Speed=NNN from each target
      const speeds: number[] = [];
      for (let i = 0; i < 8; i++) {
        const { stdout } = await ssh.execCommand(`show /system1/fan${i}`);
        const match = stdout.match(/Speed=(\d+)/);
        speeds.push(match ? parseInt(match[1], 10) : 0);
      }
      ssh.dispose();
      return res.status(200).json({ fans: speeds });
    }

    if (req.method === "POST") {
      // Validate incoming payload
      const body = await changeFanSpeedSchema.validate(req.body);

      // Apply each fan setting
      for (let i = 0; i < body.fans.length; i++) {
        const fanID = i;
        let value = body.fans[i];
        // enforce minimum of 10%
        if (value < 10) value = 10;
        const speed = Math.round((value / 100) * 255);

        await ssh.execCommand(`fan p ${fanID} lock ${speed}`);
        if (process.env.NODE_ENV === "development") {
          console.log(`DEBUG: Changed Fan ${fanID} → speed ${speed} (OK)`);
        }
      }

      ssh.dispose();
      return res.status(200).json({ message: "ok" });
    }

    // Method not allowed
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    // Clean up SSH session on error
    try { ssh.dispose(); } catch {}
    return res.status(400).json({ message: error.message || error.toString() });
  }
};

export default handler;
