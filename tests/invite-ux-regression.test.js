const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "js/therapist.js"), "utf8");
const INVITE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function createElement() {
  const classes = new Set();
  return {
    value: "",
    textContent: "",
    innerHTML: "",
    hidden: false,
    style: {},
    focus() {},
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
    },
    setAttribute() {},
  };
}

function createTherapist({ clipboard, selectionText = "", patients = [] } = {}) {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, createElement());
    return elements.get(id);
  };
  const selection = {
    removeAllRanges() {},
    addRange() {},
    toString: () => selectionText,
  };
  const context = {
    URL,
    location: { href: "https://portfolio.example/psicologo.html" },
    navigator: { clipboard },
    document: {
      addEventListener() {},
      getElementById: element,
      querySelectorAll: () => [],
      querySelector: () => null,
      createRange: () => ({ selectNodeContents() {} }),
    },
    DB: {
      Auth: {
        onAuthChange() {},
        getSession: async () => ({ access_token: "auth" }),
        getProfile: async () => ({ full_name: "Profissional", settings: {} }),
      },
      Therapist: {
        getPatients: async () => patients,
      },
    },
    confirm: () => true,
    setTimeout: () => 0,
    clearTimeout() {},
    console,
  };
  context.window = context;
  context.getSelection = () => selection;
  vm.runInNewContext(source, context, { filename: "js/therapist.js" });
  return { Therapist: context.Therapist, element };
}

async function testClipboardAndFallback() {
  const writes = [];
  const success = createTherapist({
    clipboard: { writeText: async (value) => writes.push(value) },
  });
  assert.equal(await success.Therapist.copyInvite("https://example.test/invite"), true);
  assert.deepEqual(writes, ["https://example.test/invite"]);
  assert.equal(success.element("t-toast").textContent, "Link copiado!");

  for (const clipboard of [undefined, { writeText: async () => { throw new Error("blocked"); } }]) {
    const fallback = createTherapist({ clipboard, selectionText: "selected invite" });
    fallback.element("invite-url-display").textContent = "https://example.test/manual";
    assert.equal(await fallback.Therapist.copyLatestInvite(), false);
    assert.match(fallback.element("t-toast").textContent, /selecionado para cópia manual/i);
  }
}

async function testNamedUnusedInviteRemainsDeletable() {
  const namedInvite = createTherapist({
    patients: [{
      id: INVITE_ID,
      full_name: "Paciente convidado",
      user_id: null,
      last_seen_at: null,
      active: true,
      records: [{ count: 0 }],
    }],
  });
  await namedInvite.Therapist.loadDashboard();
  const html = namedInvite.element("patients-list-inner").innerHTML;
  assert.match(html, new RegExp(`Therapist\\.deleteInvite\\('${INVITE_ID}'\\)`));
  assert.doesNotMatch(html, new RegExp(`Therapist\\.togglePatient\\('${INVITE_ID}'`));
}

(async () => {
  await testClipboardAndFallback();
  await testNamedUnusedInviteRemainsDeletable();
  console.log("Invite UX regression tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
