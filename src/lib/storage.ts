import * as path from "node:path";

// Root for uploaded-file archives and staging. On a host with a persistent
// volume (e.g. Railway), set STORAGE_DIR to the mount path so archives and the
// rollback history survive redeploys; otherwise default to ./storage in the app dir.
export const STORAGE_ROOT = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(process.cwd(), "storage");
