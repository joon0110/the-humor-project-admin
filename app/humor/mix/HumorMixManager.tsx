"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getCurrentUserId } from "@/lib/supabase/audit";

type HumorFlavorRow = Record<string, unknown>;
type HumorMixRow = Record<string, unknown>;

type HumorMixManagerProps = {
  flavors: HumorFlavorRow[];
  mixRows: HumorMixRow[];
  hasFlavorError: boolean;
  hasMixError: boolean;
  mixTableName: string | null;
};

const FLAVOR_ID_KEYS = ["id", "flavor_id", "humor_flavor_id", "uuid"];
const FLAVOR_SLUG_KEYS = ["slug", "name", "flavor", "humor_flavor"];
const FLAVOR_DESCRIPTION_KEYS = [
  "description",
  "summary",
  "details",
  "prompt",
  "notes",
];

const MIX_ID_KEYS = ["id", "mix_id", "uuid"];
const MIX_FLAVOR_ID_KEYS = [
  "humor_flavor_id",
  "humour_flavour_id",
  "flavor_id",
  "flavour_id",
  "humor_flavor",
  "humour_flavour",
  "humor_flavour",
];
const MIX_CAPTION_COUNT_KEYS = [
  "caption_count",
  "captionCount",
  "count",
  "caption_total",
  "caption_qty",
  "weight",
];
const MIX_CREATED_KEYS = [
  "created_datetime_utc",
  "created_at",
  "created_on",
  "timestamp",
];

function pickValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return null;
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
}

function formatTimestamp(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFlavorLabel(row: HumorFlavorRow) {
  const slug = pickValue(row, FLAVOR_SLUG_KEYS);
  if (slug) return String(slug);
  const id = pickValue(row, FLAVOR_ID_KEYS);
  return id ? String(id) : "Untitled flavor";
}

function getFlavorDescription(row: HumorFlavorRow) {
  const description = pickValue(row, FLAVOR_DESCRIPTION_KEYS);
  return description ? String(description) : "";
}

function resolveKey<T extends Record<string, unknown>>(
  rows: T[],
  keys: string[],
  fallback: string
) {
  return keys.find((key) => rows.some((row) => row[key] != null)) ?? fallback;
}

function getRowIdentity(
  row: HumorMixRow,
  fallbackKey: string | null
): { key: string; value: string | number } | null {
  for (const key of MIX_ID_KEYS) {
    const value = row[key];
    if (value !== null && value !== undefined) {
      return { key, value: value as string | number };
    }
  }
  if (fallbackKey) {
    const value = row[fallbackKey];
    if (value !== null && value !== undefined) {
      return { key: fallbackKey, value: value as string | number };
    }
  }
  return null;
}

export default function HumorMixManager({
  flavors,
  mixRows,
  hasFlavorError,
  hasMixError,
  mixTableName,
}: HumorMixManagerProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [localMixRows, setLocalMixRows] = useState(mixRows);
  const [searchQuery, setSearchQuery] = useState("");
  const [mixSearchQuery, setMixSearchQuery] = useState("");
  const [selectedFlavor, setSelectedFlavor] = useState<HumorFlavorRow | null>(
    null
  );
  const [captionCount, setCaptionCount] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftCaption, setDraftCaption] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setLocalMixRows(mixRows);
  }, [mixRows]);

  const flavorIdKey = useMemo(
    () => resolveKey(localMixRows, MIX_FLAVOR_ID_KEYS, "humor_flavor_id"),
    [localMixRows]
  );
  const captionCountKey = useMemo(
    () => resolveKey(localMixRows, MIX_CAPTION_COUNT_KEYS, "caption_count"),
    [localMixRows]
  );
  const createdKey = useMemo(
    () => resolveKey(localMixRows, MIX_CREATED_KEYS, "created_at"),
    [localMixRows]
  );

  const flavorById = useMemo(() => {
    const map = new Map<string, HumorFlavorRow>();
    flavors.forEach((flavor) => {
      const id = pickValue(flavor, FLAVOR_ID_KEYS);
      if (id !== null && id !== undefined) {
        map.set(String(id), flavor);
      }
    });
    return map;
  }, [flavors]);

  const mixFlavorIds = useMemo(() => {
    return new Set(
      localMixRows
        .map((row) => pickValue(row, MIX_FLAVOR_ID_KEYS))
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value))
    );
  }, [localMixRows]);

  const availableCount = Math.max(
    0,
    flavors.length - mixFlavorIds.size
  );

  const filteredFlavors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return flavors;
    return flavors.filter((flavor) => {
      const slug = String(pickValue(flavor, FLAVOR_SLUG_KEYS) ?? "").toLowerCase();
      const description = String(
        pickValue(flavor, FLAVOR_DESCRIPTION_KEYS) ?? ""
      ).toLowerCase();
      return slug.includes(query) || description.includes(query);
    });
  }, [flavors, searchQuery]);

  const filteredMixRows = useMemo(() => {
    const query = mixSearchQuery.trim().toLowerCase();
    if (!query) return localMixRows;
    return localMixRows.filter((row) => {
      const flavorId = pickValue(row, MIX_FLAVOR_ID_KEYS);
      const flavor = flavorId ? flavorById.get(String(flavorId)) : null;
      if (flavor) {
        const label = getFlavorLabel(flavor).toLowerCase();
        if (label.includes(query)) return true;
        const desc = getFlavorDescription(flavor).toLowerCase();
        if (desc.includes(query)) return true;
      }
      return String(flavorId ?? "").toLowerCase().includes(query);
    });
  }, [localMixRows, mixSearchQuery, flavorById]);

  const sortedMixRows = useMemo(() => {
    return [...filteredMixRows].sort((a, b) => {
      const aFlavorId = pickValue(a, MIX_FLAVOR_ID_KEYS);
      const bFlavorId = pickValue(b, MIX_FLAVOR_ID_KEYS);
      const aFlavor = aFlavorId ? flavorById.get(String(aFlavorId)) : null;
      const bFlavor = bFlavorId ? flavorById.get(String(bFlavorId)) : null;
      const aLabel = aFlavor ? getFlavorLabel(aFlavor) : String(aFlavorId ?? "");
      const bLabel = bFlavor ? getFlavorLabel(bFlavor) : String(bFlavorId ?? "");
      return aLabel.localeCompare(bLabel);
    });
  }, [filteredMixRows, flavorById]);

  const handleAddToMix = useCallback(async () => {
    if (!mixTableName) {
      setErrorMessage("Mix table not available.");
      return;
    }
    if (!selectedFlavor) {
      setErrorMessage("Select a flavor to add.");
      return;
    }

    const flavorId = pickValue(selectedFlavor, FLAVOR_ID_KEYS);
    if (flavorId === null || flavorId === undefined) {
      setErrorMessage("Selected flavor is missing an id.");
      return;
    }

    if (mixFlavorIds.has(String(flavorId))) {
      setErrorMessage("That flavor is already in the mix.");
      return;
    }

    const countValue = captionCount.trim();
    if (!countValue) {
      setErrorMessage("Enter a caption count.");
      return;
    }

    const parsedCount = Number(countValue);
    if (!Number.isFinite(parsedCount) || parsedCount <= 0) {
      setErrorMessage("Caption count must be a positive number.");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    const userId = await getCurrentUserId(supabase);
    if (!userId) {
      setErrorMessage("You must be signed in to update the mix.");
      setIsCreating(false);
      return;
    }

    const { data, error } = await supabase
      .from(mixTableName)
      .insert({
        [flavorIdKey]: flavorId,
        [captionCountKey]: parsedCount,
        created_by_user_id: userId,
        modified_by_user_id: userId,
      })
      .select("*")
      .single();

    if (error || !data) {
      setErrorMessage("Failed to add flavor to mix.");
      setIsCreating(false);
      return;
    }

    setLocalMixRows((prev) => [data as HumorMixRow, ...prev]);
    setSelectedFlavor(null);
    setCaptionCount("");
    setIsCreating(false);
  }, [
    mixTableName,
    selectedFlavor,
    captionCount,
    mixFlavorIds,
    supabase,
    flavorIdKey,
    captionCountKey,
  ]);

  const handleSave = useCallback(
    async (row: HumorMixRow) => {
      if (!mixTableName) {
        setErrorMessage("Mix table not available.");
        return;
      }
      const identity = getRowIdentity(row, flavorIdKey);
      if (!identity) {
        setErrorMessage("Unable to update this mix row.");
        return;
      }
      const trimmed = draftCaption.trim();
      if (!trimmed) {
        setErrorMessage("Enter a caption count.");
        return;
      }
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setErrorMessage("Caption count must be a positive number.");
        return;
      }

      setIsSaving(true);
      setErrorMessage(null);

      const userId = await getCurrentUserId(supabase);
      if (!userId) {
        setErrorMessage("You must be signed in to update the mix.");
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from(mixTableName)
        .update({ [captionCountKey]: parsed, modified_by_user_id: userId })
        .eq(identity.key, identity.value);

      if (error) {
        setErrorMessage("Failed to update mix row.");
        setIsSaving(false);
        return;
      }

      setLocalMixRows((prev) =>
        prev.map((item) => {
          const itemIdentity = getRowIdentity(item, flavorIdKey);
          if (
            itemIdentity &&
            itemIdentity.key === identity.key &&
            String(itemIdentity.value) === String(identity.value)
          ) {
            return { ...item, [captionCountKey]: parsed };
          }
          return item;
        })
      );
      setIsSaving(false);
      setEditingKey(null);
      setDraftCaption("");
    },
    [
      mixTableName,
      flavorIdKey,
      captionCountKey,
      draftCaption,
      supabase,
    ]
  );

  const handleDelete = useCallback(
    async (row: HumorMixRow) => {
      if (!mixTableName) {
        setErrorMessage("Mix table not available.");
        return;
      }
      const identity = getRowIdentity(row, flavorIdKey);
      if (!identity) {
        setErrorMessage("Unable to delete this mix row.");
        return;
      }

      const confirmed = window.confirm(
        "Are you sure you want to remove this flavor from the mix?"
      );
      if (!confirmed) return;

      setIsDeleting(true);
      setErrorMessage(null);

      const { error } = await supabase
        .from(mixTableName)
        .delete()
        .eq(identity.key, identity.value);

      if (error) {
        setErrorMessage("Failed to remove mix row.");
        setIsDeleting(false);
        return;
      }

      setLocalMixRows((prev) =>
        prev.filter((item) => {
          const itemIdentity = getRowIdentity(item, flavorIdKey);
          if (!itemIdentity) return true;
          return !(
            itemIdentity.key === identity.key &&
            String(itemIdentity.value) === String(identity.value)
          );
        })
      );
      if (editingKey === String(identity.value)) {
        setEditingKey(null);
        setDraftCaption("");
      }
      setIsDeleting(false);
    },
    [mixTableName, flavorIdKey, supabase, editingKey]
  );

  const startEditing = (row: HumorMixRow) => {
    const identity = getRowIdentity(row, flavorIdKey);
    if (!identity) {
      setErrorMessage("Unable to edit this mix row.");
      return;
    }
    setEditingKey(String(identity.value));
    setDraftCaption(String(row[captionCountKey] ?? ""));
    setErrorMessage(null);
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setDraftCaption("");
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Humor Mix</h1>
          <p className="text-sm text-zinc-400">
            Manage the humor flavors used in captions generation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-200">
            {localMixRows.length} in mix
          </span>
          <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-200">
            {availableCount} available
          </span>
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-300 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
        {(hasFlavorError || hasMixError) && (
          <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
            Failed to load humor mix data due to RLS policies.
          </div>
        )}
        {errorMessage && (
          <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-white">Add to Mix</div>
            <div className="text-xs text-zinc-500">
              Search flavors, set a caption count, and add them to the mix.
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleAddToMix()}
            disabled={isCreating || !selectedFlavor || !captionCount.trim()}
            className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-200 disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-black/40 px-4 py-2 text-xs text-zinc-400">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
              />
            </svg>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search flavors by slug or description..."
              className="w-full bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-2xl border border-zinc-800 bg-black/40">
            {filteredFlavors.length === 0 && (
              <div className="px-4 py-4 text-sm text-zinc-500">
                No flavors match this search.
              </div>
            )}
            <ul className="divide-y divide-zinc-800/80">
              {filteredFlavors.map((flavor, index) => {
                const id = pickValue(flavor, FLAVOR_ID_KEYS);
                const rowKey = `${String(id ?? "flavor")}-${index}`;
                const isSelected =
                  selectedFlavor &&
                  String(pickValue(selectedFlavor, FLAVOR_ID_KEYS)) ===
                    String(id ?? "");
                return (
                  <li
                    key={rowKey}
                    className={`cursor-pointer px-4 py-3 text-sm transition hover:bg-zinc-900/60 ${
                      isSelected ? "bg-zinc-900/70" : ""
                    }`}
                    onClick={() => {
                      setSelectedFlavor(flavor);
                      setCaptionCount("1");
                      setErrorMessage(null);
                    }}
                  >
                    <div className="font-semibold text-zinc-100">
                      {getFlavorLabel(flavor)}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {getFlavorDescription(flavor)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Caption Count</span>
              {!selectedFlavor && <span>Select a flavor to continue</span>}
            </div>
            <input
              value={captionCount}
              onChange={(event) => setCaptionCount(event.target.value)}
              placeholder="Enter caption count"
              disabled={!selectedFlavor}
              className="w-full rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-500 disabled:opacity-50"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleAddToMix()}
                disabled={isCreating || !selectedFlavor || !captionCount.trim()}
                className="rounded-full border border-zinc-800 bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Add to Mix
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFlavor(null);
                  setCaptionCount("");
                  setErrorMessage(null);
                }}
                className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs text-zinc-200"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-300 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">
              Current Mix Flavors
            </div>
            <div className="text-xs text-zinc-500">
              View and manage all humor flavors in the mix.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-black/40 px-4 py-2 text-xs text-zinc-400">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                />
              </svg>
              <input
                value={mixSearchQuery}
                onChange={(event) => setMixSearchQuery(event.target.value)}
                placeholder="Search flavors by name or slug..."
                className="w-52 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
              />
            </div>
            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-200">
              {sortedMixRows.length} shown
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black/40">
          <div className="grid grid-cols-[0.5fr_1.5fr_1fr_1fr_0.7fr] gap-4 border-b border-zinc-800 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <span>ID</span>
            <span>Humor Flavor</span>
            <span>Caption Count</span>
            <span>Created</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-zinc-800/80">
            {sortedMixRows.length === 0 && (
              <div className="px-4 py-6 text-sm text-zinc-500">
                No flavors have been added to the mix yet.
              </div>
            )}
            {sortedMixRows.map((row, index) => {
              const flavorId = pickValue(row, MIX_FLAVOR_ID_KEYS);
              const flavor = flavorId
                ? flavorById.get(String(flavorId))
                : null;
              const identity = getRowIdentity(row, flavorIdKey);
              const rowKey = identity
                ? String(identity.value)
                : `${String(flavorId ?? "mix")}-${index}`;
              const isEditing = editingKey === rowKey;

              return (
                <div
                  key={rowKey}
                  className="grid grid-cols-[0.5fr_1.5fr_1fr_1fr_0.7fr] items-center gap-4 px-4 py-4 text-sm text-zinc-200"
                >
                  <div className="text-sm text-zinc-100">
                    {formatCell(identity?.value ?? flavorId)}
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-100">
                      {flavor ? getFlavorLabel(flavor) : formatCell(flavorId)}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {flavor ? getFlavorDescription(flavor) : ""}
                    </div>
                  </div>
                  <div>
                    {isEditing ? (
                      <input
                        value={draftCaption}
                        onChange={(event) => setDraftCaption(event.target.value)}
                        className="w-full rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-100 outline-none"
                      />
                    ) : (
                      <span className="text-zinc-200">
                        {formatCell(row[captionCountKey])}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {formatTimestamp(
                      typeof row[createdKey] === "string"
                        ? (row[createdKey] as string)
                        : null
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleSave(row)}
                          disabled={isSaving}
                          className="rounded-full border border-emerald-500/40 bg-emerald-950/40 px-2 py-1 text-xs text-emerald-200"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditing(row)}
                          className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
                          aria-label="Edit mix flavor"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 16v4Z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(row)}
                          disabled={isDeleting}
                          className="rounded-full border border-red-900/40 bg-red-950/40 px-2 py-1 text-xs text-red-200 disabled:opacity-60"
                          aria-label="Remove mix flavor"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 7h12M9.5 7l.5-2h4l.5 2M9 7v10m6-10v10M8 7v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7"
                            />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
