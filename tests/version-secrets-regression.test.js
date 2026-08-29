const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const packageJson = JSON.parse(read("package.json"));
const config = read("js/config.js");
const patient = read("paciente.html");
const professional = read("psicologo.html");
const professionalAlias = read("therapist.html");
const sw = read("sw.js");
const readme = read("README.md");
const context = read("context.md");
const projectContext = read("PROJECT_CONTEXT.md");
const gitignore = read(".gitignore");
const pricing = read("docs/pricing-strategy.md");

const configVersion = config.match(/appVersion:\s*"([^"]+)"/)?.[1];
const visibleVersion = patient.match(/RDP Pro v([0-9.]+)/)?.[1];
assert.equal(configVersion, packageJson.version, "CONFIG.appVersion should match package.json");
assert.equal(visibleVersion, packageJson.version, "visible patient version should match package.json");

function scriptVersions(html) {
  return [...html.matchAll(/<script src="js\/(?:config|db|app|therapist)\.js\?v=([^"]+)"/g)].map((match) => match[1]);
}

const cachebusters = [
  ...scriptVersions(patient),
  ...scriptVersions(professional),
  ...scriptVersions(professionalAlias),
];
assert.equal(cachebusters.length, 9, "all local JavaScript entries should have cachebusters");
assert.equal(new Set(cachebusters).size, 1, "patient and professional aliases should use one cachebuster version");

const cacheVersion = sw.match(/CACHE_NAME\s*=\s*['"]rdp-pro-v(\d+)\.(\d+)['"]/)?.slice(1).map(Number);
assert.ok(cacheVersion, "service worker cache should be versioned");
assert.deepEqual(cacheVersion, [1, 22], "service worker cache should match the reviewed v1.22 release");
for (const asset of [
  "./index.html", "./paciente.html", "./psicologo.html", "./therapist.html",
  "./css/app.css", "./css/therapist.css",
  "./js/config.js", "./js/db.js", "./js/app.js", "./js/therapist.js",
]) assert.ok(sw.includes(`'${asset}'`), `service worker should include ${asset}`);

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(absolute);
    return /\.(?:css|html|js|json|md|sql|ts|txt)$/i.test(entry.name) ? [absolute] : [];
  });
}

const scannedFiles = [
  ...["README.md", "context.md", "PROJECT_CONTEXT.md", "package.json", "manifest.json", "sw.js", "index.html", "paciente.html", "psicologo.html", "therapist.html"].map((file) => path.join(root, file)),
  ...collectFiles(path.join(root, "css")),
  ...collectFiles(path.join(root, "js")),
  ...collectFiles(path.join(root, "supabase")),
  ...collectFiles(path.join(root, "docs")),
  ...collectFiles(path.join(root, ".lgpd")),
];
const scanned = scannedFiles.map((file) => `${path.relative(root, file)}\n${fs.readFileSync(file, "utf8")}`).join("\n");

for (const [label, pattern] of [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["Resend key", /\bre_[A-Za-z0-9_-]{20,}\b/],
  ["GitHub token", /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{20,}\b/],
  ["OpenAI key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
]) assert.doesNotMatch(scanned, pattern, `repository should not expose a ${label}`);

for (const match of scanned.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
  let payload;
  try {
    payload = JSON.parse(Buffer.from(match[0].split(".")[1], "base64url").toString("utf8"));
  } catch {
    continue;
  }
  assert.notEqual(payload.role, "service_role", "repository must never expose a service-role JWT");
  if (match[0] === config.match(/anonKey:\s*"([^"]+)"/)?.[1]) {
    assert.equal(payload.role, "anon", "the public frontend JWT must be limited to role=anon");
  }
}

const publicDocs = `${readme}\n${context}\n${projectContext}`;
assert.doesNotMatch(publicDocs, /https:\/\/[a-z0-9]{20}\.supabase\.co/i, "public docs should not expose a concrete Supabase project URL");
assert.doesNotMatch(publicDocs, /(?:project-ref|Projeto Supabase:)\s*(?:`|--project-ref\s+)?[a-z0-9]{20}(?:`|\b)/i, "public docs should not expose a concrete Supabase project ref");
assert.doesNotMatch(publicDocs, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, "public docs should not contain a personal email address");

const lgpdDocs = collectFiles(path.join(root, ".lgpd"))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
assert.doesNotMatch(lgpdDocs, /[A-Z0-9._%+-]+@(?:gmail|hotmail|outlook|yahoo)\.[A-Z]{2,}/i, "LGPD artifacts should not contain personal mailbox providers");
assert.doesNotMatch(lgpdDocs, /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, "LGPD artifacts should not contain a concrete CPF");

for (const localFile of [
  "paciente.html", "psicologo.html", "index.html", "therapist.html",
  "css/app.css", "css/therapist.css", "js/config.js", "js/db.js", "js/app.js", "js/therapist.js",
  "supabase/migrations/001_initial_schema.sql", "supabase/migrations/002_fix_rls_security.sql",
  "supabase/migrations/003_patient_auth_ptbr_routes.sql", "supabase/migrations/004_repair_patient_auth_rpc.sql",
  "supabase/migrations/005_fix_claim_patient_invite_ambiguity.sql", "supabase/migrations/006_invite_single_use.sql",
  "supabase/migrations/007_patient_data_rights.sql", "supabase/templates/confirm-signup.html",
  "docs/pricing-strategy.md", ".lgpd",
]) assert.ok(fs.existsSync(path.join(root, localFile)), `README local reference should exist: ${localFile}`);

const documentationFiles = [
  path.join(root, "README.md"),
  path.join(root, "context.md"),
  path.join(root, "PROJECT_CONTEXT.md"),
  ...collectFiles(path.join(root, "docs")).filter((file) => file.endsWith(".md")),
  ...collectFiles(path.join(root, ".lgpd")).filter((file) => file.endsWith(".md")),
];
for (const file of documentationFiles) {
  const markdown = fs.readFileSync(file, "utf8");
  for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, "");
    if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
    const relativeTarget = decodeURIComponent(target.split("#")[0]);
    if (!relativeTarget) continue;
    assert.ok(
      fs.existsSync(path.resolve(path.dirname(file), relativeTarget)),
      `${path.relative(root, file)}: local Markdown link should exist: ${target}`
    );
  }
}

assert.match(pricing, /Status\*\*:\s*hipótese de produto/i, "pricing strategy should be explicitly marked as a hypothesis");
assert.match(pricing, /validar antes de implementar cobrança ou divulgar preços/i, "pricing should require validation before launch");
const nonPremiumRights = pricing.match(/Não limitar por plano:[^\n]+/i)?.[0] || "";
for (const right of ["exportação", "exclusão", "segurança", "privacidade"]) {
  assert.match(nonPremiumRights, new RegExp(right, "i"), `pricing must not limit ${right}`);
}

for (const pattern of [/^\.env\.\*$/m, /^!\.env\.example$/m, /^\*\.pem$/m, /^\*\.key$/m, /^\*\.p12$/m, /^\*\.pfx$/m]) {
  assert.match(gitignore, pattern, `.gitignore should include ${pattern}`);
}

console.log("Version and secrets regression tests passed");
