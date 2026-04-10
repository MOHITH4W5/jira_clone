"use client";

import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
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
import { AlertCircle, ArrowRight, FolderKanban } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useRef, useState } from "react";
import axios from "axios";
import ReCAPTCHA from "react-google-recaptcha";

const page = () => {
  const router = useRouter();
  const { login } = useAuth();
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState("");

  const resetCaptcha = () => {
    recaptchaRef.current?.reset();
    setRecaptchaToken("");
  };

  const requireCaptchaToken = () => {
    if (!recaptchaSiteKey) {
      return "";
    }
    if (!recaptchaToken) {
      setError("Please complete the reCAPTCHA verification.");
      return null;
    }
    return recaptchaToken;
  };

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
    setIsLoading(true);
    setError("");

    try {
      const captcha = requireCaptchaToken();
      if (captcha === null) {
        setIsLoading(false);
        return;
      }

      if (isSignUp) {
        const res = await axiosInstance.post("/api/users/public-signup", {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: "USER",
          avatar: `https://i.pravatar.cc/150?u=${formData.email || "new-user"}`,
          recaptchaToken: captcha,
        });
        login(res.data);
        router.push("/setup-project");
      } else {
        const res = await axiosInstance.post("/api/users/public-login", {
          email: formData.email,
          password: formData.password,
          recaptchaToken: captcha,
        });
        login(res.data);
        router.push("/");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const responseData = err.response?.data;
        const message =
          typeof responseData === "string"
            ? responseData
            : responseData?.message ||
              err.message ||
              "Request failed. Please try again.";
        setError(message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      resetCaptcha();
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setError("");
      setIsLoading(true);

      const captcha = requireCaptchaToken();
      if (captcha === null) {
        setIsLoading(false);
        return;
      }

      const idToken = credentialResponse.credential;
      if (!idToken) {
        setError("Google login failed: missing credential.");
        return;
      }

      const res = await axiosInstance.post("/api/users/google-login", {
        idToken,
        recaptchaToken: captcha,
      });
      login(res.data);
      router.push("/");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const responseData = err.response?.data;
        const message =
          typeof responseData === "string"
            ? responseData
            : responseData?.message ||
              err.message ||
              "Google login failed.";
        setError(message);
      } else {
        setError("Google login failed.");
      }
    } finally {
      resetCaptcha();
      setIsLoading(false);
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
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
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
                  placeholder={isSignUp ? "At least 8 chars with symbols" : "Your password"}
                  required
                  className="h-10 border-[#DFE1E6] focus-visible:ring-[#0052CC]"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              {recaptchaSiteKey ? (
                <div className="pt-1">
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={recaptchaSiteKey}
                    onChange={(token) => setRecaptchaToken(token || "")}
                  />
                </div>
              ) : (
                <p className="text-xs text-[#6B778C]">
                  reCAPTCHA site key not configured. Set `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`.
                </p>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0052CC] text-white hover:bg-[#0747A6]"
              >
                {isLoading ? "Processing..." : isSignUp ? "Sign up" : "Log in"}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            {googleClientId ? (
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-[#6B778C]">or continue with</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError("Google login failed.")}
                    text={isSignUp ? "signup_with" : "signin_with"}
                    shape="pill"
                  />
                </div>
              </div>
            ) : (
              <p className="mt-4 text-center text-xs text-[#6B778C]">
                Google login not configured. Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
              </p>
            )}

            <div className="mt-6 text-center text-sm text-[#6B778C]">
              {isSignUp
                ? "Already have an account? "
                : "Don't have an account? "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                  setFormData({ name: "", email: "", password: "" });
                  resetCaptcha();
                }}
                className="font-semibold text-[#0052CC] hover:underline"
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

