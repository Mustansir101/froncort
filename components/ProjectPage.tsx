"use client";

import React, { useEffect, useState } from "react";
import ConfirmModal from "./ConfirmModal";
import Link from "next/link";
import useRole from "./useRole";
import { useRouter } from "next/navigation";
import KanbanBoard from "./KanbanBoard";
import Editor from "./Editor";
import ActivityFeed from "./ActivityFeed";

type Project = {
  id: string;
  name: string;
  description?: string;
};

const STORAGE_KEY = "froncort:projects:v1";

export default function ProjectPage({ id }: { id: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [view, setView] = useState<"editor" | "kanban">("kanban");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { role } = useRole();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDeleteProject() {
    if (role !== "owner") {
      alert("You don't have permission to delete this project.");
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmDeleteProject() {
    setConfirmOpen(false);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("failed to delete project");
      router.push("/");
    } catch (err) {
      console.error(err);
      alert("Failed to delete project");
    }
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${encodeURIComponent(id)}`);
        if (res.ok) {
          const json = await res.json();
          if (mounted) setProject(json);
          return;
        }

        if (res.status === 404) {
          try {
            const all = await fetch(`/api/projects`);
            if (all.ok) {
              const list: Project[] = await all.json();
              const found = list.find((p) => p.id === id);
              if (found) {
                if (mounted) setProject(found);
                return;
              }
            }
          } catch (e) {
            // ignore
          }
        }

        const text = await res.text().catch(() => "");
        throw new Error(`Project fetch failed: ${res.status} ${text}`);
      } catch (err: any) {
        console.error(err);
        if (mounted) setError(err?.message ?? "Failed to load project");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Loading...
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 text-sm text-red-600 dark:text-red-400">
          {error ?? "Project not found."}
        </div>
        <Link href="/">Back</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <ConfirmModal
        open={confirmOpen}
        title={`Delete project "${project?.name ?? id}"?`}
        description="This will remove all data for this project. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteProject}
        onCancel={() => setConfirmOpen(false)}
      />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {project.name}
            </h1>
            <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {role}
            </span>
          </div>
          {project.description ? (
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {project.description}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDeleteProject}
            disabled={role !== "owner"}
            className={`rounded px-3 py-1 text-sm font-medium ${
              role === "owner"
                ? "bg-red-50 text-red-600 hover:opacity-90"
                : "bg-transparent text-zinc-400 cursor-not-allowed opacity-60"
            }`}
          >
            Delete Project
          </button>
          <Link
            href="/"
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 rounded border border-zinc-100 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4">
            <div className="inline-flex rounded-md bg-zinc-100 p-1 dark:bg-zinc-800">
              <button
                onClick={() => setView("editor")}
                className={`px-3 py-1 text-sm ${
                  view === "editor"
                    ? "font-medium bg-white dark:bg-zinc-900"
                    : "text-zinc-600 dark:text-zinc-300"
                }`}
              >
                Editor
              </button>
              <button
                onClick={() => setView("kanban")}
                className={`px-3 py-1 text-sm ${
                  view === "kanban"
                    ? "font-medium bg-white dark:bg-zinc-900"
                    : "text-zinc-600 dark:text-zinc-300"
                }`}
              >
                Kanban
              </button>
            </div>
          </div>

          {view === "kanban" ? (
            <KanbanBoard projectId={project.id} />
          ) : (
            <div>
              <Editor projectId={project.id} />
            </div>
          )}
        </div>

        {/* Activity Feed Sidebar */}
        <div className="w-80 shrink-0 rounded border border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <ActivityFeed projectId={project.id} />
        </div>
      </div>
    </div>
  );
}
