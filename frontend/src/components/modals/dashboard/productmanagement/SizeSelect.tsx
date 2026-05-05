import Select, { type MultiValue } from "react-select";
import { useGetAllStoreSizeQuery } from "@/redux/services/sizeApi";
import { useParams } from "react-router-dom";
import type { ProductColorOrSize } from "@/types/api";

type SelectOption = {
  label: string;
  value: string;
};

export default function SizeSelect({
  onCheckedChange,
  formvalue,
}: {
  onCheckedChange: (values: ProductColorOrSize[]) => void;
  formvalue: { size: ProductColorOrSize[] };
}) {
  const { id } = useParams();
  const { data: storeSize } = useGetAllStoreSizeQuery({ storeid: id });

  const options: SelectOption[] =
    (storeSize ?? []).map((select: ProductColorOrSize) => ({
      label: select.name,
      value: select.value,
    }));

  const selectedValues = options.filter((option) =>
    formvalue.size.some((size) => size.value === option.value)
  );

  const handleChange = (selectedOptions: MultiValue<SelectOption>) => {
    const selectedSizes: ProductColorOrSize[] = (selectedOptions ?? []).map((option) => ({
      name: option.label,
      value: option.value,
    }));
    onCheckedChange(selectedSizes);
  };

  return (
    <div className="w-full relative flex flex-col gap-2 text-sm">
      <span className="text-sm lg:text-base">Product size</span>
      <Select
        isMulti
        options={options}
        value={selectedValues}
        onChange={handleChange}
        placeholder="Select your size"
        className="basic-multi-select"
        classNamePrefix="select"
        styles={{
          control: (base) => ({
            ...base,
            height: "45px",
            borderRadius: "0px",
            fontSize: "14px",
          }),
          menu: (base) => ({
            ...base,
            zIndex: 400,
          }),
        }}
      />
    </div>
  );
}