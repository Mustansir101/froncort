"use client";

import React, { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => void;
};

export default function AddProjectDialog({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  if (!open) return null;

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim() || undefined);
    setName("");
    setDescription("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleCreate}
        className="w-full max-w-md rounded bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Create new project
        </h3>

        <label className="mb-2 block text-sm text-zinc-700 dark:text-zinc-300">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          placeholder="Project name"
          autoFocus
        />

        <label className="mb-2 block text-sm text-zinc-700 dark:text-zinc-300">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mb-4 w-full rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          placeholder="Short description"
          rows={3}
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setName("");
              setDescription("");
              onClose();
            }}
            className="rounded px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-95"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
