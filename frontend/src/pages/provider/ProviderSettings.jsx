import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Camera,
  CheckCircle2,
  Key,
  Loader2,
  Lock,
  Plus,
  Save,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import ProviderLayout from "../../components/provider/ProviderLayout";
import { getErrorMessage, httpClient } from "../../lib/http";
import PasswordChecklist from "../../components/common/PasswordChecklist";
import { strongPassword } from "../../lib/passwordPolicy";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: strongPassword,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

const profileSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^03\d{9}$/.test(val.replace(/[-\s]/g, "")), {
      message: "Pakistani format e.g. 03XXXXXXXXX (11 digits)",
    }),
  bio: z.string().trim().max(500, "Bio cannot exceed 500 characters").optional(),
  experienceYears: z
    .number({ invalid_type_error: "Must be a number" })
    .min(0, "Cannot be negative")
    .max(60, "Cannot exceed 60")
    .optional(),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

export default function ProviderSettings() {
  const photoInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState("profile"); // profile | password

  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [serviceAreas, setServiceAreas] = useState([]);
  const [areaInput, setAreaInput] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await httpClient.get("/provider/profile");
      const p = res.data.provider;
      setProvider(p);

      setFirstName(p.firstName || "");
      setLastName(p.lastName || "");
      setPhone(p.phone || "");
      setBio(p.bio || "");
      setExperienceYears(
        p.experienceYears !== undefined && p.experienceYears !== null ? String(p.experienceYears) : ""
      );
      setCity(p.city || "");
      setAddress(p.address || "");
      setServiceAreas(Array.isArray(p.serviceAreas) ? p.serviceAreas : []);
      setProfilePhoto(p.profilePhoto || "");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Allowed image formats: JPG, PNG, WEBP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo size must be less than 5MB");
      return;
    }

    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append("photo", file);

      const res = await httpClient.post("/upload/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProfilePhoto(res.data.fileUrl);
      toast.success("Profile photo updated!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleAddArea = (e) => {
    e.preventDefault();
    const trimmed = areaInput.trim();
    if (!trimmed) return;
    if (serviceAreas.includes(trimmed)) return;
    if (serviceAreas.length >= 20) {
      toast.error("Maximum 20 service areas allowed");
      return;
    }
    setServiceAreas([...serviceAreas, trimmed]);
    setAreaInput("");
  };

  const handleRemoveArea = (idx) => {
    setServiceAreas(serviceAreas.filter((_, i) => i !== idx));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileErrors({});

    const normalizedPhone = phone ? phone.replace(/[-\s]/g, "") : "";
    const expNum = experienceYears !== "" ? Number(experienceYears) : undefined;

    const result = profileSchema.safeParse({
      firstName,
      lastName,
      phone: normalizedPhone,
      bio,
      experienceYears: expNum,
      city,
      address,
    });

    if (!result.success) {
      const errors = {};
      result.error.issues.forEach((i) => {
        errors[i.path[0]] = i.message;
      });
      setProfileErrors(errors);
      return;
    }

    try {
      setSavingProfile(true);
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normalizedPhone || undefined,
        bio: bio.trim(),
        experienceYears: expNum,
        city: city.trim(),
        address: address.trim(),
        serviceAreas,
        profilePhoto: profilePhoto || undefined,
      };

      const res = await httpClient.put("/provider/profile", payload);
      toast.success(res.data.message || "Profile updated successfully!");
      fetchProfile();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordErrors({});

    const result = passwordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!result.success) {
      const errors = {};
      result.error.issues.forEach((i) => {
        errors[i.path[0]] = i.message;
      });
      setPasswordErrors(errors);
      return;
    }

    try {
      setSavingPassword(true);
      const res = await httpClient.put("/provider/change-password", {
        currentPassword,
        newPassword,
      });
      toast.success(res.data.message || "Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <ProviderLayout title="Profile & Settings">
      {/* Navigation tabs */}
      <div className="mb-6 flex gap-2 border-b border-black/5 pb-2">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition ${
            activeTab === "profile"
              ? "bg-ink text-white"
              : "text-slate-600 hover:bg-soft hover:text-ink"
          }`}
        >
          <User className="h-4 w-4" /> Profile details
        </button>
        <button
          onClick={() => setActiveTab("password")}
          className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition ${
            activeTab === "password"
              ? "bg-ink text-white"
              : "text-slate-600 hover:bg-soft hover:text-ink"
          }`}
        >
          <Lock className="h-4 w-4" /> Change password
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl bg-white p-8 shadow-xs border border-black/5">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 w-full animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      ) : activeTab === "profile" ? (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          {/* Card: Photo & Name */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sm:p-8">
            <h3 className="text-base font-bold text-ink mb-1">Account & Public Profile</h3>
            <p className="text-xs text-slate-500 mb-6">
              Update your photo, name and contact details.
            </p>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center mb-6">
              <div className="relative group self-center sm:self-auto">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt=""
                    className="h-24 w-24 rounded-3xl object-cover border-2 border-black/10"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-pastel-yellow text-xl font-bold text-ink">
                    {provider?.firstName?.[0]}
                    {provider?.lastName?.[0]}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-5 w-5" />
                      <span className="text-[10px] font-bold mt-1">Change</span>
                    </>
                  )}
                </button>
              </div>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              <div className="flex-1 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input-field"
                  />
                  {profileErrors.firstName && (
                    <p className="mt-1 text-xs text-red-500">{profileErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input-field"
                  />
                  {profileErrors.lastName && (
                    <p className="mt-1 text-xs text-red-500">{profileErrors.lastName}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Email (read-only)
                </label>
                <input
                  type="text"
                  value={provider?.email || ""}
                  disabled
                  className="input-field bg-slate-50 text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03001234567"
                  className="input-field font-mono"
                />
                {profileErrors.phone && (
                  <p className="mt-1 text-xs text-red-500">{profileErrors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Card: Professional Details & Bio */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sm:p-8">
            <h3 className="text-base font-bold text-ink mb-1">Professional Experience</h3>
            <p className="text-xs text-slate-500 mb-6">
              Details customers see on your profile.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 mb-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Category (read-only)
                </label>
                <input
                  type="text"
                  value={provider?.serviceCategory || ""}
                  disabled
                  className="input-field bg-slate-50 text-slate-400 cursor-not-allowed uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className="input-field font-mono"
                />
                {profileErrors.experienceYears && (
                  <p className="mt-1 text-xs text-red-500">{profileErrors.experienceYears}</p>
                )}
              </div>


            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Bio
                </label>
                <span className="text-[11px] text-slate-400">{bio.length}/500</span>
              </div>
              <textarea
                rows={4}
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="input-field resize-none"
              />
              {profileErrors.bio && (
                <p className="mt-1 text-xs text-red-500">{profileErrors.bio}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mb-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {/* Service Areas */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Service Areas
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={areaInput}
                  onChange={(e) => setAreaInput(e.target.value)}
                  placeholder="e.g. DHA, Gulberg, Bahria Town"
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddArea}
                  className="btn-dark px-4 shrink-0"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {serviceAreas.map((area, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-full bg-soft px-3.5 py-1.5 text-xs font-semibold text-ink border border-black/5"
                  >
                    {area}
                    <button
                      type="button"
                      onClick={() => handleRemoveArea(idx)}
                      className="text-slate-400 hover:text-red-600 transition"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="btn-dark w-full sm:w-auto"
            >
              {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
              Save profile settings
            </button>
          </div>
        </form>
      ) : (
        /* Password Tab */
        <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 max-w-xl sm:p-8">
          <h3 className="text-base font-bold text-ink mb-1">Change Account Password</h3>
          <p className="text-xs text-slate-500 mb-6">
            Ensure your account is using a strong password of at least 6 characters.
          </p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Current Password *
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                autoFocus
              />
              {passwordErrors.currentPassword && (
                <p className="mt-1 text-xs text-red-500">{passwordErrors.currentPassword}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                New Password *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Strong password (see rules below)"
                className="input-field"
              />
              <PasswordChecklist password={newPassword} />
              {passwordErrors.newPassword && (
                <p className="mt-1 text-xs text-red-500">{passwordErrors.newPassword}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Confirm New Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="input-field"
              />
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{passwordErrors.confirmPassword}</p>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="btn-dark w-full sm:w-auto"
              >
                {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                Update password
              </button>
            </div>
          </form>
        </div>
      )}
    </ProviderLayout>
  );
}