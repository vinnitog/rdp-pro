// RDP Pro — Camada de dados
// Estratégia: localStorage como fonte primária (offline-first),
// Supabase como sincronização quando online.

const DB = (() => {
  let _supabase = null;

  function client() {
    if (!_supabase) {
      const { createClient } = window.supabase;
      _supabase = createClient(
        window.RDP_CONFIG.supabase.url,
        window.RDP_CONFIG.supabase.anonKey
      );
    }
    return _supabase;
  }

  // ─── LOCAL STORAGE HELPERS ──────────────────────────────────────────────────
  const LS = {
    get: (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
    set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
    rm:  (key) => localStorage.removeItem(key),
  };

  // Gera UUID v4 compatível com PostgreSQL uuid primary key
  function generateUUID() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    // Fallback para navegadores sem crypto.randomUUID
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function buildAppUrl(page, params = {}) {
    const url = new URL(page, location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    return url.toString();
  }

  function throwSupabaseError(error, fallback) {
    if (!error) throw new Error(fallback);
    const err = new Error(error.message || fallback);
    err.code = error.code;
    err.details = error.details;
    err.hint = error.hint;
    throw err;
  }

  function generateInviteToken() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  function withoutInviteToken(data) {
    if (!data) return data;
    const { invite_token: _inviteToken, ...safeSession } = data;
    return safeSession;
  }

  function clearLocalAuthToken() {
    try {
      const projectRef = new URL(window.RDP_CONFIG.supabase.url).hostname.split(".")[0];
      if (projectRef) localStorage.removeItem(`sb-${projectRef}-auth-token`);
    } catch {}
  }

  // ─── SESSION DO PACIENTE ────────────────────────────────────────────────────
  const Patient = {
    save(data) { LS.set("rdp_patient_session", data); },
    get() { return LS.get("rdp_patient_session"); },
    clear() { LS.rm("rdp_patient_session"); },
    savePendingInvite(token) { LS.set("rdp_pending_invite_token", token); },
    getPendingInvite() { return LS.get("rdp_pending_invite_token"); },
    clearPendingInvite() { LS.rm("rdp_pending_invite_token"); },

    async getAuthSession() {
      const { data } = await client().auth.getSession();
      return data.session;
    },

    async signUp({ email, password, fullName }) {
      const pendingToken = Patient.getPendingInvite();
      const { data, error } = await client().auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: buildAppUrl("paciente.html", { convite: pendingToken }),
          data: {
            role: "patient",
            full_name: fullName || null,
          },
        },
      });
      if (error) throw error;
      return data;
    },

    async signIn({ email, password }) {
      const { data, error } = await client().auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    async signOut() {
      const patientId = Patient.get()?.patient_id;
      try {
        await client().auth.signOut({ scope: "local" });
      } finally {
        clearLocalAuthToken();
        Records.clearLocalFor(patientId);
        Patient.clear();
        Patient.clearPendingInvite();
      }
    },

    async resolveToken(token) {
      const { data, error } = await client()
        .rpc("get_patient_by_token", { p_token: token })
        .single();

      if (error) throwSupabaseError(error, "Token inválido ou expirado");
      if (!data) throw new Error("Token inválido ou expirado");

      const session = withoutInviteToken(data);
      Patient.save(session);
      return session;
    },

    async claimInvite(token, fullName = null) {
      const { data, error } = await client()
        .rpc("claim_patient_invite", { p_token: token, p_full_name: fullName })
        .single();

      if (error) throwSupabaseError(error, "Convite inválido");
      if (!data) throw new Error("Convite inválido");

      const session = withoutInviteToken(data);
      Patient.save(session);
      Patient.clearPendingInvite();
      return session;
    },

    async resolveAuthSession() {
      const session = await Patient.getAuthSession();
      if (!session) return null;

      const { data, error } = await client()
        .rpc("get_current_patient")
        .single();

      if (error || !data) return null;

      const patient = withoutInviteToken(data);
      Patient.save(patient);
      return patient;
    },

    async updateName(name) {
      const session = await Patient.getAuthSession();
      if (!session) return;

      const { error } = await client()
        .rpc("update_current_patient_name", { p_full_name: name });
      if (error) throw error;
    },

    async exportData() {
      const { data, error } = await client().rpc("export_current_patient_data");
      if (error) throwSupabaseError(error, "Não foi possível exportar seus dados");
      return data;
    },

    async deleteAccount() {
      const patientId = Patient.get()?.patient_id;
      const authSession = await Patient.getAuthSession();
      if (!authSession?.access_token) throw new Error("Sessão expirada. Entre novamente.");

      const response = await fetch(
        `${window.RDP_CONFIG.supabase.url}/functions/v1/excluir-conta`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${authSession.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ confirmation: true }),
        }
      );

      if (!response.ok) throw new Error("Não foi possível excluir a conta. Tente novamente.");

      await client().auth.signOut({ scope: "local" }).catch(() => {});
      clearLocalAuthToken();
      Records.clearLocalFor(patientId);
      Patient.clear();
      Patient.clearPendingInvite();
    },
  };

  // ─── REGISTROS ──────────────────────────────────────────────────────────────
  const Records = {
    _key: () => {
      const s = Patient.get();
      return s ? `rdp_records_${s.patient_id}` : "rdp_records_anon";
    },

    getAll() {
      return LS.get(Records._key()) || [];
    },

    save(records) {
      LS.set(Records._key(), records);
    },

    add(record) {
      const all = Records.getAll();
      // UUID real — o banco exige uuid, Date.now() era rejeitado com 400
      const newRecord = { ...record, id: generateUUID(), synced: false };
      all.unshift(newRecord);
      Records.save(all);
      Records.syncPending().catch(console.warn);
      return newRecord;
    },

    update(id, data) {
      const all = Records.getAll();
      const idx = all.findIndex((r) => r.id === id);
      if (idx === -1) return;
      all[idx] = { ...all[idx], ...data, synced: false };
      Records.save(all);
      Records.syncPending().catch(console.warn);
    },

    async delete(id) {
      const session = Patient.get();
      if (!session) throw new Error("Sessão não encontrada");

      const localRecord = Records.getAll().find((record) => record.id === id);
      if (!localRecord) return;

      const { data, error } = await client()
        .from("records")
        .delete()
        .eq("id", id)
        .eq("patient_id", session.patient_id)
        .select("id");

      if (error) throwSupabaseError(error, "Não foi possível apagar o registro");
      if (localRecord.synced && !data?.some((record) => record.id === id)) {
        throw new Error("Não foi possível confirmar a exclusão do registro");
      }
      Records.save(Records.getAll().filter((record) => record.id !== id));
    },

    countDays() {
      return new Set(Records.getAll().map((r) => r.date_key)).size;
    },

    async syncPending({ throwOnError = false } = {}) {
      const session = Patient.get();
      if (!session) return;

      const all = Records.getAll();
      const pending = all.filter((r) => !r.synced);
      if (!pending.length) return;
      let syncError = null;

      for (const r of pending) {
        const { error } = await client()
          .from("records")
          .upsert({
            id:           r.id,   // já é UUID válido
            patient_id:   session.patient_id,
            therapist_id: session.therapist_id,
            datetime:     r.datetime,
            date_key:     r.date_key,
            situation:    r.situation,
            thought:      r.thought,
            feeling:      r.feeling,
            anxiety1:     r.anxiety1,
            reaction:     r.reaction,
            alt_thought:  r.altThought || r.alt_thought,
            anxiety2:     r.anxiety2,
          }, { onConflict: "id" });

        if (!error) {
          const idx = all.findIndex((x) => x.id === r.id);
          if (idx !== -1) all[idx].synced = true;
        } else if (!syncError) {
          syncError = error;
        }
      }
      Records.save(all);
      if (syncError && throwOnError) {
        throwSupabaseError(syncError, "Não foi possível sincronizar os registros");
      }
    },

    async clearAll() {
      const session = Patient.get();
      if (!session) throw new Error("Sessão não encontrada");

      const syncedIds = Records.getAll()
        .filter((record) => record.synced)
        .map((record) => record.id);

      const { data, error } = await client()
        .from("records")
        .delete()
        .eq("patient_id", session.patient_id)
        .select("id");

      if (error) throwSupabaseError(error, "Não foi possível apagar os registros");
      const deletedIds = new Set((data || []).map((record) => record.id));
      if (syncedIds.some((id) => !deletedIds.has(id))) {
        throw new Error("Não foi possível confirmar a exclusão de todos os registros");
      }
      Records.save([]);
    },

    clearLocalFor(patientId) {
      if (patientId) LS.rm(`rdp_records_${patientId}`);
      LS.rm("rdp_records_anon");
    },

    async fetchAndMerge() {
      const session = Patient.get();
      if (!session) return;

      const { data, error } = await client()
        .from("records")
        .select("*")
        .eq("patient_id", session.patient_id)
        .order("created_at", { ascending: false });

      if (error || !data?.length) return;

      const local   = Records.getAll();
      const localIds = new Set(local.map((r) => r.id));

      const incoming = data
        .filter((r) => !localIds.has(r.id))
        .map((r) => ({
          id:         r.id,
          datetime:   r.datetime,
          date_key:   r.date_key,
          situation:  r.situation,
          thought:    r.thought,
          feeling:    r.feeling,
          anxiety1:   r.anxiety1,
          reaction:   r.reaction,
          altThought: r.alt_thought,
          alt_thought:r.alt_thought,
          anxiety2:   r.anxiety2,
          synced:     true,
        }));

      if (!incoming.length) return;

      const parseDate = (r) => {
        const [date, time] = (r.datetime || "").split(", ");
        if (!date) return 0;
        const [d, m, y] = date.split("/");
        const ts = new Date(`${y}-${m}-${d}T${time || "00:00"}`).getTime();
        return isNaN(ts) ? 0 : ts;
      };

      const merged = [...local, ...incoming].sort((a, b) => parseDate(b) - parseDate(a));
      Records.save(merged);
    },
  };

  // ─── AUTH DO PSICÓLOGO ──────────────────────────────────────────────────────
  const Auth = {
    async signUp({ email, password, fullName, crp, clinicName }) {
      const { data, error } = await client().auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: buildAppUrl("psicologo.html"),
          data: {
            role:        "therapist",
            full_name:   fullName,
            crp:         crp || null,
            clinic_name: clinicName || null,
          },
        },
      });
      if (error) throw error;
      return data;
    },

    async signIn({ email, password }) {
      const { data, error } = await client().auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    async signOut() {
      await client().auth.signOut();
    },

    async getSession() {
      const { data } = await client().auth.getSession();
      return data.session;
    },

    async getProfile() {
      const session = await Auth.getSession();
      if (!session) return null;
      if (session.user.user_metadata?.role === "patient") return null;

      const { data: rows, error: fetchError } = await client()
        .from("therapists")
        .select("*")
        .eq("id", session.user.id)
        .limit(1);

      if (fetchError) throw fetchError;
      if (rows && rows.length > 0) return rows[0];

      // Primeiro login após confirmar e-mail — cria perfil agora com sessão ativa
      const { data: refreshed } = await client().auth.refreshSession();
      const meta = refreshed?.session?.user?.user_metadata
        || session.user.user_metadata
        || {};

      const { data: created, error: createError } = await client()
        .from("therapists")
        .insert({
          id:          session.user.id,
          full_name:   meta.full_name   || session.user.email,
          crp:         meta.crp         || null,
          email:       session.user.email,
          clinic_name: meta.clinic_name || null,
          settings: {
            cycle_days:    10,
            report_email:  session.user.email,
            primary_color: "#6b7c4a",
          },
        })
        .select()
        .single();

      if (createError) throw createError;
      return created;
    },

    onAuthChange(cb) {
      client().auth.onAuthStateChange(cb);
    },
  };

  // ─── PAINEL DO PSICÓLOGO ────────────────────────────────────────────────────
  const Therapist = {
    async getPatients() {
      const session = await Auth.getSession();
      if (!session) return [];
      const { data } = await client()
        .from("patients")
        .select("*, records(count)")
        .eq("therapist_id", session.user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },

    async createPatient(name) {
      const session = await Auth.getSession();
      if (!session) throw new Error("Não autenticado");
      const { data, error } = await client()
        .from("patients")
        .insert({ therapist_id: session.user.id, full_name: name })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async updateSettings(settings) {
      const session = await Auth.getSession();
      if (!session) throw new Error("Não autenticado");
      const { error } = await client()
        .from("therapists")
        .update(settings)
        .eq("id", session.user.id);
      if (error) throw error;
    },

    async getPatientRecords(patientId) {
      const { data } = await client()
        .from("records")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      return data || [];
    },

    async togglePatient(patientId, active) {
      const { error } = await client()
        .from("patients")
        .update({ active })
        .eq("id", patientId);
      if (error) throw error;
    },

    async generatePatientInvite(patientId) {
      const token = generateInviteToken();
      const { data, error } = await client()
        .from("patients")
        .update({
          invite_token: token,
          invite_used_at: null,
          active: true,
        })
        .eq("id", patientId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async deletePatientInvite(patientId) {
      const { error } = await client()
        .from("patients")
        .delete()
        .eq("id", patientId);
      if (error) throw error;
    },
  };

  // ─── ENVIO DE RELATÓRIO ─────────────────────────────────────────────────────
  const Report = {
    async send(records) {
      const authSession = await Patient.getAuthSession();
      if (!authSession?.access_token) throw new Error("Sessão expirada. Entre novamente.");

      const request = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authSession.access_token}`,
          },
          body: JSON.stringify({
            records,
            // Offset do fuso horário do cliente em minutos (ex: 180 para BRT)
            // A Edge Function usa isso para formatar o timestamp corretamente
            timezone_offset:   new Date().getTimezoneOffset(),
          }),
        };

      let res = await fetch(
        `${window.RDP_CONFIG.supabase.url}/functions/v1/enviar-relatorio`,
        request
      );

      if (res.status === 404) {
        res = await fetch(
          `${window.RDP_CONFIG.supabase.url}/functions/v1/send-report`,
          request
        );
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no envio");
      return data;
    },
  };

  return { Patient, Records, Auth, Therapist, Report, client };
})();

window.DB = DB;
