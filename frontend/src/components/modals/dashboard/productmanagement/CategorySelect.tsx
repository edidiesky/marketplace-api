import Select from "react-select";
import { useGetAllStoreCategoryQuery } from "@/redux/services/categoryApi";
import { useParams } from "react-router-dom";
export default function CategorySelect({
  onCheckedChange,
  formvalue,
}: {
  onCheckedChange: (value: string[]) => void;
  formvalue: { category: string[] };
}) {
  const { id } = useParams();
  const { data: storeCategory } = useGetAllStoreCategoryQuery({ storeid: id });

  // format react select options
  const options =
    storeCategory?.map((select: { name: string; value: string }) => ({
      label: select?.name,
      value: select?.value,
    })) || [];
  const selectedValues = options?.filter((option: {value:string}) =>
    formvalue?.category.includes(option.value)
  );
  const handleChange = (selectedOptions: any) => {
    const selectedCategories = selectedOptions
      ? selectedOptions?.map((option: { value: string }) => option.value)
      : [];
    console.log("selectedCategories", selectedCategories);
    onCheckedChange(selectedCategories); // Pass array of selected category values
  };
  return (
    <div className="w-full flex flex-col gap-2 text-sm">
      <span className="font-dashboard_normal text-sm lg:text-base">
        Product Category
      </span>
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
            borderRadius: "8px",
            fontSize: "14px",
            fontFamily: "Light"
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
