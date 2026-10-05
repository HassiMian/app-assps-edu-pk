import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Moon, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useTenantBranding } from "../context/TenantBrandingContext";
import { normalizeAppRole } from "../utils/role";

export default function LoginPage() {
  const { login } = useAuth();
  const { theme, setTheme } = useTheme();
  const branding = useTenantBranding();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isLight = theme === "light";
  const schoolName = branding?.schoolName || "AL SIDDIQUE SCHOLARS PUBLIC SCHOOL";
  const logoUrl = branding?.logoUrl || "/school-logo.svg";
  const palette = isLight
    ? {
        page: "linear-gradient(145deg, #f8fbff 0%, #eef5fb 55%, #f8fafc 100%)",
        glowA: "rgba(14, 116, 144, 0.10)",
        glowB: "rgba(200, 153, 26, 0.10)",
        card: "rgba(255,255,255,0.90)",
        border: "rgba(15,35,64,0.12)",
        title: "#0f2340",
        text: "#314155",
        muted: "#66768a",
        input: "#ffffff",
        inputBorder: "rgba(15,35,64,0.16)",
        shadow: "0 24px 70px rgba(15,35,64,0.14)",
        toggle: "rgba(255,255,255,0.86)",
      }
    : {
        page: "linear-gradient(145deg, #061523 0%, #0b2c4d 52%, #071e34 100%)",
        glowA: "rgba(6, 182, 212, 0.18)",
        glowB: "rgba(200, 153, 26, 0.12)",
        card: "rgba(11,44,77,0.86)",
        border: "rgba(192,200,216,0.16)",
        title: "#ffffff",
        text: "#d5deea",
        muted: "#97a6ba",
        input: "rgba(7,30,52,0.68)",
        inputBorder: "rgba(192,200,216,0.18)",
        shadow: "0 24px 70px rgba(0,0,0,0.34)",
        toggle: "rgba(7,30,52,0.76)",
      };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const schoolId = searchParams?.get("school_id") || searchParams?.get("schoolId") || undefined;
    const schoolCode = searchParams?.get("school_code") || searchParams?.get("schoolCode") || undefined;
    const schoolContext = {};
    if (schoolId) schoolContext.school_id = schoolId;
    if (schoolCode) schoolContext.school_code = schoolCode;

    const result = await login(email, password, schoolContext);

    if (result.success) {
      if (result.user?.mustChangePassword || result.user?.must_change_password) {
        navigate("/change-password");
      } else {
        const userRole = normalizeAppRole(result.user?.role);
        if (userRole === "student") navigate("/student-portal");
        else if (userRole === "parent") navigate("/parents");
        else navigate("/dashboard");
      }
    } else {
      setError(result.message || "Invalid email or password. Please try again.");
    }

    setLoading(false);
  };

  const fieldStyle = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 12,
    border: `1px solid ${palette.inputBorder}`,
    background: palette.input,
    color: palette.title,
    padding: "13px 14px",
    outline: "none",
    fontSize: 14,
    transition: "border-color .2s, box-shadow .2s, background .2s",
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: palette.page,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        position: "relative",
        overflow: "hidden",
        transition: "background .25s ease",
      }}
    >
      <div style={{ position: "absolute", width: 420, height: 420, borderRadius: "50%", background: palette.glowA, filter: "blur(90px)", top: -160, right: -100, pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", background: palette.glowB, filter: "blur(100px)", bottom: -170, left: -80, pointerEvents: "none" }} />

      <div style={{ position: "absolute", top: 20, right: 20, zIndex: 3, display: "flex", gap: 6, padding: 5, borderRadius: 14, background: palette.toggle, border: `1px solid ${palette.border}`, boxShadow: isLight ? "0 8px 24px rgba(15,35,64,0.08)" : "0 8px 24px rgba(0,0,0,0.18)", backdropFilter: "blur(14px)" }}>
        <button type="button" aria-label="Use light mode" title="Light mode" onClick={() => setTheme("light")} style={{ width: 38, height: 34, borderRadius: 10, border: "none", cursor: "pointer", display: "grid", placeItems: "center", background: isLight ? "#ffffff" : "transparent", color: isLight ? "#0f2340" : "#97a6ba", boxShadow: isLight ? "0 2px 8px rgba(15,35,64,0.10)" : "none" }}>
          <Sun size={17} />
        </button>
        <button type="button" aria-label="Use dark mode" title="Dark mode" onClick={() => setTheme("dark")} style={{ width: 38, height: 34, borderRadius: 10, border: "none", cursor: "pointer", display: "grid", placeItems: "center", background: !isLight ? "rgba(255,255,255,0.09)" : "transparent", color: !isLight ? "#ffffff" : "#66768a" }}>
          <Moon size={17} />
        </button>
      </div>

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 2 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ width: 92, height: 92, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={logoUrl} alt={`${schoolName} logo`} style={{ width: 88, height: 88, objectFit: "contain", filter: isLight ? "drop-shadow(0 8px 16px rgba(15,35,64,.14))" : "drop-shadow(0 8px 16px rgba(0,0,0,.25))" }} />
          </div>
          <h1 style={{ color: palette.title, fontSize: "clamp(24px, 5vw, 30px)", fontWeight: 900, margin: 0, letterSpacing: 1.2 }}>APEX OS</h1>
          <p style={{ color: palette.muted, fontSize: 12, margin: "7px auto 0", fontWeight: 700, letterSpacing: 0.6, maxWidth: 380 }}>{schoolName}</p>
          <p style={{ color: "#b68712", fontSize: 12, marginTop: 6, fontWeight: 700 }}>School Management Operating System</p>
        </div>

        <div style={{ background: palette.card, backdropFilter: "blur(24px)", border: `1px solid ${palette.border}`, borderRadius: 24, padding: "clamp(24px, 5vw, 38px)", boxShadow: palette.shadow, transition: "all .25s ease" }}>
          <h2 style={{ color: palette.title, fontSize: 21, fontWeight: 800, margin: "0 0 6px" }}>Welcome back</h2>
          <p style={{ color: palette.muted, fontSize: 13, margin: "0 0 26px" }}>Sign in to continue to your school portal.</p>

          <form onSubmit={handleLogin}>
            <label htmlFor="login-email" style={{ display: "block", color: palette.text, fontSize: 12, fontWeight: 700, marginBottom: 7 }}>Email address</label>
            <input id="login-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" style={fieldStyle} />

            <label htmlFor="login-password" style={{ display: "block", color: palette.text, fontSize: 12, fontWeight: 700, margin: "18px 0 7px" }}>Password</label>
            <div style={{ position: "relative" }}>
              <input id="login-password" type={showPass ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" style={{ ...fieldStyle, paddingRight: 48 }} />
              <button type="button" aria-label={showPass ? "Hide password" : "Show password"} onClick={() => setShowPass((v) => !v)} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: palette.muted, padding: 3, display: "flex", alignItems: "center" }}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <div role="alert" style={{ padding: "10px 14px", background: "rgba(255,55,95,0.08)", border: "1px solid rgba(255,55,95,0.25)", borderRadius: 10, marginTop: 18 }}><span style={{ color: "#e11d48", fontSize: 13 }}>{error}</span></div>}

            <button type="submit" disabled={loading} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "rgba(200,153,26,0.45)" : "linear-gradient(135deg, #C8991A, #e8b420)", color: "#071e34", fontWeight: 900, fontSize: 15, marginTop: 22, boxShadow: loading ? "none" : "0 8px 24px rgba(200,153,26,0.23)", transition: "all .2s" }}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: palette.muted, fontSize: 11, marginTop: 20 }}>© 2026 APEX Systems OS · All rights reserved</p>
      </div>
    </div>
  );
}
