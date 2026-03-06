"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type CaptionRequestRow = {
  id: string | number;
  image_id: string | null;
  profile_id: string | null;
  created_datetime_utc: string | null;
  image_notes?: string | null;
  image_note?: string | null;
  request_notes?: string | null;
  additional_context?: string | null;
  image_description?: string | null;
  prompt?: string | null;
  images: { url: string | null } | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

type CaptionRequestsTableProps = {
  rows: CaptionRequestRow[];
  hasError: boolean;
};

const PAGE_SIZE = 50;

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

function getUserLabel(profile: CaptionRequestRow["profiles"]) {
  if (!profile) return "Unknown User";
  const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  if (name.length > 0) return name;
  return profile.email ?? "Unknown User";
}

function getImageNotes(row: CaptionRequestRow) {
  return (
    row.image_notes ??
    row.image_note ??
    row.request_notes ??
    row.additional_context ??
    row.image_description ??
    row.prompt ??
    null
  );
}

export default function CaptionRequestsTable({
  rows,
  hasError,
}: CaptionRequestsTableProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] =
    useState<CaptionRequestRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [localRows, setLocalRows] = useState(rows);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return localRows;
    const matches = (value: string | number | null) =>
      String(value ?? "").toLowerCase().includes(q);
    return localRows.filter(
      (row) =>
        matches(row.id) || matches(row.image_id) || matches(row.profile_id)
    );
  }, [localRows, searchQuery]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  }, [filteredRows.length]);

  const safePage = Math.min(currentPage, totalPages);
  const startIndex =
    filteredRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(safePage * PAGE_SIZE, filteredRows.length);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const closeDialog = () => {
    setSelectedRequest(null);
    setDeleteError(null);
  };

  const selectedImageUrl = selectedRequest?.images?.url ?? null;
  const selectedUserLabel = selectedRequest
    ? getUserLabel(selectedRequest.profiles)
    : "Unknown User";
  const selectedEmail = selectedRequest?.profiles?.email ?? "—";
  const selectedNotes = selectedRequest ? getImageNotes(selectedRequest) : null;

  const handleDeleteRequest = useCallback(
    async (requestId: string | number) => {
      const confirmed = window.confirm(
        "Are you sure you want to delete this caption request?"
      );
      if (!confirmed) return;

      setIsDeleting(true);
      setDeleteError(null);

      const { error } = await supabase
        .from("caption_requests")
        .delete()
        .eq("id", requestId);

      if (error) {
        setDeleteError("Failed to delete caption request.");
        setIsDeleting(false);
        return;
      }

      setLocalRows((prev) =>
        prev.filter((row) => String(row.id) !== String(requestId))
      );
      setSelectedRequest(null);
      setIsDeleting(false);
    },
    [supabase]
  );

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950/90 to-zinc-900/40 p-4 text-sm text-zinc-300 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      {hasError && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
          Failed to load caption requests due to RLS policies.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-full max-w-xl items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
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
            placeholder="Search by request ID, image ID, or profile ID"
            className="w-full bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <div className="grid grid-cols-[0.7fr_1fr_1.6fr_1.4fr] gap-4 border-b border-zinc-800 bg-black/40 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <span>ID</span>
          <span>Image</span>
          <span>User</span>
          <span>Created</span>
        </div>
        <div className="max-h-[620px] divide-y divide-zinc-800/80 overflow-y-auto bg-black/20">
          {pageRows.length === 0 && !hasError && (
            <div className="px-4 py-6 text-sm text-zinc-500">
              No caption requests found.
            </div>
          )}
          {pageRows.map((request) => (
            <div
              key={String(request.id)}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedRequest(request);
                setDeleteError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedRequest(request);
                  setDeleteError(null);
                }
              }}
              className="grid cursor-pointer grid-cols-[0.7fr_1fr_1.6fr_1.4fr] gap-4 px-4 py-4 text-sm text-zinc-200 transition hover:bg-zinc-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
            >
              <div className="text-sm text-zinc-100">{request.id}</div>
              <div className="flex items-center">
                <div className="h-12 w-12 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                  {request.images?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={request.images.url}
                      alt="Request"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">
                      No image
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-zinc-400">
                {getUserLabel(request.profiles)}
              </div>
              <div className="text-xs text-zinc-400">
                {formatTimestamp(request.created_datetime_utc)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
        <span>
          Showing {startIndex} - {endIndex} of {filteredRows.length} requests
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

      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-8"
          onClick={closeDialog}
        >
          <div
            className="h-[88vh] w-[96vw] max-w-5xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  Request Details
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  Caption Request ID: {selectedRequest.id}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleDeleteRequest(selectedRequest.id)
                  }
                  disabled={isDeleting}
                  className="rounded-full border border-red-900/40 bg-red-950/40 px-3 py-2 text-xs text-red-200 disabled:opacity-60"
                  aria-label="Delete request"
                  title="Delete request"
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
                  Back to Requests
                </button>
              </div>
            </div>

            <div className="h-[calc(88vh-88px)] overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                {deleteError && (
                  <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
                    {deleteError}
                  </div>
                )}
                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                  <div className="grid gap-3 text-sm text-zinc-300">
                    <div className="grid grid-cols-[140px_1fr] items-start gap-4">
                      <span className="text-zinc-500">Profile ID</span>
                      <span className="text-zinc-100">
                        {selectedRequest.profile_id ?? "—"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] items-start gap-4">
                      <span className="text-zinc-500">User</span>
                      <span className="text-zinc-100">
                        {selectedUserLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] items-start gap-4">
                      <span className="text-zinc-500">Email</span>
                      <span className="text-zinc-100">{selectedEmail}</span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] items-start gap-4">
                      <span className="text-zinc-500">Image ID</span>
                      <span className="text-zinc-100">
                        {selectedRequest.image_id ?? "—"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] items-start gap-4">
                      <span className="text-zinc-500">Image Notes</span>
                      <span className="text-zinc-100">
                        {selectedNotes ?? "—"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] items-start gap-4">
                      <span className="text-zinc-500">Created</span>
                      <span className="text-zinc-100">
                        {formatTimestamp(
                          selectedRequest.created_datetime_utc
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">
                        Image
                      </div>
                      <div className="text-xs text-zinc-500">
                        Image ID: {selectedRequest.image_id ?? "—"}
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
                  <div className="mt-4 flex h-[360px] w-full items-center justify-center overflow-hidden rounded-xl bg-zinc-900">
                    {selectedImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedImageUrl}
                        alt="Request"
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
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
