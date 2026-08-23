const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const dbSource = fs.readFileSync(path.join(root, "js/db.js"), "utf8");

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key),
  };
}

function createApp(url) {
  const parsed = new URL(url);
  let replacedUrl = null;
  let authChecks = 0;
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        className: "",
        classList: { add() {}, remove() {}, toggle() {} },
        style: {},
        textContent: "",
      });
    }
    return elements.get(id);
  };
  const context = {
    URL,
    URLSearchParams,
    location: { href: parsed.href, search: parsed.search, hash: parsed.hash },
    history: { replaceState(_state, _title, next) { replacedUrl = next; } },
    localStorage: createStorage(),
    document: {
      addEventListener() {},
      getElementById: element,
      querySelectorAll: () => [],
    },
    DB: {
      Patient: {
        savePendingInvite() {},
        getPendingInvite: () => null,
        resolveToken: async () => ({ patient_id: "patient", patient_name: null }),
        getAuthSession: async () => { authChecks += 1; return null; },
        get: () => null,
      },
      Records: { getAll: () => [], syncPending: async () => {}, fetchAndMerge: async () => {} },
    },
    setTimeout,
    clearTimeout,
    console,
  };
  context.window = context;
  vm.runInNewContext(appSource, context, { filename: "js/app.js" });
  return {
    run: () => context.App.init(),
    getReplacedUrl: () => replacedUrl,
    getAuthChecks: () => authChecks,
  };
}

function createDb({ rpcResults = {}, authSession = null, signOutError = null, fetchImpl } = {}) {
  const storage = createStorage();
  const requests = [];
  const client = {
    auth: {
      getSession: async () => ({ data: { session: authSession } }),
      signOut: async () => {
        if (signOutError) throw signOutError;
        return { error: null };
      },
    },
    rpc(name) {
      return {
        single: async () => ({ data: rpcResults[name] ?? null, error: null }),
      };
    },
  };
  const context = {
    URL,
    location: { href: "https://portfolio.example/paciente.html" },
    localStorage: storage,
    crypto: require("node:crypto").webcrypto,
    console,
    Date,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return fetchImpl ? fetchImpl(url, options) : { status: 200, ok: true, json: async () => ({ ok: true }) };
    },
  };
  context.window = context;
  context.RDP_CONFIG = {
    supabase: { url: "https://project-ref.supabase.co", anonKey: "public-anon-key" },
  };
  context.supabase = { createClient: () => client };
  vm.runInNewContext(dbSource, context, { filename: "js/db.js" });
  return { DB: context.DB, storage, requests };
}

async function testUrlCleanup() {
  const invite = createApp("https://portfolio.example/paciente.html?convite=abc&code=pkce#access_token=x");
  await invite.run();
  assert.equal(invite.getReplacedUrl(), "/paciente.html?code=pkce#access_token=x");

  const legacy = createApp("https://portfolio.example/paciente.html?token=abc&next=1#type=signup");
  await legacy.run();
  assert.equal(legacy.getReplacedUrl(), "/paciente.html?next=1#type=signup");

  for (const url of [
    "https://portfolio.example/paciente.html?code=pkce",
    "https://portfolio.example/paciente.html#access_token=x&type=signup",
  ]) {
    const callback = createApp(url);
    await callback.run();
    assert.equal(callback.getReplacedUrl(), null, "auth callback URL must remain untouched without an invite");
    assert.ok(callback.getAuthChecks() > 0, "Supabase auth session resolution must still run");
  }
}

async function testSessionSanitizationAndLogout() {
  const inviteToken = "never-persist-this-token";
  const { DB, storage } = createDb({
    rpcResults: {
      get_patient_by_token: { patient_id: "p1", invite_token: inviteToken },
      claim_patient_invite: { patient_id: "p1", invite_token: inviteToken },
      get_current_patient: { patient_id: "p1", invite_token: inviteToken },
    },
    authSession: { access_token: "patient-access-token" },
    signOutError: new Error("offline"),
  });

  for (const resolve of [
    () => DB.Patient.resolveToken("invite"),
    () => DB.Patient.claimInvite("invite"),
    () => DB.Patient.resolveAuthSession(),
  ]) {
    const session = await resolve();
    assert.equal(session.invite_token, undefined);
    assert.equal(JSON.parse(storage.getItem("rdp_patient_session")).invite_token, undefined);
  }

  storage.setItem("rdp_patient_session", JSON.stringify({ patient_id: "p1" }));
  storage.setItem("rdp_pending_invite_token", JSON.stringify("invite"));
  storage.setItem("rdp_records_p1", JSON.stringify([{ id: "mine" }]));
  storage.setItem("rdp_records_p2", JSON.stringify([{ id: "other" }]));
  storage.setItem("rdp_records_anon", JSON.stringify([{ id: "anon" }]));
  storage.setItem("sb-project-ref-auth-token", "auth");

  await assert.rejects(DB.Patient.signOut(), /offline/);
  for (const key of [
    "rdp_patient_session",
    "rdp_pending_invite_token",
    "rdp_records_p1",
    "rdp_records_anon",
    "sb-project-ref-auth-token",
  ]) assert.equal(storage.has(key), false, `${key} must be removed even when remote sign-out fails`);
  assert.equal(storage.has("rdp_records_p2"), true, "another patient's local data must be preserved");
}

async function testReportPayloadAndAuthentication() {
  const records = [{ id: "e39b49b1-c8ee-4e7d-a468-204959e1b5e4", feeling: "calmo" }];
  const { DB, requests } = createDb({ authSession: { access_token: "patient-access-token" } });
  await DB.Report.send(records);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.headers.Authorization, "Bearer patient-access-token");
  assert.notEqual(requests[0].options.headers.Authorization, "Bearer public-anon-key");
  const payload = JSON.parse(requests[0].options.body);
  assert.deepEqual(Object.keys(payload).sort(), ["records", "timezone_offset"]);
  assert.deepEqual(payload.records, records);
  for (const forbidden of ["patient_id", "patient_name", "invite_token", "therapist_id"]) {
    assert.equal(Object.hasOwn(payload, forbidden), false, `report body must not trust ${forbidden}`);
  }
}

(async () => {
  await testUrlCleanup();
  await testSessionSanitizationAndLogout();
  await testReportPayloadAndAuthentication();
  console.log("Patient auth regression tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
