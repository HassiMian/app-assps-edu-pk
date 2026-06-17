import { useState } from "react";
import { ShieldCheck, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import api from "../services/api";

export default function ForcePasswordChangePage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (form.newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await api.post("/api/auth/change-password", {
        newPassword: form.newPassword,
      });

      if (res.data && res.data.success) {
        // Update local session state to prevent route-guard redirection loop
        const savedUser = localStorage.getItem("al_siddique_user");
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            parsed.mustChangePassword = false;
            localStorage.setItem("al_siddique_user", JSON.stringify(parsed));
          } catch (e) {
            console.error("Failed to update cached user", e);
          }
        }
        
        window.location.href = "/dashboard";
      } else {
        setError(res.data?.message || "Password change failed");
      }
    } catch (err) {
      console.error("Change password error:", err);
      setError(err.response?.data?.message || "Server error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main 
      className="flex min-h-screen items-center justify-center px-6 py-20 text-white relative"
      style={{
        background: "linear-gradient(135deg, #071e34 0%, #0B2C4D 50%, #071e34 100%)",
        fontFamily: '"Aptos", "Avenir Next", "Segoe UI", sans-serif'
      }}
    >
      <div 
        className="absolute inset-0" 
        style={{
          background: "radial-gradient(circle at top, rgba(14, 165, 233, 0.15), transparent 45%)",
          pointerEvents: "none"
        }}
      />

      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/20"
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
        }}
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-300/10 text-cyan-400 ring-1 ring-cyan-300/20 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
          <ShieldCheck size={38} />
        </div>

        <h1 className="text-center text-3xl font-semibold tracking-tight">
          Change Your Password
        </h1>

        <p className="mt-3 text-center text-sm leading-6 text-slate-300">
          For security, please create a new password before entering your APEX
          dashboard.
        </p>

        {error && (
          <div className="mt-4 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-xs text-center">
            {error}
          </div>
        )}

        <div className="mt-8 space-y-5">
          <PasswordField
            label="New Password"
            value={form.newPassword}
            onChange={(v) => update("newPassword", v)}
            show={showPassword}
            toggle={() => setShowPassword((p) => !p)}
          />

          <PasswordField
            label="Confirm Password"
            value={form.confirmPassword}
            onChange={(v) => update("confirmPassword", v)}
            show={showPassword}
            toggle={() => setShowPassword((p) => !p)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-cyan-400 hover:bg-cyan-300 disabled:bg-cyan-500/40 text-slate-950 px-6 py-4 text-sm font-semibold transition-all duration-300 shadow-[0_4px_20px_rgba(34,211,238,0.3)] hover:shadow-[0_4px_25px_rgba(34,211,238,0.5)] cursor-pointer"
        >
          {loading ? "Updating..." : "Update Password"}
          {!loading && <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />}
        </button>
      </form>
    </main>
  );
}

function PasswordField({ label, value, onChange, show, toggle }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>

      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 focus-within:border-cyan-400 focus-within:bg-white/[0.05] transition-all">
        <Lock size={18} className="text-cyan-400" />

        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-white outline-none placeholder:text-slate-500 text-sm"
          placeholder="Enter password"
          required
        />

        <button type="button" onClick={toggle} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
