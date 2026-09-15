// Temporary diagnostic: confirms whether Railway is injecting service
// variables into this container's process.env at all. Delete once the
// DATABASE_URL runtime-injection issue is resolved.
const keys = Object.keys(process.env).filter((k) => !k.startsWith("npm_")).sort();
console.log(`DIAG DATABASE_URL=[${process.env.DATABASE_URL ?? ""}]`);
console.log(`DIAG ADMIN_PASSWORD_set=${Boolean(process.env.ADMIN_PASSWORD)}`);
console.log(`DIAG SESSION_SECRET_set=${Boolean(process.env.SESSION_SECRET)}`);
console.log(`DIAG PORT=[${process.env.PORT ?? ""}]`);
console.log(`DIAG total_env_keys=${keys.length}`);
console.log(`DIAG env_key_names=${keys.join(",")}`);
