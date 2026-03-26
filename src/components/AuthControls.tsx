"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";

export function AuthControls() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="h-10 w-24 rounded-lg border border-white/10 bg-white/5" />
    );
  }

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button
          type="button"
          className="h-10 rounded-lg border border-cyan-300/30 bg-cyan-400/15 px-4 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-400/25"
        >
          Sign in
        </button>
      </SignInButton>
    );
  }

  return (
    <div className="rounded-full border border-white/10 bg-white/5 p-1">
      <UserButton />
    </div>
  );
}
