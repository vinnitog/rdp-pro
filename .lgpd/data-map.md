# Mapa de Dados — RDP Pro

**Versão**: v0.1
**Data**: 2026-08-23
**Owner global**: a definir pelo controlador
**Escopo**: reverse-engineering do repositório; ambiente, contratos, regiões, logs e backups não verificados.

> O vínculo com psicólogo ou serviço de saúde mental pode revelar informação de saúde pelo contexto. Atividades do paciente são classificadas como sensíveis ou potencialmente sensíveis. O uso por menores não foi confirmado.

## A001 — Conta e perfil do profissional

| Campo | Valor |
| --- | --- |
| Slug | `a001-conta-perfil-profissional` |
| Finalidade | Autenticar o profissional, disponibilizar o painel e manter configurações operacionais. |
| Base legal | **HIPÓTESE A VALIDAR** — Art. 7º, V, para dados necessários ao serviço ([detalhes](./legal-basis.md#a001--conta-e-perfil-do-profissional)). |
| Titulares | Profissionais de saúde mental. |
| Dados | nome, e-mail, credencial no Auth, role, CRP, clínica, e-mail de relatório, plano, configurações e timestamps. |
| Fonte | profissional, sessão de autenticação e sistema. |
| Sistemas | Supabase Auth, `public.therapists` e sessão do cliente. |
| Operadores | Supabase; hospedagem/CDNs para metadados técnicos. |
| Transferência | a confirmar. |
| Retenção | a definir. |
| Segurança | RLS `therapist_self`; HTTPS observado; estado implantado não verificado. |
| Alto risco/RIPD | não concluído; validar escala e operação. |
| Owner | a definir. |

## A002 — Convite e vínculo profissional–paciente

| Campo | Valor |
| --- | --- |
| Slug | `a002-convite-vinculo-paciente` |
| Finalidade | Introduzir o paciente, vinculá-lo ao profissional correto e controlar o convite. |
| Base legal | **HIPÓTESE A VALIDAR** — Art. 7º, V, para identificadores necessários; Art. 11, II, `f`, somente se confirmada tutela da saúde, ou Art. 11, I. |
| Titulares | Pacientes; menores a confirmar. |
| Sensíveis? | potencialmente, pelo vínculo assistencial. |
| Dados | nome opcional, IDs, token, uso do convite, status e timestamps. |
| Fonte | profissional e sistema. |
| Sistemas | `public.patients`, painel e cache temporário do convite. |
| Operadores | Supabase. |
| Transferência | a confirmar. |
| Retenção | a definir. |
| Segurança | token aleatório, uso único e RLS; exposição temporária em URL/cache deve ser minimizada. |
| Alto risco/RIPD | a validar. |
| Owner | a definir. |

## A003 — Conta e autenticação do paciente

| Campo | Valor |
| --- | --- |
| Slug | `a003-conta-auth-paciente` |
| Finalidade | Autenticar o paciente e associar sua conta ao vínculo correto. |
| Base legal | **HIPÓTESE A VALIDAR** — Art. 7º, V, para conta; Art. 11, II, `f`, para vínculo sensível, ou Art. 11, I. |
| Titulares | Pacientes; idade não coletada. |
| Sensíveis? | potencialmente, pelo vínculo assistencial. |
| Dados | nome, e-mail, credencial, IDs, token temporário, vínculo e último acesso. |
| Fonte | titular, profissional, Auth e sistema. |
| Sistemas | Supabase Auth, `public.patients`, RPCs e `localStorage`. |
| Operadores | Supabase. |
| Transferência | a confirmar. |
| Retenção | a definir. |
| Segurança | autenticação, RLS por `auth.uid()` e convite de uso único. |
| Alto risco/RIPD | a validar; RIPD recomendado pelo contexto. |
| Owner | a definir. |

## A004 — Registro terapêutico local

| Campo | Valor |
| --- | --- |
| Slug | `a004-registro-terapeutico-local` |
| Finalidade | Permitir ao paciente registrar e consultar pensamentos, sentimentos e ansiedade. |
| Base legal | **HIPÓTESE A VALIDAR** — Art. 11, II, `f`, se integrar tutela da saúde; alternativa Art. 11, I. |
| Titulares | Pacientes; menores a confirmar. |
| Sensíveis? | sim — saúde/conteúdo terapêutico. |
| Dados | data/hora, situação, pensamentos, sentimentos, ansiedade, reação e identificador. |
| Fonte | titular; métricas derivadas no navegador. |
| Sistemas | `localStorage`, memória e DOM do navegador. |
| Operadores | nenhum para o conteúdo estritamente local; dependências remotas tratadas em A008. |
| Transferência | não evidenciada para o conteúdo local. |
| Retenção | a definir. |
| Segurança | isolamento da origem; sem criptografia em nível de aplicação; impacto elevado de XSS. |
| Alto risco/RIPD | a validar por dado sensível e possível impacto significativo. |
| Owner | a definir. |

## A005 — Sincronização e acesso clínico

| Campo | Valor |
| --- | --- |
| Slug | `a005-sync-acesso-clinico` |
| Finalidade | Persistir registros, recuperá-los e disponibilizá-los ao profissional vinculado. |
| Base legal | **HIPÓTESE A VALIDAR** — Art. 11, II, `f`, sob confirmação de tutela da saúde e papéis; alternativa Art. 11, I. |
| Titulares | Pacientes; menores a confirmar. |
| Sensíveis? | sim. |
| Dados | conteúdo terapêutico integral, IDs e timestamps. |
| Fonte | titular e sistema. |
| Sistemas | `public.records`, `public.patients`, REST/RLS, painel e cache local. |
| Operadores | Supabase. |
| Transferência | a confirmar por entidade/região/contrato. |
| Retenção | a definir, incluindo backups e término do vínculo. |
| Segurança | RLS autenticada; trilha de leitura não evidenciada. |
| Alto risco/RIPD | **RIPD prioritário**. |
| Owner | a definir. |

## A006 — Insights e exportação local

| Campo | Valor |
| --- | --- |
| Slug | `a006-insights-exportacao` |
| Finalidade | Exibir indicadores ao titular e gerar cópia portátil sob sua ação. |
| Base legal | **HIPÓTESE A VALIDAR** — Art. 11, II, `f`, se integrar tutela da saúde; alternativa Art. 11, I. |
| Titulares | Pacientes; menores a confirmar. |
| Sensíveis? | sim — reproduz e deriva dados de saúde. |
| Dados | registros, médias, variações, contagens e sentimentos. |
| Fonte | derivado dos registros. |
| Sistemas | navegador e arquivo baixado no dispositivo. |
| Operadores | bibliotecas carregadas por CDN; envio intencional de conteúdo não observado. |
| Transferência | metadados de CDN a confirmar em A008. |
| Retenção | a definir; arquivo exportado fica sob controle do titular. |
| Segurança | processamento local; dependências remotas sem CSP/SRI no estado auditado. |
| Alto risco/RIPD | a validar. |
| Owner | a definir. |

## A007 — Relatório terapêutico por e-mail

| Campo | Valor |
| --- | --- |
| Slug | `a007-relatorio-email` |
| Finalidade | Enviar ao profissional vinculado, sob ação do paciente, histórico para acompanhamento. |
| Base legal | **HIPÓTESE A VALIDAR** — Art. 11, II, `f`, se fizer parte da tutela da saúde; alternativa Art. 11, I, específico para o envio. |
| Titulares | paciente e profissional; menores a confirmar. |
| Sensíveis? | sim — relatório terapêutico integral. |
| Dados | nome, registros, datas/fuso, perfil e e-mail do profissional, autenticação e metadados. |
| Fonte | paciente, app, profissional e sistema. |
| Sistemas | Supabase Edge Functions, Resend e caixa postal do destinatário. |
| Operadores | Supabase, Resend e provedor de e-mail a identificar. |
| Transferência | a confirmar em toda a cadeia. |
| Retenção | a definir em logs, Resend e caixa postal. |
| Segurança | JWT e secrets em ambiente; validação/escape devem ser obrigatórios. |
| Alto risco/RIPD | **RIPD prioritário**. |
| Owner | a definir. |

## A008 — Entrega da PWA e ativos remotos

| Campo | Valor |
| --- | --- |
| Slug | `a008-entrega-pwa-ativos` |
| Finalidade | Servir o app e carregar recursos técnicos da interface. |
| Base legal | **HIPÓTESE A VALIDAR** — Art. 7º, IX, com LIA, para operação estritamente necessária; considerar Art. 7º, V quando demonstravelmente indispensável. |
| Titulares | visitantes, pacientes e profissionais. |
| Sensíveis? | conteúdo não é intencionalmente enviado; URL, IP, user-agent e referer precisam ser confirmados. |
| Dados | metadados de conexão potencialmente registrados. |
| Fonte | conexão HTTP observada pelos provedores. |
| Sistemas | hosting a confirmar, Google Fonts, jsDelivr, cdnjs, Deno/esm.sh e service worker. |
| Operadores | provedores acima, conforme papéis e contratos reais. |
| Transferência | a confirmar. |
| Retenção | a definir. |
| Segurança | HTTPS observado; CSP/SRI ausentes no estado auditado. |
| Alto risco/RIPD | tende a risco inferior se limitado a metadados, sujeito a confirmação. |
| Owner | a definir. |

## Cobertura e pendências

- Tabelas cobertas: `therapists`, `patients`, `records` e `auth.users` via Supabase Auth.
- Integrações cobertas: Supabase, Resend, Google Fonts, jsDelivr, cdnjs, Deno/esm.sh e hosting a confirmar.
- Retenção permanece a definir em todas as atividades.
- Confirmar controlador(es), público menor, escala, regiões, suboperadores, logs, backups e contratos.
- RIPD prioritário: A005 e A007; reavaliar A002–A006 após confirmação operacional.
