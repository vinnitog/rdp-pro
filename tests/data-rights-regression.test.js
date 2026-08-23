const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const dbSource = fs.readFileSync(path.join(root, "js/db.js"), "utf8");
const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const RECORD_ONE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RECORD_TWO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key),
    json: (key) => JSON.parse(values.get(key)),
  };
}

function createDb({ deleteError = null, deleteData, records, authSession = null, responseOk = true } = {}) {
  const patientId = "11111111-1111-4111-8111-111111111111";
  const otherPatientId = "22222222-2222-4222-8222-222222222222";
  const initialStorage = {
    rdp_patient_session: { patient_id: patientId, therapist_id: "therapist" },
    [`rdp_records_${otherPatientId}`]: [{ id: "other-record" }],
    rdp_records_anon: [{ id: "anonymous-record" }],
    rdp_pending_invite_token: "pending",
    "sb-project-ref-auth-token": { access_token: "cached" },
  };
  if (records !== null) {
    initialStorage[`rdp_records_${patientId}`] = records || [
      { id: RECORD_ONE, synced: true },
      { id: RECORD_TWO, synced: true },
    ];
  }
  const storage = createStorage(initialStorage);
  const deletes = [];
  const client = {
    auth: {
      getSession: async () => ({ data: { session: authSession } }),
      signOut: async () => ({ error: null }),
    },
    from(table) {
      const operation = { table, filters: [] };
      const builder = {
        delete() { operation.kind = "delete"; deletes.push(operation); return builder; },
        eq(column, value) { operation.filters.push([column, value]); return builder; },
        select(columns) { operation.returning = columns; return builder; },
        then(resolve, reject) {
          const recordFilter = operation.filters.find(([column]) => column === "id");
          const defaultData = recordFilter
            ? [{ id: recordFilter[1] }]
            : [{ id: RECORD_ONE }, { id: RECORD_TWO }];
          return Promise.resolve({ data: deleteData === undefined ? defaultData : deleteData, error: deleteError })
            .then(resolve, reject);
        },
      };
      return builder;
    },
  };
  const requests = [];
  const context = {
    URL,
    location: { href: "https://portfolio.example/paciente.html" },
    localStorage: storage,
    crypto: require("node:crypto").webcrypto,
    console,
    Date,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: responseOk, status: responseOk ? 200 : 500, json: async () => ({ ok: responseOk }) };
    },
  };
  context.window = context;
  context.RDP_CONFIG = { supabase: { url: "https://project-ref.supabase.co", anonKey: "anon" } };
  context.supabase = { createClient: () => client };
  vm.runInNewContext(dbSource, context, { filename: "js/db.js" });
  return { DB: context.DB, storage, deletes, requests, patientId, otherPatientId };
}

async function testRecordDeletion() {
  const success = createDb();
  await success.DB.Records.delete(RECORD_ONE);
  assert.deepEqual(success.deletes[0], {
    table: "records",
    kind: "delete",
    filters: [["id", RECORD_ONE], ["patient_id", success.patientId]],
    returning: "id",
  });
  assert.deepEqual(success.storage.json(`rdp_records_${success.patientId}`), [{ id: RECORD_TWO, synced: true }]);

  const failure = createDb({ deleteError: { message: "offline" } });
  await assert.rejects(failure.DB.Records.delete(RECORD_ONE), /offline/);
  assert.equal(failure.storage.json(`rdp_records_${failure.patientId}`).length, 2);

  const emptySynced = createDb({ deleteData: [] });
  await assert.rejects(emptySynced.DB.Records.delete(RECORD_ONE), /confirmar a exclusão/);
  assert.equal(emptySynced.storage.json(`rdp_records_${emptySynced.patientId}`).length, 2);

  const wrongUuid = createDb({ deleteData: [{ id: RECORD_TWO }] });
  await assert.rejects(wrongUuid.DB.Records.delete(RECORD_ONE), /confirmar a exclusão/);
  assert.equal(wrongUuid.storage.json(`rdp_records_${wrongUuid.patientId}`).length, 2);

  const pending = createDb({
    deleteData: [],
    records: [{ id: RECORD_ONE, synced: false }, { id: RECORD_TWO, synced: true }],
  });
  await pending.DB.Records.delete(RECORD_ONE);
  assert.deepEqual(pending.storage.json(`rdp_records_${pending.patientId}`), [{ id: RECORD_TWO, synced: true }]);

  const absent = createDb({ records: null });
  await absent.DB.Records.delete(RECORD_ONE);
  assert.equal(absent.deletes.length, 0, "an absent local record should not issue a remote delete");
  assert.equal(absent.storage.has(`rdp_records_${absent.patientId}`), false);
}

async function testClearAllAndLocalIsolation() {
  const success = createDb();
  await success.DB.Records.clearAll();
  assert.deepEqual(success.deletes[0], {
    table: "records",
    kind: "delete",
    filters: [["patient_id", success.patientId]],
    returning: "id",
  });
  assert.deepEqual(success.storage.json(`rdp_records_${success.patientId}`), []);

  const failure = createDb({ deleteError: { message: "offline" } });
  await assert.rejects(failure.DB.Records.clearAll(), /offline/);
  assert.equal(failure.storage.json(`rdp_records_${failure.patientId}`).length, 2);

  for (const deleteData of [[{ id: RECORD_ONE }], []]) {
    const unconfirmed = createDb({ deleteData });
    await assert.rejects(unconfirmed.DB.Records.clearAll(), /confirmar a exclusão/);
    assert.equal(unconfirmed.storage.json(`rdp_records_${unconfirmed.patientId}`).length, 2);
    assert.equal(unconfirmed.deletes.length, 1, "clearAll should rely on DELETE ... select(id), without a follow-up SELECT");
  }

  const isolated = createDb();
  isolated.DB.Records.clearLocalFor(isolated.patientId);
  assert.equal(isolated.storage.has(`rdp_records_${isolated.patientId}`), false);
  assert.equal(isolated.storage.has("rdp_records_anon"), false);
  assert.equal(isolated.storage.has(`rdp_records_${isolated.otherPatientId}`), true);
}

async function testAccountDeletion() {
  const authSession = { access_token: "patient-access-token" };
  const success = createDb({ authSession });
  await success.DB.Patient.deleteAccount();
  assert.equal(success.requests[0].options.headers.Authorization, "Bearer patient-access-token");
  assert.deepEqual(JSON.parse(success.requests[0].options.body), { confirmation: true });
  for (const key of [
    "rdp_patient_session",
    `rdp_records_${success.patientId}`,
    "rdp_records_anon",
    "rdp_pending_invite_token",
    "sb-project-ref-auth-token",
  ]) assert.equal(success.storage.has(key), false, `${key} must be removed after confirmed account deletion`);

  const failure = createDb({ authSession, responseOk: false });
  await assert.rejects(failure.DB.Patient.deleteAccount(), /Não foi possível excluir/);
  assert.equal(failure.storage.has("rdp_patient_session"), true);
  assert.equal(failure.storage.has(`rdp_records_${failure.patientId}`), true);
  assert.equal(failure.storage.has("sb-project-ref-auth-token"), true);
}

function functionBody(source, name) {
  const start = source.indexOf(`async function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
  const next = source.indexOf("\n  function ", start + 1);
  const nextAsync = source.indexOf("\n  async function ", start + 1);
  const candidates = [next, nextAsync].filter((index) => index > start);
  return source.slice(start, Math.min(...candidates, source.length));
}

function testEditingStateReset() {
  const clear = functionBody(appSource, "confirmClear");
  assert.ok(clear.indexOf("await DB.Records.clearAll()") < clear.indexOf("clearForm()"));
  assert.ok(clear.indexOf("clearForm()") < clear.indexOf("renderHistory()"));

  const remove = functionBody(appSource, "deleteRecord");
  assert.ok(remove.indexOf("await DB.Records.delete(id)") < remove.indexOf("clearForm()"));
  assert.match(remove, /state\.editingId\s*===\s*id[^\n]*clearForm\(\)/);
}

(async () => {
  await testRecordDeletion();
  await testClearAllAndLocalIsolation();
  await testAccountDeletion();
  testEditingStateReset();
  console.log("Data rights regression tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
