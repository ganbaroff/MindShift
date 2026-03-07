/**
 * features/auth/index.jsx
 * Auth screen — magic link sign-in / sign-up via Supabase OTP.
 *
 * Exports: AuthScreen
 *
 * Bolt 1.7: extracted from mindflow.jsx lines 150–214.
 */

import { useState }        from "react";
import { C }               from "../../skeleton/design-system/tokens.js";
import { T }               from "../../shared/i18n/translations.js";
import { Spinner }         from "../../shared/ui/primitives.jsx";
import { waitForSupabase } from "../../shared/services/supabase.js";

export function AuthScreen({ lang, onSkip }) {
  const tx = T[lang] || T.en;
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    if (!email.includes("@")) { setErr(lang === "ru" ? "Введи корректный email" : lang === "az" ? "Düzgün email daxil edin" : "Enter a valid email"); return; }
    setLoading(true); setErr("");
    const sb = await waitForSupabase();
    if (!sb) { setErr("Supabase not loaded yet, try again"); setLoading(false); return; }
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setSent(true);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", background: C.bg }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🔐</div>
      <div style={{ color: C.text, fontSize: 22, fontWeight: 700, marginBottom: 8, letterSpacing: -.5 }}>
        {lang === "ru" ? "Войти / Зарегистрироваться" : lang === "az" ? "Daxil ol / Qeydiyyat" : "Sign in / Register"}
      </div>
      <div style={{ color: C.textSub, fontSize: 14, marginBottom: 40, textAlign: "center", lineHeight: 1.6 }}>
        {lang === "ru" ? "Магическая ссылка — без пароля.\nДанные синхронизируются между устройствами." : lang === "az" ? "Sehrli keçid — şifrəsiz.\nMəlumatlar cihazlar arasında sinxronlaşır." : "Magic link — no password.\nData syncs across your devices."}
      </div>
      {!sent ? (
        <div style={{ width: "100%", maxWidth: 320 }}>
          <input type="email" autoComplete="email" autoFocus value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="your@email.com"
            aria-label="Email address"
            aria-invalid={!!err}
            style={{ width: "100%", background: C.surface, border: `1px solid ${err ? C.high : C.border}`, borderRadius: 12, color: C.text, fontSize: 15, padding: "12px 16px", outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8 }} />
          {err && <div style={{ color: C.high, fontSize: 13, marginBottom: 8 }}>{err}</div>}
          <button onClick={send} disabled={loading}
            style={{ width: "100%", height: 48, background: C.accent, color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <><Spinner /> {lang === "ru" ? "Отправляю..." : "Sending..."}</> : lang === "ru" ? "Отправить магическую ссылку" : lang === "az" ? "Sehrli keçid göndər" : "Send Magic Link"}
          </button>
          <div style={{ textAlign: "center" }}>
            <button onClick={onSkip} style={{ background: "none", border: "none", color: C.textSub, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              {lang === "ru" ? "Продолжить без аккаунта →" : lang === "az" ? "Hesabsız davam et →" : "Continue without account →"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
          <div style={{ color: C.text, fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
            {lang === "ru" ? "Проверь почту" : lang === "az" ? "E-poçtunuzu yoxlayın" : "Check your email"}
          </div>
          <div style={{ color: C.textSub, fontSize: 14, marginBottom: 20 }}>
            {lang === "ru" ? "Ссылка отправлена на " : lang === "az" ? "Keçid göndərildi: " : "Link sent to "}<strong style={{ color: C.text }}>{email}</strong>
          </div>
          <button onClick={onSkip} style={{ background: "none", border: "none", color: C.textSub, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            {lang === "ru" ? "Пропустить пока →" : lang === "az" ? "Hələlik keç →" : "Skip for now →"}
          </button>
        </div>
      )}
    </div>
  );
}
