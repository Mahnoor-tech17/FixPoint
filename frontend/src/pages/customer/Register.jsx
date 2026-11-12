import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import AuthLayout from "../../components/common/AuthLayout";
import PasswordInput from "../../components/common/PasswordInput";
import PasswordChecklist from "../../components/common/PasswordChecklist";
import { strongPassword } from "../../lib/passwordPolicy";
import { getErrorMessage, httpClient } from "../../lib/http";

const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, "First name is required"),
    lastName: z.string().trim().min(2, "Last name is required"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
    phone: z
      .string()
      .trim()
      .regex(/^(\+92|0)?3\d{9}$/, "Enter a valid Pakistani mobile number")
      .or(z.literal("")),
    password: strongPassword,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = registerSchema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    const { confirmPassword, ...payload } = result.data;
    payload.email = payload.email.toLowerCase();

    setLoading(true);
    try {
      const { data } = await httpClient.post("/auth/register", payload);
      toast.success(data.message);
      navigate(
        `/verify-email?userId=${data.userId}&email=${encodeURIComponent(payload.email)}`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Book trusted home services in a few taps"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-ink hover:underline">
            Login
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">First name</label>
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              className="input-field"
              autoComplete="given-name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Last name</label>
            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              className="input-field"
              autoComplete="family-name"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className="input-field"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">
            Phone <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="03001234567"
            className="input-field"
            autoComplete="tel"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Password</label>
          <PasswordInput
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
          />
          <PasswordChecklist password={form.password} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Confirm password</label>
          <PasswordInput
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm password"
            autoComplete="new-password"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </AuthLayout>
  );
}