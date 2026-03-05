import Link from "next/link";
import AccountMenu from "@/app/components/AccountMenu";

const NAV_ITEMS = [
  { href: "/welcome", label: "Overview", key: "overview" },
  { href: "/user", label: "User", key: "user" },
  { href: "/images", label: "Images", key: "images" },
  { href: "/captions", label: "Captions", key: "captions" },
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
  return (
    <div className="min-h-screen bg-black text-zinc-50">
      <aside className="fixed left-0 top-0 flex h-screen w-56 flex-col border-r border-zinc-900 bg-black px-6 pb-8 pt-10">
        <nav className="space-y-3">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === activeKey;
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
