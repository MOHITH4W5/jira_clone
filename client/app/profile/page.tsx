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
import { KeyRound, Mail, MailCheck, Power, Save } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

const page = () => {
  const { user, updateUser, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [emailChange, setEmailChange] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    group: "",
    phone: "",
    avatar: "",
    emailNotificationsEnabled: true,
  });

  useEffect(() => {
    if (!user) return;
    setFormData({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "USER",
      group: user.group || "",
      phone: user.phone || "",
      avatar: user.avatar || "",
      emailNotificationsEnabled: user.emailNotificationsEnabled ?? true,
    });
    setEmailChange(user.email || "");
  }, [user]);

  if (!user) {
    return <div className="p-6">User not found</div>;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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
        phone: formData.phone.trim(),
        avatar: formData.avatar,
        emailNotificationsEnabled: formData.emailNotificationsEnabled,
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

  const handleRequestEmailChange = async () => {
    if (!emailChange.trim()) {
      setError("Please enter a valid email.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await axiosInstance.post(`/api/users/${user.id}/request-email-change`, {
        newEmail: emailChange.trim(),
      });
      setSuccess(
        "Verification link sent to your new email. Confirm it to complete the change.",
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Failed to request email change. Please try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setError("Enter current and new password.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await axiosInstance.post(`/api/users/${user.id}/change-password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setSuccess("Password updated successfully.");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Failed to update password. Please try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm("Deactivate your account? You will not be able to log in.")) {
      return;
    }
    try {
      await axiosInstance.put(`/api/users/${user.id}/deactivate`);
      logout();
      window.location.href = "/login";
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Failed to deactivate account. Please try again.";
      setError(msg);
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

                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#172B4D]">
                    Phone
                  </label>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="focus-visible:ring-[#0052CC]"
                  />
                </div>

                <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
                  <input
                    type="checkbox"
                    name="emailNotificationsEnabled"
                    checked={formData.emailNotificationsEnabled}
                    onChange={handleInputChange}
                  />
                  Receive email notifications for assignments, reminders, and status
                  updates
                </label>

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
              <CardTitle className="text-[#172B4D]">Security</CardTitle>
              <CardDescription>
                Manage password, email verification, and account access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#172B4D]">
                  New Email (Requires Verification)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={emailChange}
                    onChange={(e) => setEmailChange(e.target.value)}
                    className="focus-visible:ring-[#0052CC]"
                  />
                  <Button
                    variant="outline"
                    onClick={handleRequestEmailChange}
                    disabled={saving}
                  >
                    <MailCheck className="mr-2 h-4 w-4" />
                    Send Link
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#172B4D]">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    className="focus-visible:ring-[#0052CC]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#172B4D]">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    className="focus-visible:ring-[#0052CC]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handlePasswordChange}
                  disabled={saving}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Update Password
                </Button>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={handleDeactivate}
                  disabled={saving}
                >
                  <Power className="mr-2 h-4 w-4" />
                  Deactivate Account
                </Button>
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
