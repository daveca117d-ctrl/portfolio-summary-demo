"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Batch {
  id: string; createdAt: string | Date; fileName: string;
  rowsKept: number; rowsDropped: number; active: boolean;
}
interface Preview {
  token: string; fileName: string;
  report: { sheetsFound: string[]; sheetsMissing: string[]; rowsRead: Record<string, number>; rowsKept: Record<string, number>; notes: string[] };
  diff: Record<string, string>;
}

async function safeJson(res: Response): Promise<{ error?: string; [k: string]: unknown }> {
  const text = await res.text();
  if (!text) return { error: res.ok ? "Empty response from server." : `Upload failed (HTTP ${res.status}). The file may be too large or the server errored.` };
  try { return JSON.parse(text); } catch { return { error: `Unexpected server response (HTTP ${res.status}).` }; }
}

export default function UpdateClient({ history }: { history: Batch[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setBusy("upload"); setError(null);
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await fetch("/api/ingest/preview", { method: "POST", body: fd });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json.error ?? "Parse failed");
      setPreview(json as unknown as Preview);
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(null); }
  }

  async function confirm(token: string) {
    setBusy("confirm");
    try {
      const res = await fetch("/api/ingest/confirm", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error((await safeJson(res)).error ?? "Commit failed");
      setPreview(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(null); }
  }

  async function rollback(batchId: string) {
    if (!window.confirm("Roll back to this import? It becomes the live data.")) return;
    setBusy(batchId);
    await fetch("/api/ingest/rollback", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ batchId }),
    });
    router.refresh(); setBusy(null);
  }

  return (
    <div className="space-y-8">
      <DropZone busy={busy === "upload"} onFile={onFile} />
      {error && <p className="text-sm text-red">{error}</p>}

      {preview && (
        <div className="border border-rule bg-cream-tint p-5">
          <div className="caption mb-3">Validation — {preview.fileName}</div>

          {preview.report.sheetsMissing.length > 0 && (
            <p className="text-xs text-red mb-2">Missing sheets: {preview.report.sheetsMissing.join(", ")}</p>
          )}

          <div className="flex flex-wrap gap-x-8 gap-y-2 mb-4">
            {Object.entries(preview.diff).map(([k, v]) => (
              <span key={k} className="text-sm"><span className="text-ink-50">{k}: </span><span className="tnum">{v}</span></span>
            ))}
          </div>

          {preview.report.notes.map((n, i) => <p key={i} className="text-xs text-ink-50">{n}</p>)}

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => confirm(preview.token)}
              disabled={busy === "confirm"}
              className="bg-ink text-paper px-5 py-2 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Confirm & replace live data
            </button>
            <button onClick={() => setPreview(null)} className="px-4 py-2 text-sm text-ink-50 hover:text-ink">
              Discard
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <table className="sheet mt-6">
          <thead><tr><th className="text-left">Imported</th><th className="text-left">File</th><th>Kept</th><th>Dropped</th><th></th></tr></thead>
          <tbody>
            {history.map((b) => (
              <tr key={b.id}>
                <td className="text-left">
                  {new Date(b.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  {b.active && <span className="ml-2 text-xs text-green">● live</span>}
                </td>
                <td className="text-left text-ink-50">{b.fileName}</td>
                <td>{b.rowsKept.toLocaleString()}</td>
                <td>{b.rowsDropped}</td>
                <td>
                  {!b.active && (
                    <button onClick={() => rollback(b.id)} disabled={busy === b.id} className="text-xs text-ink-50 hover:text-ink underline">
                      Roll back to this
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function DropZone({ busy, onFile }: { busy: boolean; onFile: (f: File) => void }) {
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      className={`flex items-center justify-center h-32 border border-dashed cursor-pointer transition-colors ${
        over ? "border-ink bg-cream-tint" : "border-ink-30 hover:border-ink"
      }`}
    >
      <input type="file" accept=".xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <span className="text-sm text-ink-50">{busy ? "Parsing…" : "Drop Master - Portfolio Overview.xlsx here, or click to choose"}</span>
    </label>
  );
}
