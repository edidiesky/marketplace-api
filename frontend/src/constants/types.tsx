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


// -------- Login form Data Type Start ----------------------
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
// -------- Login form Data Type End ----------------------

// -------- Register form Data Type Start ----------------------
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
// -------- Login form Data Type End ----------------------


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
  name: keyof productDataType;
  label: string;
  type: string;
  required: boolean;
  placeholder:string;
};

export type productDataType = {
  _id?:string;
  store?:string;
  name:string;
  price: number;
  description: string;
  images: string[];
  category: string[];
  size: {name:string, value:string}[];
  colors: {name:string, value:string}[];
  availableStock: number;
  thresholdStock?:number;
  isArchive?:boolean;
  
};
