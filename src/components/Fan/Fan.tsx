import { ChangeEvent } from "react";
import type { FanObject } from "../../types/Fan";

interface FanProps {
    data: FanObject;
    values: Array<number>;
    index: number;
    update: (field: string, value: any, shouldValidate?: boolean) => void;
    editAll: boolean;
}

const Fan = ({
    data,
    values,
    index,
    update,
    editAll,
}: FanProps): JSX.Element => {
    const HandleUpdate = (val: ChangeEvent<HTMLInputElement>, event = true) => {
        const value = event
            ? (val.target.value as never as number)
            : (val as never as number);

        let newValues = editAll ? [] : values;

        if (editAll) {
            for (let _val of values) {
                newValues.push(value);
            }
        } else {
            newValues[index] = value;
        }

        update("fans", newValues);
    };

    return (
        <div className="flex items-center justify-center gap-2">
            <h1 className="text-lg font-semibold">{data.FanName}</h1>
            <input
                type="range"
                min="10"
                max="100"
                value={values[index]}
                className="sm:w-[27rem] w-[13rem]"
                onChange={HandleUpdate}
            />
            <input
                type="number"
                min="10"
                max="100"
                value={values[index]}
                required
                className="bg-gray-800 border border-gray-700 max-w-max p-1.5 py-1 rounded-md font-mono focus:outline-none"
                onChange={HandleUpdate}
            />
        </div>
    );
};

export default Fan;
