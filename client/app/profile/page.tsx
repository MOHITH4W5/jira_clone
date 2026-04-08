"use client"
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
import { Mail, Save } from "lucide-react";
import React from "react";

const page = () => {
  const {user}=useAuth()
  // const user = {
  //   id: "user-1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   role: "ADMIN",
  //   group: "Engineering",
  //   avatar: "https://i.pravatar.cc/150?u=john",
  //   createdAt: new Date().toISOString(),
  // };
  if (!user) {
    return <div className="p-6">User not found</div>;
  }
  return (
    <div className="flex h-full flex-col p-6 overflow-auto bg-[#F4F5F7]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#172B4D] mb-2">
          Profile Settings
        </h1>
        <p className="text-[#5E6C84]">
          Manage your personal information and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-[#172B4D]">About You</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarImage src={user.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold text-[#172B4D]">
                  {user.name}
                </h2>
                <Badge className="mt-2">{user.role}</Badge>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-[#5E6C84]" />
                  <span className="text-[#172B4D]">{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[#5E6C84]">Group:</span>
                  <Badge variant="outline">{user?.group}</Badge>
                </div>
              </div>

              <Button className="w-full bg-[#0052CC] text-white hover:bg-[#0747A6]">
                Edit Profile Picture
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#172B4D]">
                Personal Information
              </CardTitle>
              <CardDescription>Update your contact details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-[#172B4D] mb-1 block">
                    Full Name
                  </label>
                  <Input
                    defaultValue={user.name}
                    className="focus-visible:ring-[#0052CC]"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[#172B4D] mb-1 block">
                    Email
                  </label>
                  <Input
                    type="email"
                    defaultValue={user.email}
                    className="focus-visible:ring-[#0052CC]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-[#172B4D] mb-1 block">
                      Role
                    </label>
                    <Input
                      disabled
                      defaultValue={user.role}
                      className="focus-visible:ring-[#0052CC]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#172B4D] mb-1 block">
                      Team
                    </label>
                    <Input
                      disabled
                      defaultValue={user?.group}
                      className="focus-visible:ring-[#0052CC]"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button className="bg-[#0052CC] text-white hover:bg-[#0747A6]">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Information */}
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
                  <span className="text-[#172B4D] font-semibold">
                    {new Date(user?.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="text-[#5E6C84]">Last Login</span>
                  <span className="text-[#172B4D] font-semibold">
                    Today at 2:45 PM
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
