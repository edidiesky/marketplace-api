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
  value: string;
  onValueChange: (value: string) => void;
  options: ChartSelectOption[];
}

export function ChartSelect({ value, onValueChange, options }: ChartSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="py-2 rounded h-auto cursor-pointer border shadow-custom-light bg-white flex items-center justify-center w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-sm transition-opacity duration-200 ease-in-out">
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="text-sm  text-gray-500 flex items-center gap-2 cursor-pointer hover:bg-gray-100 hover:text-gray-700 focus:text-gray-700"
          >
            <div className="flex items-center gap-2 my-2">{opt.label}</div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export type { ChartSelectOption };