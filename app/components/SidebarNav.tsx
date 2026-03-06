"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "@/app/components/AccountMenu";

const NAV_ITEMS = [
  { href: "/overview", label: "Overview", key: "overview" },
  { href: "/user", label: "User", key: "user" },
  {
    href: "/images",
    label: "Images",
    key: "images",
    children: [
      { href: "/images", label: "Images", key: "images-list" },
      { href: "/images/upload", label: "Upload Image", key: "images-upload" },
    ],
  },
  {
    href: "/captions",
    label: "Captions",
    key: "captions",
    children: [
      { href: "/captions", label: "Captions", key: "captions-list" },
      {
        href: "/captions/requests",
        label: "Caption Requests",
        key: "captions-requests",
      },
      {
        href: "/captions/examples",
        label: "Caption Example",
        key: "captions-examples",
      },
    ],
  },
  { href: "/humor", label: "Humor", key: "humor" },
  { href: "/llm", label: "LLM", key: "llm" },
  { href: "/terms", label: "Terms", key: "terms" },
  { href: "/domains", label: "Domains", key: "domains" },
  { href: "/bug-report", label: "Bug Report", key: "bug-report" },
] as const;

type SidebarNavProps = {
  activeKey: (typeof NAV_ITEMS)[number]["key"];
  displayName: string;
  children: React.ReactNode;
};

export default function SidebarNav({
  activeKey,
  displayName,
  children,
}: SidebarNavProps) {
  const pathname = usePathname();
  const isImagesRoute = useMemo(
    () => pathname === "/images" || pathname.startsWith("/images/"),
    [pathname]
  );
  const [isImagesOpen, setIsImagesOpen] = useState(isImagesRoute);
  const isCaptionsRoute = useMemo(
    () => pathname === "/captions" || pathname.startsWith("/captions/"),
    [pathname]
  );
  const [isCaptionsOpen, setIsCaptionsOpen] = useState(isCaptionsRoute);

  const imagesMenuOpen = isImagesRoute || isImagesOpen;
  const captionsMenuOpen = isCaptionsRoute || isCaptionsOpen;

  return (
    <div className="min-h-screen bg-black text-zinc-50">
      <aside className="fixed left-0 top-0 flex h-screen w-56 flex-col border-r border-zinc-900 bg-black px-6 pb-8 pt-10">
        <nav className="space-y-3">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === activeKey;
            if ("children" in item) {
              const isImagesMenu = item.key === "images";
              const childActive = isImagesMenu
                ? pathname === "/images"
                  ? "images-list"
                  : pathname.startsWith("/images/upload")
                    ? "images-upload"
                    : null
                : pathname === "/captions"
                  ? "captions-list"
                  : pathname.startsWith("/captions/requests")
                    ? "captions-requests"
                    : pathname.startsWith("/captions/examples")
                      ? "captions-examples"
                      : null;
              const isOpen = isImagesMenu
                ? imagesMenuOpen
                : captionsMenuOpen;
              const setOpen = isImagesMenu
                ? setIsImagesOpen
                : setIsCaptionsOpen;
              const isRouteActive = isImagesMenu
                ? isImagesRoute
                : isCaptionsRoute;

              return (
                <div key={item.key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Link
                      href={item.href}
                      onClick={() => setOpen(true)}
                      className={`block w-full rounded-full px-6 py-3 text-left text-sm font-semibold tracking-wide transition ${
                        isRouteActive
                          ? "border border-zinc-700 bg-zinc-900 text-white shadow-[0_0_0_1px_rgba(63,63,70,0.7)]"
                          : "border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setOpen((open) => !open)}
                      className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-2 text-xs text-zinc-400"
                      aria-label={`Toggle ${item.label} submenu`}
                    >
                      {isOpen ? "▴" : "▾"}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="ml-4 space-y-2">
                      {item.children.map((child) => {
                        const isChildActive = child.key === childActive;
                        return (
                          <Link
                            key={child.key}
                            href={child.href}
                            className={`block rounded-full px-5 py-2 text-xs font-semibold tracking-wide transition ${
                              isChildActive
                                ? "border border-amber-300/70 bg-amber-300/90 text-zinc-900"
                                : "border border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`block w-full rounded-full px-6 py-3 text-left text-sm font-semibold tracking-wide transition ${
                  isActive
                    ? "border border-zinc-700 bg-zinc-900 text-white shadow-[0_0_0_1px_rgba(63,63,70,0.7)]"
                    : "border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pb-2 pt-10">
          <AccountMenu displayName={displayName} />
        </div>
      </aside>

      <main className="ml-56 px-12 pb-12 pt-12">{children}</main>
    </div>
  );
}
