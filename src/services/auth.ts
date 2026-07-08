import { api } from "@/lib/axois";
import { LoginResponse } from "@/types/types";
import { LoginData, RegisterData } from "@/utils/Zod";

export const onRegister = async (data: RegisterData) => {
  const res = await api.post("/auth/register", data);

  return res.data;
};

export const onLogin = async (data: LoginData): Promise<LoginResponse> => {
  const res = await api.post("/auth/login", data);

  return res.data;
};

export const onLogout = async () => {
  const res = await api.post("/auth/logout");

  return res.data;
};

type optType = {
  otp: string;
  userId: number;
};

export const verifyOtp = async ({ otp, userId }: optType) => {
  const res = await api.post("/auth/verifyOtp", { otp, userId });
  console.log(res.data);

  return res.data;
};
