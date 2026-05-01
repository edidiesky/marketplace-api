import Select from "react-select";
import { useGetAllStoreSizeQuery } from "@/redux/services/sizeApi";
import { useParams } from "react-router-dom";

export default function SizeSelect({
  onCheckedChange,
  formvalue,
}: {
  onCheckedChange: (values: { name: string; value: string }[]) => void; 
  formvalue: { size: { name: string; value: string }[] }; 
}) {
  const { id } = useParams();
  const { data: storeSize } = useGetAllStoreSizeQuery({ storeid: id });

  // Formatting react select options
  const options =
    storeSize?.map((select: { name: string; value: string }) => ({
      label: select?.name,
      value: select?.value,
    })) || [];

  // Matching the selected size to the form value size
  const selectedValues = options.filter((option: { label: string; value: string }) =>
    formvalue.size.some((size) => size.value === option.value)
  );

  // Handling selection change
  const handleChange = (selectedOptions: any) => {
    const selectedSizes = selectedOptions
      ? selectedOptions.map((option: { label: string; value: string }) => ({
          name: option.label,
          value: option.value,
        }))
      : [];
    // console.log("selectedSizes", selectedSizes);
    onCheckedChange(selectedSizes);
  };

  return (
    <div className="w-full relative flex flex-col gap-2 text-sm">
      <span className="font-dashboard_normal text-sm lg:text-base">
        Product size
      </span>
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
            borderRadius: "8px",
            fontSize: "14px",
            fontFamily: "Light",
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