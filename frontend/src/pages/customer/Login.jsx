import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import AuthLayout from "../../components/common/AuthLayout";
import PasswordInput from "../../components/common/PasswordInput";
import { getErrorMessage, httpClient } from "../../lib/http";
import { getDashboardPath, setAuth } from "../../lib/local-storage";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const { data } = await httpClient.post("/auth/login", {
        email: result.data.email.toLowerCase(),
        password: result.data.password,
      });

      setAuth(data.token, data.user);
      toast.success("Login successful");

      const from = location.state?.from?.pathname;
      navigate(from || getDashboardPath(data.user.role), { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Login to book or manage your services"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="font-bold text-ink hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            autoComplete="email"
            className="input-field"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Password</label>
          <PasswordInput
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
          />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-sm font-semibold hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </AuthLayout>
  );
}