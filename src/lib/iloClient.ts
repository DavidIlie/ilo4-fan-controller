import base64 from "base-64";
import { Agent as UndiciAgent } from "undici";
import { NodeSSH } from "node-ssh";
import { changeFanSpeedSchema, ChangeFanSpeedInput } from "../schemas/changeFanSpeed";
import type { FanObject } from "../types/Fan";

const httpsDispatcher = new UndiciAgent({
    connect: {
        rejectUnauthorized: false,
    },
});

const getIloHost = (): string =>
    (process.env.ILO_HOST ?? "").replace(/^https?:\/\//, "");

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

type IloThermalPayload = {
    Fans?: FanObject[];
};

export const fetchFans = async (): Promise<FanObject[]> => {
    ensureEnv();

    const requestInit: RequestInit & { dispatcher: UndiciAgent } = {
        headers: {
            Authorization: `Basic ${base64.encode(
                `${process.env.ILO_USERNAME}:${process.env.ILO_PASSWORD}`
            )}`,
        },
        dispatcher: httpsDispatcher,
    };

    const response = await fetch(
        `https://${process.env.ILO_HOST}/redfish/v1/chassis/1/Thermal`,
        requestInit
    );

    if (!response.ok) {
        throw new Error(`Unable to fetch fan data (${response.status})`);
    }

    const payload = (await response.json()) as IloThermalPayload;
    return payload.Fans ?? [];
};

const withSshConnection = async (callback: (ssh: NodeSSH) => Promise<void>) => {
    ensureEnv();
    const iloHost = getIloHost();
    const ssh = new NodeSSH();

    await ssh.connect({
        host: iloHost,
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