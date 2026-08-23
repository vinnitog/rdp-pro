# Retenção e Eliminação — RDP Pro

**Versão**: v0.1
**Data**: 2026-08-23
**Status**: controles técnicos mínimos implementados; prazos jurídicos, clínicos, contratuais e de backup pendentes de aprovação.

## Princípios

- Encerrar o tratamento e eliminar quando a finalidade terminar, salvo hipótese do art. 16 da LGPD.
- Não adotar prazo fiscal, trabalhista, bancário ou de consumo por analogia sem confirmar sua incidência.
- Quando retenção obrigatória for confirmada, bloquear o uso para a finalidade original e manter apenas o necessário.
- Não afirmar eliminação de cópias de operadores/backups sem evidência contratual e técnica.

## Matriz atual

| Categoria | Estado técnico | Gatilho/ação | Prazo aprovado |
| --- | --- | --- | --- |
| Registros terapêuticos no dispositivo | `localStorage` por paciente | exclusão individual, limpeza do ciclo, logout ou exclusão da conta | a definir |
| Registros terapêuticos no Supabase | `public.records` | DELETE autenticado por registro/ciclo; cascata na exclusão de `patients` | a definir |
| Perfil/vínculo do paciente | `public.patients` | hard delete pela Edge Function de exclusão da conta | duração da conta; critério final a definir |
| Conta Auth do paciente | Supabase Auth | `auth.admin.deleteUser` após remoção do perfil | duração da conta; critério final a definir |
| Perfil profissional e pacientes vinculados | Supabase | sem self-service de eliminação nesta versão | a definir |
| Relatório por e-mail | Resend + caixa postal | fora do controle direto do app após entrega | a definir com contratos e profissional |
| Logs/backups dos operadores | provedores | não observável no repositório | a definir/comprovar |
| Registro de incidentes | `.lgpd/incidents/log.md` | manter todos os incidentes | mínimo 5 anos — art. 10 Res. 15/2024 |

## Controles implementados

- Migration 007: policy DELETE permite ao paciente autenticado apagar somente seus registros.
- A exclusão local ocorre apenas depois de sucesso da operação remota.
- Limpeza do ciclo apaga todos os registros do paciente remoto e local.
- Exclusão da conta remove `patients`, registros em cascata e o usuário Auth pelo endpoint autenticado.
- Logout remove sessão, convite pendente, token Auth local e cache sensível do paciente atual.
- Exportação sincroniza pendências antes de gerar o JSON remoto.

## Riscos e pendências

- A exclusão de `patients` e `auth.users` não é transacional; falha entre etapas exige retry/reconciliação operacional.
- Confirmar exclusão em backups, logs, Resend e caixa postal.
- Definir retenção de perfis inativos, convites nunca usados e conta do profissional.
- Criar processo para obrigações do art. 16, bloqueio e resposta ao titular.
- Depois de aprovados os prazos, adicionar job de expiração, log de execução e relatório ao responsável.

## Critérios de validação

- dado apagado não reaparece após login/sincronização;
- paciente A nunca apaga/exporta dados de B;
- falha remota preserva a cópia local e informa erro;
- exclusão de conta profissional é rejeitada pelo endpoint de paciente;
- ambiente de teste confirma cascata e comportamento de backups.
