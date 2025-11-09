"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

type Activity = {
  id: string;
  projectId: string;
  userId: string;
  type: string;
  content: string;
  metadata?: any;
  createdAt: string;
};

type Project = {
  id: string;
  name: string;
  description?: string;
};

export default function ActivityFeed({ projectId }: { projectId?: string }) {
  const { isSignedIn } = useUser();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;

    async function fetchActivities() {
      try {
        const url = projectId
          ? `/api/activities?projectId=${encodeURIComponent(projectId)}`
          : "/api/activities";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setActivities(data);
        }
      } catch (err) {
        console.error("Failed to fetch activities:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchActivities();
    // Poll for new activities every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [projectId, isSignedIn]);

  // Fetch project details
  useEffect(() => {
    if (!projectId || !isSignedIn) {
      setProject(null);
      return;
    }

    async function fetchProject() {
      try {
        const res = await fetch(
          `/api/projects/${encodeURIComponent(projectId!)}`
        );
        if (res.ok) {
          const data = await res.json();
          setProject(data);
        }
      } catch (err) {
        console.error("Failed to fetch project:", err);
      }
    }

    fetchProject();
  }, [projectId, isSignedIn]);

  if (!isSignedIn) {
    return (
      <div className="rounded border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-700">
        Sign in to view activity
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-700">
        Loading activities...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Activity Feed</h3>
        {projectId && project && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {project.name}
          </span>
        )}
      </div>
      {!projectId ? (
        <div className="rounded border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-700">
          Select a project to view activity
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-700">
          No activity yet
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      {getActivityIcon(activity.type)}
                    </span>
                    <div className="font-medium">{activity.content}</div>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {new Date(activity.createdAt).toLocaleString()}
                  </div>
                  {activity.metadata &&
                    renderMetadata(activity.type, activity.metadata)}
                </div>
                <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {formatActivityType(activity.type)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderMetadata(type: string, metadata: any): React.ReactNode {
  if (!metadata) return null;

  return (
    <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
      {type === "card_move" && (
        <div className="italic">
          Column change: {metadata.fromColumnId} → {metadata.toColumnId}
        </div>
      )}
      {type === "card_assign" && metadata.assignee && (
        <div className="italic">Assigned to: {metadata.assignee}</div>
      )}
      {type === "mention" && metadata.mentionedUserId && (
        <div className="italic">Mentioned user: {metadata.mentionedUserId}</div>
      )}
    </div>
  );
}

function formatActivityType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getActivityIcon(type: string): string {
  switch (type) {
    case "mention":
      return "👤";
    case "page_edit":
      return "📝";
    case "card_move":
      return "🔄";
    case "card_create":
      return "➕";
    case "card_edit":
      return "✏️";
    case "card_assign":
      return "👥";
    default:
      return "•";
  }
}
