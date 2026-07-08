"use client";

import Button from "@/components/ui/btn";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <>
      <div className="w-full min-h-screen bg-bg-light flex items-center justify-center">
        <div className="w-150 flex gap-3">
          <Button
            variant="primary"
            className="w-50"
            onClick={() => router.push("/login")}
          >
            Login
          </Button>
          <Button
            variant="primary"
            className="w-50"
            onClick={() => router.push("/register")}
          >
            Register
          </Button>
        </div>
      </div>
    </>
  );
}
