"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type GoogleSignInButtonProps = {
  variant?: "floating" | "inline";
};

export default function GoogleSignInButton({
  variant = "floating",
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const supabase = createSupabaseBrowserClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div
      className={
        variant === "inline"
          ? "space-y-2"
          : "fixed bottom-6 left-6 z-50 space-y-2"
      }
    >
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isLoading}
        className="group flex w-full items-center gap-3 rounded-full border border-zinc-500/30 bg-zinc-800/90 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-900/40 backdrop-blur transition hover:bg-zinc-700/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="grid h-9 w-9 place-items-center rounded-md bg-white/95 shadow-sm">
          <svg aria-hidden="true" viewBox="0 0 48 48" className="h-6 w-6">
            <path
              fill="#EA4335"
              d="M24 9.5c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35.1 2.5 29.9 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.4 5.7C12.1 12.7 17.6 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v7.8h12.6c-.3 2-1.7 5.1-4.9 7.2l7.5 5.8c4.5-4.1 7.3-10.2 7.3-16.7z"
            />
            <path
              fill="#FBBC05"
              d="M10.1 28.9c-.5-1.3-.8-2.7-.8-4.4s.3-3.1.8-4.4l-7.4-5.7C1 17.6 0 20.8 0 24.5c0 3.7 1 6.9 2.7 10l7.4-5.6z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.5 0 12-2.1 16-5.8l-7.5-5.8c-2 1.4-4.7 2.3-8.5 2.3-6.4 0-11.9-3.2-13.9-9.4l-7.4 5.6C6.6 42.6 14.6 48 24 48z"
            />
          </svg>
        </span>
        <span className="text-base tracking-wide">
          {isLoading ? "Redirecting..." : "Sign in with Google"}
        </span>
      </button>
      {errorMessage && (
        <p className="max-w-xs text-xs text-red-200">
          Sign-in failed: {errorMessage}
        </p>
      )}
    </div>
  );
}
