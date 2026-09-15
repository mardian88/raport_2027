import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface ScoreInputProps {
    label: string;
    value: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
    disabled?: boolean;
}

export function ScoreInput({ label, value, onChange, min = 10, max = 100, disabled = false }: ScoreInputProps) {
    const isError = value < min || value > max || isNaN(value);

    return (
        <div className="flex items-center justify-between gap-4">
            <Label className="flex-1">{label}</Label>
            <div className="flex flex-col items-end">
                <Input
                    type="number"
                    min={min}
                    max={max}
                    step={1}
                    className={`w-20 text-right [&::-webkit-inner-spin-button]:opacity-100 [&::-webkit-outer-spin-button]:opacity-100 ${
                        isError ? 'border-red-500 focus-visible:ring-red-500' : ''
                    }`}
                    value={value === 0 ? '' : value}
                    disabled={disabled}
                    onFocus={(e) => {
                        e.target.select();
                    }}
                    onChange={(e) => {
                        const inputValue = e.target.value;
                        if (inputValue === '') {
                            onChange(min);
                            return;
                        }
                        let val = parseFloat(inputValue);
                        if (isNaN(val)) {
                            onChange(min);
                            return;
                        }

                        // C-3 FIX: clamp ke min dan max (sebelumnya hanya max)
                        if (val < min) val = min;
                        if (val > max) val = max;

                        onChange(val);
                    }}
                />
                {isError && value !== 0 && (
                    <span className="text-[10px] text-red-500 mt-0.5">
                        {value < min ? `Min ${min}` : `Max ${max}`}
                    </span>
                )}
            </div>
        </div>
    );
}
