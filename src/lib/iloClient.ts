import base64 from "base-64";
import https from "https";
import { NodeSSH } from "node-ssh";

import { changeFanSpeedSchema, ChangeFanSpeedInput } from "../schemas/changeFanSpeed";
import type { FanObject } from "../types/Fan";

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

const ensureEnv = () => {
    const missing = [
        { key: "ILO_HOST", value: process.env.ILO_HOST },
        { key: "ILO_USERNAME", value: process.env.ILO_USERNAME },
        { key: "ILO_PASSWORD", value: process.env.ILO_PASSWORD },
    ]
        .filter((entry) => !entry.value)
        .map((entry) => entry.key);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
};

export const fetchFans = async (): Promise<FanObject[]> => {
    ensureEnv();

    const response = await fetch(
        `https://${process.env.ILO_HOST}/redfish/v1/chassis/1/Thermal`,
        {
            headers: {
                Authorization: `Basic ${base64.encode(
                    `${process.env.ILO_USERNAME}:${process.env.ILO_PASSWORD}`
                )}`,
            },
            // @ts-expect-error: The undici fetch typing does not expose "agent" yet.
            agent: httpsAgent,
        }
    );

    if (!response.ok) {
        throw new Error(`Unable to fetch fan data (${response.status})`);
    }

    const payload = await response.json();
    return payload.Fans ?? [];
};

const withSshConnection = async (callback: (ssh: NodeSSH) => Promise<void>) => {
    ensureEnv();

    const ssh = new NodeSSH();

    await ssh.connect({
        host: process.env.ILO_HOST,
        username: process.env.ILO_USERNAME,
        password: process.env.ILO_PASSWORD,
        algorithms: {
            kex: ["diffie-hellman-group14-sha1"],
        },
    });

    try {
        await callback(ssh);
    } finally {
        ssh.dispose();
    }
};

export const unlockFans = async (): Promise<void> =>
    withSshConnection(async (ssh) => {
        await ssh.execCommand("fan p global unlock");
    });

export const setFanSpeeds = async (payload: ChangeFanSpeedInput): Promise<void> => {
    const validated = await changeFanSpeedSchema.validate(payload, {
        abortEarly: false,
        stripUnknown: true,
    });

    await withSshConnection(async (ssh) => {
        for (let i = 0; i < validated.fans.length; i++) {
            const speed = Math.round((validated.fans[i] / 100) * 255);
            await ssh.execCommand(`fan p ${i} lock ${speed}`);
        }
    });
};
