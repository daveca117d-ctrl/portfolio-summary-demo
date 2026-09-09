import UpdateClient from "@/components/UpdateClient";
import { getImportHistory } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function UpdatePage() {
  const history = await getImportHistory();
  const safe = history.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() }));

  return (
    <main className="max-w-[900px] mx-auto px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <div className="caption mb-3">Weekly refresh · admin only</div>
          <h1 className="figure text-4xl mb-3">Update data</h1>
          <p className="text-sm text-ink-50 max-w-xl leading-relaxed">
            Upload the Master - Portfolio Overview.xlsx workbook to refresh the portfolio. Every upload is
            validated and shown as a diff before anything changes — nothing is written until you confirm.
            The previous eight imports are kept so you can roll back a bad export.
          </p>
        </div>
        <form action="/api/admin-logout" method="post" className="shrink-0">
          <button className="caption hover:text-ink transition-colors" type="submit">
            Sign out
          </button>
        </form>
      </div>
      <UpdateClient history={safe} />
    </main>
  );
}
