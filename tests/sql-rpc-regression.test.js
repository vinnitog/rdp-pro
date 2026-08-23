const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migrations = [
  "supabase/migrations/003_patient_auth_ptbr_routes.sql",
  "supabase/migrations/004_repair_patient_auth_rpc.sql",
  "supabase/migrations/005_fix_claim_patient_invite_ambiguity.sql",
  "supabase/migrations/006_invite_single_use.sql",
];

function readMigration(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function getFunctionBody(sql, functionName) {
  const start = sql.search(new RegExp(`create (?:or replace )?function public\\.${functionName}\\b`, "i"));
  assert.notEqual(start, -1, `${functionName} not found`);

  const bodyStart = sql.indexOf("as $$", start);
  assert.notEqual(bodyStart, -1, `${functionName} body start not found`);

  const bodyEnd = sql.indexOf("$$;", bodyStart + 5);
  assert.notEqual(bodyEnd, -1, `${functionName} body end not found`);

  return sql.slice(bodyStart, bodyEnd);
}

for (const migration of migrations) {
  const sql = readMigration(migration);
  const body = getFunctionBody(sql, "claim_patient_invite");

  assert.doesNotMatch(
    body,
    /\bwhere\s+invite_token\s*=\s*p_token\b/i,
    `${migration}: claim_patient_invite must qualify patients.invite_token to avoid PL/pgSQL ambiguity`
  );

  assert.match(
    body,
    /\bwhere\s+(?:p|pt|patients)\.invite_token\s*=\s*p_token\b/i,
    `${migration}: claim_patient_invite should compare p_token against a qualified invite_token column`
  );

  assert.doesNotMatch(
    body,
    /\bcoalesce\(email\b/i,
    `${migration}: claim_patient_invite should qualify email in update expressions`
  );

  assert.doesNotMatch(
    body,
    /\b,\s*full_name\s*,\s*v_email\)/i,
    `${migration}: claim_patient_invite should qualify full_name in update expressions`
  );

  assert.doesNotMatch(
    body,
    /\bwhere\s+id\s*=\s*v_patient\.id\b/i,
    `${migration}: claim_patient_invite should qualify id in update where clause`
  );
}

const inviteSql = readMigration("supabase/migrations/006_invite_single_use.sql");
const getPatientByTokenBody = getFunctionBody(inviteSql, "get_patient_by_token");
const claimPatientInviteBody = getFunctionBody(inviteSql, "claim_patient_invite");

assert.match(
  inviteSql,
  /add column if not exists invite_used_at timestamptz/i,
  "006: patients should track when an invite has been used"
);
assert.match(
  getPatientByTokenBody,
  /pt\.invite_used_at\s+is\s+null/i,
  "006: get_patient_by_token should only validate unused invites"
);
assert.match(
  claimPatientInviteBody,
  /p\.invite_used_at\s+is\s+null/i,
  "006: claim_patient_invite should reject already-used invites"
);
assert.match(
  claimPatientInviteBody,
  /invite_used_at\s*=\s*now\(\)/i,
  "006: claim_patient_invite should mark the invite as used"
);

const rightsSql = readMigration("supabase/migrations/007_patient_data_rights.sql");
const initialSql = readMigration("supabase/migrations/001_initial_schema.sql");
const exportBody = getFunctionBody(rightsSql, "export_current_patient_data");

assert.match(
  rightsSql,
  /create policy "patient_delete_own_records"[\s\S]*?for delete[\s\S]*?p\.id\s*=\s*records\.patient_id[\s\S]*?p\.user_id\s*=\s*auth\.uid\(\)[\s\S]*?p\.active\s*=\s*true/i,
  "007: authenticated patients should delete only records belonging to their active profile"
);
assert.match(rightsSql, /export_current_patient_data\(\)[\s\S]*?security definer[\s\S]*?set search_path\s*=\s*public/i);
assert.match(exportBody, /auth\.uid\(\)\s+is\s+null/i, "007: anonymous exports should be rejected");
assert.match(exportBody, /where\s+p\.user_id\s*=\s*auth\.uid\(\)/i, "007: export should select the authenticated patient");
assert.match(exportBody, /where\s+r\.patient_id\s*=\s*p\.id/i, "007: export should select only that patient's records");
assert.match(exportBody, /coalesce\([\s\S]*?'\[\]'::jsonb\)/i, "007: an empty record list should be []");
assert.doesNotMatch(exportBody, /invite_token|'settings'|therapist_(?:id|name)|report_email/i, "007: export should omit credentials and professional data");
assert.match(rightsSql, /revoke all on function public\.export_current_patient_data\(\) from (?:public|anon)/i);
assert.match(rightsSql, /grant execute on function public\.export_current_patient_data\(\) to authenticated/i);
assert.doesNotMatch(rightsSql, /grant execute on function public\.export_current_patient_data\(\) to (?:anon|public)/i);
assert.match(
  initialSql,
  /patient_id\s+uuid\s+not null references public\.patients\(id\) on delete cascade/i,
  "001: deleting a patient should cascade to their records"
);

console.log("SQL RPC regression tests passed");
