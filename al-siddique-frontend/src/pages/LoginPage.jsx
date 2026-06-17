import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { normalizeAppRole } from "../utils/role";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleFillDemo = () => {
    setEmail("demo@assps.edu.pk");
    setPassword("Demo@12345");
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #071e34 0%, #0B2C4D 50%, #071e34 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(12px, 3vw, 20px)",
        fontFamily: "'DM Sans', sans-serif",
        position: "relative",
        overflowX: "hidden",
        overflowY: "auto",
      }}
    >
      {/* Decorative Orbs */}
      <div
        style={{
          position: "absolute",
          width: 450,
          height: 450,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,153,26,0.08) 0%, transparent 70%)",
          top: -150,
          right: -100,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(10,132,255,0.06) 0%, transparent 70%)",
          bottom: -100,
          left: -100,
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 1 }}>
        
        {/* Header Block with Premium Inline APEX Logo */}
        <div style={{ textAlign: "center", marginBottom: "clamp(24px, 4.5vw, 36px)" }}>
          <div style={{ width: 96, height: 96, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/apex-logo.png" alt="APEX Logo" style={{ width: 120, height: 120, objectFit: 'contain' }} />
          </div>
          
          <h1 style={{ color: "#FFFFFF", fontSize: "clamp(26px, 6vw, 32px)", fontWeight: 900, margin: 0, letterSpacing: 2 }}>
            APEX
          </h1>
          <p style={{ color: "#8892A4", fontSize: 11, marginTop: 4, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase" }}>
            Learn • Grow • Lead • Transform
          </p>
          <p style={{ color: "#C8991A", fontSize: 13, marginTop: 6, fontWeight: 500, letterSpacing: 0.5 }}>
            School Management Operating System
          </p>
        </div>

        {/* Form Container */}
        <div
          style={{
            background: "rgba(11,44,77,0.85)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(148,163,184,0.18)",
            borderRadius: 24,
            padding: "clamp(24px, 5vw, 40px)",
            boxShadow: "0 24px 64px rgba(7,22,40,0.85)",
          }}
        >
          <h2 style={{ color: "#C0C8D8", fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>Welcome back</h2>
          <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 28px" }}>Sign in to the school operating system portal</p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  color: "#8892A4",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "block",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Email Address / Login ID
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@school.com"
                style={{
                  width: "100%",
                  padding: "13px 18px",
                  borderRadius: 12,
                  boxSizing: "border-box",
                  background: "rgba(7,22,40,0.92)",
                  border: "1px solid rgba(200,153,26,0.2)",
                  color: "#C0C8D8",
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#C8991A")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(200,153,26,0.2)")}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  color: "#8892A4",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "block",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  style={{
                    width: "100%",
                    padding: "13px 48px 13px 18px",
                    borderRadius: 12,
                    boxSizing: "border-box",
                    background: "rgba(7,22,40,0.92)",
                    border: "1px solid rgba(200,153,26,0.2)",
                    color: "#C0C8D8",
                    fontSize: 14,
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#C8991A")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(200,153,26,0.2)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#8892A4",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(255,55,95,0.08)",
                  border: "1px solid rgba(255,55,95,0.25)",
                  borderRadius: 10,
                  marginBottom: 18,
                }}
              >
                <span style={{ color: "#FF375F", fontSize: 13 }}>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 12,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                background: loading ? "rgba(200,153,26,0.4)" : "linear-gradient(135deg, #C8991A, #e8b420)",
                color: "#071e34",
                fontWeight: 800,
                fontSize: 15,
                marginTop: 20,
                boxShadow: loading ? "none" : "0 4px 20px rgba(200,153,26,0.25)",
                transition: "all 0.2s",
              }}
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          {/* Re-purposed Demo Auto-Fill Trigger */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: "1px solid rgba(148,163,184,0.12)",
              textAlign: "center",
            }}
          >
            <button
              type="button"
              onClick={handleFillDemo}
              style={{
                background: "rgba(200,153,26,0.08)",
                border: "1px solid rgba(200,153,26,0.2)",
                borderRadius: 12,
                color: "#C8991A",
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(200,153,26,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(200,153,26,0.08)";
              }}
            >
              <Shield size={15} />
              Auto-fill Demo Sandbox
            </button>
            <p style={{ color: "#6B7280", fontSize: 11, marginTop: 8, marginHorizontal: 0 }}>
              Quickly test the platform with sandbox demo credentials
            </p>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "#6B7280", fontSize: 11, marginTop: 24 }}>
          © 2026 APEX Systems OS · All rights reserved
        </p>
      </div>
    </div>
  );
}
