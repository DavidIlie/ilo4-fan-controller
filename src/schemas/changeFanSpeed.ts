import * as yup from "yup";

export const changeFanSpeedSchema = yup.object().shape({
    fans: yup.array().of(yup.number().min(10).max(100).required()).required(),
});

export type ChangeFanSpeedInput = yup.InferType<typeof changeFanSpeedSchema>;
