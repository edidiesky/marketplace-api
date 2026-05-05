import { ProductFormDataItem } from "./types";

export const productFormData:ProductFormDataItem[] = [
    {
      type: "text",
      placeholder: "title",
      name: "name",
      required: true,
      label: "Title",
    },
   
    {
      type: "number",
      placeholder: "Price",
      name: "price",
      required: true,
      label: "Price",
    },
    {
      type: "number",
      placeholder: "availableStock",
      name: "availableStock",
      required: true,
      label: "Available Stock",
    },
    {
      type: "number",
      placeholder: "thresholdStock",
      name: "thresholdStock",
      required: false,
      label: "Threshold Stock",
    },

     {
      type: "textarea",
      placeholder: "description",
      name: "description",
      required: true,
      label: "Description",
    },
  ];