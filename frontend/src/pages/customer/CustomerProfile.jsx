import React, { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { User, Lock, Upload, Save, CheckCircle2 } from "lucide-react";
import CustomerLayout from "../../components/customer/CustomerLayout";
import Spinner from "../../components/common/Spinner";
import PasswordChecklist from "../../components/common/PasswordChecklist";
import { strongPassword } from "../../lib/passwordPolicy";
import { httpClient, getErrorMessage } from "../../lib/http";
import { getUser, getToken, setAuth } from "../../lib/local-storage";

const nameRegex = /^[\p{L}][\p{L}\s.'-]*$/u;

const profileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be 50 characters or less")
    .regex(nameRegex, "First name can only contain letters"),
  lastName: z
    .string()
    .trim()
    .max(50, "Last name must be 50 characters or less")
    .refine((v) => v === "" || nameRegex.test(v), "Last name can only contain letters"),
  phone: z
    .string()
    .trim()
    .regex(/^(\+92|0)?3\d{9}$/, "Enter a valid Pakistani mobile number (e.g. 03001234567)")
    .or(z.literal("")),
  city: z.string().trim().max(60, "City must be 60 characters or less"),
  address: z.string().trim().max(200, "Address must be 200 characters or less"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: strongPassword,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

export default function CustomerProfile() {
  const [activeTab, setActiveTab] = useState("info"); // "info" | "security"
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    httpClient
      .get("/customer/profile")
      .then((res) => {
        if (res.data?.success) {
          const c = res.data.customer;
          setFirstName(c.firstName || "");
          setLastName(c.lastName || "");
          setEmail(c.email || "");
          setPhone(c.phone || "");
          setCity(c.city || "");
          setAddress(c.address || "");
          setProfilePhoto(c.profilePhoto || "");
        }
      })
      .catch((err) => {
        toast.error(getErrorMessage(err, "Failed to load customer profile"));
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB.");
      return;
    }

    setPhotoUploading(true);
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await httpClient.post("/upload/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success) {
        setProfilePhoto(res.data.url);
        toast.success("Profile photo uploaded!");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to upload photo"));
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    const result = profileSchema.safeParse({
      firstName,
      lastName,
      phone: phone.replace(/[\s-]/g, ""),
      city,
      address,
    });
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setSaving(true);
    try {
      const res = await httpClient.put("/customer/profile", {
        ...result.data,
        profilePhoto,
      });

      if (res.data?.success) {
        toast.success("Profile updated successfully!");
        const current = getUser();
        if (current) {
          setAuth(getToken(), {
            ...current,
            firstName: res.data.customer.firstName,
            lastName: res.data.customer.lastName,
            phone: res.data.customer.phone,
            profilePhoto: res.data.customer.profilePhoto,
          });
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const result = passwordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await httpClient.put("/customer/change-password", {
        currentPassword,
        newPassword,
      });
      if (res.data?.success) {
        toast.success("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to change password"));
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <CustomerLayout title="My Profile & Settings">
      <div className="space-y-6 max-w-3xl">
        {/* Navigation Tabs */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "info"
                ? "bg-[#111111] text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <User className="w-4 h-4" />
            Personal Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "security"
                ? "bg-[#111111] text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Lock className="w-4 h-4" />
            Security & Password
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : activeTab === "info" ? (
          /* Profile Details Form */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
            <form onSubmit={handleSaveInfo} className="space-y-6">
              {/* Photo Upload Section */}
              <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
                <div className="relative">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt="Profile"
                      className="w-20 h-20 rounded-2xl object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-pastel-mint flex items-center justify-center font-black text-ink text-2xl">
                      {firstName?.[0] || "U"}
                    </div>
                  )}

                  {photoUploading && (
                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                      <Spinner size="sm" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="btn-dark text-xs px-4 py-2 cursor-pointer inline-flex items-center gap-1.5 font-bold">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={photoUploading}
                    />
                  </label>
                  <p className="text-[11px] text-gray-400 mt-1">
                    JPG, PNG or WEBP, max 5MB.
                  </p>
                </div>
              </div>

              {/* Name fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-gray-400">
                    Email address cannot be modified.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 03001234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                </div>
              </div>

              {/* City & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lahore"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
                    Default Street Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. House 12, Street 4"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-dark text-xs px-6 py-2.5 font-bold flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving Changes..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Security & Password Form */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Strong password (see rules below)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                />
                <PasswordChecklist password={newPassword} />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="btn-dark text-xs px-6 py-2.5 font-bold flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {passwordSaving ? "Updating Password..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}