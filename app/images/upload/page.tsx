"use client";

import { useEffect, useMemo, useState } from "react";
import SidebarNav from "@/app/components/SidebarNav";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const BASE_URL = "https://api.almostcrackd.ai";
const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
];

const EXTENSION_TO_TYPE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
};

const STEPS = [
  "Generate presigned URL",
  "Upload image bytes",
  "Register image URL",
];

type PresignedResponse = {
  presignedUrl: string;
  cdnUrl: string;
};

type RegisterResponse = {
  imageId: string;
  now?: number;
};

function resolveContentType(file: File): string | null {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  const extIndex = name.lastIndexOf(".");
  if (extIndex === -1) return null;
  const ext = name.slice(extIndex);
  return EXTENSION_TO_TYPE[ext] ?? null;
}

export default function UploadPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [displayName, setDisplayName] = useState("Account");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const [cdnUrl, setCdnUrl] = useState<string | null>(null);
  const [isCommonUse, setIsCommonUse] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    let isMounted = true;
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;
      const email = data.user?.email ?? "";
      const name = data.user?.user_metadata?.full_name ?? "";
      setDisplayName(name || email || "Account");
    };
    loadUser();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function fetchAccessToken(): Promise<string> {
    const response = await fetch("/api/auth/jwt");
    if (!response.ok) {
      throw new Error("Please log in to request a JWT.");
    }
    const data = (await response.json()) as { accessToken?: string };
    if (!data.accessToken) {
      throw new Error("JWT not available. Try logging in again.");
    }
    return data.accessToken;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setImageId(null);
    setCdnUrl(null);
    setStepIndex(null);

    if (!file) {
      setErrorMessage("Select an image before running the pipeline.");
      return;
    }

    const contentType = resolveContentType(file);
    if (!contentType || !SUPPORTED_TYPES.includes(contentType)) {
      setErrorMessage(
        `Unsupported file type. Supported: ${SUPPORTED_TYPES.join(", ")}.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await fetchAccessToken();

      setStepIndex(0);
      const presignedResponse = await fetch(
        `${BASE_URL}/pipeline/generate-presigned-url`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ contentType }),
        }
      );

      if (!presignedResponse.ok) {
        throw new Error(await presignedResponse.text());
      }

      const step1 = (await presignedResponse.json()) as PresignedResponse;
      if (!step1.presignedUrl || !step1.cdnUrl) {
        throw new Error("Step 1 response missing presignedUrl or cdnUrl.");
      }

      setCdnUrl(step1.cdnUrl);

      setStepIndex(1);
      const uploadResponse = await fetch(step1.presignedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(await uploadResponse.text());
      }

      setStepIndex(2);
      const registerResponse = await fetch(
        `${BASE_URL}/pipeline/upload-image-from-url`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: step1.cdnUrl,
            isCommonUse,
          }),
        }
      );

      if (!registerResponse.ok) {
        throw new Error(await registerResponse.text());
      }

      const step3 = (await registerResponse.json()) as RegisterResponse;
      if (!step3.imageId) {
        throw new Error("Step 3 response missing imageId.");
      }

      if (isPublic) {
        await supabase
          .from("images")
          .update({ is_public: true })
          .eq("id", step3.imageId);
      }

      setImageId(step3.imageId);
      setStepIndex(STEPS.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SidebarNav activeKey="images" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Upload Image</h1>
          <p className="text-sm text-zinc-400">
            Upload to storage and register the image without generating captions.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-300 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Image upload</h2>
              <p className="text-xs text-zinc-500">
                Uses the same pipeline as humorproject, without captions.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label
                  htmlFor="upload-file"
                  className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
                >
                  Image file
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor="upload-file"
                    className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-800"
                  >
                    Choose file
                  </label>
                  <span className="text-xs text-zinc-500">
                    {file ? file.name : "No file chosen"}
                  </span>
                </div>
                <input
                  id="upload-file"
                  type="file"
                  accept={SUPPORTED_TYPES.join(",")}
                  className="sr-only"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    setFile(nextFile);
                    setImageId(null);
                    setCdnUrl(null);
                    setErrorMessage(null);
                    setStepIndex(null);
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-200">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-950"
                    checked={isCommonUse}
                    onChange={(event) => setIsCommonUse(event.target.checked)}
                  />
                  Add to common-use library
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-950"
                    checked={isPublic}
                    onChange={(event) => setIsPublic(event.target.checked)}
                  />
                  Public
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full border border-zinc-700 bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Uploading..." : "Upload image"}
              </button>
            </form>

            {previewUrl ? (
              <div className="overflow-hidden rounded-xl border border-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="h-64 w-full object-cover"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-500">
                Upload an image to preview it here.
              </div>
            )}
          </section>

          <section className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-300 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Pipeline status</h2>
              <p className="text-xs text-zinc-500">
                Steps update as the API responds.
              </p>
            </div>

            <ol className="space-y-2 text-sm">
              {STEPS.map((step, index) => {
                const isActive = stepIndex === index;
                const isDone = stepIndex !== null && index < stepIndex;
                return (
                  <li
                    key={step}
                    className={`rounded-lg border px-3 py-2 ${
                      isActive
                        ? "border-zinc-600 bg-zinc-900 text-white"
                        : isDone
                          ? "border-zinc-800 bg-zinc-950 text-zinc-300"
                          : "border-zinc-900 bg-black text-zinc-500"
                    }`}
                  >
                    {step}
                  </li>
                );
              })}
            </ol>

            {errorMessage ? (
              <div className="rounded-lg border border-red-900/40 bg-red-950/40 p-4 text-sm text-red-200">
                {errorMessage}
              </div>
            ) : null}

            {imageId ? (
              <div className="space-y-1 text-xs text-zinc-400">
                <div>Image ID: {imageId}</div>
                {cdnUrl ? <div>CDN URL: {cdnUrl}</div> : null}
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-900 bg-black/60 p-4 text-sm text-zinc-500">
                {isSubmitting ? "Uploading..." : "Image ID will appear here."}
              </div>
            )}
          </section>
        </div>
      </div>
    </SidebarNav>
  );
}
