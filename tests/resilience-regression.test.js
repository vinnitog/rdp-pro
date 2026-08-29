const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const dbSource = fs.readFileSync(path.join(root, "js/db.js"), "utf8");
const PATIENT_ID = "11111111-1111-4111-8111-111111111111";

function createStorage(initial = {}, shouldThrow = () => false) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem(key, value) {
      if (shouldThrow(key)) throw new Error("QuotaExceededError");
      values.set(key, String(value));
    },
    removeItem: (key) => values.delete(key),
    json: (key) => values.has(key) ? JSON.parse(values.get(key)) : null,
  };
}

function evaluateDb(storage, client) {
  const context = {
    URL,
    location: { href: "https://portfolio.example/paciente.html" },
    localStorage: storage,
    crypto: require("node:crypto").webcrypto,
    console,
    Date,
  };
  context.window = context;
  context.RDP_CONFIG = { supabase: { url: "https://project-ref.supabase.co", anonKey: "anon" } };
  context.supabase = { createClient: () => client };
  vm.runInNewContext(dbSource, context, { filename: "js/db.js" });
  return context.DB;
}

function remoteRecord(id, overrides = {}) {
  return {
    id,
    datetime: "28/08/2026, 10:00",
    date_key: "2026-08-28",
    situation: `remote-${id}`,
    thought: "",
    feeling: "calmo",
    anxiety1: 2,
    reaction: "",
    alt_thought: "",
    anxiety2: 1,
    ...overrides,
  };
}

function createRecordDb({ localRecords, pageResult, failRecordWrites = false }) {
  const storage = createStorage({
    rdp_patient_session: { patient_id: PATIENT_ID, therapist_id: "therapist" },
    [`rdp_records_${PATIENT_ID}`]: localRecords,
  }, (key) => failRecordWrites && key === `rdp_records_${PATIENT_ID}`);
  const ranges = [];
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }) },
    from(table) {
      assert.equal(table, "records");
      const builder = {
        select() { return builder; },
        eq() { return builder; },
        order() { return builder; },
        upsert: async () => ({ error: null }),
        async range(from, to) {
          ranges.push([from, to]);
          return pageResult(from, to);
        },
      };
      return builder;
    },
  };
  return { DB: evaluateDb(storage, client), storage, ranges };
}

async function testAtomicRemoteReconciliation() {
  const emptyRemote = createRecordDb({
    localRecords: [
      { id: "synced-old", synced: true },
      { id: "pending", situation: "local", synced: false },
    ],
    pageResult: async () => ({ data: [], error: null }),
  });
  await emptyRemote.DB.Records.fetchAndMerge();
  assert.deepEqual(
    emptyRemote.storage.json(`rdp_records_${PATIENT_ID}`).map((record) => record.id),
    ["pending"],
    "an empty server result must remove old synced rows and preserve unsynced work"
  );

  const collision = createRecordDb({
    localRecords: [
      { id: "old-synced", synced: true },
      { id: "collision", situation: "pending-wins", synced: false },
    ],
    pageResult: async (from) => from === 0
      ? { data: [remoteRecord("new-remote"), remoteRecord("collision", { situation: "remote-loses" })], error: null }
      : { data: [], error: null },
  });
  await collision.DB.Records.fetchAndMerge();
  const merged = collision.storage.json(`rdp_records_${PATIENT_ID}`);
  assert.equal(merged.some((record) => record.id === "old-synced"), false);
  assert.equal(merged.find((record) => record.id === "collision").situation, "pending-wins");
  assert.equal(merged.find((record) => record.id === "collision").synced, false);
  assert.equal(merged.some((record) => record.id === "new-remote"), true);

  const firstPage = Array.from({ length: 500 }, (_, index) => remoteRecord(`remote-${index}`));
  const paginated = createRecordDb({
    localRecords: [],
    pageResult: async (from) => {
      if (from === 0) return { data: firstPage, error: null };
      if (from === 500) return { data: [remoteRecord("remote-500"), remoteRecord("remote-501")], error: null };
      return { data: [], error: null };
    },
  });
  await paginated.DB.Records.fetchAndMerge();
  assert.equal(paginated.storage.json(`rdp_records_${PATIENT_ID}`).length, 502);
  assert.deepEqual(paginated.ranges, [[0, 499], [500, 999], [502, 1001]]);

  const original = [{ id: "keep-until-complete", synced: true }];
  const laterFailure = createRecordDb({
    localRecords: original,
    pageResult: async (from) => from === 0
      ? { data: firstPage, error: null }
      : { data: null, error: { message: "second page offline" } },
  });
  await laterFailure.DB.Records.fetchAndMerge();
  assert.deepEqual(
    laterFailure.storage.json(`rdp_records_${PATIENT_ID}`),
    original,
    "a later page failure must not apply a partial snapshot"
  );
}

function createElement(value = "") {
  const classes = new Set();
  const attrs = new Map();
  return {
    value,
    textContent: "",
    innerHTML: "",
    style: {},
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      toggle(name, force) { if (force) classes.add(name); else classes.delete(name); },
      contains: (name) => classes.has(name),
    },
    setAttribute: (name, val) => attrs.set(name, String(val)),
    getAttribute: (name) => attrs.get(name),
  };
}

function createRecordFormApp(records, operations) {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, createElement());
    return elements.get(id);
  };
  const pages = [createElement(), createElement(), createElement(), createElement()];
  const tabs = [createElement(), createElement(), createElement(), createElement()];
  const context = {
    URL,
    URLSearchParams,
    location: { href: "https://portfolio.example/paciente.html", search: "", hash: "" },
    history: { replaceState() {} },
    localStorage: createStorage(),
    document: {
      documentElement: { setAttribute() {} },
      addEventListener() {},
      getElementById: element,
      querySelectorAll(selector) {
        if (selector === ".page") return pages;
        if (selector === ".tab") return tabs;
        return [];
      },
    },
    DB: {
      Records: {
        getAll: () => records,
        countDays: () => 0,
        add: operations.add,
        update: operations.update,
      },
    },
    setTimeout: () => 0,
    clearTimeout() {},
    console,
    Date,
  };
  context.window = context;
  vm.runInNewContext(appSource, context, { filename: "js/app.js" });
  return { App: context.App, element };
}

function testStorageFailureDoesNotClaimSuccess() {
  const quota = createRecordDb({
    localRecords: [{ id: "existing", situation: "before", synced: true }],
    pageResult: async () => ({ data: [], error: null }),
    failRecordWrites: true,
  });
  assert.throws(() => quota.DB.Records.add({ situation: "new" }), /Não foi possível salvar/);
  assert.throws(() => quota.DB.Records.update("existing", { situation: "changed" }), /Não foi possível salvar/);
  assert.deepEqual(quota.storage.json(`rdp_records_${PATIENT_ID}`), [{ id: "existing", situation: "before", synced: true }]);

  const createForm = createRecordFormApp([], {
    add: () => { throw new Error("Não foi possível salvar no dispositivo"); },
    update() {},
  });
  createForm.element("f-situation").value = "conteúdo importante";
  createForm.App.saveRecord();
  assert.equal(createForm.element("f-situation").value, "conteúdo importante");
  assert.equal(createForm.element("toast").textContent, "Não foi possível salvar no dispositivo");
  assert.notEqual(createForm.element("btn-save").textContent, "Salvo!");

  const editable = [{
    id: "edit-me",
    datetime: "28/08/2026, 09:30",
    situation: "original",
    thought: "",
    feeling: "calmo",
    anxiety1: 1,
    reaction: "",
    altThought: "",
    anxiety2: 1,
  }];
  let updateAttempts = 0;
  let addAttempts = 0;
  const editForm = createRecordFormApp(editable, {
    add: () => { addAttempts += 1; },
    update: () => {
      updateAttempts += 1;
      if (updateAttempts === 1) throw new Error("quota");
    },
  });
  editForm.App.loadRecord(0);
  editForm.element("f-situation").value = "edição preservada";
  editForm.App.saveRecord();
  assert.equal(editForm.element("f-situation").value, "edição preservada");
  assert.equal(editForm.element("btn-save").textContent, "Atualizar Registro");
  editForm.App.saveRecord();
  assert.equal(updateAttempts, 2, "a retry after quota failure must remain in edit mode");
  assert.equal(addAttempts, 0, "a failed edit must not turn into a duplicate create");
}

function createInviteApp(url, { storage = createStorage(), resolve, claim, authenticated = false } = {}) {
  const parsed = new URL(url);
  const elements = new Map();
  const screens = ["screen-patient-auth", "screen-onboarding", "screen-invalid-token", "screen-app"]
    .map((id) => [id, createElement()]);
  screens.forEach(([id, el]) => elements.set(id, el));
  let patientSession = null;
  let resolvedToken = null;
  const patient = {
    savePendingInvite(token) { storage.setItem("rdp_pending_invite_token", JSON.stringify(token)); },
    getPendingInvite() { return storage.json("rdp_pending_invite_token"); },
    clearPendingInvite() { storage.removeItem("rdp_pending_invite_token"); },
    async resolveToken(token) {
      resolvedToken = token;
      patientSession = await resolve(token);
      return patientSession;
    },
    getAuthSession: async () => authenticated ? { access_token: "auth" } : null,
    get: () => patientSession,
    async claimInvite(token, name) { return claim(token, name); },
    resolveAuthSession: async () => patientSession,
  };
  const context = {
    URL,
    URLSearchParams,
    location: { href: parsed.href, search: parsed.search, hash: parsed.hash },
    history: { replaceState() {} },
    localStorage: storage,
    document: {
      documentElement: { setAttribute() {} },
      addEventListener() {},
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, createElement());
        return elements.get(id);
      },
      querySelectorAll: (selector) => selector === ".screen" ? screens.map(([, el]) => el) : [],
    },
    DB: {
      Patient: patient,
      Records: { getAll: () => [], countDays: () => 0, syncPending: async () => {}, fetchAndMerge: async () => {} },
    },
    setTimeout: () => 0,
    clearTimeout() {},
    console,
    Date,
  };
  context.window = context;
  vm.runInNewContext(appSource, context, { filename: "js/app.js" });
  return {
    run: () => context.App.init(),
    pending: () => storage.json("rdp_pending_invite_token"),
    resolvedToken: () => resolvedToken,
    activeScreen: () => screens.find(([, el]) => el.classList.contains("active"))?.[0],
    title: () => elements.get("invalid-token-title")?.textContent,
  };
}

function inviteError(code, message = "failure") {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function testInviteFailureLifecycle() {
  const invalid = createInviteApp("https://portfolio.example/paciente.html?convite=bad", {
    resolve: async () => { throw inviteError("INVITE_INVALID"); },
    claim: async () => null,
  });
  await invalid.run();
  assert.equal(invalid.pending(), null);
  assert.equal(invalid.activeScreen(), "screen-invalid-token");
  assert.equal(invalid.title(), "Link inválido");

  const sharedStorage = createStorage();
  const transient = createInviteApp("https://portfolio.example/paciente.html?convite=retry-me", {
    storage: sharedStorage,
    resolve: async () => { throw inviteError("NETWORK", "offline"); },
    claim: async () => null,
  });
  await transient.run();
  assert.equal(transient.pending(), "retry-me");
  assert.equal(transient.title(), "Não foi possível validar o convite");

  const reload = createInviteApp("https://portfolio.example/paciente.html", {
    storage: sharedStorage,
    resolve: async () => ({ patient_id: PATIENT_ID, patient_name: null }),
    claim: async () => null,
  });
  await reload.run();
  assert.equal(reload.resolvedToken(), "retry-me", "reload must retry a transiently failed pending invite");
  assert.equal(reload.pending(), "retry-me");
  assert.equal(reload.activeScreen(), "screen-patient-auth");

  for (const [code, expectedPending] of [["INVITE_INVALID", null], ["NETWORK", "claim-me"]]) {
    const claimFailure = createInviteApp("https://portfolio.example/paciente.html?convite=claim-me", {
      resolve: async () => ({ patient_id: PATIENT_ID, patient_name: "Paciente" }),
      authenticated: true,
      claim: async () => { throw inviteError(code); },
    });
    await claimFailure.run();
    assert.equal(claimFailure.pending(), expectedPending, `${code} must have the expected pending-token policy`);
  }
}

function createInviteDb(rpcReplies) {
  const storage = createStorage();
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }) },
    rpc(name) {
      return {
        single: async () => rpcReplies[name],
      };
    },
  };
  return evaluateDb(storage, client);
}

async function testInviteErrorClassification() {
  const invalid = createInviteDb({
    get_patient_by_token: { data: null, error: { code: "PGRST116", message: "no rows" } },
    claim_patient_invite: { data: null, error: { message: "Convite já está vinculado" } },
  });
  await assert.rejects(invalid.Patient.resolveToken("bad"), (error) => error.code === "INVITE_INVALID");
  await assert.rejects(invalid.Patient.claimInvite("used"), (error) => error.code === "INVITE_INVALID");

  const transient = createInviteDb({
    get_patient_by_token: { data: null, error: { code: "NETWORK", message: "offline" } },
    claim_patient_invite: { data: null, error: { code: "TIMEOUT", message: "timeout" } },
  });
  await assert.rejects(transient.Patient.resolveToken("retry"), (error) => error.code === "NETWORK");
  await assert.rejects(transient.Patient.claimInvite("retry"), (error) => error.code === "TIMEOUT");
}

(async () => {
  await testAtomicRemoteReconciliation();
  testStorageFailureDoesNotClaimSuccess();
  await testInviteFailureLifecycle();
  await testInviteErrorClassification();
  console.log("Resilience regression tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
