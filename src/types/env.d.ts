declare namespace NodeJS {
    interface ProcessEnv {
        ILO_HOST: string;
        ILO_USERNAME: string;
        ILO_PASSWORD: string;
        FAN_CURVE_POLL_INTERVAL?: string;
        FAN_CURVE_MIN_SPEED?: string;
        FAN_CURVE_MODE?: string;
    }
}
