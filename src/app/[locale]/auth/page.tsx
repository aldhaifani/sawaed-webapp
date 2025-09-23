"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
  type ReactElement,
} from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { getDashboardPathForRole } from "@/lib/rbac";

import { LogoIcon } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

type Step =
  | "credentials"
  | { verify: { email: string } }
  | "resetRequest"
  | { reset: { email: string } };

export default function LoginPage(): ReactElement {
  const { signIn, signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState<Step>("credentials");
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [resending, setResending] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [info, setInfo] = useState<string>("");
  const [lastEmail, setLastEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const codeFormRef = useRef<HTMLFormElement | null>(null);
  const lastAutoSubmittedCodeRef = useRef<string | null>(null);
  const me = useQuery(api.rbac.currentUser);
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");

  // Normalize any locale-specific digits (e.g., Arabic-Indic) to ASCII 0-9
  const toAsciiDigits = (value: string): string => {
    return (
      value
        // Eastern Arabic-Indic digits \u0660-\u0669
        .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
        // Persian digits \u06F0-\u06F9
        .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
        // Keep only 0-9
        .replace(/[^0-9]/g, "")
    );
  };

  useEffect(() => {
    setError("");
    setInfo("");
    // Reset auto-submit tracker when switching steps
    lastAutoSubmittedCodeRef.current = null;
    // Reset resend cooldown when switching steps
    setCooldown(0);
  }, [step]);

  // Tick down the resend cooldown every second
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  // Determine active locale from pathname or cookie
  const getActiveLocale = useCallback((): "en" | "ar" => {
    if (typeof window !== "undefined") {
      const path = pathname || window.location.pathname;
      const seg = path.split("/").find((s) => s.length > 0);
      if (seg === "en" || seg === "ar") return seg;
      const match = /(?:^|; )locale=([^;]+)/.exec(document.cookie);
      const raw = match?.[1] ? decodeURIComponent(match[1]) : undefined;
      if (raw === "en" || raw === "ar") return raw;
    }
    return "ar";
  }, [pathname]);

  // If already authenticated, redirect to dashboard (locale-aware)
  useEffect(() => {
    if (me === undefined) return; // loading
    if (me === null) return; // not authenticated
    if (me.isDeleted || me.isBlocked) {
      void signOut();
      return; // stay on /auth
    }
    const locale = getActiveLocale();
    const base = getDashboardPathForRole(me.role);
    const target = base === "/" ? `/${locale}` : `/${locale}${base}`;
    router.replace(target);
  }, [me, router, signOut, getActiveLocale]);

  // Auto-submit when the 6th digit is entered (using ASCII-normalized value)
  useEffect(() => {
    // Only auto-submit for email verification step (not for password reset)
    if (typeof step !== "object" || !("verify" in step)) return;
    const ascii = toAsciiDigits(code);
    // Clear tracker while user is still typing (<6 digits)
    if (ascii.length < 6) {
      lastAutoSubmittedCodeRef.current = null;
      return;
    }
    if (
      !loading &&
      ascii.length === 6 &&
      lastAutoSubmittedCodeRef.current !== ascii
    ) {
      lastAutoSubmittedCodeRef.current = ascii;
      codeFormRef.current?.requestSubmit();
    }
  }, [code, loading, step]);

  async function onSubmitCredentials(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const rawForm = new FormData(event.currentTarget);
      const emailValue = rawForm.get("email");
      const passwordValue = rawForm.get("password");
      const confirmValue = rawForm.get("passwordConfirm");
      const email = (typeof emailValue === "string" ? emailValue : "")
        .trim()
        .toLowerCase();
      const password = (
        typeof passwordValue === "string" ? passwordValue : ""
      ).trim();
      const confirm = (
        typeof confirmValue === "string" ? confirmValue : ""
      ).trim();
      setLastEmail(email);
      if (!email || !password) {
        setError(tAuth("incorrectCredentials"));
        return;
      }
      if (flow === "signUp" && password !== confirm) {
        setError(tAuth("passwordsDoNotMatch"));
        return;
      }
      const form = new FormData();
      form.set("email", email);
      form.set("password", password);
      form.set("flow", flow);
      await signIn("password", form);
      // For sign up, immediately guide the user to verify email and send code.
      if (flow === "signUp") {
        setStep({ verify: { email } });
        // Send verification code
        const sendForm = new FormData();
        sendForm.set("email", email);
        await signIn("resend-otp", sendForm);
        setInfo(tAuth("resentCode"));
      }
      // On successful sign-in, redirect is handled by the me effect.
    } catch {
      // If sign-in failed, show incorrect credentials and allow verification as an option
      setError(`${tAuth("incorrectCredentials")} — ${tAuth("forgotPassword")}`);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitCode(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (loading || step === "credentials") return;
    if (code.length !== 6) {
      setError(tAuth("otp"));
      return;
    }
    setLoading(true);
    setError("");
    // Keep the UI in a verifying state after a successful sign-in to avoid
    // a brief flicker back to "Continue" that allows a second click.
    let success = false;
    try {
      // Ensure we're on the email verification step, not reset
      if (typeof step !== "object" || !("verify" in step)) {
        setLoading(false);
        return;
      }
      const form = new FormData(event.currentTarget);
      form.set("email", step.verify.email.trim().toLowerCase());
      form.set("code", toAsciiDigits(code));
      await signIn("resend-otp", form);
      success = true;
      // Redirect after successful verification (locale-aware root)
      const locale = getActiveLocale();
      router.push(`/${locale}`);
    } catch {
      // Show a friendly, localized message instead of raw server error
      setError(tAuth("invalidCode"));
    } finally {
      // Only clear loading if verification failed. On success, navigation will
      // occur and the component will unmount; keeping loading=true prevents
      // double submits and state conflicts.
      if (!success) {
        setLoading(false);
      }
    }
  }

  async function onResendCode(): Promise<void> {
    if (resending || step === "credentials" || cooldown > 0) return;
    setResending(true);
    setError("");
    setInfo("");
    // Start 90s cooldown immediately on click
    setCooldown(90);
    try {
      const form = new FormData();
      // Safe guard: only execute for verify step
      if (typeof step !== "object" || !("verify" in step)) return;
      form.set("email", step.verify.email.trim().toLowerCase());
      await signIn("resend-otp", form);
      setInfo(tAuth("resentCode"));
      // Allow a fresh auto-submit on the next complete entry
      lastAutoSubmittedCodeRef.current = null;
    } catch {
      // Localized resend error message
      setError(tAuth("resendFailed"));
      // Cancel cooldown on failure to allow retry
      setCooldown(0);
    } finally {
      setResending(false);
    }
  }

  async function onResendResetCode(email: string): Promise<void> {
    if (resending || cooldown > 0) return;
    setResending(true);
    setError("");
    setInfo("");
    setCooldown(90);
    try {
      const sendForm = new FormData();
      sendForm.set("email", email.trim().toLowerCase());
      sendForm.set("flow", "reset");
      await signIn("password", sendForm);
      setInfo(tAuth("resetSent"));
    } catch {
      setError(tAuth("resetFailed"));
      setCooldown(0);
    } finally {
      setResending(false);
    }
  }

  async function onSubmitResetVerification(
    event: FormEvent<HTMLFormElement>,
    email: string,
  ): Promise<void> {
    event.preventDefault();
    if (loading) return;
    const ascii = toAsciiDigits(code);
    const npw = newPassword.trim();
    if (ascii.length !== 6 || npw.length === 0) {
      setError(tAuth("invalidCode"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.set("email", email.trim().toLowerCase());
      form.set("code", ascii);
      form.set("newPassword", npw);
      form.set("flow", "reset-verification");
      await signIn("password", form);
      setInfo(tAuth("resetSuccess"));
      // Return to credentials for sign-in
      setStep("credentials");
      setCode("");
      setNewPassword("");
    } catch {
      setError(tAuth("invalidCode"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      <div className="relative z-10 flex min-h-screen items-center px-4 py-16 md:py-32">
        <div className="bg-background/80 m-auto w-full max-w-md rounded-xl border p-6 backdrop-blur">
          <div className="w-full text-center">
            <div className="flex w-full justify-between">
              <LogoIcon className="inline-block" />
              <LanguageSwitcher />
            </div>
            <h1 className="mt-6 text-xl font-semibold text-balance">
              <span className="text-muted-foreground">
                {tAuth("headWelcome")}
              </span>{" "}
              <br />
              {tAuth("headSubHeading")}
            </h1>
          </div>

          {step === "credentials" ? (
            <form onSubmit={onSubmitCredentials} className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="block text-sm">
                  {tAuth("email")}
                </Label>
                <Input
                  type="email"
                  required
                  name="email"
                  id="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  className="ring-foreground/15 border-transparent ring-1"
                  defaultValue={lastEmail}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="block text-sm">
                  {tAuth("password")}
                </Label>
                <Input
                  type="password"
                  required
                  name="password"
                  id="password"
                  placeholder="••••••••"
                  className="ring-foreground/15 border-transparent ring-1"
                />
              </div>
              {flow === "signUp" && (
                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm" className="block text-sm">
                    {tAuth("confirmPassword")}
                  </Label>
                  <Input
                    type="password"
                    required
                    name="passwordConfirm"
                    id="passwordConfirm"
                    placeholder="••••••••"
                    className="ring-foreground/15 border-transparent ring-1"
                  />
                </div>
              )}
              {error && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              )}
              <div className="flex items-center justify-between">
                <button
                  className="text-muted-foreground text-sm"
                  type="button"
                  onClick={() => {
                    setStep("resetRequest");
                  }}
                >
                  {tAuth("forgotPassword")}
                </button>
                <div className="flex items-center gap-2 text-sm">
                  <button
                    type="button"
                    className="underline"
                    onClick={() =>
                      setFlow(flow === "signIn" ? "signUp" : "signIn")
                    }
                  >
                    {flow === "signIn"
                      ? tAuth("signUpInstead")
                      : tAuth("signInInstead")}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {flow === "signIn" ? tAuth("signIn") : tAuth("createAccount")}
              </Button>
            </form>
          ) : step === "resetRequest" ? (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (loading) return;
                setLoading(true);
                setError("");
                try {
                  const formEl = event.currentTarget as HTMLFormElement;
                  const formData = new FormData(formEl);
                  const emailValue = formData.get("email");
                  const email = (
                    typeof emailValue === "string" ? emailValue : ""
                  )
                    .trim()
                    .toLowerCase();
                  if (!email) {
                    setError(tAuth("email"));
                    return;
                  }
                  setLastEmail(email);
                  const sendForm = new FormData();
                  sendForm.set("email", email);
                  sendForm.set("flow", "reset");
                  await signIn("password", sendForm);
                  setInfo(tAuth("resetSent"));
                  setStep({ reset: { email } });
                } catch {
                  setError(tAuth("resetFailed"));
                } finally {
                  setLoading(false);
                }
              }}
              className="mt-6 space-y-6"
            >
              <div className="space-y-2">
                <Label htmlFor="resetEmail" className="block text-sm">
                  {tAuth("email")}
                </Label>
                <Input
                  type="email"
                  required
                  name="email"
                  id="resetEmail"
                  inputMode="email"
                  placeholder="you@example.com"
                  className="ring-foreground/15 border-transparent ring-1"
                  defaultValue={lastEmail}
                />
              </div>
              {error && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              )}
              {info && (
                <p className="text-sm text-emerald-600" role="status">
                  {info}
                </p>
              )}
              <div className="flex items-center justify-between">
                <Button type="submit" className="" disabled={loading}>
                  {tAuth("sendResetCode")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep("credentials")}
                  disabled={loading}
                >
                  {tCommon("cancel")}
                </Button>
              </div>
            </form>
          ) : typeof step === "object" && "reset" in step ? (
            <form
              onSubmit={(e) => onSubmitResetVerification(e, step.reset.email)}
              className="mt-6 space-y-6"
            >
              <div>
                <p className="text-muted-foreground text-sm">
                  {tAuth("resetPasswordDesc")}
                </p>
                <p className="font-medium">{step.reset.email}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resetCode" className="block text-sm">
                  {tAuth("otp")}
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    containerClassName="justify-center"
                    onChange={(value) => setCode(toAsciiDigits(value))}
                    value={toAsciiDigits(code)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator className="mx-2" />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="block text-sm">
                  {tAuth("newPassword")}
                </Label>
                <Input
                  type="password"
                  name="newPassword"
                  id="newPassword"
                  placeholder="••••••••"
                  className="ring-foreground/15 border-transparent ring-1"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              {error && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              )}
              {info && (
                <p className="text-sm text-emerald-600" role="status">
                  {info}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    loading ||
                    code.length !== 6 ||
                    newPassword.trim().length === 0
                  }
                >
                  {loading ? tCommon("loading") : tAuth("resetPassword")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onResendResetCode(step.reset.email)}
                  disabled={resending || loading || cooldown > 0}
                >
                  {resending
                    ? tAuth("sendingCode")
                    : `${tAuth("resendCode")}${cooldown > 0 ? ` (${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, "0")})` : ""}`}
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep("credentials")}
                  disabled={loading}
                  className="px-5 text-sm"
                >
                  {tCommon("cancel")}
                </Button>
              </div>
            </form>
          ) : (
            <form
              ref={codeFormRef}
              onSubmit={onSubmitCode}
              className="mt-6 space-y-6"
            >
              <div>
                <p className="text-muted-foreground text-sm">
                  {tAuth("verifyEmailDesc")}
                </p>
                <p className="font-medium">
                  {(step as { verify: { email: string } }).verify.email}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code" className="block text-sm">
                  {tAuth("otp")}
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    containerClassName="justify-center"
                    onChange={(value) => setCode(toAsciiDigits(value))}
                    value={toAsciiDigits(code)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator className="mx-2" />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || code.length !== 6}
                >
                  {loading ? tCommon("loading") : tAuth("continue")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onResendCode}
                  disabled={resending || loading || cooldown > 0}
                >
                  {resending
                    ? tAuth("sendingCode")
                    : `${tAuth("resendCode")}${cooldown > 0 ? ` (${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, "0")})` : ""}`}
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep("credentials")}
                  disabled={loading}
                  className="px-5 text-sm"
                >
                  {tAuth("changeEmail")}
                </Button>
                {info && (
                  <span className="text-xs text-emerald-600">
                    {tAuth("resentCode")}
                  </span>
                )}
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              {tAuth("dontHaveAccount")}
              <br />
              {tAuth("signUp")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
