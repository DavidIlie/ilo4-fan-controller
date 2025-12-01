import { ChangeEvent } from "react";
import type { FanObject } from "../../types/Fan";

interface FanProps {
    data: FanObject;
    values: number[];
    index: number;
    update: (field: string, value: number[], shouldValidate?: boolean) => void;
    editAll: boolean;
}

const Fan = ({
    data,
    values,
    index,
    update,
    editAll,
}: FanProps): JSX.Element => {
    const handleUpdate = (event: ChangeEvent<HTMLInputElement>) => {
        const nextValue = Math.min(100, Math.max(10, Number(event.target.value)));
        const newValues = editAll
            ? values.map(() => nextValue)
            : values.map((value, valueIndex) =>
                  valueIndex === index ? nextValue : value
              );

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
                onChange={handleUpdate}
            />
            <input
                type="number"
                min="10"
                max="100"
                value={values[index]}
                required
                className="bg-gray-800 border border-gray-700 max-w-max p-1.5 py-1 rounded-md font-mono focus:outline-none"
                onChange={handleUpdate}
            />
        </div>
    );
};

export default Fan;
