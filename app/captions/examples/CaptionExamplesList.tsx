"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getCurrentUserId } from "@/lib/supabase/audit";

type CaptionExampleRow = {
  id: string | number;
  caption?: string | null;
  content?: string | null;
  caption_text?: string | null;
  example_text?: string | null;
  text?: string | null;
  image_description?: string | null;
  image_context?: string | null;
  description?: string | null;
  explanation?: string | null;
  explanation_text?: string | null;
  reason?: string | null;
};

type CaptionExamplesListProps = {
  rows: CaptionExampleRow[];
  hasError: boolean;
};

type EditableFieldKey =
  | "caption"
  | "content"
  | "caption_text"
  | "example_text"
  | "text";

type DescriptionFieldKey = "image_description" | "image_context" | "description";

type ExplanationFieldKey = "explanation" | "explanation_text" | "reason";

function getCaptionText(row: CaptionExampleRow) {
  return (
    row.caption ??
    row.content ??
    row.caption_text ??
    row.example_text ??
    row.text ??
    null
  );
}

function getCaptionKey(row: CaptionExampleRow): EditableFieldKey {
  if ("caption" in row) return "caption";
  if ("content" in row) return "content";
  if ("caption_text" in row) return "caption_text";
  if ("example_text" in row) return "example_text";
  if ("text" in row) return "text";
  return "caption";
}

function getImageDescription(row: CaptionExampleRow) {
  return row.image_description ?? row.image_context ?? row.description ?? null;
}

function getDescriptionKey(row: CaptionExampleRow): DescriptionFieldKey {
  if ("image_description" in row) return "image_description";
  if ("image_context" in row) return "image_context";
  if ("description" in row) return "description";
  return "image_description";
}

function getExplanation(row: CaptionExampleRow) {
  return row.explanation ?? row.explanation_text ?? row.reason ?? null;
}

function getExplanationKey(row: CaptionExampleRow): ExplanationFieldKey {
  if ("explanation" in row) return "explanation";
  if ("explanation_text" in row) return "explanation_text";
  if ("reason" in row) return "reason";
  return "explanation";
}

export default function CaptionExamplesList({
  rows,
  hasError,
}: CaptionExamplesListProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [localRows, setLocalRows] = useState(rows);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [draftCaption, setDraftCaption] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftExplanation, setDraftExplanation] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createCaption, setCreateCaption] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createExplanation, setCreateExplanation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return localRows;
    return localRows.filter((row) =>
      String(getCaptionText(row) ?? "").toLowerCase().includes(q)
    );
  }, [localRows, searchQuery]);

  const startEditing = (row: CaptionExampleRow) => {
    setEditingId(row.id);
    setDraftCaption(getCaptionText(row) ?? "");
    setDraftDescription(getImageDescription(row) ?? "");
    setDraftExplanation(getExplanation(row) ?? "");
    setErrorMessage(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftCaption("");
    setDraftDescription("");
    setDraftExplanation("");
    setErrorMessage(null);
  };

  const handleSave = useCallback(
    async (row: CaptionExampleRow) => {
      setIsSaving(true);
      setErrorMessage(null);

      const userId = await getCurrentUserId(supabase);
      if (!userId) {
        setErrorMessage("You must be signed in to save caption examples.");
        setIsSaving(false);
        return;
      }

      const captionKey = getCaptionKey(row);
      const descriptionKey = getDescriptionKey(row);
      const explanationKey = getExplanationKey(row);

      const updates: Record<string, string | null> = {
        [captionKey]: draftCaption.trim() || null,
        [descriptionKey]: draftDescription.trim() || null,
        [explanationKey]: draftExplanation.trim() || null,
        modified_by_user_id: userId,
      };

      const { error } = await supabase
        .from("caption_examples")
        .update(updates)
        .eq("id", row.id);

      if (error) {
        setErrorMessage("Failed to save caption example.");
        setIsSaving(false);
        return;
      }

      setLocalRows((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                [captionKey]: updates[captionKey],
                [descriptionKey]: updates[descriptionKey],
                [explanationKey]: updates[explanationKey],
              }
            : item
        )
      );
      setIsSaving(false);
      setEditingId(null);
    },
    [supabase, draftCaption, draftDescription, draftExplanation]
  );

  const handleDelete = useCallback(
    async (row: CaptionExampleRow) => {
      const confirmed = window.confirm(
        "Are you sure you want to delete this caption example?"
      );
      if (!confirmed) return;

      setIsDeleting(true);
      setErrorMessage(null);

      const { error } = await supabase
        .from("caption_examples")
        .delete()
        .eq("id", row.id);

      if (error) {
        setErrorMessage("Failed to delete caption example.");
        setIsDeleting(false);
        return;
      }

      setLocalRows((prev) => prev.filter((item) => item.id !== row.id));
      if (expandedId === row.id) {
        setExpandedId(null);
      }
      if (editingId === row.id) {
        cancelEditing();
      }
      setIsDeleting(false);
    },
    [supabase, expandedId, editingId]
  );

  const handleCreate = useCallback(async () => {
    setIsCreating(true);
    setErrorMessage(null);

    const userId = await getCurrentUserId(supabase);
    if (!userId) {
      setErrorMessage("You must be signed in to create caption examples.");
      setIsCreating(false);
      return;
    }

    const payload = {
      caption: createCaption.trim() || null,
      image_description: createDescription.trim() || null,
      explanation: createExplanation.trim() || null,
      created_by_user_id: userId,
      modified_by_user_id: userId,
    };

    const { data, error } = await supabase
      .from("caption_examples")
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      setErrorMessage("Failed to create caption example.");
      setIsCreating(false);
      return;
    }

    setLocalRows((prev) => [data as CaptionExampleRow, ...prev]);
    setCreateOpen(false);
    setCreateCaption("");
    setCreateDescription("");
    setCreateExplanation("");
    setIsCreating(false);
  }, [supabase, createCaption, createDescription, createExplanation]);

  return (
    <section className="space-y-5 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950/90 to-zinc-900/40 p-6 text-sm text-zinc-300 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      {hasError && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
          Failed to load caption examples due to RLS policies.
        </div>
      )}
      {errorMessage && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="flex w-72 items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs text-zinc-400">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search captions..."
              className="w-full bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setCreateOpen(true);
              setErrorMessage(null);
            }}
            className="rounded-2xl border border-blue-500/40 bg-blue-500/80 px-4 py-2 text-sm font-semibold text-zinc-900"
          >
            + Add Caption Example
          </button>
        </div>
      </div>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-8"
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  New Caption Example
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  Add a new caption example.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-200"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  Caption
                </label>
                <input
                  value={createCaption}
                  onChange={(event) => setCreateCaption(event.target.value)}
                  placeholder="Caption text..."
                  className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  Image Description
                </label>
                <textarea
                  value={createDescription}
                  onChange={(event) =>
                    setCreateDescription(event.target.value)
                  }
                  rows={3}
                  placeholder="Describe the image..."
                  className="mt-2 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  Explanation
                </label>
                <textarea
                  value={createExplanation}
                  onChange={(event) =>
                    setCreateExplanation(event.target.value)
                  }
                  rows={3}
                  placeholder="Explain why this is funny..."
                  className="mt-2 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={isCreating}
                  className="rounded-full border border-emerald-500/40 bg-emerald-500/80 px-4 py-2 text-xs font-semibold text-zinc-900 disabled:opacity-60"
                >
                  {isCreating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredRows.length === 0 && !hasError && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-6 text-sm text-zinc-500">
            No caption examples found.
          </div>
        )}
        {filteredRows.map((row) => {
          const captionText = getCaptionText(row) ?? "Untitled caption";
          const imageDescription = getImageDescription(row) ?? "—";
          const explanation = getExplanation(row) ?? "—";
          const isOpen = expandedId === row.id;
          const isEditing = editingId === row.id;

          return (
            <div
              key={String(row.id)}
              className="rounded-2xl border border-zinc-800 bg-black/40 px-4 py-4 text-zinc-200"
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-zinc-400">{row.id}</div>
                    <div className="text-base font-semibold text-zinc-100">
                    {isEditing ? (
                      <input
                        value={draftCaption}
                        onChange={(event) =>
                          setDraftCaption(event.target.value)
                        }
                        className="w-full min-w-[240px] max-w-[560px] rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 outline-none"
                      />
                    ) : (
                      captionText
                    )}
                    </div>
                  </div>
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : row.id)}
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200"
                >
                  {isOpen ? "Collapse" : "Expand"}
                </button>
              </div>

              {isOpen && (
                <div className="mt-5 space-y-4 text-sm text-zinc-300">
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">
                      Image Description:
                    </div>
                    {isEditing ? (
                      <textarea
                        value={draftDescription}
                        onChange={(event) =>
                          setDraftDescription(event.target.value)
                        }
                        rows={3}
                        className="mt-2 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                      />
                    ) : (
                      <div className="mt-2 text-zinc-200">
                        {imageDescription}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">
                      Explanation:
                    </div>
                    {isEditing ? (
                      <textarea
                        value={draftExplanation}
                        onChange={(event) =>
                          setDraftExplanation(event.target.value)
                        }
                        rows={3}
                        className="mt-2 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                      />
                    ) : (
                      <div className="mt-2 text-zinc-200">{explanation}</div>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSave(row)}
                          disabled={isSaving}
                          className="rounded-full border border-emerald-500/40 bg-emerald-500/80 px-4 py-2 text-xs font-semibold text-zinc-900 disabled:opacity-60"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditing(row)}
                          className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(row)}
                          disabled={isDeleting}
                          className="rounded-full border border-red-500/40 bg-red-500/80 px-4 py-2 text-xs font-semibold text-zinc-900 disabled:opacity-60"
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
