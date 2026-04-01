"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getCurrentUserId } from "@/lib/supabase/audit";

type TermRow = Record<string, unknown>;

type TermsManagerProps = {
  rows: TermRow[];
  hasError: boolean;
  termTypeMap: Record<string, string>;
};

const TABLE_NAME = "terms";
const PAGE_SIZE = 6;
const ID_KEYS = ["id", "term_id", "uuid"];
const NAME_KEYS = ["name", "term", "title", "word"];
const TYPE_KEYS = [
  "part_of_speech",
  "part_of_speech_label",
  "term_type_id",
  "term_type",
  "type",
  "pos",
  "category",
];
const PRIORITY_KEYS = ["priority", "priority_score", "rank", "order", "weight"];
const DEFINITION_KEYS = [
  "definition",
  "meaning",
  "description",
  "summary",
  "details",
];
const EXAMPLE_KEYS = [
  "example",
  "example_text",
  "usage_example",
  "usage",
  "example_sentence",
];
const CREATED_KEYS = [
  "created_datetime_utc",
  "created_at",
  "created_on",
  "timestamp",
];

function pickValue(row: TermRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return null;
}

function resolveKey(rows: TermRow[], keys: string[], fallback: string) {
  return keys.find((key) => rows.some((row) => row[key] != null)) ?? fallback;
}

function getRowId(row: TermRow) {
  for (const key of ID_KEYS) {
    if (row[key] !== null && row[key] !== undefined) {
      return { key, value: row[key] };
    }
  }
  return null;
}

function formatTimestamp(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function coercePriority(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isNaN(num)) return num;
  return trimmed;
}

function normalizeText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sortRows(
  rows: TermRow[],
  nameKey: string | null,
  createdKey: string | null
) {
  return [...rows].sort((a, b) => {
    if (nameKey) {
      const aName = String(a[nameKey] ?? "").toLowerCase();
      const bName = String(b[nameKey] ?? "").toLowerCase();
      const nameCompare = aName.localeCompare(bName);
      if (nameCompare !== 0) return nameCompare;
    }
    if (!createdKey) return 0;
    const aVal = a[createdKey];
    const bVal = b[createdKey];
    const aTime = typeof aVal === "string" ? new Date(aVal).getTime() : 0;
    const bTime = typeof bVal === "string" ? new Date(bVal).getTime() : 0;
    return bTime - aTime;
  });
}

function buildNameLookup(termTypeMap: Record<string, string>) {
  const nameLookup: Record<string, string> = {};
  for (const [id, name] of Object.entries(termTypeMap)) {
    if (name) nameLookup[name.toLowerCase()] = id;
  }
  return nameLookup;
}

function formatTypeValue(
  value: unknown,
  termTypeMap: Record<string, string>
) {
  if (value === null || value === undefined || value === "") return "—";
  const key = String(value);
  return termTypeMap[key] ?? key;
}

function coerceTermTypeValue(
  value: string | null,
  typeKey: string,
  nameLookup: Record<string, string>
) {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const fromName = nameLookup[trimmed.toLowerCase()];
  if (fromName) return fromName;
  if (typeKey.toLowerCase().includes("id")) {
    const num = Number(trimmed);
    if (!Number.isNaN(num)) return num;
  }
  return trimmed;
}

export default function TermsManager({
  rows,
  hasError,
  termTypeMap,
}: TermsManagerProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [localRows, setLocalRows] = useState(rows);
  const [currentPage, setCurrentPage] = useState(1);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [newExample, setNewExample] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftType, setDraftType] = useState("");
  const [draftPriority, setDraftPriority] = useState("");
  const [draftDefinition, setDraftDefinition] = useState("");
  const [draftExample, setDraftExample] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const nameKey = useMemo(
    () => resolveKey(localRows, NAME_KEYS, NAME_KEYS[0]),
    [localRows]
  );
  const typeKey = useMemo(
    () => resolveKey(localRows, TYPE_KEYS, TYPE_KEYS[0]),
    [localRows]
  );
  const priorityKey = useMemo(
    () => resolveKey(localRows, PRIORITY_KEYS, PRIORITY_KEYS[0]),
    [localRows]
  );
  const definitionKey = useMemo(
    () => resolveKey(localRows, DEFINITION_KEYS, DEFINITION_KEYS[0]),
    [localRows]
  );
  const exampleKey = useMemo(
    () => resolveKey(localRows, EXAMPLE_KEYS, EXAMPLE_KEYS[0]),
    [localRows]
  );
  const createdKey = useMemo(
    () => resolveKey(localRows, CREATED_KEYS, CREATED_KEYS[0]),
    [localRows]
  );

  const nameLookup = useMemo(() => buildNameLookup(termTypeMap), [termTypeMap]);
  const sortedRows = useMemo(
    () => sortRows(localRows, nameKey, createdKey),
    [localRows, nameKey, createdKey]
  );

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageRows = sortedRows.slice(startIndex, startIndex + PAGE_SIZE);

  useEffect(() => {
    if (currentPage !== safePage) {
      setCurrentPage(safePage);
    }
  }, [currentPage, safePage]);

  const startEditing = (row: TermRow) => {
    const rowId = getRowId(row);
    if (!rowId) {
      setErrorMessage("Cannot edit rows without an id or uuid.");
      return;
    }
    const rowKey = `${rowId.key}:${String(rowId.value)}`;
    setEditingKey(rowKey);
    setDraftName(String(pickValue(row, NAME_KEYS) ?? ""));
    setDraftType(String(pickValue(row, TYPE_KEYS) ?? ""));
    setDraftPriority(String(pickValue(row, PRIORITY_KEYS) ?? ""));
    setDraftDefinition(String(pickValue(row, DEFINITION_KEYS) ?? ""));
    setDraftExample(String(pickValue(row, EXAMPLE_KEYS) ?? ""));
    setErrorMessage(null);
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setDraftName("");
    setDraftType("");
    setDraftPriority("");
    setDraftDefinition("");
    setDraftExample("");
    setErrorMessage(null);
  };

  const handleCreate = useCallback(async () => {
    const normalizedName = normalizeText(newName);

    if (!normalizedName) {
      setErrorMessage("Enter a term name to add.");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    const userId = await getCurrentUserId(supabase);
    if (!userId) {
      setErrorMessage("You must be signed in to add terms.");
      setIsCreating(false);
      return;
    }

    const payload: Record<string, unknown> = {
      [nameKey]: normalizedName,
      created_by_user_id: userId,
      modified_by_user_id: userId,
    };

    const typeValue = normalizeText(newType);
    const definitionValue = normalizeText(newDefinition);
    const exampleValue = normalizeText(newExample);
    const priorityValue = coercePriority(newPriority);

    if (typeValue !== null) {
      payload[typeKey] = coerceTermTypeValue(typeValue, typeKey, nameLookup);
    }
    if (priorityValue !== null) payload[priorityKey] = priorityValue;
    if (definitionValue !== null) payload[definitionKey] = definitionValue;
    if (exampleValue !== null) payload[exampleKey] = exampleValue;

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      setErrorMessage("Failed to add term.");
      setIsCreating(false);
      return;
    }

    setLocalRows((prev) => [data as TermRow, ...prev]);
    setNewName("");
    setNewType("");
    setNewPriority("");
    setNewDefinition("");
    setNewExample("");
    setIsCreating(false);
  }, [
    exampleKey,
    nameKey,
    nameLookup,
    newDefinition,
    newExample,
    newName,
    newPriority,
    newType,
    priorityKey,
    definitionKey,
    typeKey,
    supabase,
  ]);

  const handleSave = useCallback(
    async (row: TermRow) => {
      const rowId = getRowId(row);
      if (!rowId) {
        setErrorMessage("Cannot save rows without an id or uuid.");
        return;
      }

      const normalizedName = normalizeText(draftName);
      if (!normalizedName) {
        setErrorMessage("Enter a term name to save.");
        return;
      }

      const rowKey = `${rowId.key}:${String(rowId.value)}`;
      setSavingKey(rowKey);
      setErrorMessage(null);

      const userId = await getCurrentUserId(supabase);
      if (!userId) {
        setErrorMessage("You must be signed in to save terms.");
        setSavingKey(null);
        return;
      }

      const payload: Record<string, unknown> = {
        [nameKey]: normalizedName,
        [typeKey]: coerceTermTypeValue(
          normalizeText(draftType),
          typeKey,
          nameLookup
        ),
        [priorityKey]: coercePriority(draftPriority),
        [definitionKey]: normalizeText(draftDefinition),
        [exampleKey]: normalizeText(draftExample),
        modified_by_user_id: userId,
      };

      const { error } = await supabase
        .from(TABLE_NAME)
        .update(payload)
        .eq(rowId.key, rowId.value);

      if (error) {
        setErrorMessage("Failed to save term.");
        setSavingKey(null);
        return;
      }

      setLocalRows((prev) =>
        prev.map((item) => {
          const itemId = getRowId(item);
          if (!itemId) return item;
          if (
            itemId.key === rowId.key &&
            String(itemId.value) === String(rowId.value)
          ) {
            return {
              ...item,
              [nameKey]: normalizedName,
              [typeKey]: coerceTermTypeValue(
                normalizeText(draftType),
                typeKey,
                nameLookup
              ),
              [priorityKey]: coercePriority(draftPriority),
              [definitionKey]: normalizeText(draftDefinition),
              [exampleKey]: normalizeText(draftExample),
            };
          }
          return item;
        })
      );

      setSavingKey(null);
      setEditingKey(null);
      setDraftName("");
      setDraftType("");
      setDraftPriority("");
      setDraftDefinition("");
      setDraftExample("");
    },
    [
      draftDefinition,
      draftExample,
      draftName,
      draftPriority,
      draftType,
      exampleKey,
      nameKey,
      nameLookup,
      priorityKey,
      definitionKey,
      typeKey,
      supabase,
    ]
  );

  const handleDelete = useCallback(
    async (row: TermRow) => {
      const rowId = getRowId(row);
      if (!rowId) {
        setErrorMessage("Cannot delete rows without an id or uuid.");
        return;
      }

      const confirmed = window.confirm(
        "Are you sure you want to remove this term?"
      );
      if (!confirmed) return;

      const rowKey = `${rowId.key}:${String(rowId.value)}`;
      setDeletingKey(rowKey);
      setErrorMessage(null);

      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq(rowId.key, rowId.value);

      if (error) {
        setErrorMessage("Failed to delete term.");
        setDeletingKey(null);
        return;
      }

      setLocalRows((prev) =>
        prev.filter((item) => {
          const itemId = getRowId(item);
          if (!itemId) return true;
          return !(
            itemId.key === rowId.key &&
            String(itemId.value) === String(rowId.value)
          );
        })
      );
      if (editingKey === rowKey) {
        cancelEditing();
      }
      setDeletingKey(null);
    },
    [editingKey, supabase]
  );

  return (
    <section className="space-y-5 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950/90 to-zinc-900/40 p-6 text-sm text-zinc-300 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      {hasError && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
          Failed to load terms due to RLS policies.
        </div>
      )}
      {errorMessage && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Term
            </span>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="e.g. Aura"
              className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Term Type
            </span>
            <input
              value={newType}
              onChange={(event) => setNewType(event.target.value)}
              placeholder="e.g. Adjective or 1"
              className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Priority
            </span>
            <input
              value={newPriority}
              onChange={(event) => setNewPriority(event.target.value)}
              placeholder="e.g. 0"
              className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 outline-none"
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Definition
            </span>
            <input
              value={newDefinition}
              onChange={(event) => setNewDefinition(event.target.value)}
              placeholder="Definition"
              className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 outline-none"
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Example
            </span>
            <input
              value={newExample}
              onChange={(event) => setNewExample(event.target.value)}
              placeholder="Example sentence"
              className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={isCreating}
              className="w-full rounded-2xl border border-blue-500/40 bg-blue-500/80 px-5 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-60"
            >
              {isCreating ? "Adding..." : "+ Add"}
            </button>
          </div>
        </div>
      </div>

      {pageRows.length === 0 && !hasError ? (
        <div className="rounded-2xl border border-zinc-800 bg-black/40 px-4 py-6 text-sm text-zinc-500">
          No terms configured yet.
        </div>
      ) : (
        <div className="space-y-3">
          {pageRows.map((row) => {
            const rowId = getRowId(row);
            const rowKey = rowId
              ? `${rowId.key}:${String(rowId.value)}`
              : JSON.stringify(row);
            const isEditing = editingKey === rowKey;
            const isSaving = savingKey === rowKey;
            const isDeleting = deletingKey === rowKey;
            const nameValue = pickValue(row, NAME_KEYS);
            const typeValue = pickValue(row, TYPE_KEYS);
            const priorityValue = pickValue(row, PRIORITY_KEYS);
            const definitionValue = pickValue(row, DEFINITION_KEYS);
            const exampleValue = pickValue(row, EXAMPLE_KEYS);
            const createdValue = pickValue(row, CREATED_KEYS);
            const nameLabel =
              nameValue === null || nameValue === undefined || nameValue === ""
                ? "Untitled"
                : String(nameValue);
            const priorityLabel =
              priorityValue === null ||
              priorityValue === undefined ||
              priorityValue === ""
                ? "—"
                : String(priorityValue);
            const definitionLabel =
              definitionValue === null ||
              definitionValue === undefined ||
              definitionValue === ""
                ? "No definition provided for this term."
                : String(definitionValue);
            const exampleLabel =
              exampleValue === null ||
              exampleValue === undefined ||
              exampleValue === ""
                ? "—"
                : String(exampleValue);

            return (
              <div
                key={rowKey}
                className="rounded-2xl border border-zinc-800 bg-black/40 px-5 py-4 text-zinc-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {isEditing ? (
                        <input
                          value={draftName}
                          onChange={(event) => setDraftName(event.target.value)}
                          className="min-w-[180px] rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 outline-none"
                        />
                      ) : (
                        <h3 className="text-xl font-semibold text-zinc-100">
                          {nameLabel}
                        </h3>
                      )}
                      {isEditing ? (
                        <input
                          value={draftType}
                          onChange={(event) => setDraftType(event.target.value)}
                          className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs text-zinc-100 outline-none"
                        />
                      ) : (
                        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                          {formatTypeValue(typeValue, termTypeMap)}
                        </span>
                      )}
                      {isEditing ? (
                        <input
                          value={draftPriority}
                          onChange={(event) =>
                            setDraftPriority(event.target.value)
                          }
                          className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs text-zinc-100 outline-none"
                        />
                      ) : (
                        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                          Priority: {priorityLabel}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-zinc-200">
                      {isEditing ? (
                        <textarea
                          value={draftDefinition}
                          onChange={(event) =>
                            setDraftDefinition(event.target.value)
                          }
                          rows={2}
                          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 outline-none"
                        />
                      ) : (
                        <p>
                          {definitionLabel}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-zinc-400">
                      {isEditing ? (
                        <textarea
                          value={draftExample}
                          onChange={(event) =>
                            setDraftExample(event.target.value)
                          }
                          rows={2}
                          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 outline-none"
                        />
                      ) : (
                        <p>
                          <span className="font-semibold text-zinc-200">
                            Example:
                          </span>{" "}
                          {exampleLabel}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">
                      Created {formatTimestamp(String(createdValue ?? ""))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-zinc-400">
        <span>
          Showing {pageRows.length === 0 ? 0 : startIndex + 1}–
          {Math.min(startIndex + PAGE_SIZE, sortedRows.length)} of{" "}
          {sortedRows.length} terms
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={safePage === 1}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs text-zinc-500">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={safePage === totalPages}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
