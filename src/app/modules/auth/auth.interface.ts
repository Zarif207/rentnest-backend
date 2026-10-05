export type TRegisterUser = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: "TENANT" | "LANDLORD";
};

export type TLoginUser = {
  email: string;
  password: string;
};