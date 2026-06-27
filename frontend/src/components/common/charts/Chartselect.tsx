import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChartSelectOption {
  label: string;
  value: string;
}

interface ChartSelectProps {
  value:         string;
  onValueChange: (value: string) => void;
  options:       ChartSelectOption[];
  placeholder?:  string;
}

const EMPTY_SENTINEL = "__all__";

function toInternal(v: string) { return v === "" ? EMPTY_SENTINEL : v; }
function toExternal(v: string) { return v === EMPTY_SENTINEL ? "" : v; }

export function ChartSelect({ value, onValueChange, options, placeholder }: ChartSelectProps) {
  return (
    <Select
      value={toInternal(value)}
      onValueChange={(v) => onValueChange(toExternal(v))}
    >
      <SelectTrigger className="py-1 rounded h-auto cursor-pointer border shadow-custom-light bg-white flex items-center justify-center w-[140px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-sm">
        {options.map((opt) => (
          <SelectItem
            key={toInternal(opt.value)}
            value={toInternal(opt.value)}
            className="text-sm text-gray-500 bold cursor-pointer hover:bg-gray-100 hover:text-gray-700 focus:text-gray-700"
          >
            <div className="flex items-center bold gap-2 my-1">{opt.label}</div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export type { ChartSelectOption };