import { Suspense } from "react";
import Nav from "@/components/Nav";
import { getLastUpdated, getPartners } from "@/lib/queries";

// Every authenticated page reads the SQLite DB, which only exists at runtime
// (schema is created by `prisma db push` on start, on the persistent volume).
// Force dynamic rendering so the build never tries to prerender / hit the DB.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [lastUpdated, partners] = await Promise.all([getLastUpdated(), getPartners()]);
  return (
    <>
      <Suspense>
        <Nav lastUpdated={lastUpdated} partners={partners} />
      </Suspense>
      <div className="flex-1">{children}</div>
    </>
  );
}
