import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader as Loader2 } from "lucide-react";
import { DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";
import { LoginMapPanel } from "@/components/login-map-panel";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).catch("signup"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — TRYB" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (isSignup) {
        if (!name.trim()) throw new Error("Tell us your name");
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Welcome to TRYB!");
        navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast.success("Welcome back ✨");
        navigate({ to: "/home" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function signInGoogle() {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/auth/callback" },
      });
      // On success, Supabase redirects the browser to Google immediately —
      // this line only runs if the redirect itself failed to kick off.
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setGoogleLoading(false);
    }
  }

  const themeClassName = seasonThemeClassName(DEFAULT_SEASON_THEME);

  return (
    <div className={`${themeClassName} relative min-h-screen overflow-hidden`}>
      <LoginMapPanel />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-24">
        <Link to="/" className="absolute left-6 top-6 inline-flex items-center gap-1.5 text-sm text-cream/80 hover:text-cream sm:left-8 sm:top-8">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="warm-card shadow-warm w-full max-w-md rounded-3xl p-6 sm:p-8">
          <h1 className="fomo-heading text-ink text-4xl font-bold tracking-tight">
            {isSignup ? "Join the tribe" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            {isSignup ? "Create an account in 30 seconds." : "Sign in to see your trips."}
          </p>

          <button
            onClick={signInGoogle}
            disabled={googleLoading}
            className="shadow-warm-sm text-ink mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-cream px-4 py-3.5 font-medium transition hover:opacity-90 disabled:opacity-50"
          >
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-ink/40">
            <div className="bg-ink/10 h-px flex-1" /> OR <div className="bg-ink/10 h-px flex-1" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {isSignup && (
              <Field label="Full name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivers"
                  className="ipt"
                  autoComplete="name"
                  required
                />
              </Field>
            )}
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="ipt"
                autoComplete="email"
                required
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="ipt"
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={6}
                required
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-cream mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold shadow-[var(--shadow-glow)] transition hover:scale-[1.01] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink/60">
            {isSignup ? "Already a member?" : "New to TRYB?"}{" "}
            <Link
              to="/auth"
              search={{ mode: isSignup ? "login" : "signup" }}
              className="font-semibold text-primary"
            >
              {isSignup ? "Sign in" : "Create one"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-ink/50 mb-1.5 block text-xs font-medium">{label}</span>
      {children}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.44.36-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}
