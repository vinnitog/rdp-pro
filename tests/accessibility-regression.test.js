const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const patient = read("paciente.html");
const professional = read("psicologo.html");
const professionalAlias = read("therapist.html");
const appSource = read("js/app.js");
const appCss = read("css/app.css");
const therapistCss = read("css/therapist.css");

function attributes(source) {
  return Object.fromEntries(
    [...source.matchAll(/([\w:-]+)(?:\s*=\s*"([^"]*)")?/g)]
      .map((match) => [match[1].toLowerCase(), match[2] ?? ""])
  );
}

function assertUniqueIds(file, html) {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${file}: every id should be unique`);
}

function assertNamedControls(file, html) {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const labelTargets = new Set([...html.matchAll(/<label\b[^>]*\bfor="([^"]+)"[^>]*>/gi)].map((match) => match[1]));
  const controls = [...html.matchAll(/<(input|textarea|select)\b([^>]*)>/gi)];
  assert.ok(controls.length > 0, `${file}: should contain form controls`);

  for (const [, tag, rawAttrs] of controls) {
    const attrs = attributes(rawAttrs);
    if (tag.toLowerCase() === "input" && attrs.type === "hidden") continue;
    const labelledBy = (attrs["aria-labelledby"] || "").split(/\s+/).filter(Boolean);
    const hasAccessibleName = Boolean(
      (attrs.id && labelTargets.has(attrs.id)) ||
      attrs["aria-label"]?.trim() ||
      (labelledBy.length && labelledBy.every((id) => ids.has(id)))
    );
    assert.ok(hasAccessibleName, `${file}: ${tag}#${attrs.id || "(sem id)"} should have a label or ARIA name`);
  }
}

function forms(html) {
  return [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)]
    .map((match) => ({ attrs: attributes(match[1]), body: match[2] }));
}

function assertFormContract(file, html, handlers) {
  const parsed = forms(html);
  for (const handler of handlers) {
    const form = parsed.find((candidate) => candidate.attrs.onsubmit?.includes(handler));
    assert.ok(form, `${file}: ${handler} should be submitted by a real form`);
    const buttons = [...form.body.matchAll(/<button\b([^>]*)>/gi)].map((match) => attributes(match[1]));
    assert.ok(buttons.some((button) => button.type === "submit"), `${file}: ${handler} should have a submit button`);
    for (const button of buttons.filter((candidate) => candidate.type !== "submit")) {
      assert.equal(button.type, "button", `${file}: auxiliary buttons inside ${handler} must use type=button`);
    }
  }
}

function assertTabContract(file, html, selectorClass, controlledPrefix) {
  const tabs = [...html.matchAll(new RegExp(`<button\\b([^>]*class="[^"]*\\b${selectorClass}\\b[^"]*"[^>]*)>`, "gi"))]
    .map((match) => attributes(match[1]));
  assert.ok(tabs.length >= 2, `${file}: should expose the ${selectorClass} controls`);
  assert.equal(tabs.filter((tab) => tab["aria-pressed"] === "true").length, 1, `${file}: exactly one ${selectorClass} should start active`);
  for (const tab of tabs) {
    assert.match(tab["aria-controls"] || "", new RegExp(`^${controlledPrefix}`), `${file}: each ${selectorClass} should identify its panel`);
    assert.match(html, new RegExp(`id="${tab["aria-controls"]}"`), `${file}: controlled panel should exist`);
  }
}

function createElement(active = false) {
  const classes = new Set(active ? ["active"] : []);
  const attrs = new Map();
  return {
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      toggle(name, force) {
        const enabled = force === undefined ? !classes.has(name) : force;
        if (enabled) classes.add(name); else classes.delete(name);
        return enabled;
      },
      contains: (name) => classes.has(name),
    },
    setAttribute: (name, value) => attrs.set(name, String(value)),
    getAttribute: (name) => attrs.get(name),
    style: {},
  };
}

function testShowTabState() {
  const pages = [createElement(true), createElement(), createElement(), createElement()];
  const tabs = [createElement(true), createElement(), createElement(), createElement()];
  const byId = new Map([
    ["page-formulario", pages[0]],
    ["page-historico", pages[1]],
    ["page-insights", pages[2]],
    ["page-privacidade", pages[3]],
  ]);
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  const context = {
    localStorage: storage,
    document: {
      documentElement: { setAttribute() {} },
      addEventListener() {},
      querySelectorAll(selector) { return selector === ".page" ? pages : selector === ".tab" ? tabs : []; },
      getElementById(id) { return byId.get(id) || createElement(); },
    },
    DB: { Records: { countDays: () => 0, getAll: () => [] } },
    URL,
    URLSearchParams,
    location: { href: "https://portfolio.example/paciente.html", search: "", hash: "" },
    history: { replaceState() {} },
    setTimeout,
    clearTimeout,
    console,
  };
  context.window = context;
  vm.runInNewContext(appSource, context, { filename: "js/app.js" });
  context.App.showTab("privacidade", tabs[3]);

  assert.equal(pages[0].classList.contains("active"), false);
  assert.equal(pages[0].getAttribute("aria-hidden"), "true");
  assert.equal(pages[3].classList.contains("active"), true);
  assert.equal(pages[3].getAttribute("aria-hidden"), "false");
  assert.equal(tabs[0].getAttribute("aria-pressed"), "false");
  assert.equal(tabs[3].getAttribute("aria-pressed"), "true");
}

function testSwitchAuthState() {
  const tabs = [createElement(true), createElement()];
  const login = createElement(true);
  const signup = createElement();
  const start = professional.indexOf("function switchAuth(tab)");
  const end = professional.indexOf("// Toast fallback", start);
  assert.ok(start >= 0 && end > start, "professional auth switch should be executable");
  const context = {
    document: {
      querySelectorAll: (selector) => selector === ".auth-tab" ? tabs : [],
      getElementById: (id) => id === "auth-login" ? login : signup,
    },
  };
  vm.runInNewContext(professional.slice(start, end), context, { filename: "switch-auth.js" });
  context.switchAuth("signup");

  assert.equal(tabs[0].getAttribute("aria-pressed"), "false");
  assert.equal(tabs[1].getAttribute("aria-pressed"), "true");
  assert.equal(login.getAttribute("aria-hidden"), "true");
  assert.equal(signup.getAttribute("aria-hidden"), "false");
}

function testShowScreenState() {
  const ids = ["screen-patient-auth", "screen-onboarding", "screen-invalid-token", "screen-no-session", "screen-app"];
  const screens = new Map(ids.map((id) => [id, createElement()]));
  const start = appSource.indexOf("function showScreen(id)");
  const end = appSource.indexOf("function isBackendSetupError", start);
  assert.ok(start >= 0 && end > start, "patient screen switch should be executable");
  const context = {
    document: {
      querySelectorAll: (selector) => selector === ".screen" ? [...screens.values()] : [],
      getElementById: (id) => screens.get(id),
    },
  };
  vm.runInNewContext(appSource.slice(start, end), context, { filename: "show-screen.js" });
  for (const id of ids) {
    context.showScreen(id);
    const active = [...screens.entries()].filter(([, screen]) => screen.classList.contains("active"));
    assert.deepEqual(active.map(([activeId]) => activeId), [id], `${id}: exactly one patient screen must be active`);
  }
}

function assertOneMainPerPatientState() {
  const screenStarts = [...patient.matchAll(/<div\b[^>]*class="screen"[^>]*id="([^"]+)"[^>]*>/gi)]
    .map((match) => ({ id: match[1], index: match.index, opening: match[0] }));
  assert.deepEqual(
    screenStarts.map(({ id }) => id),
    ["screen-patient-auth", "screen-onboarding", "screen-invalid-token", "screen-no-session", "screen-app"]
  );
  const toastStart = patient.indexOf('<div class="toast"');
  screenStarts.forEach((screen, index) => {
    const end = screenStarts[index + 1]?.index ?? toastStart;
    const chunk = patient.slice(screen.index, end);
    const mainCount = (screen.opening.match(/\brole="main"/i) ? 1 : 0)
      + [...chunk.matchAll(/<main\b/gi)].length;
    assert.equal(mainCount, 1, `${screen.id}: the visible state must expose exactly one main landmark`);
  });
}

function parseVariables(block) {
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-f]{6})/gi)]
      .map((match) => [match[1], match[2]])
  );
}

function luminance(hex) {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function assertThemeContrast(file, css, tokens) {
  const lightBlock = css.match(/:root\s*\{([^}]+)\}/)?.[1];
  const darkBlock = css.match(/\[data-theme="dark"\]\s*\{([^}]+)\}/)?.[1];
  assert.ok(lightBlock && darkBlock, `${file}: light and dark theme variables should exist`);
  for (const [theme, vars] of [["light", parseVariables(lightBlock)], ["dark", parseVariables(darkBlock)]]) {
    for (const token of tokens) {
      assert.ok(vars[token], `${file}: ${theme} --${token} should exist`);
      const ratio = contrast(vars[token], vars.surface);
      assert.ok(ratio >= 4.5, `${file}: ${theme} --${token} contrast is ${ratio.toFixed(2)}:1; expected >= 4.5:1`);
    }
  }
}

for (const [file, html] of [["paciente.html", patient], ["psicologo.html", professional]]) {
  assertUniqueIds(file, html);
  assertNamedControls(file, html);
}

assert.match(patient, /<fieldset\b[^>]*datetime-field[^>]*>[\s\S]*?<legend>[\s\S]*?Data \/ Hora[\s\S]*?<\/legend>[\s\S]*?type="date"[\s\S]*?type="time"[\s\S]*?<\/fieldset>/i);
for (const screenId of ["screen-patient-auth", "screen-onboarding", "screen-invalid-token", "screen-no-session"]) {
  assert.match(
    patient,
    new RegExp(`<div[^>]*id="${screenId}"[^>]*role="main"[^>]*tabindex="-1"`),
    `paciente.html: ${screenId} should expose a focusable main landmark while active`
  );
}
assert.match(
  patient,
  /id="screen-invalid-token"[^>]*role="main"[\s\S]*?<div class="screen-card"[^>]*role="alert"[^>]*aria-live="assertive"/,
  "paciente.html: invalid invite should keep its assertive announcement inside the main landmark"
);
assert.match(patient, /<main id="main-content" tabindex="-1">/, "paciente.html: the authenticated app should expose its main landmark");
assert.doesNotMatch(
  patient,
  /id="screen-app"[^>]*role="main"/,
  "paciente.html: screen-app should not duplicate the nested main landmark"
);
assertFormContract("paciente.html", patient, ["App.submitPatientLogin()", "App.submitPatientSignup()", "App.submitOnboarding()", "App.saveRecord()"]);
assertFormContract("psicologo.html", professional, ["Therapist.signIn()", "Therapist.signUp()", "Therapist.createPatient()", "Therapist.saveSettings()"]);
assertTabContract("paciente.html", patient, "tab", "page-");
assertTabContract("psicologo.html", professional, "auth-tab", "auth-");
testShowTabState();
testSwitchAuthState();
testShowScreenState();
assertOneMainPerPatientState();

assertThemeContrast("css/app.css", appCss, ["text-subtle", "placeholder"]);
assertThemeContrast("css/therapist.css", therapistCss, ["text-subtle"]);

assert.match(patient, /id="toast"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
assert.match(patient, /id="patient-auth-message"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
for (const [file, html] of [["psicologo.html", professional], ["therapist.html", professionalAlias]]) {
  assert.match(html, /id="t-toast"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/, `${file}: toast should be announced`);
  for (const id of ["auth-error", "signup-error"]) {
    assert.match(html, new RegExp(`id="${id}"[^>]*aria-live="polite"[^>]*aria-atomic="true"`), `${file}: ${id} should be announced`);
  }
}

console.log("Accessibility regression tests passed");
