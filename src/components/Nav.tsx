"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Wordmark from "./Wordmark";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/asset-management", label: "Asset Management" },
  { href: "/development", label: "Development" },
  { href: "/cashflow", label: "Cashflow" },
  { href: "/data-glossary", label: "Data Glossary" },
];

export default function Nav({
  lastUpdated,
  partners,
}: {
  lastUpdated?: string;
  partners: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const partner = searchParams.get("partner") ?? "All";

  function onPartnerChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "All") params.delete("partner");
    else params.set("partner", value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <header className="bg-navy">
      <div className="w-full px-6 h-16 flex items-center justify-between gap-6">
        <div className="flex items-center gap-8 min-w-0">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Wordmark size={15} />
          </Link>
          <nav className="flex gap-5 overflow-x-auto">
            {LINKS.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href + (searchParams.toString() ? `?${searchParams.toString()}` : "")}
                  className={`text-xs tracking-wide uppercase whitespace-nowrap px-4 py-2 transition-colors ${
                    active ? "bg-cream text-ink" : "text-paper-ink-70 hover:text-paper-ink"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-5 shrink-0">
          {lastUpdated && <span className="caption caption-on-navy hidden md:inline">{lastUpdated}</span>}
          <select
            value={partner}
            onChange={(e) => onPartnerChange(e.target.value)}
            className="bg-navy-2 text-paper-ink text-xs border border-rule-dark rounded-sm px-2 py-1.5 outline-none"
          >
            <option value="All">All</option>
            {partners.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
