"use client";

import React, { useEffect, useState } from "react";
import CardDialog from "./CardDialog";
import ColumnDialog from "./ColumnDialog";

type Card = {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  labels?: string[];
};

type Column = {
  id: string;
  title: string;
  cards: Card[];
};

const DEFAULT_COLUMNS: Column[] = [
  { id: "todo", title: "To do", cards: [] },
  { id: "inprogress", title: "In progress", cards: [] },
  { id: "done", title: "Done", cards: [] },
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function KanbanBoard({ projectId }: { projectId: string }) {
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [newTitle, setNewTitle] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogColumnId, setDialogColumnId] = useState<string | undefined>();
  const [dialogCard, setDialogCard] = useState<Card | null>(null);
  const [colDialogOpen, setColDialogOpen] = useState(false);
  const [colDialogMode, setColDialogMode] = useState<"create" | "edit">(
    "create"
  );
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{
    cardId: string;
    fromId: string;
  } | null>(null);
  const [dragOver, setDragOver] = useState<{
    colId: string;
    index: number;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${projectId}/board`);
        if (!res.ok) throw new Error("Failed to load board");
        const cols: Column[] = await res.json();
        if (mounted) setColumns(cols);
      } catch (err: any) {
        console.error(err);
        if (mounted) setError(err?.message ?? "Failed to load board");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  async function handleAdd(columnId: string) {
    setDialogMode("create");
    setDialogColumnId(columnId);
    setDialogCard(null);
    setDialogOpen(true);
  }

  function handleDragStart(e: React.DragEvent, cardId: string, fromId: string) {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ cardId, fromId })
    );
    e.dataTransfer.effectAllowed = "move";
    setDragging({ cardId, fromId });
    setDragOver(null);
  }

  function handleCardDragOver(
    e: React.DragEvent,
    colId: string,
    cardIndex: number
  ) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const halfway = rect.top + rect.height / 2;
    const clientY = e.clientY;
    const index = clientY < halfway ? cardIndex : cardIndex + 1;
    setDragOver({ colId, index });
  }

  function handleColumnDragOverEmpty(e: React.DragEvent, colId: string) {
    e.preventDefault();
    setDragOver({ colId, index: 0 });
  }

  async function handleDrop(e: React.DragEvent, toId: string) {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData("application/json");
      let cardId = dragging?.cardId;
      let fromId = dragging?.fromId;
      if (!cardId && raw) {
        const parsed = JSON.parse(raw) as { cardId: string; fromId: string };
        cardId = parsed.cardId;
        fromId = parsed.fromId;
      }
      if (!cardId || !fromId) return;

      const target = dragOver && dragOver.colId === toId ? dragOver.index : 0;

      let movedCard: Card | null = null;
      setColumns((prev) => {
        const next = prev.map((c) => ({ ...c, cards: [...c.cards] }));
        const fromCol = next.find((c) => c.id === fromId);
        const toCol = next.find((c) => c.id === toId);
        if (!fromCol || !toCol) return prev;
        const cardIndex = fromCol.cards.findIndex((x) => x.id === cardId);
        if (cardIndex === -1) return prev;
        movedCard = fromCol.cards.splice(cardIndex, 1)[0];
        const insertIndex = Math.min(Math.max(target, 0), toCol.cards.length);
        toCol.cards.splice(insertIndex, 0, movedCard!);
        return next;
      });

      const res = await fetch(`/api/projects/${projectId}/board`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardId, toColumnId: toId, toOrder: target }),
      });
      if (!res.ok) throw new Error("failed to move card");
    } catch (err) {
      console.error(err);
      alert("Failed to move card");
      try {
        const r = await fetch(`/api/projects/${projectId}/board`);
        if (r.ok) setColumns(await r.json());
      } catch {}
    } finally {
      setDragging(null);
      setDragOver(null);
    }
  }

  async function handleEditCard(card: Card, colId: string) {
    setDialogMode("edit");
    setDialogCard(card);
    setDialogColumnId(colId);
    setDialogOpen(true);
  }

  async function handleDeleteCard(card: Card, colId: string) {
    if (!confirm(`Delete card "${card.title}"?`)) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/board`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardId: card.id }),
      });
      if (!res.ok) throw new Error("failed to delete card");
      setColumns((prev) =>
        prev.map((c) =>
          c.id === colId
            ? { ...c, cards: c.cards.filter((x) => x.id !== card.id) }
            : c
        )
      );
    } catch (err) {
      console.error(err);
      alert("Failed to delete card");
    }
  }

  async function handleDialogSave(
    title: string,
    description?: string,
    columnId?: string,
    assignee?: string,
    dueDate?: string,
    labels?: string[]
  ) {
    if (dialogMode === "create") {
      try {
        const res = await fetch(`/api/projects/${projectId}/board`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            columnId: columnId ?? dialogColumnId,
            title,
            description,
            assignee,
            dueDate,
            labels,
          }),
        });
        if (!res.ok) throw new Error("failed to create card");
        const card: Card = await res.json();
        setColumns((prev) =>
          prev.map((c) =>
            c.id === (columnId ?? dialogColumnId)
              ? { ...c, cards: [card, ...c.cards] }
              : c
          )
        );
      } catch (err) {
        console.error(err);
        alert("Failed to create card");
      }
    } else if (dialogMode === "edit" && dialogCard) {
      try {
        const res = await fetch(`/api/projects/${projectId}/board`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            cardId: dialogCard.id,
            title,
            description,
            assignee,
            dueDate,
            labels,
          }),
        });
        if (!res.ok) throw new Error("failed to update card");
        const updated: Card = await res.json();
        setColumns((prev) =>
          prev.map((c) => ({
            ...c,
            cards: c.cards.map((x) => (x.id === updated.id ? updated : x)),
          }))
        );
      } catch (err) {
        console.error(err);
        alert("Failed to update card");
      }
    }
  }

  async function handleDialogDelete() {
    if (!dialogCard) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/board`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardId: dialogCard.id }),
      });
      if (!res.ok) throw new Error("failed to delete card");
      setColumns((prev) =>
        prev.map((c) =>
          c.id === dialogColumnId
            ? { ...c, cards: c.cards.filter((x) => x.id !== dialogCard.id) }
            : c
        )
      );
    } catch (err) {
      console.error(err);
      alert("Failed to delete card");
    }
  }

  async function handleCreateColumn(title: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/columns`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("failed to create column");
      const col: Column = await res.json();
      setColumns((prev) => [...prev, { ...col, cards: [] }]);
    } catch (err) {
      console.error(err);
      alert("Failed to create column");
    }
  }

  async function handleEditColumnSave(title: string) {
    if (!editingColumn) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/columns`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ columnId: editingColumn.id, title }),
      });
      if (!res.ok) throw new Error("failed to update column");
      const updated: Column = await res.json();
      setColumns((prev) =>
        prev.map((c) =>
          c.id === updated.id ? { ...c, title: updated.title } : c
        )
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update column");
    }
  }

  async function handleDeleteColumn(columnId: string) {
    if (!confirm("Delete this column and all its cards?")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/columns`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ columnId }),
      });
      if (!res.ok) throw new Error("failed to delete column");
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete column");
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto w-full min-h-[475px]">
      {columns.map((col) => (
        <div
          key={col.id}
          onDragOver={(e) =>
            col.cards.length === 0
              ? handleColumnDragOverEmpty(e, col.id)
              : e.preventDefault()
          }
          onDrop={(e) => handleDrop(e, col.id)}
          className="min-w-[320px] max-w-sm shrink-0 rounded border border-zinc-100 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <button
                onClick={() => {
                  setColDialogMode("edit");
                  setEditingColumn(col);
                  setColDialogOpen(true);
                }}
                className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 hover:underline"
                title="Edit column"
              >
                {col.title}
              </button>
              <button
                onClick={() => handleDeleteColumn(col.id)}
                title="Delete column"
                className="text-xs text-red-500 hover:text-red-700"
              >
                🗑
              </button>
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {col.cards.length}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {col.cards.map((card, i) => (
              <React.Fragment key={card.id}>
                {dragOver &&
                dragOver.colId === col.id &&
                dragOver.index === i ? (
                  <div className="h-2 w-full rounded bg-sky-300/60" />
                ) : null}

                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, card.id, col.id)}
                  onDragOver={(e) => handleCardDragOver(e, col.id, i)}
                  onDragEnd={() => {
                    setDragging(null);
                  }}
                  className={`group relative rounded border border-zinc-100 bg-zinc-50 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-800 ${
                    dragging?.cardId === card.id ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {card.title}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                      <button
                        onClick={() => handleEditCard(card, col.id)}
                        className="text-xs text-zinc-500 hover:text-zinc-700"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card, col.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  {card.description ? (
                    <div className="mb-2 text-xs text-zinc-600 dark:text-zinc-400">
                      {card.description}
                    </div>
                  ) : null}

                  {/* Labels */}
                  {card.labels && card.labels.length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {card.labels.map((label) => (
                        <span
                          key={label}
                          className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {/* Footer with assignee and due date */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
                    {card.assignee ? (
                      <div className="flex items-center gap-1" title="Assignee">
                        <span>👤</span>
                        <span>{card.assignee}</span>
                      </div>
                    ) : (
                      <div />
                    )}

                    {card.dueDate ? (
                      <div className="flex items-center gap-1" title="Due date">
                        <span>📅</span>
                        <span>
                          {new Date(card.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </React.Fragment>
            ))}

            {dragOver &&
            dragOver.colId === col.id &&
            dragOver.index === col.cards.length ? (
              <div className="h-2 w-full rounded bg-sky-300/60" />
            ) : null}
          </div>

          <div className="mt-3">
            <button
              onClick={() => {
                setDialogMode("create");
                setDialogColumnId(col.id);
                setDialogCard(null);
                setDialogOpen(true);
              }}
              className="w-full rounded border border-dashed border-zinc-200 px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              + Add card
            </button>
          </div>
        </div>
      ))}
      <div className="min-w-[320px] max-w-sm shrink-0 flex items-start">
        <button
          onClick={() => {
            setColDialogMode("create");
            setEditingColumn(null);
            setColDialogOpen(true);
          }}
          className="h-fit w-full rounded border border-dashed border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          + Add column
        </button>
      </div>
      <CardDialog
        open={dialogOpen}
        mode={dialogMode}
        initialTitle={dialogCard?.title}
        initialDescription={dialogCard?.description}
        initialAssignee={dialogCard?.assignee}
        initialDueDate={dialogCard?.dueDate}
        initialLabels={dialogCard?.labels}
        columnId={dialogColumnId}
        projectId={projectId}
        onClose={() => setDialogOpen(false)}
        onSave={handleDialogSave}
        onDelete={dialogMode === "edit" ? handleDialogDelete : undefined}
      />
      <ColumnDialog
        open={colDialogOpen}
        mode={colDialogMode}
        initialTitle={editingColumn?.title}
        onClose={() => setColDialogOpen(false)}
        onSave={(title) =>
          colDialogMode === "create"
            ? handleCreateColumn(title)
            : handleEditColumnSave(title)
        }
      />
    </div>
  );
}
