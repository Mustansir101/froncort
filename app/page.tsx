"use client";

import React from "react";
import Link from "next/link";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";

export default function Home() {
  const { isSignedIn } = useUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-white to-zinc-50 dark:from-black dark:to-zinc-900">
      <main className="mx-auto w-full max-w-4xl p-12 text-center">
        <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-zinc-50">
          Froncort — Docs + Kanban, together
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-zinc-600 dark:text-zinc-400">
          A lightweight collaborative editor and Kanban board for planning and
          documentation. Create projects, write rich docs, and manage work in a
          simple, real-time workspace.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          {isSignedIn ? (
            <Link href="/projects">
              <button className="rounded-full bg-[#6c47ff] px-6 py-3 text-white font-medium hover:opacity-95">
                Go to Projects
              </button>
            </Link>
          ) : (
            <>
              <SignUpButton>
                <button className="rounded-full bg-[#6c47ff] px-6 py-3 text-white font-medium hover:opacity-95">
                  Create account
                </button>
              </SignUpButton>
              <SignInButton>
                <button className="rounded-full border border-zinc-200 px-6 py-3 text-zinc-900 dark:text-zinc-50 font-medium hover:bg-zinc-100">
                  Sign in
                </button>
              </SignInButton>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
