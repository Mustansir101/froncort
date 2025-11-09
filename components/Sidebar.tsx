"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AddProjectDialog from "./AddProjectDialog";
import ActivityFeed from "./ActivityFeed";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";

type Project = {
  id: string;
  name: string;
  description?: string;
};

const STORAGE_KEY = "froncort:projects:v1";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Sidebar() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function load() {
      // Wait for auth to load before checking
      if (!isLoaded) return;

      if (!isSignedIn) {
        setProjects([]);
        setAuthRequired(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch("/api/projects");
        if (res.status === 401) {
          setAuthRequired(true);
          if (mounted) setProjects([]);
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch projects");
        const list: Project[] = await res.json();
        if (mounted) {
          setProjects(list);
          setAuthRequired(false);
        }
      } catch (e) {
        console.warn("Failed to load projects", e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [isSignedIn, isLoaded]);

  async function refreshProjects() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (res.status === 401) {
        setAuthRequired(true);
        setProjects([]);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch projects");
      const list: Project[] = await res.json();
      setProjects(list);
      setAuthRequired(false);
    } catch (e) {
      console.warn("Failed to refresh projects", e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // persist is handled by backend; keep local state only
  }, [projects]);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  function handleCreate(name: string, description?: string) {
    (async () => {
      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, description }),
        });
        if (!res.ok) throw new Error("failed to create project");
        const created: Project = await res.json();
        setProjects((s) => [created, ...s]);
        try {
          router.push(`/projects/${created.id}`);
        } catch (e) {
          console.warn("Failed to navigate to new project", e);
        }
      } catch (err) {
        console.error(err);
        alert("Failed to create project");
      }
    })();
  }

  function startEdit(p: Project) {
    setEditingId(p.id);
    setEditName(p.name);
  }

  function saveEdit(id: string) {
    const name = editName.trim();
    if (!name) return;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error("failed to update project");
        const updated: Project = await res.json();
        setProjects((prev) => prev.map((x) => (x.id === id ? updated : x)));
        setEditingId(null);
        setEditName("");
      } catch (err) {
        console.error(err);
        alert("Failed to rename project");
      }
    })();
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  // Extract current project ID from pathname
  const currentProjectId = pathname?.startsWith("/projects/")
    ? pathname.split("/")[2]
    : undefined;

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Top Half - Projects List */}
      <div className="flex h-1/2 flex-col overflow-hidden border-b border-zinc-100 p-4 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Projects
          </h2>
          <button
            onClick={() => setDialogOpen(true)}
            title={isSignedIn ? "Add project" : "Sign in to create projects"}
            disabled={!isSignedIn}
            className={`ml-2 rounded px-3 py-1 text-sm ${
              isSignedIn
                ? "bg-foreground text-background hover:opacity-95"
                : "bg-transparent text-zinc-400 cursor-not-allowed"
            }`}
          >
            New
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-2">
            {isLoading ? (
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                Loading...
              </div>
            ) : authRequired ? (
              <div className="flex w-full flex-col gap-2">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Projects are private. Please sign in to view your projects.
                </div>
                <div className="flex gap-2">
                  <SignInButton>
                    <button className="rounded border border-zinc-200 px-3 py-1 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50">
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton>
                    <button className="rounded bg-[#6c47ff] px-3 py-1 text-sm font-medium text-white hover:opacity-95">
                      Create account
                    </button>
                  </SignUpButton>
                </div>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                No projects yet. Create one to get started.
              </div>
            ) : (
              projects.map((p) => {
                const active = pathname === `/projects/${p.id}`;
                return (
                  <div
                    key={p.id}
                    className={`flex items-start gap-3 rounded px-2 py-2 transition-colors ${
                      active
                        ? "bg-white/80 dark:bg-zinc-800"
                        : "hover:bg-white/60 hover:dark:bg-zinc-800"
                    }`}
                  >
                    <div className="shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-800 dark:bg-zinc-700 dark:text-zinc-50">
                        {initials(p.name)}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      {editingId === p.id ? (
                        <input
                          ref={inputRef}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => saveEdit(p.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(p.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                        />
                      ) : (
                        <Link href={`/projects/${p.id}`} className="block">
                          <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {p.name}
                          </div>
                          {p.description ? (
                            <div className="mt-1 truncate text-xs text-zinc-600 dark:text-zinc-400">
                              {p.description}
                            </div>
                          ) : null}
                        </Link>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(p)}
                        className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        title="Rename project"
                      >
                        ✎
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Half - Activity Feed */}
      <div className="flex h-1/2 flex-col overflow-hidden p-4">
        <div className="flex-1 overflow-y-auto">
          <ActivityFeed projectId={currentProjectId} />
        </div>
      </div>

      <AddProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
      />
      <div className="m-2 mt-auto border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <SignedIn>
          <div className="flex items-center gap-3">
            <UserButton />
            <div className="flex-1 text-sm">
              <div className="font-medium text-zinc-900 dark:text-zinc-50">
                {isSignedIn &&
                  (user ? user.firstName || user.fullName || user.id : "User")}
              </div>
              <div className="text-xs text-zinc-500">Signed in</div>
            </div>
          </div>
        </SignedIn>
      </div>
    </aside>
  );
}
