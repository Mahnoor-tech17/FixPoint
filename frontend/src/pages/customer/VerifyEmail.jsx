import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AuthLayout from "../../components/common/AuthLayout";
import { getErrorMessage, httpClient } from "../../lib/http";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const userId = params.get("userId");
  const email = params.get("email");

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userId && !email) {
      toast.error("Verification parameters missing. Please register again.");
      return;
    }
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const { data } = await httpClient.post("/auth/verify-email", {
        userId: userId || undefined,
        code,
      });
      toast.success(data.message);
      navigate("/login");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0 || resending) return;

    if (!userId && !email) {
      toast.error("User identification missing. Please register again.");
      return;
    }

    try {
      setResending(true);
      const { data } = await httpClient.post("/auth/resend-code", {
        userId: userId || undefined,
        email: email || undefined,
      });
      toast.success(data.message || "A new code has been sent!");
      setCooldown(60);
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      toast.error(errorMsg);
      if (error.response?.data?.secondsRemaining) {
        setCooldown(error.response.data.secondsRemaining);
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={
        email
          ? `We sent a 6-digit code to ${email}. It expires in 15 minutes.`
          : "Enter the 6-digit code sent to your email."
      }
      footer={
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resending || cooldown > 0}
            className="text-xs font-semibold text-slate-600 hover:text-ink disabled:opacity-50 transition"
          >
            {resending
              ? "Sending code..."
              : cooldown > 0
              ? `Resend code in ${cooldown}s`
              : "Didn't receive the code? Resend code"}
          </button>
          <Link to="/login" className="font-bold text-ink hover:underline text-sm">
            Back to login
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          placeholder="------"
          className="input-field text-center text-2xl tracking-[0.5em]"
          autoFocus
        />
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Verifying..." : "Verify email"}
        </button>
      </form>
    </AuthLayout>
  );
}
