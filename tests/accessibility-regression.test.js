const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const patient = read("paciente.html");
const professional = read("psicologo.html");
const appSource = read("js/app.js");

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

for (const [file, html] of [["paciente.html", patient], ["psicologo.html", professional]]) {
  assertUniqueIds(file, html);
  assertNamedControls(file, html);
}

assert.match(patient, /<fieldset\b[^>]*datetime-field[^>]*>[\s\S]*?<legend>[\s\S]*?Data \/ Hora[\s\S]*?<\/legend>[\s\S]*?type="date"[\s\S]*?type="time"[\s\S]*?<\/fieldset>/i);
assertFormContract("paciente.html", patient, ["App.submitPatientLogin()", "App.submitPatientSignup()", "App.submitOnboarding()", "App.saveRecord()"]);
assertFormContract("psicologo.html", professional, ["Therapist.signIn()", "Therapist.signUp()", "Therapist.createPatient()", "Therapist.saveSettings()"]);
assertTabContract("paciente.html", patient, "tab", "page-");
assertTabContract("psicologo.html", professional, "auth-tab", "auth-");
testShowTabState();
testSwitchAuthState();

console.log("Accessibility regression tests passed");
