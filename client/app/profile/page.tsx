"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { Mail, Save } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

const page = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    group: "",
    avatar: "",
  });

  useEffect(() => {
    if (!user) return;
    setFormData({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "USER",
      group: user.group || "",
      avatar: user.avatar || "",
    });
  }, [user]);

  if (!user) {
    return <div className="p-6">User not found</div>;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
    setSuccess("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        avatar: String(reader.result || ""),
      }));
      setError("");
      setSuccess("");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError("Name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const res = await axiosInstance.put(`/api/users/${user.id}`, {
        name: formData.name.trim(),
        group: formData.group.trim(),
        avatar: formData.avatar,
      });

      const updatedUser = {
        ...user,
        ...res.data,
        email: user.email,
        role: user.role,
      };
      updateUser(updatedUser);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      console.error(err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString();
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "Never";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Never";
    return date.toLocaleString();
  };

  return (
    <div className="flex h-full flex-col overflow-auto bg-[#F4F5F7] p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-[#172B4D]">
          Profile Settings
        </h1>
        <p className="text-[#5E6C84]">
          Manage your personal information and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-[#172B4D]">About You</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <Avatar className="mb-4 h-20 w-20">
                  <AvatarImage src={formData.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{formData.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold text-[#172B4D]">
                  {formData.name}
                </h2>
                <Badge className="mt-2">{formData.role || "USER"}</Badge>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-[#5E6C84]" />
                  <span className="text-[#172B4D]">{formData.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[#5E6C84]">Group:</span>
                  <Badge variant="outline">{formData.group || "-"}</Badge>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                className="w-full bg-[#0052CC] text-white hover:bg-[#0747A6]"
                onClick={() => fileInputRef.current?.click()}
              >
                Edit Profile Picture
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#172B4D]">
                Personal Information
              </CardTitle>
              <CardDescription>Update your contact details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {error && <p className="text-sm text-red-600">{error}</p>}
                {success && <p className="text-sm text-green-600">{success}</p>}

                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#172B4D]">
                    Full Name
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="focus-visible:ring-[#0052CC]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#172B4D]">
                    Email
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    readOnly
                    className="focus-visible:ring-[#0052CC]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#172B4D]">
                      Role
                    </label>
                    <Input
                      disabled
                      value={formData.role}
                      className="focus-visible:ring-[#0052CC]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#172B4D]">
                      Team
                    </label>
                    <Input
                      name="group"
                      value={formData.group}
                      onChange={handleInputChange}
                      className="focus-visible:ring-[#0052CC]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    className="bg-[#0052CC] text-white hover:bg-[#0747A6]"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#172B4D]">Activity</CardTitle>
              <CardDescription>
                Your account activity information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#5E6C84]">Account Created</span>
                  <span className="font-semibold text-[#172B4D]">
                    {formatDate(user?.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-3 text-sm">
                  <span className="text-[#5E6C84]">Last Login</span>
                  <span className="font-semibold text-[#172B4D]">
                    {formatDateTime(user?.lastLoginAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default page;
