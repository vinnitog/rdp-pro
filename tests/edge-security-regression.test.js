const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const http = read("supabase/functions/_shared/http.ts");
const report = read("supabase/functions/_shared/report.ts");
const deleteAccount = read("supabase/functions/_shared/delete-account.ts");
const reportPt = read("supabase/functions/enviar-relatorio/index.ts");
const reportLegacy = read("supabase/functions/send-report/index.ts");
const deleteEntry = read("supabase/functions/excluir-conta/index.ts");

function assertOrdered(source, labels, message) {
  let previous = -1;
  for (const label of labels) {
    const current = source.indexOf(label);
    assert.ok(current > previous, `${message}: expected ${label} after the previous security step`);
    previous = current;
  }
}

assert.match(http, /new Set\([\s\S]*?ALLOWED_ORIGINS[\s\S]*?\.split\(","\)/, "CORS should use the configured exact-origin allowlist");
assert.match(http, /allowedOrigins\.has\(origin\)/, "CORS should require an exact allowed origin");
assert.match(http, /"Access-Control-Allow-Origin": origin/, "allowed browser requests should echo their origin");
assert.match(http, /"Vary": "Origin"/, "origin-dependent responses should include Vary: Origin");
assert.match(http, /"Access-Control-Allow-Methods": "POST, OPTIONS"/);
assert.match(http, /"Cache-Control": "no-store"/);
assert.doesNotMatch(http, /"Access-Control-Allow-Origin":\s*"\*"/, "CORS must not use a wildcard");
assert.match(http, /if \(!origin\) return \{ \.\.\.BASE_HEADERS \}/, "server-to-server requests should work without wildcard CORS");
assert.match(http, /return new Response\(null, \{ status: 204, headers \}\)/, "allowed preflight should return 204");
assert.match(http, /if \(!headers\) return new Response\(null, \{ status: 403 \}\)/, "blocked preflight should return 403");

for (const [file, source] of [
  ["enviar-relatorio", reportPt],
  ["send-report", reportLegacy],
]) {
  assert.match(source, /import \{ handleReportRequest \} from "\.\.\/_shared\/report\.ts"/);
  assert.match(source, /serve\(handleReportRequest\)/, `${file} should delegate to the shared report handler`);
}
assert.match(deleteEntry, /serve\(handleDeleteAccountRequest\)/);

assertOrdered(report, [
  'startsWith("Bearer ")',
  "auth.getUser(",
  '.rpc("get_current_patient")',
  "await req.text()",
  "createClient(supabaseUrl, serviceRoleKey)",
  'fetch("https://api.resend.com/emails"',
], "report handler");
assert.doesNotMatch(report, /Authorization[^\n]+anonKey|Bearer \$\{anonKey\}/, "anon key must never authenticate the patient request");
for (const forbidden of ["payload.patient_id", "payload.patient_name", "payload.invite_token", "payload.therapist_id"]) {
  assert.doesNotMatch(report, new RegExp(forbidden.replace(".", "\\.")), `report handler must not trust ${forbidden}`);
}

assert.match(report, /const MAX_BODY_LENGTH = 512_000/);
assert.match(report, /declaredLength > MAX_BODY_LENGTH[\s\S]*?413/);
assert.match(report, /rawPayload\.length > MAX_BODY_LENGTH[\s\S]*?413/);
assert.match(report, /!Array\.isArray\(value\) \|\| value\.length < 1 \|\| value\.length > MAX_RECORDS/);
assert.match(report, /UUID_PATTERN\.test\(id\)/);
assert.match(report, /Number\.isInteger\(value\)[\s\S]*?>= 0[\s\S]*?<= 10/);
assert.match(report, /record\.alt_thought \?\? record\.altThought/, "legacy altThought should normalize to alt_thought");
assert.match(report, /value\.length > maxLength/);
assert.match(report, /!Number\.isInteger\(timezoneOffset\)[\s\S]*?timezoneOffset < -840 \|\| timezoneOffset > 840/);

for (const field of ["datetime", "situation", "thought", "feeling", "reaction", "alt_thought"]) {
  assert.match(report, new RegExp(`escapeHtml\\(record\\.${field}`), `${field} should be escaped in report HTML`);
}
for (const field of ["patientName", "therapistName", "clinicName", "date", "dateTime"]) {
  assert.match(report, new RegExp(`escapeHtml\\(params\\.${field}`), `${field} should be escaped in report HTML`);
}
assert.match(report, /function safeSubject[\s\S]*?replace\(\/\[\\r\\n\]\+\/g, " "\)\.slice\(0, 160\)/);
assert.match(report, /subject: `[^`]*\$\{safeSubject\(patientName\)\}/);

assertOrdered(deleteAccount, [
  'startsWith("Bearer ")',
  "await req.text()",
  "auth.getUser(",
  '.from("patients")',
  '.select("id")',
  '.eq("user_id", authData.user.id)',
  '.delete()',
  "admin.deleteUser(authData.user.id)",
], "delete-account handler");
assert.match(deleteAccount, /declaredLength > 1_024[\s\S]*?413/);
assert.match(deleteAccount, /rawPayload\.length > 1_024[\s\S]*?413/);
assert.match(deleteAccount, /if \(!patient\)[\s\S]*?Acesso restrito a pacientes[\s\S]*?403/);
assert.match(deleteAccount, /\.eq\("id", patient\.id\)[\s\S]*?\.eq\("user_id", authData\.user\.id\)/);

for (const [file, source] of [["report.ts", report], ["delete-account.ts", deleteAccount]]) {
  assert.doesNotMatch(source, /jsonResponse\(req,\s*\{[^}]*\b(?:detail|sent_to|stack|provider_error)\b/i, `${file}: responses must not expose internal details`);
  assert.doesNotMatch(source, /jsonResponse\(req,\s*\{[^}]*reportEmail/i, `${file}: responses must not expose recipient email`);
  assert.match(source, /catch \(error\)[\s\S]*?jsonResponse\(req, \{ error: "[^"]+" \}, 500\)/, `${file}: unexpected errors should return a generic response`);
}

console.log("Edge security regression tests passed");
