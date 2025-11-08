"use client";

import { useUser } from "@clerk/nextjs";

export default function useRole() {
  const { isSignedIn, user } = useUser();

  if (!isSignedIn) return { role: "viewer", isSignedIn };

  const meta: any =
    (user as any)?.publicMetadata || (user as any)?.privateMetadata || {};
  const role = meta?.role || "owner"; // default to owner for now
  return { role, isSignedIn };
}
