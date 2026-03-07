/**
 * features/auth/index.jsx
 * Auth screen — email + password sign-in / register.
 *
 * Bolt 2.3: replaced magic link OTP with email/password auth.
 *   - Two modes: "signin" (default) | "signup"
 *   - Neutral error messages (no "wrong password" shaming)
 *   - No "skip" option — auth is required (AC6: protected routes)
 *   - EN / RU / AZ strings
 *   - Touch targets ≥ 44px, contrast ≥ 4.5:1
 *
 * Security:
 *   - Password never stored in state beyond the input
 *   - signIn / signUp functions passed as props from useAuth (no direct Supabase in view)
 *   - aria-invalid + aria-describedby for screen readers
 *
 * Exports: AuthScreen
 */

import { useState, useRef, useEffect } from "react";
import { C }       from "../../skeleton/design-system/tokens.js";
import { Spinner } from "../../shared/ui/primitives.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// Strings
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  en: {
    heading:        "Welcome to MindFocus",
    sub:            "Sign in to save your tasks across devices.",
    emailLabel:     "Email",
    emailPH:        "your@email.com",
    passwordLabel:  "Password",
    passwordPH:     "Your password",
    signinBtn:      "Sign in",
    signupBtn:      "Create account",
    toSignup:       "No account yet? Create one →",
    toSignin:       "Already have an account? Sign in →",
    sending:        "One moment…",
    errGeneric:     "Check your email and password, then try again.",
    errEmail:       "Enter a valid email address.",
    errPassword:    "Password must be at least 6 characters.",
    errNoClient:    "Connection error — try again in a moment.",
    confirmPending: "Check your inbox — we sent you a confirmation link.",
    signupHeading:  "Create your account",
    signupSub:      "Your tasks stay private and sync across devices.",
  },
  ru: {
    heading:        "Добро пожаловать в MindFocus",
    sub:            "Войди, чтобы сохранять задачи на всех устройствах.",
    emailLabel:     "Email",
    emailPH:        "твой@email.com",
    passwordLabel:  "Пароль",
    passwordPH:     "Твой пароль",
    signinBtn:      "Войти",
    signupBtn:      "Создать аккаунт",
    toSignup:       "Нет аккаунта? Создать →",
    toSignin:       "Уже есть аккаунт? Войти →",
    sending:        "Подождите…",
    errGeneric:     "Проверь email и пароль, попробуй снова.",
    errEmail:       "Введи корректный email.",
    errPassword:    "Пароль должен быть не менее 6 символов.",
    errNoClient:    "Ошибка соединения — попробуй через секунду.",
    confirmPending: "Проверь почту — мы отправили письмо для подтверждения.",
    signupHeading:  "Создать аккаунт",
    signupSub:      "Твои задачи приватны и синхронизируются между устройствами.",
  },
  az: {
    heading:        "MindFocus-a xoş gəldin",
    sub:            "Tapşırıqlarını bütün cihazlarda saxlamaq üçün daxil ol.",
    emailLabel:     "Email",
    emailPH:        "sənin@email.com",
    passwordLabel:  "Şifrə",
    passwordPH:     "Şifrəni daxil et",
    signinBtn:      "Daxil ol",
    signupBtn:      "Hesab yarat",
    toSignup:       "Hesabın yoxdur? Yarat →",
    toSignin:       "Artıq hesabın var? Daxil ol →",
    sending:        "Bir anlıq…",
    errGeneric:     "Email və şifrəni yoxla, yenidən cəhd et.",
    errEmail:       "Düzgün email daxil et.",
    errPassword:    "Şifrə ən az 6 simvol olmalıdır.",
    errNoClient:    "Bağlantı xətası — bir az sonra cəhd et.",
    confirmPending: "Poçtunu yoxla — təsdiq linki göndərdik.",
    signupHeading:  "Hesab yarat",
    signupSub:      "Tapşırıqların gizli qalır və cihazlar arasında sinxronlaşır.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AuthScreen
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object}   props
 * @param {string}   props.lang
 * @param {Function} props.onSignIn  — (email, password) => Promise<void>
 * @param {Function} props.onSignUp  — (email, password) => Promise<{ needsConfirmation? }>
 */
export function AuthScreen({ lang, onSignIn, onSignUp }) {
  const tx = S[lang] || S.en;

  const [mode, setMode]       = useState("signin"); // "signin" | "signup"
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const [confirmPending, setConfirmPending] = useState(false);

  const emailRef    = useRef(null);
  const errId       = "auth-err";

  // Auto-focus email on mount
  useEffect(() => { emailRef.current?.focus(); }, []);
  // Clear error when user edits
  useEffect(() => { setErr(""); }, [email, password]);

  const validate = () => {
    if (!email.includes("@") || email.length < 5) return tx.errEmail;
    if (password.length < 6) return tx.errPassword;
    return null;
  };

  const handleSubmit = async (submittedMode) => {
    const validErr = validate();
    if (validErr) { setErr(validErr); return; }

    setLoading(true);
    setErr("");
    try {
      if (submittedMode === "signin") {
        await onSignIn(email, password);
        // User state update fires via onAuthStateChange → mindflow.jsx handles redirect
      } else {
        const result = await onSignUp(email, password);
        if (result?.needsConfirmation) {
          setConfirmPending(true);
        }
        // If no confirmation needed, onAuthStateChange fires → auto-login
      }
    } catch (e) {
      // Neutral error — never expose "wrong password", only "check your credentials"
      if (e.message === "no_client") {
        setErr(tx.errNoClient);
      } else {
        setErr(tx.errGeneric);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) handleSubmit(mode);
  };

  // ── Confirmation pending ────────────────────────────────────────────────
  if (confirmPending) {
    return (
      <div style={outerStyle}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
        <div style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 10, letterSpacing: -0.3 }}>
          {tx.confirmPending.split("—")[0]}
        </div>
        <div style={{ color: C.textSub, fontSize: 14, textAlign: "center", lineHeight: 1.6, maxWidth: 280 }}>
          {tx.confirmPending}
        </div>
        <button
          onClick={() => { setConfirmPending(false); setMode("signin"); }}
          style={linkBtnStyle}
        >
          ← {tx.toSignin}
        </button>
      </div>
    );
  }

  // ── Auth form ────────────────────────────────────────────────────────────
  const isSignup = mode === "signup";
  return (
    <div style={outerStyle}>
      {/* Icon */}
      <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>

      {/* Heading */}
      <div style={{ color: C.text, fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: -0.4, textAlign: "center" }}>
        {isSignup ? tx.signupHeading : tx.heading}
      </div>
      <div style={{ color: C.textSub, fontSize: 14, marginBottom: 32, textAlign: "center", lineHeight: 1.6, maxWidth: 300 }}>
        {isSignup ? tx.signupSub : tx.sub}
      </div>

      {/* Form */}
      <div style={{ width: "100%", maxWidth: 340 }}>

        {/* Email */}
        <label style={labelStyle} htmlFor="auth-email">{tx.emailLabel}</label>
        <input
          ref={emailRef}
          id="auth-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tx.emailPH}
          aria-label={tx.emailLabel}
          aria-invalid={!!err}
          aria-describedby={err ? errId : undefined}
          disabled={loading}
          style={inputStyle(!!err)}
        />

        {/* Password */}
        <label style={labelStyle} htmlFor="auth-password">{tx.passwordLabel}</label>
        <input
          id="auth-password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tx.passwordPH}
          aria-label={tx.passwordLabel}
          aria-invalid={!!err}
          aria-describedby={err ? errId : undefined}
          disabled={loading}
          style={{ ...inputStyle(!!err), marginBottom: 8 }}
        />

        {/* Error */}
        {err && (
          <div
            id={errId}
            role="alert"
            aria-live="polite"
            style={{ color: C.high, fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}
          >
            {err}
          </div>
        )}

        {/* Primary action: Sign in */}
        <button
          onClick={() => handleSubmit("signin")}
          disabled={loading}
          aria-label={tx.signinBtn}
          style={primaryBtnStyle(loading)}
        >
          {loading && mode === "signin"
            ? <><Spinner size={14} color="white" /> {tx.sending}</>
            : tx.signinBtn}
        </button>

        {/* Secondary action: Register */}
        <button
          onClick={() => {
            if (mode === "signup") {
              handleSubmit("signup");
            } else {
              setMode("signup");
              setErr("");
            }
          }}
          disabled={loading}
          aria-label={isSignup ? tx.signupBtn : tx.toSignup}
          style={secondaryBtnStyle(loading)}
        >
          {loading && mode === "signup"
            ? <><Spinner size={13} color={C.accentLit} /> {tx.sending}</>
            : isSignup ? tx.signupBtn : tx.toSignup}
        </button>

        {/* Back to sign-in when in signup mode */}
        {isSignup && (
          <button
            onClick={() => { setMode("signin"); setErr(""); }}
            style={linkBtnStyle}
          >
            {tx.toSignin}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Style helpers
// ─────────────────────────────────────────────────────────────────────────────

const outerStyle = {
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px 20px",
  background: C.bg,
};

const labelStyle = {
  display: "block",
  color: C.textSub,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  marginBottom: 6,
  marginTop: 16,
};

const inputStyle = (hasErr) => ({
  width: "100%",
  background: C.surface,
  border: `1.5px solid ${hasErr ? C.high : C.border}`,
  borderRadius: 12,
  color: C.text,
  fontSize: 15,
  padding: "13px 16px",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
  transition: "border-color .2s",
  marginBottom: 4,
  minHeight: 48, // touch target
});

const primaryBtnStyle = (loading) => ({
  width: "100%",
  minHeight: 48, // WCAG touch target
  background: loading ? C.surfaceHi : `linear-gradient(135deg, ${C.accent}, ${C.accentLit})`,
  color: "white",
  border: "none",
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 700,
  cursor: loading ? "not-allowed" : "pointer",
  fontFamily: "inherit",
  marginTop: 16,
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  boxShadow: loading ? "none" : `0 4px 20px ${C.accentGlow}`,
  transition: "all .2s",
});

const secondaryBtnStyle = (loading) => ({
  width: "100%",
  minHeight: 48,
  background: "none",
  border: `1.5px solid ${C.border}`,
  borderRadius: 12,
  color: C.accentLit,
  fontSize: 14,
  fontWeight: 600,
  cursor: loading ? "not-allowed" : "pointer",
  fontFamily: "inherit",
  marginBottom: 4,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "border-color .2s",
});

const linkBtnStyle = {
  background: "none",
  border: "none",
  color: C.textSub,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
  marginTop: 8,
  padding: "4px 0",
};
