import { useState } from "react";

const API = import.meta.env.VITE_RENDER_URL || "";
import { motion, AnimatePresence } from "framer-motion";

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg:         "#03070f",
  panel:      "#060d1a",
  border:     "#17325f",
  borderSoft: "#102240",
  text:       "#eef3ff",
  muted:      "#7ea2df",
  muted2:     "#4d6797",
  blue:       "#76a8ff",
  blueBright: "#8db7ff",
  button:     "#5e86f0",
  buttonText: "#f8fbff",
  white:      "#ffffff",
};

// ─── Animation variants ───────────────────────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
  exit:    { opacity: 0, transition: { duration: 0.25 } },
};

const cardVariants = {
  initial: { opacity: 0, y: 28, scale: 0.97 },
  animate: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0, y: -16, scale: 0.97,
    transition: { duration: 0.22, ease: "easeIn" },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 14 },
  animate: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.15 + i * 0.07, duration: 0.35, ease: "easeOut" },
  }),
};

const logoVariants = {
  initial: { opacity: 0, scale: 0.85, y: -10 },
  animate: {
    opacity: 1, scale: 1, y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const shakeVariants = {
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.45 },
  },
};

// ─── Animated background orbs ─────────────────────────────────────────────────
function BgOrbs() {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <motion.div
        animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "-10%",
          left: "20%",
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(94,134,240,0.13) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <motion.div
        animate={{ x: [0, -25, 15, 0], y: [0, 30, -20, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        style={{
          position: "absolute",
          bottom: "-5%",
          right: "15%",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(118,168,255,0.09) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />
      <motion.div
        animate={{ x: [0, 20, -10, 0], y: [0, -15, 25, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut", delay: 8 }}
        style={{
          position: "absolute",
          top: "40%",
          left: "-5%",
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(30,60,120,0.18) 0%, transparent 70%)",
          filter: "blur(35px)",
        }}
      />
    </div>
  );
}

// ─── Shared Input Field ───────────────────────────────────────────────────────
function Field({ type = "text", placeholder, value, onChange, onKeyDown }) {
  const [focused, setFocused] = useState(false);
  return (
    <motion.input
      whileFocus={{ borderColor: T.blue }}
      type={type}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "100%",
        background: "rgba(1,4,10,0.85)",
        color: T.text,
        border: `1px solid ${focused ? T.blue : T.border}`,
        borderRadius: 10,
        padding: "13px 16px",
        fontSize: 14,
        outline: "none",
        fontFamily: "Inter, Arial, sans-serif",
        boxSizing: "border-box",
        boxShadow: focused ? `0 0 0 3px rgba(118,168,255,0.1)` : "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    />
  );
}

// ─── Primary Button ───────────────────────────────────────────────────────────
function PrimaryBtn({ onClick, disabled, loading, children }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.02, boxShadow: "0 0 36px rgba(94,134,240,0.5)" }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      animate={loading ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
      transition={loading ? { repeat: Infinity, duration: 1.1 } : { type: "spring", stiffness: 400, damping: 20 }}
      style={{
        width: "100%",
        border: "none",
        borderRadius: 10,
        padding: "14px 16px",
        background: disabled && !loading ? "rgba(94,134,240,0.5)" : T.button,
        color: T.buttonText,
        fontWeight: 800,
        fontSize: 14,
        letterSpacing: "0.04em",
        cursor: disabled ? "default" : "pointer",
        boxShadow: "0 0 24px rgba(94,134,240,0.25)",
        fontFamily: "Inter, Arial, sans-serif",
        marginTop: 18,
      }}
    >
      {children}
    </motion.button>
  );
}

// ─── Link button ──────────────────────────────────────────────────────────────
function LinkBtn({ onClick, children, fontSize = 13 }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ color: T.blueBright }}
      style={{
        color: T.blue,
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize,
        padding: 0,
        fontFamily: "Inter, Arial, sans-serif",
        textDecoration: "underline",
        textUnderlineOffset: 3,
      }}
    >
      {children}
    </motion.button>
  );
}

// ─── Alert ────────────────────────────────────────────────────────────────────
function Alert({ message, type = "error" }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          variants={shakeVariants}
          animate="shake"
          initial={{ opacity: 0, y: -6 }}
          exit={{ opacity: 0, y: -4 }}
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
            background: type === "error" ? "rgba(255,80,80,0.08)" : "rgba(76,175,126,0.08)",
            border: `1px solid ${type === "error" ? "rgba(255,80,80,0.28)" : "rgba(76,175,126,0.28)"}`,
            color: type === "error" ? "#ff9f9f" : "#7ef4a0",
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0" }}>
      <div style={{ flex: 1, height: 1, background: T.borderSoft }} />
      <span style={{ color: T.muted2, fontSize: 11, fontFamily: '"IBM Plex Mono", monospace' }}>or</span>
      <div style={{ flex: 1, height: 1, background: T.borderSoft }} />
    </div>
  );
}

// ─── Auth Page Shell (background + card) ─────────────────────────────────────
function AuthPage({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        minHeight: "100vh",
        background: T.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "Inter, Arial, sans-serif",
        position: "relative",
      }}
    >
      <style>{`
        .auth-logo-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 32px;
          position: relative;
          z-index: 1;
        }
        .auth-swi-logo { height: 110px; width: auto; object-fit: contain; }
        .auth-divider  { width: 1px; height: 64px; background: ${T.border}; flex-shrink: 0; }
        .auth-by-row   { display: flex; align-items: center; gap: 10px; }
        .auth-by-text  { color: ${T.muted2}; font-size: 11px; letter-spacing: 0.2em; font-family: "IBM Plex Mono", monospace; }
        .auth-trinity-logo { height: 46px; width: auto; object-fit: contain; }
        .auth-card {
          width: 100%;
          max-width: 440px;
          background: ${T.panel};
          border: 1px solid ${T.border};
          border-radius: 18px;
          padding: 32px 36px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(118,168,255,0.05);
          position: relative;
          z-index: 1;
          box-sizing: border-box;
        }
        @media (max-width: 480px) {
          .auth-logo-bar { gap: 12px; margin-bottom: 24px; }
          .auth-swi-logo { height: 72px; }
          .auth-divider  { height: 44px; }
          .auth-trinity-logo { height: 30px; }
          .auth-by-text  { font-size: 9px; letter-spacing: 0.14em; }
          .auth-card     { padding: 24px 18px; border-radius: 14px; }
        }
        @media (max-width: 360px) {
          .auth-logo-bar { flex-direction: column; gap: 10px; }
          .auth-divider  { display: none; }
          .auth-swi-logo { height: 60px; }
          .auth-trinity-logo { height: 26px; }
        }
      `}</style>

      <BgOrbs />

      {/* Top logo bar */}
      <motion.div
        className="auth-logo-bar"
        variants={logoVariants}
        initial="initial"
        animate="animate"
      >
        <img src="/swi-logo.png" alt="Severe Weather Intelligence" className="auth-swi-logo" />
        <div className="auth-divider" />
        <div className="auth-by-row">
          <span className="auth-by-text">BY</span>
          <img src="/trinity-logo.png" alt="Trinity Engineering" className="auth-trinity-logo" />
        </div>
      </motion.div>

      {/* Card */}
      <motion.div
        className="auth-card hail-auth-card"
        variants={cardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ─── Section title + subtitle inside card ─────────────────────────────────────
function CardTitle({ title, subtitle, index = 0 }) {
  return (
    <motion.div
      custom={index}
      variants={itemVariants}
      initial="initial"
      animate="animate"
      style={{ textAlign: "center", marginBottom: 24 }}
    >
      <div style={{ fontWeight: 800, fontSize: 20, color: T.white, letterSpacing: "-0.01em", marginBottom: 6 }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ color: T.muted2, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: '"IBM Plex Mono", monospace' }}>
          {subtitle}
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export function LoginScreen({ onLoginSuccess, onGoSignup, onGoForgot }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleLogin() {
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API}/api/auth/login`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");
      onLoginSuccess(data.user);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <AuthPage>
      <CardTitle title="Welcome back" subtitle="Authorized access only" index={0} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { ph: "Email address", type: "email",    val: email,    set: setEmail },
          { ph: "Password",      type: "password",  val: password, set: setPassword, kd: handleLogin },
        ].map(({ ph, type, val, set, kd }, i) => (
          <motion.div key={ph} custom={i + 1} variants={itemVariants} initial="initial" animate="animate">
            <Field type={type} placeholder={ph} value={val} onChange={(e) => set(e.target.value)} onKeyDown={kd ? (e) => e.key === "Enter" && kd() : undefined} />
          </motion.div>
        ))}
      </div>

      <motion.div custom={3} variants={itemVariants} initial="initial" animate="animate" style={{ marginTop: 10, textAlign: "right" }}>
        <LinkBtn onClick={onGoForgot} fontSize={12}>Forgot password?</LinkBtn>
      </motion.div>

      <Alert message={error} />

      <motion.div custom={4} variants={itemVariants} initial="initial" animate="animate">
        <PrimaryBtn onClick={handleLogin} disabled={loading} loading={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </PrimaryBtn>
      </motion.div>

      <motion.div custom={5} variants={itemVariants} initial="initial" animate="animate">
        <Divider />
        <div style={{ textAlign: "center", color: T.muted2, fontSize: 13 }}>
          Don't have an account?{" "}
          <LinkBtn onClick={onGoSignup}>Create account</LinkBtn>
        </div>
      </motion.div>
    </AuthPage>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNUP SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export function SignupScreen({ onSignupSuccess, onGoLogin }) {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSignup() {
    if (!name || !email || !password || !confirm) { setError("All fields are required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm)  { setError("Passwords do not match."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API}/api/auth/signup`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed.");
      onSignupSuccess(data.user);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const strength = password.length < 8 ? { w: "25%", c: "#e05555", l: "Weak" }
                 : password.length < 12 ? { w: "60%", c: "#e09c35", l: "Good" }
                 : { w: "100%", c: "#4caf7e", l: "Strong" };

  return (
    <AuthPage>
      <CardTitle title="Create account" subtitle="Join Severe Weather Intelligence" index={0} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { ph: "Full name",                  type: "text",     val: name,     set: setName },
          { ph: "Email address",              type: "email",    val: email,    set: setEmail },
          { ph: "Password (min. 8 chars)",    type: "password", val: password, set: setPassword },
          { ph: "Confirm password",           type: "password", val: confirm,  set: setConfirm, kd: handleSignup },
        ].map(({ ph, type, val, set, kd }, i) => (
          <motion.div key={ph} custom={i + 1} variants={itemVariants} initial="initial" animate="animate">
            <Field type={type} placeholder={ph} value={val} onChange={(e) => set(e.target.value)} onKeyDown={kd ? (e) => e.key === "Enter" && kd() : undefined} />
          </motion.div>
        ))}
      </div>

      {/* Password strength bar */}
      <AnimatePresence>
        {password.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}
          >
            <div style={{ flex: 1, height: 3, borderRadius: 3, background: T.borderSoft, overflow: "hidden" }}>
              <motion.div
                animate={{ width: strength.w, background: strength.c }}
                transition={{ duration: 0.35 }}
                style={{ height: "100%", borderRadius: 3 }}
              />
            </div>
            <motion.span
              animate={{ color: strength.c }}
              style={{ fontSize: 10, fontFamily: '"IBM Plex Mono", monospace', minWidth: 44 }}
            >
              {strength.l}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <Alert message={error} />

      <motion.div custom={5} variants={itemVariants} initial="initial" animate="animate">
        <PrimaryBtn onClick={handleSignup} disabled={loading} loading={loading}>
          {loading ? "Creating account…" : "Create account"}
        </PrimaryBtn>
      </motion.div>

      <motion.div custom={6} variants={itemVariants} initial="initial" animate="animate">
        <Divider />
        <div style={{ textAlign: "center", color: T.muted2, fontSize: 13 }}>
          Already have an account?{" "}
          <LinkBtn onClick={onGoLogin}>Sign in</LinkBtn>
        </div>
      </motion.div>
    </AuthPage>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export function ForgotPasswordScreen({ onEmailSent, onGoLogin }) {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit() {
    if (!email) { setError("Please enter your email address."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API}/api/auth/forgot-password`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed.");
      onEmailSent(email);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <AuthPage>
      <CardTitle title="Reset password" subtitle="Password recovery" index={0} />

      <motion.p custom={1} variants={itemVariants} initial="initial" animate="animate"
        style={{ color: T.muted, fontSize: 13, marginBottom: 20, marginTop: 0, lineHeight: 1.65, textAlign: "center" }}
      >
        Enter your email and we'll send you a secure reset code.
      </motion.p>

      <motion.div custom={2} variants={itemVariants} initial="initial" animate="animate">
        <Field type="email" placeholder="Email address" value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </motion.div>

      <Alert message={error} />

      <motion.div custom={3} variants={itemVariants} initial="initial" animate="animate">
        <PrimaryBtn onClick={handleSubmit} disabled={loading} loading={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </PrimaryBtn>
      </motion.div>

      <motion.div custom={4} variants={itemVariants} initial="initial" animate="animate"
        style={{ marginTop: 20, textAlign: "center" }}
      >
        <LinkBtn onClick={onGoLogin}>← Back to sign in</LinkBtn>
      </motion.div>
    </AuthPage>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP VERIFY SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export function OtpVerifyScreen({ email, onVerified, onGoLogin, onResend }) {
  const [code, setCode]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleVerify() {
    const trimmed = code.trim();
    if (trimmed.length !== 6) { setError("Enter the 6-digit code from your email."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API}/api/auth/verify-otp`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code: trimmed }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed.");
      onVerified(trimmed);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <AuthPage>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 64, height: 64, borderRadius: "50%",
            background: "rgba(94,134,240,0.1)", border: `1px solid ${T.border}`,
            marginBottom: 18,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="2" width="14" height="20" rx="2" stroke="#76a8ff" strokeWidth="1.8"/>
            <path d="M9 10h6M9 14h4" stroke="#76a8ff" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="12" cy="7" r="1" fill="#76a8ff"/>
          </svg>
        </motion.div>
        <CardTitle title="Enter your code" subtitle="Check your email" index={0} />
        <motion.p custom={1} variants={itemVariants} initial="initial" animate="animate"
          style={{ color: T.muted, fontSize: 13, margin: "0 0 20px", lineHeight: 1.65 }}
        >
          We sent a 6-digit code to{" "}
          <span style={{ color: T.blue, fontWeight: 600 }}>{email}</span>.
          <br />It expires in 15 minutes.
        </motion.p>
      </div>

      <motion.div custom={2} variants={itemVariants} initial="initial" animate="animate">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(1,4,10,0.85)", color: T.text,
            border: `1px solid ${T.border}`, borderRadius: 10,
            padding: "14px 16px", fontSize: 28, fontWeight: 800,
            letterSpacing: "0.35em", textAlign: "center",
            outline: "none", fontFamily: "Inter, Arial, sans-serif",
          }}
        />
      </motion.div>

      <Alert message={error} />

      <motion.div custom={3} variants={itemVariants} initial="initial" animate="animate">
        <PrimaryBtn onClick={handleVerify} disabled={loading} loading={loading}>
          {loading ? "Verifying…" : "Verify code"}
        </PrimaryBtn>
      </motion.div>

      <motion.div custom={4} variants={itemVariants} initial="initial" animate="animate"
        style={{ marginTop: 20, textAlign: "center", display: "flex", justifyContent: "center", gap: 20 }}
      >
        <LinkBtn onClick={onResend} fontSize={12}>Resend code</LinkBtn>
        <LinkBtn onClick={onGoLogin} fontSize={12}>← Back to sign in</LinkBtn>
      </motion.div>
    </AuthPage>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW PASSWORD SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export function NewPasswordScreen({ email, code, onResetSuccess }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleReset() {
    if (!password || !confirm) { setError("Both fields are required."); return; }
    if (password.length < 8)   { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm)  { setError("Passwords do not match."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API}/api/auth/reset-password`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed.");
      onResetSuccess(data.user);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const strength = password.length < 8 ? { w: "25%", c: "#e05555", l: "Weak" }
                 : password.length < 12 ? { w: "60%", c: "#e09c35", l: "Good" }
                 : { w: "100%", c: "#4caf7e", l: "Strong" };

  return (
    <AuthPage>
      <CardTitle title="Set new password" subtitle="Choose a strong password" index={0} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { ph: "New password (min. 8 chars)", type: "password", val: password, set: setPassword },
          { ph: "Confirm new password",        type: "password", val: confirm,  set: setConfirm, kd: handleReset },
        ].map(({ ph, type, val, set, kd }, i) => (
          <motion.div key={ph} custom={i + 1} variants={itemVariants} initial="initial" animate="animate">
            <Field type={type} placeholder={ph} value={val} onChange={(e) => set(e.target.value)} onKeyDown={kd ? (e) => e.key === "Enter" && kd() : undefined} />
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {password.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}
          >
            <div style={{ flex: 1, height: 3, borderRadius: 3, background: T.borderSoft, overflow: "hidden" }}>
              <motion.div animate={{ width: strength.w, background: strength.c }} transition={{ duration: 0.35 }} style={{ height: "100%", borderRadius: 3 }} />
            </div>
            <motion.span animate={{ color: strength.c }} style={{ fontSize: 10, fontFamily: '"IBM Plex Mono", monospace', minWidth: 44 }}>
              {strength.l}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <Alert message={error} />

      <motion.div custom={3} variants={itemVariants} initial="initial" animate="animate">
        <PrimaryBtn onClick={handleReset} disabled={loading} loading={loading}>
          {loading ? "Saving…" : "Set new password"}
        </PrimaryBtn>
      </motion.div>
    </AuthPage>
  );
}

// Keep export name for backwards compat
export { NewPasswordScreen as ResetPasswordScreen };
export function CheckEmailScreen({ onGoLogin }) {
  return null; // replaced by OtpVerifyScreen
}
