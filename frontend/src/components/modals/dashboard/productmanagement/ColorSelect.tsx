import Select from "react-select";
import { useGetAllStoreColorQuery } from "@/redux/services/colorApi";
import { useParams } from "react-router-dom";

export default function ColorSelect({
  onCheckedChange,
  formvalue,
}: {
  onCheckedChange: (values: { name: string; value: string }[]) => void; 
  formvalue: { colors: { name: string; value: string }[] }; 
}) {
  const { id } = useParams();
  const { data: storeColor } = useGetAllStoreColorQuery({ storeid: id });

  // Formatting react select options
  const options =
    storeColor?.map((select: { name: string; value: string }) => ({
      label: select?.name,
      value: select?.value,
    })) || [];

  // Match selected colors from formvalue.colors with options
  const selectedValues = options.filter((option: { label: string; value: string }) =>
    formvalue.colors.some((color) => color.value === option.value)
  );

  // Handle selection change
  const handleChange = (selectedOptions: any) => {
    const selectedColors = selectedOptions
      ? selectedOptions.map((option: { label: string; value: string }) => ({
          name: option.label,
          value: option.value,
        }))
      : [];
    console.log("selectedColors", selectedColors);
    onCheckedChange(selectedColors);
  };

  // Major challenge was in the color select change
  // console.log("storeColor", storeColor)
  // console.log("selectedValues", selectedValues)
  // console.log("options", options)
  // console.log("formvalue", formvalue)
  return (
    <div className="w-full relative flex flex-col gap-2 text-sm">
      <span className="font-dashboard_normal text-sm lg:text-base">
        Product colors
      </span>
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