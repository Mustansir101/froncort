"use client";

import React, { useEffect, useRef, useState } from "react";
import ConfirmModal from "./ConfirmModal";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Underline from "@tiptap/extension-underline";
import Mention from "@tiptap/extension-mention";
import { useUser } from "@clerk/nextjs";
import useRole from "./useRole";
import { toast, Toaster } from "sonner";

type Page = {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
};

export default function Editor({ projectId }: { projectId: string }) {
  const { isSignedIn, user } = useUser();
  const { role } = useRole();
  const [pages, setPages] = useState<Page[]>([]);
  const [selected, setSelected] = useState<Page | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const previousMentions = useRef<Set<string>>(new Set());

  const ydoc = React.useMemo(
    () => (selected ? new Y.Doc() : undefined),
    [selected?.id]
  );

  const providerRef = useRef<WebsocketProvider | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);

  const [presence, setPresence] = useState<any[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ydoc || !selected) return;

    const room = `page-${selected.id}`;
    const prov = new WebsocketProvider("ws://localhost:1234", room, ydoc);
    providerRef.current = prov;
    setProvider(prov);

    const colorFromId = (id: string) => {
      let h = 0;
      for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
      const hex = (h & 0xffffff).toString(16).padStart(6, "0");
      return `#${hex}`;
    };

    const localUser = user
      ? {
          id: user.id,
          name: (user as any).fullName || (user as any).firstName || user.id,
          image:
            (user as any).profileImageUrl || (user as any).imageUrl || null,
          color: colorFromId(user.id),
          role: role || "viewer",
        }
      : {
          id: `anon-${Math.floor(Math.random() * 10000)}`,
          name: `Guest-${Math.floor(Math.random() * 10000)}`,
          image: null,
          color: colorFromId(`anon-${Math.floor(Math.random() * 10000)}`),
          role: "viewer",
        };

    prov.awareness.setLocalStateField("user", localUser);

    const updatePresence = () => {
      try {
        const states = Array.from(prov.awareness.getStates().values());
        const users = states
          .map((s: any) => s.user)
          .filter(Boolean)
          .map((u: any) => ({
            id: u.id,
            name: u.name,
            image: u.image,
            color: u.color || colorFromId(u.id || "anon"),
            role: u.role || "viewer",
            selection: u.selection || null,
          }));
        setPresence(users);
      } catch (e) {
        // ignore
      }
    };

    updatePresence();
    prov.awareness.on("change", updatePresence);

    return () => {
      prov.awareness.off("change", updatePresence);
      try {
        prov.destroy();
      } catch (e) {
        /* ignore */
      }
      providerRef.current = null;
      setProvider(null);
      try {
        ydoc.destroy();
      } catch (e) {
        /* ignore */
      }
    };
  }, [ydoc, selected?.id, user]);

  const extensions = React.useMemo(() => {
    const base: any[] = [
      StarterKit,
      Link.configure({ HTMLAttributes: { rel: "noopener noreferrer" } }),
      Underline,
      Image,
      Placeholder.configure({ placeholder: "Start writing..." }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },
        suggestion: {
          items: ({ query }: { query: string }) => {
            console.log("Mention query:", query, "Members:", members);
            const filtered = members.filter((member) =>
              member.name.toLowerCase().includes(query.toLowerCase())
            );
            console.log("Filtered members:", filtered);
            return filtered.slice(0, 5);
          },
          render: () => {
            let component: any;
            let popup: any;

            return {
              onStart: (props: any) => {
                component = document.createElement("div");
                component.className =
                  "mention-suggestions rounded border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-800";

                const items = props.items;
                if (items.length === 0) {
                  component.innerHTML =
                    '<div class="px-2 py-1 text-sm text-zinc-500">No users found</div>';
                } else {
                  items.forEach((item: any, index: number) => {
                    const button = document.createElement("button");
                    button.className =
                      "mention-item w-full px-2 py-1 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded";
                    button.textContent = item.name;
                    button.addEventListener("click", () =>
                      props.command({ id: item.id, label: item.name })
                    );
                    if (index === props.selectedIndex) {
                      button.classList.add("bg-zinc-100", "dark:bg-zinc-700");
                    }
                    component.appendChild(button);
                  });
                }

                document.body.appendChild(component);

                popup = {
                  getBoundingClientRect: () =>
                    props.clientRect?.() || new DOMRect(),
                };

                const updatePosition = () => {
                  const rect = popup.getBoundingClientRect();
                  component.style.position = "fixed";
                  component.style.top = `${rect.bottom + 8}px`;
                  component.style.left = `${rect.left}px`;
                  component.style.zIndex = "1000";
                };
                updatePosition();
              },

              onUpdate: (props: any) => {
                const items = props.items;
                component.innerHTML = "";
                if (items.length === 0) {
                  component.innerHTML =
                    '<div class="px-2 py-1 text-sm text-zinc-500">No users found</div>';
                } else {
                  items.forEach((item: any, index: number) => {
                    const button = document.createElement("button");
                    button.className =
                      "mention-item w-full px-2 py-1 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded";
                    button.textContent = item.name;
                    button.addEventListener("click", () =>
                      props.command({ id: item.id, label: item.name })
                    );
                    if (index === props.selectedIndex) {
                      button.classList.add("bg-zinc-100", "dark:bg-zinc-700");
                    }
                    component.appendChild(button);
                  });
                }
              },

              onKeyDown: (props: any) => {
                if (props.event.key === "ArrowUp") {
                  const items = component.querySelectorAll(".mention-item");
                  const current = props.selectedIndex;
                  const prev = current > 0 ? current - 1 : items.length - 1;
                  items[current]?.classList.remove(
                    "bg-zinc-100",
                    "dark:bg-zinc-700"
                  );
                  items[prev]?.classList.add("bg-zinc-100", "dark:bg-zinc-700");
                  return true;
                }
                if (props.event.key === "ArrowDown") {
                  const items = component.querySelectorAll(".mention-item");
                  const current = props.selectedIndex;
                  const next = current < items.length - 1 ? current + 1 : 0;
                  items[current]?.classList.remove(
                    "bg-zinc-100",
                    "dark:bg-zinc-700"
                  );
                  items[next]?.classList.add("bg-zinc-100", "dark:bg-zinc-700");
                  return true;
                }
                if (props.event.key === "Enter") {
                  const items = props.items;
                  if (items[props.selectedIndex]) {
                    props.command({
                      id: items[props.selectedIndex].id,
                      label: items[props.selectedIndex].name,
                    });
                  }
                  return true;
                }
                return false;
              },

              onExit: () => {
                if (component) {
                  component.remove();
                }
              },
            };
          },
        },
      }),
    ];
    if (ydoc) {
      base.push(Collaboration.configure({ document: ydoc }));
      if (provider) {
        base.push(
          CollaborationCursor.configure({
            provider,
            user: provider.awareness.getLocalState()?.user || {
              name: "anon",
              color: "#888",
            },
          })
        );
      }
    }
    return base;
  }, [ydoc, selected?.id, provider, members]);

  const editor = useEditor({
    extensions,
    content: selected?.content || "",
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<any | null>(null);

  // Fetch members for mentions
  useEffect(() => {
    async function fetchMembers() {
      // Start with hardcoded fallback of current user
      const fallbackMember = user
        ? {
            id: user.id,
            name: (user as any).fullName || (user as any).firstName || user.id,
            email: (user as any).primaryEmailAddress?.emailAddress || "",
            image: (user as any).imageUrl || null,
          }
        : {
            id: "mock-user",
            name: "Current User",
            email: "user@example.com",
            image: null,
          };

      setMembers([fallbackMember]);

      // Try to fetch from API but don't block on it
      try {
        const res = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/members`
        );
        if (res.ok) {
          const data = await res.json();
          console.log("Fetched members from API:", data);
          if (data && data.length > 0) {
            setMembers(data);
          }
        } else {
          console.error("Failed to fetch members, status:", res.status);
        }
      } catch (err) {
        console.error("Failed to fetch members:", err);
      }
    }
    if (user || !isSignedIn) {
      fetchMembers();
    }
  }, [projectId, user, isSignedIn]);

  useEffect(() => {
    if (!editor || !providerRef.current) return;
    const prov = providerRef.current;

    const publishSelection = () => {
      if (!prov || !editor) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        try {
          const sel = editor.state.selection;
          const existing = prov.awareness.getLocalState()?.user || {};
          if (!sel) {
            prov.awareness.setLocalStateField("user", {
              ...existing,
              selection: null,
            });
            return;
          }
          const { from, to } = sel;
          prov.awareness.setLocalStateField("user", {
            ...existing,
            selection: { from, to },
          });
        } catch (e) {
          // ignore
        }
      });
    };

    editor.on("selectionUpdate", publishSelection);
    publishSelection();

    return () => {
      editor.off("selectionUpdate", publishSelection);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [editor, provider]);

  function PresenceBar() {
    if (!presence || presence.length === 0) return null;
    return (
      <div className="ml-4 flex items-center gap-2">
        {presence.map((p) => (
          <div
            key={p.id}
            title={`${p.name} — ${p.role || "viewer"}`}
            className="flex items-center gap-2"
          >
            <div
              className="h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: p.color || "#666" }}
            >
              {p.image ? (
                <img
                  src={p.image}
                  alt={p.name}
                  className="h-7 w-7 rounded-full"
                />
              ) : (
                <span className="select-none">
                  {(p.name || "?").slice(0, 2)}
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-500">
              {p.role || "viewer"}
            </div>
          </div>
        ))}
      </div>
    );
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/pages`
        );
        if (!res.ok) throw new Error("Failed to load pages");
        const list: Page[] = await res.json();
        if (mounted) setPages(list);
      } catch (err) {
        console.error(err);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    setTitleInput(selected?.title ?? "");
    if (selected) {
      editor?.commands.setContent(selected.content || "");
      editor?.commands.focus();
    } else {
      editor?.commands.setContent("");
    }
  }, [selected, editor]);

  async function createPage(e?: React.FormEvent) {
    if (!isSignedIn) {
      alert("Please sign in to create pages.");
      return;
    }
    e?.preventDefault();
    const title = newTitle.trim() || "Untitled";
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/pages`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, content: "" }),
        }
      );
      if (!res.ok) throw new Error("Failed to create page");
      const created: Page = await res.json();
      setPages((p) => [created, ...p]);
      setNewTitle("");
      setSelected(created);
      setTitleInput(created.title);
    } catch (err) {
      console.error(err);
      alert("Failed to create page");
    }
  }

  async function loadPage(pageId: string) {
    try {
      const res = await fetch(`/api/pages/${encodeURIComponent(pageId)}`);
      if (!res.ok) throw new Error("Failed to load page");
      const p: Page = await res.json();
      setSelected(p);
      setTitleInput(p.title);
    } catch (err) {
      console.error(err);
      alert("Failed to load page");
    }
  }

  async function saveContent(content: string) {
    if (!isSignedIn) {
      alert("Please sign in to save pages.");
      return;
    }
    if (!selected) return;

    // Extract mentions from content
    const mentionRegex =
      /<span[^>]*data-type="mention"[^>]*data-id="([^"]+)"[^>]*>@([^<]+)<\/span>/g;
    const mentions: Array<{ id: string; name: string }> = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push({ id: match[1], name: match[2] });
    }

    try {
      const res = await fetch(`/api/pages/${encodeURIComponent(selected.id)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: titleInput.trim() || selected.title,
          content,
        }),
      });
      if (!res.ok) throw new Error("Failed to save page");
      const updated: Page = await res.json();
      setPages((p) => p.map((it) => (it.id === updated.id ? updated : it)));
      setSelected(updated);
      setStatus("Saved");
      window.setTimeout(() => setStatus(null), 1200);

      // Handle new mentions
      const newMentions = mentions.filter(
        (m) => !previousMentions.current.has(m.id)
      );
      if (newMentions.length > 0 && user) {
        for (const mention of newMentions) {
          // Create activity for mention
          try {
            await fetch("/api/activities", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                projectId,
                type: "mention",
                content: `${
                  user.fullName || user.firstName || user.id
                } mentioned ${mention.name} in "${selected.title}"`,
                metadata: {
                  pageId: selected.id,
                  pageTitle: selected.title,
                  mentionedUserId: mention.id,
                  mentionedUserName: mention.name,
                },
              }),
            });

            // Show toast notification
            toast.success(`Mentioned ${mention.name}`, {
              description: `In page: ${selected.title}`,
            });

            previousMentions.current.add(mention.id);
          } catch (err) {
            console.error("Failed to create mention activity:", err);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("Error saving");
    }
  }

  async function renameSelected(newTitle: string) {
    if (!selected) return;
    try {
      const res = await fetch(`/api/pages/${encodeURIComponent(selected.id)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: newTitle, content: selected.content }),
      });
      if (!res.ok) throw new Error("Failed to rename page");
      const updated: Page = await res.json();
      setPages((p) => p.map((it) => (it.id === updated.id ? updated : it)));
      setSelected(updated);
      setTitleInput(updated.title);
    } catch (err) {
      console.error(err);
      alert("Failed to rename page");
    }
  }

  async function deletePage() {
    if (!isSignedIn) {
      alert("Please sign in to delete pages.");
      return;
    }
    if (role === "viewer") {
      alert("You don't have permission to delete pages.");
      return;
    }
    if (!selected) return;
    setConfirmOpen(true);
  }

  async function fetchVersions() {
    if (!selected) return;
    try {
      const res = await fetch(
        `/api/pages/${encodeURIComponent(selected.id)}/versions`
      );
      if (!res.ok) throw new Error("Failed to fetch versions");
      const list = await res.json();
      setVersions(list);
      setHistoryOpen(true);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch version history");
    }
  }

  async function previewVersion(versionId: string) {
    if (!selected) return;
    try {
      const res = await fetch(
        `/api/pages/${encodeURIComponent(
          selected.id
        )}/versions/${encodeURIComponent(versionId)}`
      );
      if (!res.ok) throw new Error("Failed to fetch version");
      const version = await res.json();
      setSelectedVersion(version);
    } catch (err) {
      console.error(err);
      alert("Failed to preview version");
    }
  }

  async function restoreVersion(versionId: string) {
    if (!selected) return;
    try {
      const res = await fetch(
        `/api/pages/${encodeURIComponent(
          selected.id
        )}/versions/${encodeURIComponent(versionId)}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to restore version");
      const restored: Page = await res.json();
      setPages((p) => p.map((it) => (it.id === restored.id ? restored : it)));
      setSelected(restored);
      setTitleInput(restored.title);
      editor?.commands.setContent(restored.content || "");
      setHistoryOpen(false);
      setSelectedVersion(null);
      setStatus("Version restored");
      window.setTimeout(() => setStatus(null), 1200);
    } catch (err) {
      console.error(err);
      alert("Failed to restore version");
    }
  }

  async function confirmDelete() {
    setConfirmOpen(false);
    if (!selected) return;
    try {
      const res = await fetch(`/api/pages/${encodeURIComponent(selected.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete page");
      setPages((p) => p.filter((it) => it.id !== selected.id));
      setSelected(null);
      setTitleInput("");
    } catch (err) {
      console.error(err);
      alert("Failed to delete page");
    }
  }

  async function insertImage(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      const src = reader.result as string;
      editor?.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
  }

  function ToolButton({
    active,
    onClick,
    label,
  }: {
    active?: boolean;
    onClick?: () => void;
    label: React.ReactNode;
  }) {
    return (
      <button
        onClick={onClick}
        className={`rounded px-2 py-1 text-sm ${
          active ? "bg-zinc-200 dark:bg-zinc-700" : "hover:bg-zinc-100"
        }`}
        aria-pressed={active}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex gap-6">
      <Toaster position="top-right" richColors />
      <ConfirmModal
        open={confirmOpen}
        title="Delete page?"
        description="Delete this page? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
      <aside className="w-64 shrink-0">
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Pages</h3>
            <span className="text-xs text-zinc-500">{pages.length}</span>
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pages"
              className="w-full rounded border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>
        </div>

        <form onSubmit={createPage} className="mb-3 flex items-center gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New page"
            className="flex-1 rounded border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
          <button className="rounded bg-foreground px-3 py-1 text-sm font-medium text-background">
            Create
          </button>
        </form>

        <div className="flex flex-col gap-1 max-h-[68vh] overflow-y-auto">
          {pages
            .filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
            .map((p) => (
              <div
                key={p.id}
                className={`px-3 py-2 rounded cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                  selected?.id === p.id ? "bg-zinc-100 dark:bg-zinc-800" : ""
                }`}
                onClick={() => loadPage(p.id)}
              >
                <div className="text-sm font-medium truncate">{p.title}</div>
                <div className="text-xs text-zinc-500">
                  {p.createdAt ? new Date(p.createdAt).toLocaleString() : ""}
                </div>
              </div>
            ))}
        </div>
      </aside>

      <main className="flex-1">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                }
              }}
              placeholder="Page title"
              className="w-96 rounded border border-zinc-200 px-3 py-2 text-lg font-semibold dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <div className="text-sm text-zinc-500">{status}</div>
            <div className="ml-2">
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {role}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => editor?.chain().focus().undo().run()}
              className="rounded px-2 py-1 text-sm hover:bg-zinc-100"
            >
              Undo
            </button>
            <button
              onClick={() => editor?.chain().focus().redo().run()}
              className="rounded px-2 py-1 text-sm hover:bg-zinc-100"
            >
              Redo
            </button>
            <button
              onClick={async () => {
                if (!selected) return;
                const content = editor?.getHTML() || "";
                await saveContent(content);
              }}
              className="rounded bg-foreground px-3 py-1 text-sm font-medium text-background"
            >
              Save
            </button>
            <button
              onClick={fetchVersions}
              className="rounded bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600 hover:opacity-90"
            >
              History
            </button>
            <button
              onClick={deletePage}
              className="rounded bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:opacity-90"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="sticky top-20 z-10 mb-2 bg-white/50 backdrop-blur-sm dark:bg-zinc-900/50 rounded">
          <div className="flex items-center gap-2 p-2">
            <ToolButton
              active={!!editor?.isActive("bold")}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              label="B"
            />
            <ToolButton
              active={!!editor?.isActive("italic")}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              label="I"
            />
            <ToolButton
              active={!!editor?.isActive("strike")}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              label="S"
            />

            <ToolButton
              active={!!editor?.isActive("underline")}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              label="U"
            />

            <button
              onClick={() => {
                let url = prompt(
                  "Insert link URL (include http:// or https:// or just www)"
                );
                if (!url) return;
                url = url.trim();
                if (!/^\w+:\/\//.test(url)) {
                  if (url.startsWith("www.")) url = `https://${url}`;
                  else if (url.includes(".")) url = `https://${url}`;
                }
                editor
                  ?.chain()
                  .focus()
                  .extendMarkRange("link")
                  .setLink({ href: url })
                  .run();
              }}
              className="rounded px-2 py-1 text-sm hover:bg-zinc-100"
            >
              🔗
            </button>
            <label className="rounded px-2 py-1 text-sm hover:bg-zinc-100 cursor-pointer">
              📷
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files && insertImage(e.target.files[0])
                }
                className="hidden"
              />
            </label>
            <div className="ml-auto flex items-center">
              <PresenceBar />
            </div>
          </div>
        </div>

        <div className="min-h-[60vh] w-full rounded border border-zinc-200 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 editor-frame">
          {selected ? (
            <EditorContent editor={editor} />
          ) : (
            <div className="text-zinc-500">
              Select or create a page to start editing.
            </div>
          )}
        </div>

        {/* Scoped styles for links and mentions */}
        <style>{`
          .editor-frame a {
            text-decoration: underline;
            cursor: pointer;
            color: inherit;
          }
          .editor-frame a:hover {
            opacity: 0.85;
          }
          .editor-frame .mention {
            background-color: #e0f2fe;
            color: #0369a1;
            padding: 2px 4px;
            border-radius: 4px;
            font-weight: 500;
            cursor: pointer;
          }
          .editor-frame .mention:hover {
            background-color: #bae6fd;
          }
          .dark .editor-frame .mention {
            background-color: #1e3a5f;
            color: #7dd3fc;
          }
          .dark .editor-frame .mention:hover {
            background-color: #2d4a6f;
          }
        `}</style>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => {
              if (!selected) return;
              const newTitle = prompt("Rename page", selected.title);
              if (newTitle && newTitle.trim()) renameSelected(newTitle.trim());
            }}
            className="rounded px-3 py-2 text-sm hover:bg-zinc-100"
          >
            Rename
          </button>
          <button
            onClick={deletePage}
            className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:opacity-90"
          >
            Delete Page
          </button>
        </div>
      </main>

      {/* Version History Panel */}
      {historyOpen && (
        <aside className="w-80 shrink-0 border-l border-zinc-200 dark:border-zinc-700 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Version History</h3>
            <button
              onClick={() => {
                setHistoryOpen(false);
                setSelectedVersion(null);
              }}
              className="text-sm text-zinc-500 hover:text-zinc-700"
            >
              Close
            </button>
          </div>

          {selectedVersion ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedVersion(null)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  ← Back to list
                </button>
              </div>

              <div className="rounded border border-zinc-200 p-3 dark:border-zinc-700">
                <div className="mb-2 text-sm font-semibold">
                  Version {selectedVersion.version}
                </div>
                <div className="text-xs text-zinc-500">
                  {new Date(selectedVersion.createdAt).toLocaleString()}
                </div>
                <div className="mt-2 text-sm font-medium">
                  {selectedVersion.title}
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto rounded border border-zinc-200 p-3 text-sm dark:border-zinc-700">
                <div
                  dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                />
              </div>

              <button
                onClick={() => restoreVersion(selectedVersion.id)}
                className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Restore this version
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.length === 0 ? (
                <div className="text-sm text-zinc-500">
                  No versions saved yet. Save the page to create a version.
                </div>
              ) : (
                versions.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => previewVersion(v.id)}
                    className="cursor-pointer rounded border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        Version {v.version}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {new Date(v.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {v.title}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
