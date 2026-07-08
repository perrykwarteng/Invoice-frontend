"use client";

import { useEffect, useState } from "react";
import Button from "../ui/btn";
import CustomInput from "../ui/Input";
import { useUserStore } from "@/store/useUserStore";

export default function UserProfileTab() {
  const { user } = useUserStore();

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "staff",
    isActive: false,
  });

  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user.profilePic?.imageUrl ?? "",
  );

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name ?? "",
        email: user.email ?? "",
        role: user.role ?? "staff",
        isActive: user.isActive ?? false,
      });

      setAvatarPreview(user.profilePic?.imageUrl ?? "");
    }
  }, [user]);

  const [saving, setSaving] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setAvatar(file);

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);

    try {
      const data = new FormData();

      if (avatar) {
        data.append("profilePic", avatar);
      }
      console.log("Submitted:", {
        avatar,
      });
    } catch (err) {}
  };

  return (
    <div className="rounded-2xl border border-accent/30 bg-white p-5 sm:p-6">
      <h2 className="text-base font-semibold text-gray-900">User profile</h2>

      <p className="mt-1 text-sm text-gray-500">
        User information, role and account status.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full border bg-gray-100 flex items-center justify-center">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-gray-400 text-center">
                {form.name ? form.name.charAt(0).toUpperCase() : "No Image"}
              </span>
            )}
          </div>

          <div>
            <input
              type="file"
              id="avatar"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <Button type="button" variant="outline">
              <label htmlFor="avatar" className="cursor-pointer">
                Change photo
              </label>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CustomInput
            label="Full name"
            id="name"
            type="text"
            value={form.name}
            disabled
            placeholder="Name"
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
          />

          <CustomInput
            label="Email"
            id="email"
            type="email"
            value={form.email}
            disabled
            placeholder="Email"
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value,
              })
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">Role</label>

            <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="font-medium text-gray-800">
                {form.role === "super_admin" && "Super Admin"}
                {form.role === "org_admin" && "Organisation Admin"}
                {form.role === "staff" && "Staff"}
              </p>
              <p className="mt-1 text-xs text-gray-500">User access level</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Account Status
            </label>

            <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <span
                className={`inline-flex items-center rounded-full text-sm font-medium ${
                  form.isActive ? " text-green-700" : "text-red-700"
                }`}
              >
                {form.isActive ? "Active" : "Inactive"}
              </span>

              <p className="mt-1 text-xs text-gray-500">
                Account is Current Active
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
