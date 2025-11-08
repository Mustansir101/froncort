"use client";

import React, { useEffect, useState } from "react";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialTitle?: string;
  onClose: () => void;
  onSave: (title: string) => void;
};

export default function ColumnDialog({
  open,
  mode,
  initialTitle = "",
  onClose,
  onSave,
}: Props) {
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    if (open) setTitle(initialTitle);
  }, [open, initialTitle]);

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {mode === "create" ? "Create column" : "Edit column"}
        </h3>

        <label className="mb-2 block text-sm text-zinc-700 dark:text-zinc-300">
          Name
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-4 w-full rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          placeholder="Column name"
          autoFocus
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setTitle("");
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
            {mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
