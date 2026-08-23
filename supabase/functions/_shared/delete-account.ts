import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, preflightResponse } from "./http.ts";

export async function handleDeleteAccountRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return preflightResponse(req);
  if (!corsHeaders(req)) return jsonResponse(req, { error: "Origem não permitida" }, 403);
  if (req.method !== "POST") return jsonResponse(req, { error: "Método não permitido" }, 405);

  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      return jsonResponse(req, { error: "Não autenticado" }, 401);
    }

    const declaredLength = Number(req.headers.get("Content-Length") || 0);
    if (declaredLength > 1_024) {
      return jsonResponse(req, { error: "Solicitação inválida" }, 413);
    }
    const rawPayload = await req.text();
    if (rawPayload.length > 1_024) {
      return jsonResponse(req, { error: "Solicitação inválida" }, 413);
    }
    let payload: Record<string, unknown> | null = null;
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      payload = null;
    }
    if (payload?.confirmation !== true) {
      return jsonResponse(req, { error: "Confirmação obrigatória" }, 400);
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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: patient, error: patientError } = await adminClient
      .from("patients")
      .select("id")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (patientError) throw new Error("Falha ao localizar paciente");
    if (!patient) {
      return jsonResponse(req, { error: "Acesso restrito a pacientes" }, 403);
    }

    const { error: deleteDataError } = await adminClient
      .from("patients")
      .delete()
      .eq("id", patient.id)
      .eq("user_id", authData.user.id);
    if (deleteDataError) throw new Error("Falha ao excluir dados");

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(authData.user.id);
    if (deleteUserError) throw new Error("Falha ao excluir usuario");

    return jsonResponse(req, { ok: true });
  } catch (error) {
    console.error("Erro interno na exclusão de conta", error);
    return jsonResponse(req, { error: "Não foi possível excluir a conta" }, 500);
  }
}
