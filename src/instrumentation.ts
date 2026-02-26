export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { getFanController } = await import("./lib/fanController");
        const controller = getFanController();
        controller.start();
    }
}
