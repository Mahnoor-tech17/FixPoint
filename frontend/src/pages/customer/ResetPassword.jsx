import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import AuthLayout from "../../components/common/AuthLayout";
import PasswordInput from "../../components/common/PasswordInput";
import PasswordChecklist from "../../components/common/PasswordChecklist";
import { strongPassword } from "../../lib/passwordPolicy";
import { getErrorMessage, httpClient } from "../../lib/http";

const resetSchema = z
  .object({
    password: strongPassword,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error("Reset link is invalid");
      return;
    }
    const result = resetSchema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const { data } = await httpClient.put("/auth/reset-password", {
        token,
        password: form.password,
      });
      toast.success(data.message);
      navigate("/login");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password you haven't used before."
      footer={
        <Link to="/login" className="font-bold text-ink hover:underline">
          Back to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">New password</label>
          <PasswordInput
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="New password"
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
          {loading ? "Saving..." : "Reset password"}
        </button>
      </form>
    </AuthLayout>
  );
}