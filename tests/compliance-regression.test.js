const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const gaps = read(".lgpd/gaps.md");
const status = read(".lgpd/STATUS.md");
const policy = read(".lgpd/policies/privacy-policy-v0.1-draft.md");
const readme = read("README.md");
const projectContext = read("PROJECT_CONTEXT.md");

const matrixStatuses = [...gaps.matchAll(/^\|\s*\d+\s*\|\s*(RED|YELLOW|GREEN)\s*\|/gm)]
  .map((match) => match[1]);
const count = (value) => matrixStatuses.filter((statusValue) => statusValue === value).length;
assert.deepEqual(
  { red: count("RED"), yellow: count("YELLOW"), green: count("GREEN") },
  { red: 4, yellow: 9, green: 4 },
  "the LGPD summary must match the current gap matrix"
);
assert.match(status, /4 gaps vermelhos, 9 amarelos e 4 controles verdes/i);

for (const [file, content] of [["README.md", readme], ["PROJECT_CONTEXT.md", projectContext]]) {
  assert.match(content, /18 anos ou mais|adulto \(18\+\)/i, `${file}: current product scope must be adult-only`);
}
assert.doesNotMatch(projectContext, /C:\\Users\\|Togszera|Documents\\RDP-Pro|Desktop\\RDP-Pro/i);
assert.match(projectContext, /minuta técnica, não um documento jurídico vigente/i);
assert.match(policy, /MINUTA PARA REVISÃO JURÍDICA/i);
assert.match(policy, /Vigência\*\*:\s*não vigente; não publicar/i);

console.log("Compliance regression tests passed");
