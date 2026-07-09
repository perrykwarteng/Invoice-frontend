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
  otp?: string;
  userId?: number;
  type?: string;
};

type resetPasswordType = {
  email: string;
  newPassword?: string;
};

export const verifyOtp = async ({ otp, userId, type }: optType) => {
  const res = await api.post("/auth/verifyOtp", { otp, userId, type });

  return res.data;
};

export const resendOtp = async ({ userId, type }: optType) => {
  const res = await api.post("/auth/resendOtp", { userId, type });

  return res.data;
};

export const forgetPassword = async (email: string) => {
  const res = await api.post("/auth/forgetPassword", { email });

  return res.data;
};

export const resetPassword = async ({
  email,
  newPassword,
}: resetPasswordType) => {
  const res = await api.post("/auth/resetPassword", { email, newPassword });

  return res.data;
};
