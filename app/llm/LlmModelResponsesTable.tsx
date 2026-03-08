"use client";

import { useEffect, useMemo, useState } from "react";

type LlmModelResponseRow = Record<string, unknown>;

type LlmModelResponsesTableProps = {
  rows: LlmModelResponseRow[];
  hasError: boolean;
};

const PAGE_SIZE = 50;
const ID_KEYS = ["id", "response_id", "uuid"];
const CREATED_KEYS = [
  "created_datetime_utc",
  "created_at",
  "created_on",
  "timestamp",
];
const MODEL_KEYS = ["model_id", "llm_model_id", "model", "model_uuid"];
const CAPTION_REQUEST_KEYS = [
  "caption_request_id",
  "caption_request",
  "caption_request_uuid",
  "caption_request_fk",
];
const PROFILE_KEYS = ["profile_id", "profile", "profile_uuid"];
const FLAVOR_KEYS = ["flavor_id", "humor_flavor_id", "humour_flavour_id"];
const RESPONSE_KEYS = [
  "response",
  "output_text",
  "completion",
  "content",
  "assistant_message",
  "text",
  "result",
];

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
  });
}

function pickValue(row: LlmModelResponseRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return null;
}

function formatHeadingValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
}

function shortId(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  const text = String(value);
  if (text.length <= 6) return text;
  return `${text.slice(0, 3)}...`;
}

function truncate(value: string, max = 80) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

function findCreatedKey(rows: LlmModelResponseRow[]) {
  return CREATED_KEYS.find((key) => rows.some((row) => row[key] != null)) ?? null;
}

function sortByCreated(rows: LlmModelResponseRow[], key: string | null) {
  if (!key) return rows;
  return [...rows].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    const aTime = typeof aVal === "string" ? new Date(aVal).getTime() : 0;
    const bTime = typeof bVal === "string" ? new Date(bVal).getTime() : 0;
    return bTime - aTime;
  });
}

export default function LlmModelResponsesTable({
  rows,
  hasError,
}: LlmModelResponsesTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRow, setSelectedRow] = useState<LlmModelResponseRow | null>(
    null
  );
  const [localRows, setLocalRows] = useState(rows);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const createdKey = useMemo(() => findCreatedKey(localRows), [localRows]);
  const sortedRows = useMemo(
    () => sortByCreated(localRows, createdKey),
    [localRows, createdKey]
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedRows;
    return sortedRows.filter((row) => {
      const responseValue = pickValue(row, RESPONSE_KEYS);
      const idValue = pickValue(row, ID_KEYS);
      const captionRequestValue = pickValue(row, CAPTION_REQUEST_KEYS);
      const profileValue = pickValue(row, PROFILE_KEYS);
      return (
        String(idValue ?? "").toLowerCase().includes(q) ||
        String(captionRequestValue ?? "").toLowerCase().includes(q) ||
        String(profileValue ?? "").toLowerCase().includes(q) ||
        String(responseValue ?? "").toLowerCase().includes(q)
      );
    });
  }, [sortedRows, searchQuery]);

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

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950/90 to-zinc-900/40 p-4 text-sm text-zinc-300 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      {hasError && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
          Failed to load model responses. Check table permissions or schema.
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
            placeholder="Search responses, prompts, or IDs..."
            className="w-full bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <div className="grid grid-cols-[0.55fr_1fr_0.8fr_1fr_1.2fr_0.9fr_2.2fr] gap-4 border-b border-zinc-800 bg-black/40 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <span>ID</span>
          <span>Created</span>
          <span>Model ID</span>
          <span>Caption Req</span>
          <span>Profile</span>
          <span>Flavor ID</span>
          <span>Response</span>
        </div>
        <div className="max-h-[620px] divide-y divide-zinc-800/80 overflow-y-auto bg-black/20">
          {pageRows.length === 0 && !hasError && (
            <div className="px-4 py-6 text-sm text-zinc-500">
              No responses found.
            </div>
          )}
          {pageRows.map((row, index) => {
            const idValue = pickValue(row, ID_KEYS);
            const createdValue =
              createdKey && row[createdKey] ? row[createdKey] : null;
            const modelValue = pickValue(row, MODEL_KEYS);
            const captionRequestValue = pickValue(row, CAPTION_REQUEST_KEYS);
            const profileValue = pickValue(row, PROFILE_KEYS);
            const flavorValue = pickValue(row, FLAVOR_KEYS);
            const responseValue = pickValue(row, RESPONSE_KEYS);
            const rowKey = `${String(idValue ?? "row")}-${startIndex + index}`;

            return (
              <div
                key={rowKey}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRow(row)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedRow(row);
                  }
                }}
                className="grid cursor-pointer grid-cols-[0.55fr_1fr_0.8fr_1fr_1.2fr_0.9fr_2.2fr] gap-4 px-4 py-4 text-sm text-zinc-200 transition hover:bg-zinc-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
              >
                <div className="text-sm text-zinc-100">
                  {shortId(idValue)}
                </div>
                <div className="text-xs text-zinc-400">
                  {typeof createdValue === "string"
                    ? formatTimestamp(createdValue)
                    : "—"}
                </div>
                <div className="text-xs text-zinc-400">
                  {formatCellValue(modelValue)}
                </div>
                <div className="text-xs text-zinc-400">
                  {formatCellValue(captionRequestValue)}
                </div>
                <div className="text-xs text-zinc-400">
                  {shortId(profileValue)}
                </div>
                <div className="text-xs text-zinc-400">
                  {formatCellValue(flavorValue)}
                </div>
                <div className="text-xs text-zinc-400">
                  {typeof responseValue === "string"
                    ? truncate(responseValue)
                    : responseValue
                      ? truncate(String(responseValue))
                      : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
        <span>
          Showing {startIndex} - {endIndex} of {filteredRows.length} responses
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

      {selectedRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-8"
          onClick={() => setSelectedRow(null)}
        >
          <div
            className="h-[88vh] w-[96vw] max-w-5xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  LLM Response
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {formatHeadingValue(pickValue(selectedRow, ID_KEYS))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-200"
              >
                Back to Table
              </button>
            </div>

            <div className="h-[calc(88vh-88px)] overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Response
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-100">
                    {(() => {
                      const responseValue = pickValue(selectedRow, RESPONSE_KEYS);
                      if (responseValue === null || responseValue === undefined)
                        return "—";
                      return typeof responseValue === "string"
                        ? responseValue
                        : JSON.stringify(responseValue, null, 2);
                    })()}
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Raw JSON
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap text-xs text-zinc-300">
                    {JSON.stringify(selectedRow, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
