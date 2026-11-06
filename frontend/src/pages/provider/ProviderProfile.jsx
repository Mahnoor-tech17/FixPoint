import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import ProviderLayout from "../../components/provider/ProviderLayout";
import { getErrorMessage, httpClient } from "../../lib/http";

const profileSchema = z.object({
  bio: z.string().trim().max(500, "Bio cannot exceed 500 characters").optional(),
  experienceYears: z
    .number({ invalid_type_error: "Must be a valid number" })
    .min(0, "Experience cannot be negative")
    .max(60, "Experience cannot exceed 60 years")
    .optional(),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
  cnic: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^\d{5}-?\d{7}-?\d$/.test(val), {
      message: "Enter a valid 13-digit CNIC (e.g. 35201-1234567-1 or 3520112345671)",
    }),
});

export default function ProviderProfile() {
  const navigate = useNavigate();
  const photoInputRef = useRef(null);
  const docInputRef = useRef(null);

  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [profilePhoto, setProfilePhoto] = useState("");
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [serviceAreas, setServiceAreas] = useState([]);
  const [areaInput, setAreaInput] = useState("");
  const [cnic, setCnic] = useState("");
  const [verificationDocs, setVerificationDocs] = useState([]);

  // Uploading flags
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadDocType, setUploadDocType] = useState("certificate");

  // Submission states
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await httpClient.get("/provider/profile");
      const p = res.data.provider;
      setProvider(p);

      setProfilePhoto(p.profilePhoto || "");
      setBio(p.bio || "");
      setExperienceYears(p.experienceYears !== undefined && p.experienceYears !== null ? String(p.experienceYears) : "");
      setCity(p.city || "");
      setAddress(p.address || "");
      setServiceAreas(Array.isArray(p.serviceAreas) ? p.serviceAreas : []);
      setCnic(p.cnic || "");
      setVerificationDocs(Array.isArray(p.verificationDocs) ? p.verificationDocs : []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAddArea = (e) => {
    e.preventDefault();
    const trimmed = areaInput.trim();
    if (!trimmed) return;
    if (serviceAreas.includes(trimmed)) {
      toast.error("Area already added");
      return;
    }
    if (serviceAreas.length >= 20) {
      toast.error("Maximum 20 service areas allowed");
      return;
    }
    setServiceAreas([...serviceAreas, trimmed]);
    setAreaInput("");
  };

  const handleRemoveArea = (indexToRemove) => {
    setServiceAreas(serviceAreas.filter((_, idx) => idx !== indexToRemove));
  };

  // Upload Photo
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG and WEBP image formats are supported");
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
      toast.success("Profile photo uploaded!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  // Upload Document (CNIC or Certificate)
  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Allowed formats: PDF, JPG, PNG, WEBP");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Document size must be less than 10MB");
      return;
    }

    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append("document", file);

      const res = await httpClient.post("/upload/document", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newDoc = {
        docType: uploadDocType,
        url: res.data.fileUrl,
        name: file.name,
      };

      setVerificationDocs((prev) => [...prev, newDoc]);
      toast.success(`${uploadDocType.toUpperCase()} uploaded successfully!`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const handleRemoveDoc = (indexToRemove) => {
    setVerificationDocs(verificationDocs.filter((_, idx) => idx !== indexToRemove));
  };

  // Save Draft (PUT /provider/profile)
  const handleSaveDraft = async () => {
    setFieldErrors({});
    const expNum = experienceYears !== "" ? Number(experienceYears) : undefined;

    const result = profileSchema.safeParse({
      bio,
      experienceYears: expNum,
      city,
      address,
      cnic,
    });

    if (!result.success) {
      const errors = {};
      result.error.issues.forEach((i) => {
        errors[i.path[0]] = i.message;
      });
      setFieldErrors(errors);
      toast.error("Please fix form errors before saving.");
      return;
    }

    try {
      setSavingDraft(true);
      const payload = {
        bio: bio.trim(),
        experienceYears: expNum,
        city: city.trim(),
        address: address.trim(),
        serviceAreas,
        profilePhoto: profilePhoto || undefined,
        cnic: cnic ? cnic.trim() : undefined,
        verificationDocs,
      };

      const res = await httpClient.put("/provider/profile", payload);
      toast.success(res.data.message || "Draft saved successfully!");
      fetchProfile();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingDraft(false);
    }
  };

  // Submit for Verification (save then POST /provider/profile/submit)
  const handleSubmitForVerification = async () => {
    setFieldErrors({});

    // Validate required fields before submission
    const errors = {};
    if (!profilePhoto) errors.profilePhoto = "Profile photo is required";
    if (!bio.trim()) errors.bio = "Bio is required";
    if (experienceYears === "") errors.experienceYears = "Experience is required";
    if (!city.trim()) errors.city = "City is required";
    if (!serviceAreas.length) errors.serviceAreas = "At least one service area is required";
    if (!cnic.trim()) errors.cnic = "CNIC number is required";

    const hasCnicDoc = verificationDocs.some((d) => d.docType === "cnic");
    if (!hasCnicDoc) errors.cnicDoc = "Please upload a CNIC document";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please complete all required fields before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      // 1. Save profile first
      const expNum = Number(experienceYears);
      await httpClient.put("/provider/profile", {
        bio: bio.trim(),
        experienceYears: expNum,
        city: city.trim(),
        address: address.trim(),
        serviceAreas,
        profilePhoto,
        cnic: cnic.trim(),
        verificationDocs,
      });

      // 2. Submit for verification
      const res = await httpClient.post("/provider/profile/submit");
      toast.success(res.data.message || "Profile submitted for verification!");
      navigate("/provider/verification");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = provider?.providerStatus === "pending_verification";
  const isApproved = provider?.providerStatus === "approved";

  if (loading) {
    return (
      <ProviderLayout title="Profile">
        <div className="rounded-3xl bg-white p-8 shadow-xs border border-black/5">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout title="Complete Profile">
      {/* Status banner */}
      {isPending && (
        <div className="mb-6 flex items-start gap-3 rounded-3xl bg-pastel-blue p-6 border border-blue-200">
          <AlertCircle className="h-5 w-5 text-blue-900 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-950">
            <p className="font-bold">Your profile is currently under review</p>
            <p className="mt-1 text-blue-800">
              Admin is verifying your details and uploaded documents. Editing is locked until verification is complete.
            </p>
          </div>
        </div>
      )}

      {provider?.rejectionReason && provider?.providerStatus === "rejected" && (
        <div className="mb-6 flex items-start gap-3 rounded-3xl bg-pastel-pink p-6 border border-rose-200">
          <AlertCircle className="h-5 w-5 text-rose-900 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-950">
            <p className="font-bold">Verification changes required</p>
            <p className="mt-1 text-rose-900">
              <b>Reason from admin:</b> {provider.rejectionReason}
            </p>
            <p className="mt-1 text-xs text-rose-800">
              Please update your profile or documents below and submit again.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Section 1: Profile Photo & Basic Info */}
        <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sm:p-8">
          <h3 className="text-lg font-bold text-ink mb-1">Personal & Professional Info</h3>
          <p className="text-xs text-slate-500 mb-6">
            Introduce yourself to customers and FixPoint administrators.
          </p>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start mb-6">
            {/* Photo Avatar with upload trigger */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative group">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt=""
                    className="h-28 w-28 rounded-3xl object-cover border-2 border-black/10"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-pastel-yellow text-2xl font-bold text-ink">
                    {provider?.firstName?.[0]}
                    {provider?.lastName?.[0]}
                  </div>
                )}

                {!isPending && (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <Camera className="h-6 w-6" />
                        <span className="text-[10px] font-bold mt-1">Upload</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              {!isPending && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="text-xs font-bold text-ink underline"
                >
                  {uploadingPhoto ? "Uploading..." : profilePhoto ? "Change photo" : "Upload photo *"}
                </button>
              )}
              {fieldErrors.profilePhoto && (
                <p className="text-xs text-red-500">{fieldErrors.profilePhoto}</p>
              )}
            </div>

            {/* Readonly info */}
            <div className="flex-1 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={`${provider?.firstName || ""} ${provider?.lastName || ""}`}
                  disabled
                  className="input-field bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Email
                </label>
                <input
                  type="text"
                  value={provider?.email || ""}
                  disabled
                  className="input-field bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Service Category
                </label>
                <input
                  type="text"
                  value={provider?.serviceCategory || ""}
                  disabled
                  className="input-field bg-slate-50 text-slate-500 cursor-not-allowed uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Experience (Years) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  disabled={isPending}
                  placeholder="e.g. 5"
                  className="input-field font-mono"
                />
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Professional Bio *
              </label>
              <span className="text-[11px] text-slate-400">{bio.length}/500</span>
            </div>
            <textarea
              rows={4}
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={isPending}
              placeholder="Tell customers about your craftsmanship, tools, background, and work experience..."
              className="input-field resize-none"
            />
            {fieldErrors.bio && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.bio}</p>
            )}
          </div>
        </div>

        {/* Section 2: Location & Service Areas */}
        <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sm:p-8">
          <h3 className="text-lg font-bold text-ink mb-1">Location & Service Areas</h3>
          <p className="text-xs text-slate-500 mb-6">
            Specify where you operate so local customers can find your services.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 mb-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                City *
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={isPending}
                placeholder="e.g. Lahore, Karachi, Islamabad"
                className="input-field"
              />
              {fieldErrors.city && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.city}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Workshop / Base Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isPending}
                placeholder="e.g. Main Market, Gulberg III"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Service Areas / Neighborhoods *
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Add specific towns, sectors, or societies where you can travel to provide service.
            </p>

            {!isPending && (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={areaInput}
                  onChange={(e) => setAreaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddArea(e);
                    }
                  }}
                  placeholder="e.g. DHA Phase 5, Model Town, Johar Town"
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
            )}

            <div className="flex flex-wrap gap-2">
              {serviceAreas.map((area, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-full bg-soft px-3.5 py-1.5 text-xs font-semibold text-ink border border-black/5"
                >
                  {area}
                  {!isPending && (
                    <button
                      type="button"
                      onClick={() => handleRemoveArea(idx)}
                      className="text-slate-400 hover:text-red-600 transition"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              ))}
              {serviceAreas.length === 0 && (
                <p className="text-xs text-slate-400 italic">No service areas added yet.</p>
              )}
            </div>
            {fieldErrors.serviceAreas && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.serviceAreas}</p>
            )}
          </div>
        </div>

        {/* Section 3: Verification Documents & CNIC */}
        <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sm:p-8">
          <h3 className="text-lg font-bold text-ink mb-1">CNIC & Verification Documents</h3>
          <p className="text-xs text-slate-500 mb-6">
            FixPoint requires a verified CNIC and supporting certifications before any provider can accept bookings.
          </p>

          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              CNIC Number *
            </label>
            <input
              type="text"
              value={cnic}
              onChange={(e) => setCnic(e.target.value)}
              disabled={isPending || isApproved}
              placeholder="35201-1234567-1"
              className="input-field font-mono max-w-md"
            />
            {fieldErrors.cnic && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.cnic}</p>
            )}
            {isApproved && (
              <p className="mt-1 text-xs text-slate-400">
                CNIC cannot be changed after approval. Contact support if needed.
              </p>
            )}
          </div>

          {/* Upload buttons */}
          {!isPending && !isApproved && (
            <div className="mb-6 rounded-2xl bg-soft/50 p-4 border border-black/5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                Upload New Document
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold outline-none"
                >
                  <option value="cnic">CNIC Front & Back (PDF / Image)</option>
                  <option value="certificate">Trade Certificate / Diploma</option>
                  <option value="other">Other supporting doc</option>
                </select>

                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={handleDocUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  disabled={uploadingDoc}
                  className="btn-dark py-2 px-4 text-xs"
                >
                  {uploadingDoc ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploadingDoc ? "Uploading..." : "Select File"}
                </button>
              </div>
              {fieldErrors.cnicDoc && (
                <p className="mt-2 text-xs text-red-500">{fieldErrors.cnicDoc}</p>
              )}
            </div>
          )}

          {/* Uploaded Documents List */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
              Uploaded Documents ({verificationDocs.length})
            </span>
            {verificationDocs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No documents uploaded yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {verificationDocs.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-3.5 shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pastel-blue text-blue-900">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-ink truncate">
                          {doc.name || `${doc.docType.toUpperCase()} Document`}
                        </p>
                        <span className="inline-block rounded-md bg-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                          {doc.docType}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full p-1.5 text-slate-500 hover:bg-soft hover:text-ink transition"
                        title="View file"
                      >
                        <Upload className="h-4 w-4 rotate-45" />
                      </a>
                      {!isPending && !isApproved && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(idx)}
                          className="rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                          title="Remove document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        {!isPending && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || submitting}
              className="btn-light w-full sm:w-auto"
            >
              {savingDraft && <Loader2 className="h-4 w-4 animate-spin" />}
              Save draft
            </button>
            <button
              type="button"
              onClick={handleSubmitForVerification}
              disabled={savingDraft || submitting}
              className="btn-primary w-full sm:w-auto"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit for verification
            </button>
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}
