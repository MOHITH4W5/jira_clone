"use client";

import axiosInstance from "@/lib/Axiosinstance";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const VerifyEmailPage = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Verification token is missing.");
        return;
      }
      try {
        await axiosInstance.get(`/api/users/verify-email?token=${token}`);
        setStatus("success");
        setMessage("Email verified successfully. You can go back to the app.");
      } catch (error: any) {
        const apiMessage =
          error?.response?.data?.message || "Failed to verify email.";
        setStatus("error");
        setMessage(apiMessage);
      }
    };
    verify();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7] p-6">
      <div className="w-full max-w-lg rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-[#172B4D]">
          Email Verification
        </h1>
        <p
          className={`text-sm ${
            status === "error"
              ? "text-red-600"
              : status === "success"
                ? "text-green-700"
                : "text-[#5E6C84]"
          }`}
        >
          {message}
        </p>
      </div>
    </div>
  );
};

export default VerifyEmailPage;

