import type { NextApiRequest, NextApiResponse } from "next";
import { getFanController, type ControllerMode } from "../../lib/fanController";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const controller = getFanController();

    if (req.method === "GET") {
        const state = controller.getState();
        return res.status(200).json({
            mode: state.mode,
            currentSpeed: state.currentSpeed,
            lastDecision: state.lastDecision,
            lastPollTime: state.lastPollTime,
            consecutiveErrors: state.consecutiveErrors,
            error: state.error,
        });
    }

    if (req.method === "POST") {
        const { mode } = req.body as { mode?: string };
        if (mode !== "auto" && mode !== "manual") {
            return res.status(400).json({ message: "mode must be 'auto' or 'manual'" });
        }

        await controller.setMode(mode as ControllerMode);
        return res.status(200).json({ mode: controller.getMode() });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ message: "Method Not Allowed" });
};

export default handler;
