import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, preflightResponse } from "./http.ts";

const MAX_RECORDS = 100;
const MAX_TEXT_LENGTH = 4000;
const MAX_BODY_LENGTH = 512_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ReportRecord {
  id: string;
  datetime: string;
  date_key: string;
  situation: string;
  thought: string;
  feeling: string;
  anxiety1: number;
  reaction: string;
  alt_thought: string;
  anxiety2: number;
}

function readText(value: unknown, maxLength = MAX_TEXT_LENGTH): string | null {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > maxLength) return null;
  return value;
}

function readAnxiety(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 10
    ? Number(value)
    : null;
}

function normalizeRecords(value: unknown): ReportRecord[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_RECORDS) return null;

  const normalized: ReportRecord[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const record = item as Record<string, unknown>;
    const id = readText(record.id, 36);
    const datetime = readText(record.datetime, 100);
    const dateKey = readText(record.date_key, 20);
    const situation = readText(record.situation);
    const thought = readText(record.thought);
    const feeling = readText(record.feeling);
    const reaction = readText(record.reaction);
    const altThought = readText(record.alt_thought ?? record.altThought);
    const anxiety1 = readAnxiety(record.anxiety1);
    const anxiety2 = readAnxiety(record.anxiety2);

    if (
      !id || !UUID_PATTERN.test(id) || !datetime || !dateKey ||
      situation === null || thought === null || feeling === null ||
      reaction === null || altThought === null || anxiety1 === null || anxiety2 === null
    ) return null;

    normalized.push({
      id,
      datetime,
      date_key: dateKey,
      situation,
      thought,
      feeling,
      anxiety1,
      reaction,
      alt_thought: altThought,
      anxiety2,
    });
  }
  return normalized;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeSubject(value: unknown): string {
  return String(value ?? "").replace(/[\r\n]+/g, " ").slice(0, 160);
}

function buildRows(records: ReportRecord[]): string {
  return [...records].reverse().map((record, index) => {
    const delta = record.anxiety2 - record.anxiety1;
    const deltaText = delta < 0
      ? `redução de ${Math.abs(delta)} ponto${Math.abs(delta) > 1 ? "s" : ""}`
      : delta > 0
      ? `aumento de ${delta} ponto${delta > 1 ? "s" : ""}`
      : "sem alteração";

    return `
      <tr style="background:${index % 2 === 0 ? "#f9f9f9" : "#ffffff"}">
        <td style="padding:10px 12px;border:1px solid #e0e0e0;white-space:nowrap">${escapeHtml(record.datetime)}</td>
        <td style="padding:10px 12px;border:1px solid #e0e0e0">${escapeHtml(record.situation || "—")}</td>
        <td style="padding:10px 12px;border:1px solid #e0e0e0">${escapeHtml(record.thought || "—")}</td>
        <td style="padding:10px 12px;border:1px solid #e0e0e0">${escapeHtml(record.feeling || "—")}</td>
        <td style="padding:10px 12px;border:1px solid #e0e0e0;text-align:center">${record.anxiety1}/10</td>
        <td style="padding:10px 12px;border:1px solid #e0e0e0">${escapeHtml(record.reaction || "—")}</td>
        <td style="padding:10px 12px;border:1px solid #e0e0e0">${escapeHtml(record.alt_thought || "—")}</td>
        <td style="padding:10px 12px;border:1px solid #e0e0e0;text-align:center">${record.anxiety2}/10</td>
        <td style="padding:10px 12px;border:1px solid #e0e0e0;text-align:center">${escapeHtml(deltaText)}</td>
      </tr>`;
  }).join("");
}

function buildEmail(params: {
  records: ReportRecord[];
  patientName: string;
  therapistName: string;
  clinicName: string;
  date: string;
  dateTime: string;
}): string {
  const clinicAndTherapist = params.clinicName
    ? `${escapeHtml(params.clinicName)} · ${escapeHtml(params.therapistName)}`
    : escapeHtml(params.therapistName);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#1e1e1e;margin:0;background:#f4f4f4">
  <div style="max-width:900px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#4a5535;padding:28px 32px;color:#e8edda">
      <h1 style="font-size:20px;margin:0">Registro de Pensamentos — RDP Pro</h1>
      <p style="margin:6px 0 0">${clinicAndTherapist}</p>
    </div>
    <div style="padding:24px 32px">
      <p><strong>Paciente:</strong> ${escapeHtml(params.patientName)}</p>
      <p><strong>Período:</strong> ${params.records.length} registro${params.records.length !== 1 ? "s" : ""} enviado${params.records.length !== 1 ? "s" : ""} em ${escapeHtml(params.date)}</p>
      <p style="font-size:13px;color:#666">Relatório enviado pelo paciente por uma ação explícita no RDP Pro.</p>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#4a5535;color:#e8edda">
            <th>Data / Hora</th><th>Situação</th><th>Pensamento</th><th>Sentimento</th>
            <th>Ans. Inicial</th><th>Reação</th><th>Pens. Alternativo</th><th>Ans. Final</th><th>Variação</th>
          </tr></thead>
          <tbody>${buildRows(params.records)}</tbody>
        </table>
      </div>
      <p style="margin-top:24px;font-size:11px;color:#888;text-align:center">Enviado pelo RDP Pro · ${escapeHtml(params.dateTime)}</p>
    </div>
  </div>
</body>
</html>`;
}

export async function handleReportRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return preflightResponse(req);
  if (!corsHeaders(req)) return jsonResponse(req, { error: "Origem não permitida" }, 403);
  if (req.method !== "POST") return jsonResponse(req, { error: "Método não permitido" }, 405);

  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      return jsonResponse(req, { error: "Não autenticado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Supabase env ausente");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(
      authorization.slice("Bearer ".length)
    );
    if (authError || !authData.user) {
      return jsonResponse(req, { error: "Não autenticado" }, 401);
    }

    const { data: patient, error: patientError } = await userClient
      .rpc("get_current_patient")
      .single();
    if (patientError || !patient) {
      return jsonResponse(req, { error: "Não autenticado" }, 401);
    }

    const declaredLength = Number(req.headers.get("Content-Length") || 0);
    if (declaredLength > MAX_BODY_LENGTH) {
      return jsonResponse(req, { error: "Dados do relatório inválidos" }, 413);
    }
    const rawPayload = await req.text();
    if (rawPayload.length > MAX_BODY_LENGTH) {
      return jsonResponse(req, { error: "Dados do relatório inválidos" }, 413);
    }
    let payload: Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawPayload);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return jsonResponse(req, { error: "Dados do relatório inválidos" }, 400);
      }
      payload = parsed as Record<string, unknown>;
    } catch {
      return jsonResponse(req, { error: "Dados do relatório inválidos" }, 400);
    }
    const records = normalizeRecords(payload.records);
    const timezoneOffset = payload.timezone_offset ?? 0;
    if (
      !records || !Number.isInteger(timezoneOffset) ||
      timezoneOffset < -840 || timezoneOffset > 840
    ) {
      return jsonResponse(req, { error: "Dados do relatório inválidos" }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const fallbackEmail = await adminClient
      .from("therapists")
      .select("email")
      .eq("id", patient.therapist_id)
      .single();
    const reportEmail = patient.settings?.report_email || fallbackEmail.data?.email;
    if (!reportEmail || typeof reportEmail !== "string") {
      return jsonResponse(req, { error: "Relatório indisponível" }, 503);
    }

    const reportFromEmail = Deno.env.get("REPORT_FROM_EMAIL");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!reportFromEmail || !resendKey) throw new Error("Email env ausente");

    const clientNow = new Date(Date.now() - timezoneOffset * 60 * 1000);
    const date = clientNow.toLocaleDateString("pt-BR");
    const dateTime = clientNow.toLocaleString("pt-BR");
    const patientName = patient.patient_name || "Paciente";
    const html = buildEmail({
      records,
      patientName,
      therapistName: patient.therapist_name || "Profissional",
      clinicName: patient.clinic_name || "",
      date,
      dateTime,
    });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: reportFromEmail,
        to: [reportEmail],
        subject: `Registro de Pensamentos — ${safeSubject(patientName)} · ${date}`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      console.error("Falha no provedor de e-mail", resendResponse.status);
      return jsonResponse(req, { error: "Não foi possível enviar o relatório" }, 502);
    }

    const { error: updateError } = await adminClient
      .from("patients")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", patient.patient_id);
    if (updateError) console.error("Falha ao atualizar last_seen_at", updateError.code);

    return jsonResponse(req, { ok: true });
  } catch (error) {
    console.error("Erro interno no envio de relatório", error);
    return jsonResponse(req, { error: "Não foi possível enviar o relatório" }, 500);
  }
}
