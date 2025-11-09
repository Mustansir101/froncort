"use client";

import React, { useEffect, useState } from "react";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialTitle?: string;
  initialDescription?: string;
  initialAssignee?: string;
  initialDueDate?: string;
  initialLabels?: string[];
  columnId?: string;
  projectId?: string;
  onClose: () => void;
  onSave: (
    title: string,
    description?: string,
    columnId?: string,
    assignee?: string,
    dueDate?: string,
    labels?: string[]
  ) => void;
  onDelete?: () => void;
};

export default function CardDialog({
  open,
  mode,
  initialTitle = "",
  initialDescription = "",
  initialAssignee = "",
  initialDueDate = "",
  initialLabels = [],
  columnId,
  projectId,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [assignee, setAssignee] = useState(initialAssignee);
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [labels, setLabels] = useState<string[]>(initialLabels);
  const [labelInput, setLabelInput] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [prevOpen, setPrevOpen] = useState(open);

  // Only reset form when dialog opens (not on every prop change)
  useEffect(() => {
    if (open && !prevOpen) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      setAssignee(initialAssignee);
      setDueDate(initialDueDate);
      setLabels(initialLabels || []);
    }
    setPrevOpen(open);
  }, [
    open,
    prevOpen,
    initialTitle,
    initialDescription,
    initialAssignee,
    initialDueDate,
    initialLabels,
  ]);

  // Fetch members for assignee dropdown
  useEffect(() => {
    if (open && projectId) {
      fetch(`/api/projects/${encodeURIComponent(projectId)}/members`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setMembers(data || []))
        .catch(() => setMembers([]));
    }
  }, [open, projectId]);

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(
      title.trim(),
      description?.trim() || undefined,
      columnId,
      assignee || undefined,
      dueDate || undefined,
      labels.length > 0 ? labels : undefined
    );
    onClose();
  }

  function addLabel() {
    if (labelInput.trim() && !labels.includes(labelInput.trim())) {
      setLabels([...labels, labelInput.trim()]);
      setLabelInput("");
    }
  }

  function removeLabel(label: string) {
    setLabels(labels.filter((l) => l !== label));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={submit}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {mode === "create" ? "Create card" : "Edit card"}
        </h3>

        <label className="mb-2 block text-sm text-zinc-700 dark:text-zinc-300">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-4 w-full rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          placeholder="Card title"
          autoFocus
        />

        <label className="mb-2 block text-sm text-zinc-700 dark:text-zinc-300">
          Description (optional)
        </label>
        <textarea
          value={description || ""}
          onChange={(e) => setDescription(e.target.value)}
          className="mb-4 w-full rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          placeholder="Details"
          rows={4}
        />

        <label className="mb-2 block text-sm text-zinc-700 dark:text-zinc-300">
          Assignee (optional)
        </label>
        <select
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="mb-4 w-full rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        >
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>

        <label className="mb-2 block text-sm text-zinc-700 dark:text-zinc-300">
          Due Date (optional)
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="mb-4 w-full rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />

        <label className="mb-2 block text-sm text-zinc-700 dark:text-zinc-300">
          Labels
        </label>
        <div className="mb-2 flex flex-wrap gap-2">
          {labels.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              {label}
              <button
                type="button"
                onClick={() => removeLabel(label)}
                className="hover:text-blue-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mb-4 flex gap-2">
          <input
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLabel();
              }
            }}
            className="flex-1 rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            placeholder="Add label"
          />
          <button
            type="button"
            onClick={addLabel}
            className="rounded bg-zinc-100 px-3 py-2 text-sm hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            Add
          </button>
        </div>

        <div className="flex justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setTitle("");
                setDescription("");
                setAssignee("");
                setDueDate("");
                setLabels([]);
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

          {mode === "edit" && onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (confirm("Delete this card?")) {
                  onDelete();
                  onClose();
                }
              }}
              className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:opacity-90"
            >
              Delete
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
