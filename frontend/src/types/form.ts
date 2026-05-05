export type ProfileFormDataItem = {
  id: number;
  name: keyof ProfileFormDataType;
  text: string;
  label: string;
  type: string;
  required: boolean;
};

export type ProfileFormDataType = {
  name: string;
  email: string;
  password: string;
  username: string;
  phone: string;
  country: string;
};

export type LoginValueType = {
  email: string;
  password: string;
};

export type LoginFormDataItem = {
  id: number;
  name: keyof LoginValueType;
  text: string;
  label: string;
  type: string;
  required: boolean;
};

export type RegisterValueType = {
  email: string;
  password: string;
  name: string;
  username: string;
};

export type RegisterFormDataItem = {
  id: number;
  name: keyof RegisterValueType;
  text: string;
  label: string;
  type: string;
  required: boolean;
};

export type PasswordFormValueType = {
  password: string;
  confirmpassword: string;
};

export type ProfilePasswordDataItem = {
  id: number;
  name: keyof PasswordFormValueType;
  text: string;
  label: string;
  type: string;
  required: boolean;
};

export type ProductFormDataItem = {
  name: keyof ProductDataType;
  label: string;
  type: string;
  required: boolean;
  placeholder: string;
};

export type ProductColorOrSize = {
  name: string;
  value: string;
};

export type ProductDataType = {
  _id?: string;
  store?: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  category: string[];
  size: ProductColorOrSize[];
  colors: ProductColorOrSize[];
  availableStock: number;
  thresholdStock?: number;
  isArchive?: boolean;
};