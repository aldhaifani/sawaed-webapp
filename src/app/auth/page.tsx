"use client";

import {
  useState,
  useEffect,
  useRef,
  type FormEvent,
  type ReactElement,
} from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";

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

type Step = "email" | { email: string };

export default function LoginPage(): ReactElement {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [resending, setResending] = useState<boolean>(false);
  const [info, setInfo] = useState<string>("");
  const codeFormRef = useRef<HTMLFormElement | null>(null);
  const lastAutoSubmittedCodeRef = useRef<string | null>(null);

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
  }, [step]);

  // Auto-submit when the 6th digit is entered (using ASCII-normalized value)
  useEffect(() => {
    if (step === "email") return;
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

  async function onSubmitEmail(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const rawForm = new FormData(event.currentTarget);
      const emailValue = rawForm.get("email");
      const email = (typeof emailValue === "string" ? emailValue : "")
        .trim()
        .toLowerCase();
      if (!email) {
        setError("Please enter your email.");
        return;
      }
      const form = new FormData();
      form.set("email", email);
      await signIn("resend-otp", form);
      setStep({ email });
    } catch {
      setError("Failed to send code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitCode(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (loading || step === "email") return;
    if (code.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      form.set("email", step.email.trim().toLowerCase());
      form.set("code", toAsciiDigits(code));
      await signIn("resend-otp", form);
      // Redirect after successful verification
      router.push("/");
    } catch {
      setError("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onResendCode(): Promise<void> {
    if (resending || step === "email") return;
    setResending(true);
    setError("");
    setInfo("");
    try {
      const form = new FormData();
      form.set("email", step.email.trim().toLowerCase());
      await signIn("resend-otp", form);
      setInfo("A new code has been sent.");
      // Allow a fresh auto-submit on the next complete entry
      lastAutoSubmittedCodeRef.current = null;
    } catch {
      setError("Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "#ffffff",
          backgroundImage:
            "radial-gradient(circle at top center, rgba(173,109,244,0.5), transparent 70%)",
          filter: "blur(80px)",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center px-4 py-16 md:py-32">
        <div className="bg-background/80 m-auto w-full max-w-md rounded-xl border p-6 backdrop-blur">
          <div className="text-center">
            <LogoIcon className="mx-auto inline-block" />
            <h1 className="mt-6 text-xl font-semibold text-balance">
              <span className="text-muted-foreground">Welcome to Sawaed.</span>{" "}
              <br />
              Sign in to continue
            </h1>
          </div>

          {step === "email" ? (
            <form onSubmit={onSubmitEmail} className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="block text-sm">
                  Email
                </Label>
                <Input
                  type="email"
                  required
                  name="email"
                  id="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  className="ring-foreground/15 border-transparent ring-1"
                />
              </div>
              {error && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Continue"}
              </Button>
            </form>
          ) : (
            <form
              ref={codeFormRef}
              onSubmit={onSubmitCode}
              className="mt-6 space-y-6"
            >
              <div>
                <p className="text-muted-foreground text-sm">
                  We sent a 6‑digit code to
                </p>
                <p className="font-medium">{step.email}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code" className="block text-sm">
                  Enter code
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
                {/* Hidden inputs consumed by Convex Auth */}
                <input type="hidden" name="email" value={step.email} />
                <input type="hidden" name="code" value={code} />
              </div>
              {error && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || code.length !== 6}
                >
                  {loading ? "Verifying..." : "Continue"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("email")}
                  disabled={loading}
                >
                  Change email
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onResendCode}
                  disabled={resending}
                  className="px-5 text-sm"
                >
                  {resending ? "Resending..." : "Resend code"}
                </Button>
                {info && (
                  <span className="text-xs text-emerald-600">{info}</span>
                )}
              </div>
              <p className="text-muted-foreground text-center text-xs">
                Didn’t get a code? Check spam or try again later.
              </p>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Don’t have an account? <br /> Just enter your email — we’ll create
              it on first sign-in.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
