import { useEffect, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff, Mail } from "lucide-react";
import { continueAsGuest, logIn, register, signInWith } from "../lib/account";
import { t, useLanguage } from "../i18n";
import { haptic, Segmented, Sheet, showToast, SPRING } from "./ui";

// Brand marks, drawn per Apple's and Google's sign-in button guidelines.
const AppleLogo = () => (
  <svg width="17" height="20" viewBox="0 0 17 20" aria-hidden fill="currentColor">
    <path d="M14.2 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9C3.7 4.8 2 5.8 1.1 7.4c-1.9 3.2-.5 8 1.3 10.7.9 1.3 1.9 2.7 3.3 2.7 1.3-.1 1.8-.9 3.4-.9 1.6 0 2 .9 3.4.8 1.4 0 2.3-1.3 3.2-2.6 1-1.5 1.4-2.9 1.4-3-.1 0-2.9-1.1-2.9-4.5zM11.6 3c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z" />
  </svg>
);
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" />
    <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C1 16.4 0 20.1 0 24s1 7.6 2.6 10.8l7.9-6.2z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
  </svg>
);

export function SocialButtons({ onDone }: { onDone?: () => void }) {
  useLanguage();
  const [busy, setBusy] = useState<null | "google" | "apple">(null);
  const go = async (p: "google" | "apple") => {
    setBusy(p);
    try {
      if (await signInWith(p)) {
        haptic("success");
        onDone?.();
      }
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <button className="btn auth-apple" onClick={() => go("apple")} disabled={busy !== null}>
        {busy === "apple" ? <div className="spinner" /> : <AppleLogo />} {t("Continue with Apple")}
      </button>
      <button className="btn auth-google" onClick={() => go("google")} disabled={busy !== null}>
        {busy === "google" ? <div className="spinner" /> : <GoogleLogo />} {t("Continue with Google")}
      </button>
    </div>
  );
}

type Mode = "signup" | "login";

export function EmailAuthSheet({ open, mode: initialMode, onClose, onDone }: { open: boolean; mode: Mode; onClose: () => void; onDone?: () => void }) {
  useLanguage();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
      setPassword("");
    }
  }, [open, initialMode]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "signup" && password.length < 8) return setError(t("Use at least 8 characters for your password."));
    setBusy(true);
    try {
      if (mode === "signup") await register(email, password, name);
      else await logIn(email, password);
      haptic("success");
      showToast(mode === "signup" ? t("Account created · your data is backed up") : t("Welcome back · your data is synced"));
      onClose();
      onDone?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={mode === "signup" ? t("Create account") : t("Log in")}>
      <Segmented
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
        }}
        options={[
          { value: "signup", label: t("Create account") },
          { value: "login", label: t("Log in") },
        ]}
      />
      <form onSubmit={submit} style={{ marginTop: 14 }} noValidate>
        <div className="group">
          {mode === "signup" && (
            <div className="field">
              <label htmlFor="au-name">{t("Name")}</label>
              <input id="au-name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Optional")} />
            </div>
          )}
          <div className="field">
            <label htmlFor="au-email">{t("Email")}</label>
            <input
              id="au-email"
              type="email"
              inputMode="email"
              autoComplete={mode === "signup" ? "email" : "username"}
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ width: "62%" }}
            />
          </div>
          <div className="field">
            <label htmlFor="au-password">{t("Password")}</label>
            <input
              id="au-password"
              type={show ? "text" : "password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? t("8+ characters") : t("Required")}
              style={{ width: "50%" }}
            />
            <button type="button" className="icon-btn" onClick={() => setShow((v) => !v)} aria-label={show ? t("Hide password") : t("Show password")}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        {error && (
          <motion.p role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="footnote" style={{ color: "var(--red)" }}>
            {error}
          </motion.p>
        )}
        <div className="spacer" />
        <button className="btn" type="submit" disabled={busy || !email || !password}>
          {busy ? <div className="spinner" style={{ borderTopColor: "#fff" }} /> : null}
          {mode === "signup" ? t("Create account") : t("Log in")}
        </button>
      </form>
      <div className="auth-divider">{t("or")}</div>
      <SocialButtons
        onDone={() => {
          onClose();
          onDone?.();
        }}
      />
      <p className="footnote" style={{ textAlign: "center" }}>
        {t("Your food log, workouts and plan are backed up and synced to every phone you sign in on.")}
      </p>
    </Sheet>
  );
}

export function Welcome() {
  useLanguage();
  const [sheet, setSheet] = useState<Mode | null>(null);
  return (
    <div className="onboard welcome">
      <div style={{ flex: 1, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <motion.img
            src="/icon-192.png"
            alt=""
            width={96}
            height={96}
            style={{ borderRadius: 22, margin: "0 auto", boxShadow: "0 10px 30px rgba(255, 90, 60, 0.35)" }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={SPRING}
          />
          <h1 className="large-title" style={{ marginTop: 22 }}>
            Calories
          </h1>
          <p className="subtitle" style={{ maxWidth: 300, margin: "6px auto 0" }}>
            {t("Count calories from a photo, clock in at the gym and follow a plan made for your body.")}
          </p>
        </div>
      </div>
      <SocialButtons />
      <div className="spacer" />
      <button className="btn secondary" onClick={() => setSheet("signup")}>
        <Mail size={18} /> {t("Sign up with email")}
      </button>
      <p style={{ textAlign: "center", margin: "22px 0 0", fontSize: 15 }}>
        <span className="muted">{t("Already have an account?")} </span>
        <button className="link bold tap" onClick={() => setSheet("login")}>
          {t("Log in")}
        </button>
      </p>
      <p style={{ textAlign: "center", margin: "26px 0 0" }}>
        <button className="link tap" onClick={continueAsGuest} style={{ fontSize: 15 }}>
          {t("Continue without an account")}
        </button>
      </p>
      <p className="footnote" style={{ textAlign: "center", margin: "14px 8px 0" }}>
        {t("Without an account, your data stays only on this phone.")}
      </p>
      <EmailAuthSheet open={sheet !== null} mode={sheet ?? "signup"} onClose={() => setSheet(null)} />
    </div>
  );
}
