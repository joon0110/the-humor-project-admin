"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type CaptionRow = {
  id: string;
  content: string | null;
  created_datetime_utc: string | null;
  modified_datetime_utc?: string | null;
  updated_datetime_utc?: string | null;
  updated_at?: string | null;
  is_public: boolean | null;
  image_id: string | null;
  image_url?: string | null;
  profile_id: string | null;
  like_count: number | null;
  share_count: number;
  caption_request_id?: string | number | null;
  caption_request?: string | number | null;
  humor_flavor?: string | null;
  humor_flavour?: string | null;
  images: { url: string | null } | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

type CaptionTableProps = {
  rows: CaptionRow[];
  hasError: boolean;
};

const PAGE_SIZE = 50;
type SearchField = "all" | "content" | "caption_id" | "image_id" | "profile_id";
type SortOrder =
  | "newest"
  | "oldest"
  | "content_asc"
  | "content_desc"
  | "image_id_asc"
  | "image_id_desc"
  | "most_liked"
  | "most_shared";

const SEARCH_FIELDS: { key: SearchField; label: string }[] = [
  { key: "all", label: "All Fields" },
  { key: "content", label: "Content" },
  { key: "caption_id", label: "Caption ID" },
  { key: "image_id", label: "Image ID" },
  { key: "profile_id", label: "Profile ID" },
];

const SORT_OPTIONS: { key: SortOrder; label: string }[] = [
  { key: "newest", label: "Date Created (Newest)" },
  { key: "oldest", label: "Date Created (Oldest)" },
  { key: "content_asc", label: "Content (A–Z)" },
  { key: "content_desc", label: "Content (Z–A)" },
  { key: "image_id_asc", label: "Image ID (A–Z)" },
  { key: "image_id_desc", label: "Image ID (Z–A)" },
  { key: "most_liked", label: "Most Liked" },
  { key: "most_shared", label: "Most Shares" },
];

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimestamp(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getUserLabel(profile: CaptionRow["profiles"]) {
  if (!profile) return "Unknown user";
  const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  if (name.length > 0) return name;
  return profile.email ?? "Unknown user";
}

function getModifiedTimestamp(row: CaptionRow) {
  return (
    row.modified_datetime_utc ??
    row.updated_datetime_utc ??
    row.updated_at ??
    null
  );
}

function getCaptionRequestId(row: CaptionRow) {
  return row.caption_request_id ?? row.caption_request ?? null;
}

function getHumorFlavor(row: CaptionRow) {
  return row.humor_flavor ?? row.humor_flavour ?? null;
}

export default function CaptionTable({ rows, hasError }: CaptionTableProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchField, setSearchField] = useState<SearchField>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [isFieldOpen, setIsFieldOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedCaption, setSelectedCaption] = useState<CaptionRow | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [localRows, setLocalRows] = useState(rows);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const sortRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!fieldRef.current?.contains(target)) {
        setIsFieldOpen(false);
      }
      if (!sortRef.current?.contains(target)) {
        setIsSortOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return localRows;

    const matchesId = (value: string | null) =>
      Boolean(value && value.toLowerCase() === q);
    const matchesContent = (value: string | null) =>
      Boolean(value && value.toLowerCase().includes(q));

    return localRows.filter((row) => {
      if (searchField === "content") {
        return matchesContent(row.content);
      }
      if (searchField === "caption_id") {
        return matchesId(row.id);
      }
      if (searchField === "image_id") {
        return matchesId(row.image_id);
      }
      if (searchField === "profile_id") {
        return matchesId(row.profile_id);
      }
      return (
        matchesContent(row.content) ||
        matchesId(row.id) ||
        matchesId(row.image_id) ||
        matchesId(row.profile_id)
      );
    });
  }, [localRows, searchQuery, searchField]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows].sort((a, b) => {
      const aTime = a.created_datetime_utc
        ? new Date(a.created_datetime_utc).getTime()
        : 0;
      const bTime = b.created_datetime_utc
        ? new Date(b.created_datetime_utc).getTime()
        : 0;
      if (sortOrder === "newest") return bTime - aTime;
      if (sortOrder === "oldest") return aTime - bTime;
      if (sortOrder === "content_asc") {
        return (a.content ?? "").localeCompare(b.content ?? "");
      }
      if (sortOrder === "content_desc") {
        return (b.content ?? "").localeCompare(a.content ?? "");
      }
      if (sortOrder === "image_id_asc") {
        return (a.image_id ?? "").localeCompare(b.image_id ?? "");
      }
      if (sortOrder === "image_id_desc") {
        return (b.image_id ?? "").localeCompare(a.image_id ?? "");
      }
      if (sortOrder === "most_liked") {
        return (b.like_count ?? 0) - (a.like_count ?? 0);
      }
      if (sortOrder === "most_shared") {
        return (b.share_count ?? 0) - (a.share_count ?? 0);
      }
      return bTime - aTime;
    });
    return sorted;
  }, [filteredRows, sortOrder]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  }, [sortedRows.length]);

  const safePage = Math.min(currentPage, totalPages);
  const startIndex =
    sortedRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(safePage * PAGE_SIZE, sortedRows.length);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, safePage]);

  const closeDialog = () => {
    setSelectedCaption(null);
    setCopied(false);
    setDeleteError(null);
  };

  const handleCopyId = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleDeleteCaption = useCallback(
    async (captionId: string) => {
      const confirmed = window.confirm(
        "Are you sure you want to delete this caption?"
      );
      if (!confirmed) return;

      setIsDeleting(true);
      setDeleteError(null);

      const { error } = await supabase
        .from("captions")
        .delete()
        .eq("id", captionId);

      if (error) {
        setDeleteError("Failed to delete caption.");
        setIsDeleting(false);
        return;
      }

      setLocalRows((prev) => prev.filter((row) => row.id !== captionId));
      setSelectedCaption(null);
      setIsDeleting(false);
    },
    [supabase]
  );

  const selectedImageUrl =
    selectedCaption?.images?.url ?? selectedCaption?.image_url ?? null;
  const selectedProfileLabel = selectedCaption
    ? getUserLabel(selectedCaption.profiles)
    : "Unknown user";
  const selectedCaptionRequest = selectedCaption
    ? getCaptionRequestId(selectedCaption)
    : null;
  const selectedHumorFlavor = selectedCaption
    ? getHumorFlavor(selectedCaption)
    : null;
  const selectedModified = selectedCaption
    ? getModifiedTimestamp(selectedCaption)
    : null;

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950/90 to-zinc-900/40 p-4 text-sm text-zinc-300 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      {hasError && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
          Failed to load captions due to RLS policies.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative" ref={fieldRef}>
          <button
            type="button"
            onClick={() => setIsFieldOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-200"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4 text-zinc-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 4.5a5.5 5.5 0 1 0 3.6 9.6l4.2 4.2 1.7-1.7-4.2-4.2A5.5 5.5 0 0 0 10 4.5Z"
              />
            </svg>
            {SEARCH_FIELDS.find((field) => field.key === searchField)?.label ??
              "All Fields"}
            <span className="text-zinc-500">▾</span>
          </button>
          {isFieldOpen && (
            <div className="absolute left-0 top-12 z-20 w-48 space-y-1 rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-xl">
              {SEARCH_FIELDS.map((field) => {
                const isActive = field.key === searchField;
                return (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => {
                      setSearchField(field.key);
                      setIsFieldOpen(false);
                      setCurrentPage(1);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition ${
                      isActive
                        ? "bg-amber-300/90 text-zinc-900"
                        : "text-zinc-200 hover:bg-zinc-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{isActive ? "✓" : ""}</span>
                      {field.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 4.5a5.5 5.5 0 1 0 3.6 9.6l4.2 4.2 1.7-1.7-4.2-4.2A5.5 5.5 0 0 0 10 4.5Z"
            />
          </svg>
          <input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search content or exact IDs..."
            className="w-full bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-500"
          />
        </div>

        <div className="relative" ref={sortRef}>
          <button
            type="button"
            onClick={() => setIsSortOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-200"
          >
            {SORT_OPTIONS.find((option) => option.key === sortOrder)?.label ??
              "Date Created..."}
            <span className="text-zinc-500">▾</span>
          </button>
          {isSortOpen && (
            <div className="absolute left-0 top-12 z-20 w-56 space-y-1 rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-xl">
              {SORT_OPTIONS.map((option) => {
                const isActive = option.key === sortOrder;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setSortOrder(option.key);
                      setIsSortOpen(false);
                      setCurrentPage(1);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition ${
                      isActive
                        ? "bg-amber-300/90 text-zinc-900"
                        : "text-zinc-200 hover:bg-zinc-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{isActive ? "✓" : ""}</span>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <div className="grid grid-cols-[1.2fr_2.4fr_1.4fr_1.2fr_0.8fr] gap-4 border-b border-zinc-800 bg-black/40 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <span>Image</span>
          <span>Caption</span>
          <span>User Name</span>
          <span>Created Date</span>
          <span>Visibility</span>
        </div>
        <div className="max-h-[620px] divide-y divide-zinc-800/80 overflow-y-auto bg-black/20">
          {pageRows.length === 0 && !hasError && (
            <div className="px-4 py-6 text-sm text-zinc-500">
              No captions found.
            </div>
          )}
          {pageRows.map((caption) => (
            <div
              key={caption.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedCaption(caption);
                setDeleteError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedCaption(caption);
                  setDeleteError(null);
                }
              }}
              className="grid cursor-pointer grid-cols-[1.2fr_2.4fr_1.4fr_1.2fr_0.8fr] gap-4 px-4 py-4 text-sm text-zinc-200 transition hover:bg-zinc-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
            >
              <div className="flex items-center">
                <div className="h-14 w-20 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                  {caption.images?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={caption.images.url}
                      alt="Captioned"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                      No image
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm text-zinc-100">
                {caption.content ?? "Untitled caption"}
              </div>
              <div className="text-xs text-zinc-400">
                {getUserLabel(caption.profiles)}
              </div>
              <div className="text-xs text-zinc-400">
                {formatDate(caption.created_datetime_utc)}
              </div>
              <div className="text-xs">
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    caption.is_public
                      ? "border-emerald-400/60 bg-emerald-400/20 text-emerald-200"
                      : "border-zinc-700 bg-zinc-900 text-zinc-400"
                  }`}
                >
                  {caption.is_public ? "Public" : "Private"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
        <span>
          Showing {startIndex} - {endIndex} of {sortedRows.length} captions
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => setCurrentPage(1)}
            className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-400 disabled:opacity-50"
          >
            First
          </button>
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-400 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-200">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
            className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-200 disabled:opacity-50"
          >
            Next
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage(totalPages)}
            className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-200 disabled:opacity-50"
          >
            Last
          </button>
        </div>
      </div>

      {selectedCaption && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-8"
          onClick={closeDialog}
        >
          <div
            className="h-[88vh] w-[96vw] max-w-6xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  Caption Details
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  Review caption metadata and related image.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    selectedCaption && handleDeleteCaption(selectedCaption.id)
                  }
                  disabled={isDeleting}
                  className="rounded-full border border-red-900/40 bg-red-950/40 px-3 py-2 text-xs text-red-200 disabled:opacity-60"
                  aria-label="Delete caption"
                  title="Delete caption"
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
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-200"
                >
                  Back to Captions
                </button>
              </div>
            </div>

            <div className="grid h-[calc(88vh-88px)] gap-6 overflow-hidden px-6 py-6 lg:grid-cols-[2.2fr_1fr]">
              <div className="flex h-full min-h-0 flex-col gap-4">
                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">
                        Caption
                      </div>
                      <div className="text-xs text-zinc-500">
                        Caption ID: {selectedCaption.id}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyId(selectedCaption.id)}
                      className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300"
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="mt-3 text-sm text-zinc-100">
                    {selectedCaption.content ?? "Untitled caption"}
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-zinc-800 bg-black/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">
                        Image
                      </div>
                      <div className="text-xs text-zinc-500">
                        Image ID: {selectedCaption.image_id ?? "—"}
                      </div>
                    </div>
                    {selectedImageUrl && (
                      <a
                        href={selectedImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-200"
                      >
                        Open Image
                      </a>
                    )}
                  </div>
                  <div className="mt-4 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-zinc-900">
                    {selectedImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedImageUrl}
                        alt="Captioned"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="text-sm text-zinc-500">
                        No image available
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1">
                {deleteError && (
                  <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
                    {deleteError}
                  </div>
                )}
                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                      Metadata
                    </div>
                    <div className="text-xs text-zinc-400">
                      Profile: {selectedProfileLabel}
                    </div>
                  </div>
                  <div className="mt-4 space-y-3 text-xs text-zinc-400">
                    <div className="flex items-center justify-between gap-3">
                      <span>Profile ID</span>
                      <span className="text-zinc-100">
                        {selectedCaption.profile_id ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Created</span>
                      <span className="text-zinc-100">
                        {formatTimestamp(selectedCaption.created_datetime_utc)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Modified</span>
                      <span className="text-zinc-100">
                        {formatTimestamp(selectedModified)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Caption Request</span>
                      <span className="text-zinc-100">
                        {selectedCaptionRequest ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Humor Flavor</span>
                      <span className="text-zinc-100">
                        {selectedHumorFlavor ?? "—"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div>Image URL</div>
                      {selectedImageUrl ? (
                        <a
                          href={selectedImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block break-all text-amber-300"
                        >
                          {selectedImageUrl}
                        </a>
                      ) : (
                        <div className="text-zinc-100">—</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                    Engagement
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                      <div className="text-xs text-zinc-500">Likes</div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {selectedCaption.like_count ?? 0}
                      </div>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                      <div className="text-xs text-zinc-500">Shares</div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {selectedCaption.share_count ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
