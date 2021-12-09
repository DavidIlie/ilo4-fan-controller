import { ChangeEvent, useState } from "react";
import type { FanObject } from "../../types/Fan";

interface FanProps {
    data: FanObject;
    values: Array<number>;
    index: number;
    update: (field: string, value: any, shouldValidate?: boolean) => void;
}

const Fan = ({ data, values, index, update }: FanProps): JSX.Element => {
    const [original, _setOriginal] = useState(values[index]);

    const HandleUpdate = (val: ChangeEvent<HTMLInputElement>, event = true) => {
        const value = event
            ? (val.target.value as never as number)
            : (val as never as number);

        let newValues = values;
        newValues[index] = value;

        update("fans", newValues);
    };

    return (
        <div className="flex items-center gap-2">
            <h1 className="font-semibold text-lg">{data.FanName}</h1>
            <input
                type="range"
                min="10"
                max="100"
                value={values[index]}
                className="w-full sm:w-72"
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
            <button
                type="button"
                onClick={() => HandleUpdate(original as any, false)}
            >
                Reset
            </button>
        </div>
    );
};

export default Fan;
