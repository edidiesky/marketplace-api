import Select, { type MultiValue } from "react-select";
import { useGetAllStoreCategoryQuery } from "@/redux/services/categoryApi";
import { useParams } from "react-router-dom";
import type { ProductColorOrSize } from "@/types/api";

type SelectOption = {
  label: string;
  value: string;
};

export default function CategorySelect({
  onCheckedChange,
  formvalue,
}: {
  onCheckedChange: (value: string[]) => void;
  formvalue: { category: string[] };
}) {
  const { id } = useParams();
  const { data: storeCategory } = useGetAllStoreCategoryQuery({ storeid: id });

  const options: SelectOption[] = (storeCategory ?? []).map((select: ProductColorOrSize) => ({
    label: select.name,
    value: select.value,
  }));

  const selectedValues = options.filter((option) =>
    formvalue.category.includes(option.value)
  );

  const handleChange = (selectedOptions: MultiValue<SelectOption>) => {
    const selectedCategories = (selectedOptions ?? []).map((option) => option.value);
    onCheckedChange(selectedCategories);
  };

  return (
    <div className="w-full flex flex-col gap-2 text-sm">
      <span className="font-dashboard_normal text-sm lg:text-base">Product Category</span>
      <Select
        isMulti
        options={options}
        value={selectedValues}
        onChange={handleChange}
        placeholder="Select your category"
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