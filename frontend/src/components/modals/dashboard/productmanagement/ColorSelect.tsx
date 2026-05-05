import Select, { type MultiValue } from "react-select";
import { useGetAllStoreColorQuery } from "@/redux/services/colorApi";
import { useParams } from "react-router-dom";
import type { ProductColorOrSize } from "@/types/api";

type SelectOption = {
  label: string;
  value: string;
};

export default function ColorSelect({
  onCheckedChange,
  formvalue,
}: {
  onCheckedChange: (values: ProductColorOrSize[]) => void;
  formvalue: { colors: ProductColorOrSize[] };
}) {
  const { id } = useParams();
  const { data: storeColor } = useGetAllStoreColorQuery({ storeid: id });

  const options: SelectOption[] = (storeColor ?? []).map((select: ProductColorOrSize) => ({
    label: select.name,
    value: select.value,
  }));

  const selectedValues = options.filter((option) =>
    formvalue.colors.some((color) => color.value === option.value)
  );

  const handleChange = (selectedOptions: MultiValue<SelectOption>) => {
    const selectedColors: ProductColorOrSize[] = (selectedOptions ?? []).map((option) => ({
      name: option.label,
      value: option.value,
    }));
    onCheckedChange(selectedColors);
  };

  return (
    <div className="w-full relative flex flex-col gap-2 text-sm">
      <span className="font-dashboard_normal text-sm lg:text-base">Product colors</span>
      <Select
        isMulti
        options={options}
        value={selectedValues}
        onChange={handleChange}
        placeholder="Select your colors"
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