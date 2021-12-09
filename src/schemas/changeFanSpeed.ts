import * as yup from "yup";

export const changeFanSpeedSchema = yup.object().shape({
    fans: yup
        .object()
        .shape({
            speed: yup.number().min(10).max(100).required(),
        })
        .required(),
});
