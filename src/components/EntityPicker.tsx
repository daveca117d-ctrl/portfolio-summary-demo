"use client";
import { useRouter, useSearchParams } from "next/navigation";

/** Address/asset selector dropdown. Navigates to the same page with `param`
 * updated in the query string, preserving other params (e.g. partner). */
export default function EntityPicker({
  basePath,
  param,
  options,
  value,
  label = "Address",
  dark = false,
}: {
  basePath: string;
  param: string;
  options: string[];
  value: string;
  label?: string;
  dark?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(v: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(param, v);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div>
      <label className={`caption block mb-1.5 ${dark ? "caption-on-navy" : ""}`}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={
          dark
            ? "w-full bg-navy-2 border border-rule-dark text-paper-ink text-sm px-3 py-2 rounded-sm outline-none"
            : "w-full bg-cream border border-rule text-sm px-3 py-2 rounded-sm outline-none"
        }
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
