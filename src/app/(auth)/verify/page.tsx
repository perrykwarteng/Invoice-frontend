"use client";

import Button from "@/components/ui/btn";
import { verifyOtp } from "@/services/auth";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

export default function Verify() {
  const [otp, setOtp] = useState(Array(6).fill(""));
  const inputsRef = useRef<Array<HTMLInputElement>>([]);
  const [otpValue, setOtpValue] = useState("");
  const route = useRouter();

  const { mutate: VerifyOtp, isPending } = useMutation({
    mutationKey: ["Verify Otp"],
    mutationFn: verifyOtp,
    onSuccess: () => {
      toast.success("Verified OTP sucessfully");
      route.push("/login");
    },
  });

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    const joinOtp = newOtp.join("");
    setOtpValue(joinOtp);

    if (value && index <= 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: any, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const submitOtp = () => {
    if (otpValue.length < 5) {
      toast.error("6 digits required");
    }
    const userId = localStorage.getItem("userId");

    const userIdOtp = Number(userId);
    const numOtp = otpValue;

    VerifyOtp({ otp: numOtp, userId: userIdOtp });
  };

  return (
    <div className="w-full h-screen bg-bg-light flex flex-col items-center justify-center p-5">
      <div className="text-primary text-center">SwiftInvoice.</div>
      <div className="w-full md:w-[45%] bg-white p-6 rounded-2xl mt-7">
        <div className="text-center">
          <h3 className="text-3xl font-medium text-accent">Enter your code</h3>
          <p className="text-accent mt-1">
            We have send a 6 digit OTP to{" "}
            <span className="font-semibold">email@gmail.com</span>
          </p>
        </div>

        <div className="mt-5 flex justify-center">
          <div className="flex items-center gap-x-2">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el: HTMLInputElement) => {
                  inputsRef.current[i] = el;
                }}
                value={digit}
                maxLength={1}
                onChange={(e) => handleChange(e.target.value, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                className="w-10 h-10 md:w-12 md:h-12 text-center border-2 border-accent rounded-lg text-lg"
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-y-1.5 items-center justify-center mt-5">
          <div className="">
            <Button
              variant="primary"
              className="px-10"
              onClick={submitOtp}
              loading={isPending}
              disabled={isPending}
            >
              {isPending ? "Verifying OTP..." : "Verify OTP"}
            </Button>
          </div>
          <p className="cursor-pointer hover:underline transition-all duration-200">
            Reset Code
          </p>
        </div>
      </div>
    </div>
  );
}
