"use client";

import Button from "@/components/ui/btn";
import CustomInput from "@/components/ui/Input";
import Image from "next/image";
import Link from "next/link";
import AuthImage from "@/assets/images/authImage.jpg";

export default function ForgotPassword() {
  return (
    <div className="w-full max-h-screen bg-bg-light flex flex-col md:flex-row p-5">
      <div className="md:flex-2/4">
        <div className="">SwiftInvoice.</div>
        <div className="min-h-155 flex items-center justify-center">
          <div className="w-full md:w-[80%] lg:w-[60%]">
            <h3 className="text-3xl font-semibold text-secondary font-Saira">
              Forgot Password
            </h3>
            <p className="text-gray-500 text-sm mt-2">
              The verification code will be sent to your email
            </p>
            <form className="mt-5">
              <div className="my-2">
                <CustomInput
                  type="text"
                  label="Email"
                  id="email"
                  placeholder="mark@gmail.com"
                  onChange={() => {}}
                />
              </div>

              <Link
                href={"/login"}
                className="text-sm text-accent hover:underline hover:text-primary transition-all duration-75 cursor-pointer"
              >
                Back to Login
              </Link>

              <div className="mt-8">
                <Button variant="primary">Verify Email</Button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="hidden md:block md:flex-2/4">
        <div className="bg-bg-muted w-full min-h-[60vh] sm:min-h-[70vh] md:min-h-[80vh] lg:h-[95vh] rounded-2xl sm:rounded-3xl relative overflow-hidden">
          <Image
            src={AuthImage}
            alt="Authentication Image"
            fill
            priority
            className="object-cover"
          />

          <div className="absolute inset-0 bg-linear-to-t from-accent/70 via-accent/30 to-transparent z-10" />
        </div>
      </div>
    </div>
  );
}
