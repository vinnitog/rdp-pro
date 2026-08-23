const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const app = read("js/app.js");
const db = read("js/db.js");
const therapist = read("js/therapist.js");

assert.deepEqual(
  fs.readFileSync(path.join(root, "psicologo.html")),
  fs.readFileSync(path.join(root, "therapist.html")),
  "professional route aliases must remain byte-for-byte identical"
);

assert.match(db, /crypto\?\.randomUUID/);
assert.match(db, /xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx/);
assert.match(db, /\(r & 0x3\) \| 0x8/, "UUID fallback should set RFC 4122 variant bits");
assert.doesNotMatch(app, /(?:id|onclick)="[^"]*\$\{r\.id\}/, "record IDs must not be interpolated into HTML attributes or inline handlers");
assert.match(app, /onclick="App\.deleteRecord\(\$\{index\}\)"/);
assert.match(app, /const record = DB\.Records\.getAll\(\)\[index\]/, "record actions should resolve a controlled numeric index internally");

assert.match(therapist, /const UUID_PATTERN\s*=\s*\/\^\[0-9a-f\]/, "professional panel should define strict UUID validation");
assert.match(therapist, /patients\s*=\s*patients\.filter\(\(patient\)\s*=>\s*UUID_PATTERN\.test\(patient\.id\)\)/, "only valid patient UUIDs should reach markup and actions");

function functionBody(source, name) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{([\\s\\S]*?)\\n  \\}`, "m"));
  assert.ok(match, `${name} should exist`);
  return match[1];
}

for (const [file, body] of [
  ["js/app.js", functionBody(app, "escapeHtml")],
  ["js/therapist.js", functionBody(therapist, "esc")],
]) {
  for (const entity of ["&amp;", "&lt;", "&gt;", "&quot;", "&#39;"]) {
    assert.ok(body.includes(entity), `${file}: sanitizer should emit ${entity}`);
  }
}

assert.match(app, /escapeHtml\(feeling\)/, "insight feelings should be escaped before innerHTML");
assert.doesNotMatch(therapist, /onclick="[^"]*\$\{(?:p|patient)\.full_name\}/, "patient names must never be interpolated into onclick");
assert.match(therapist, /document\.getElementById\("pr-patient-name"\)\.textContent\s*=\s*patientName/);

console.log("HTML security regression tests passed");
