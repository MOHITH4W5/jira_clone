"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";
import { AlertCircle, ArrowRight, Car, FolderKanban } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const page = () => {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    setError("");
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        const res = await axiosInstance.post("/api/users/signup", {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: "USER",
          avatar: "https://i.pravatar.cc/150?u=john",
        });
        const user = res.data;
        login(user);
        router.push("/setup-project");
      } else {
        const res = await axiosInstance.post("/api/users/login", {
          email: formData.email,
          password: formData.password,
        });
        const user = res.data;
        login(user);
        router.push("/");
      }
    } catch (error: any) {
      setError(error.response?.data?.message);
      console.log(error);
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7] p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-[#0052CC] text-white">
            <FolderKanban className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172B4D]">
            {isSignUp ? "Create your account" : "Log in to your account"}
          </h1>
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">
              {isSignUp ? "Get started" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? "Create an account to start managing your projects"
                : "Enter your credentials to access your Jira projects"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex gap-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {isSignUp && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-[#6B778C]">
                    Full name
                  </label>
                  <Input
                    type="text"
                    name="name"
                    placeholder="John Doe"
                    required={isSignUp}
                    className="h-10 border-[#DFE1E6] focus-visible:ring-[#0052CC]"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-[#6B778C]">
                  Email address
                </label>
                <Input
                  type="email"
                  name="email"
                  placeholder="name@company.com"
                  required
                  className="h-10 border-[#DFE1E6] focus-visible:ring-[#0052CC]"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-[#6B778C]">
                  Password
                </label>
                <Input
                  type="password"
                  name="password"
                  placeholder={
                    isSignUp ? "At least 6 characters" : "Your password"
                  }
                  required
                  className="h-10 border-[#DFE1E6] focus-visible:ring-[#0052CC]"
                  value={formData.password}
                  onChange={handleChange}
                />
                {isSignUp && (
                  <p className="text-xs text-[#6B778C]">
                    Password must be at least 6 characters
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0052CC] text-white hover:bg-[#0747A6]"
              >
                {isLoading ? "Processing..." : isSignUp ? "Sign up" : "Log in"}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-[#6B778C]">
              {isSignUp
                ? "Already have an account? "
                : "Don't have an account? "}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                  setFormData({ name: "", email: "", password: "" });
                }}
                className="text-[#0052CC] hover:underline font-semibold"
              >
                {isSignUp ? "Log in" : "Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-6 text-xs text-[#6B778C]">
          <span>Privacy Policy</span>
          <span>User Agreement</span>
        </div>
      </div>
    </div>
  );
};

export default page;
