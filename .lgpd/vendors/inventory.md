# Inventário Preliminar de Fornecedores — RDP Pro

**Data**: 2026-08-23
**Escopo**: evidências estáticas do repositório.
**Status**: razão social, país, região, contrato, DPA, subprocessadores, certificações, retenção e incidentes não confirmados.

> A presença de um serviço no código não define sozinha seu papel jurídico. O papel e eventual transferência internacional devem ser validados por fluxo e contrato.

## Tiering preliminar

| Serviço | Papel observado | Dados observados ou possíveis | Tier |
| --- | --- | --- | --- |
| Supabase | Auth, banco, RLS, RPCs e Edge Functions | identidade, autenticação, vínculo clínico e registros terapêuticos | **Crítico** |
| Resend | entrega de relatório por e-mail | nome e relatório terapêutico integral, destinatário e metadados | **Crítico** |
| Hosting da PWA | servir arquivos estáticos | IP, user-agent, URL/referer e logs possíveis | **Médio provisório** |
| Google Fonts | tipografia | metadados de conexão possíveis | **Baixo/Médio provisório** |
| jsDelivr | cliente Supabase JS | metadados e risco de supply chain | **Baixo/Médio provisório** |
| cdnjs | Chart.js e jsPDF | metadados; processamento de conteúdo no cliente | **Baixo/Médio provisório** |
| deno.land / esm.sh | dependências da Edge | download de código; nenhum envio intencional de PII observado | **Baixo LGPD; risco técnico** |
| Provedor da caixa postal | armazenar/encaminhar relatório | relatório terapêutico integral | **papel/tier a confirmar** |

## V001 — Supabase

- **Atividades**: A001, A002, A003, A005 e A007.
- **Dados**: perfis, IDs, vínculo clínico, tokens, conteúdo terapêutico e metadados a confirmar.
- **Tier**: crítico.
- **DPA, região, subprocessadores, certificações, SLA e mecanismo de transferência**: não evidenciados; solicitar/comprovar.
- **Retenção/backups/eliminação**: definir e comprovar para Auth, banco, Edge logs e backups.
- **Controles locais**: RLS e convite de uso único no SQL; implantação não auditada.
- **Ação P0**: obter documentação e validar RLS/migrations no ambiente.
- **Owner/revisão**: a definir; após coleta documental, revisão trimestral.

## V002 — Resend

- **Atividade**: A007.
- **Dados**: relatório terapêutico, identidades, destinatário e metadados de entrega.
- **Tier**: crítico pela presença de dado sensível.
- **DPA, região, retenção de corpo/logs/bounces, subprocessadores, incidentes, DSAR e transferência**: não evidenciados.
- **Ação P0**: comprovar itens acima e avaliar canal mais seguro que e-mail.
- **Owner/revisão**: a definir; após coleta documental, revisão trimestral.

## V003 — Hosting da PWA

- **Provedor real**: a confirmar; GitHub Pages consta apenas como instrução.
- **Dados possíveis**: IP, user-agent, URL/referer e logs, inclusive risco de token na query string.
- **Tier**: médio provisório.
- **Ação P1**: identificar provedor, impedir logging de tokens e revisar DPA, retenção, subprocessadores e transferência.

## V004–V006 — Fontes e CDNs

- **Serviços**: Google Fonts, jsDelivr e cdnjs.
- **Dados possíveis**: metadados de conexão; conteúdo clínico não é enviado intencionalmente no fluxo observado.
- **Tier**: baixo/médio provisório.
- **Ação P2**: preferir self-host; caso mantidos, pinning/SRI/CSP e documentação do fluxo.

## V007–V008 — Dependências remotas da Edge

- **Serviços**: deno.land e esm.sh.
- **Papel**: distribuição de código; status de operador não demonstrado.
- **Ação P2**: pinning, governança de dependências e confirmação de telemetria/logs.

## Cadeia de e-mail

O provedor da caixa postal e MTAs podem armazenar o relatório, mas não são identificáveis pelo código. É necessário definir papéis, informar que o e-mail sai do ambiente do app, estabelecer retenção/eliminação e não alegar ausência de terceiros.

## Checklist documental para críticos

- [ ] identidade legal e contato de privacidade;
- [ ] papel e instruções do controlador (LGPD art. 39);
- [ ] contrato/DPA vigente;
- [ ] categorias, titulares e finalidades;
- [ ] regiões, acessos e subprocessadores;
- [ ] mecanismo de transferência, se aplicável;
- [ ] retenção, backup, devolução e eliminação;
- [ ] criptografia, acesso e logs;
- [ ] incidente compatível com Res. 15/2024;
- [ ] assistência a DSAR/RIPD/auditoria;
- [ ] owner e revisão periódica.

## Status

- 2 fornecedores críticos preliminares: Supabase e Resend.
- Nenhum DPA, região, mecanismo de transferência ou certificação foi comprovado no repositório; isso é ausência de evidência, não prova de inexistência operacional.
