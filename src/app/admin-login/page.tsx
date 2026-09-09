import Wordmark from "@/components/Wordmark";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; locked?: string }>;
}) {
  const { error, next, locked } = await searchParams;

  return (
    <main className="min-h-screen grid place-items-center px-6 bg-navy">
      <div className="w-full max-w-sm">
        <Wordmark size={30} className="mb-8" />
        <h1 className="figure text-3xl mb-1 text-paper-ink">Update data</h1>
        <p className="text-sm text-paper-ink-70 mb-10 leading-relaxed">
          This area is restricted. Enter the admin password to upload a new portfolio workbook.
        </p>

        <form action="/api/admin-login" method="post" className="space-y-4">
          <input type="hidden" name="next" value={next ?? "/update"} />
          <div>
            <label className="caption caption-on-navy block mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              className="w-full bg-transparent border-b border-rule-dark py-2 text-lg outline-none focus:border-chart-2 text-paper-ink"
            />
          </div>
          {locked ? (
            <p className="text-sm text-red">
              Too many failed attempts. Try again in about {locked} minute{locked === "1" ? "" : "s"}.
            </p>
          ) : error ? (
            <p className="text-sm text-red">That password wasn&rsquo;t recognised. Try again.</p>
          ) : null}
          <button
            type="submit"
            className="mt-4 w-full bg-cream text-ink py-3 text-sm tracking-wide hover:bg-cream-active transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    </main>
  );
}
