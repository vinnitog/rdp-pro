# Gap Analysis e Plano de Remediação — 2026-08-22

## Resumo executivo

- **10 gaps vermelhos**: ausência ou contradição verificável que exige remediação.
- **5 gaps amarelos**: risco ou obrigação depende de confirmação operacional/jurídica.
- **2 controles verdes**: salvaguardas presentes no código, sem atestar o ambiente implantado.

O risco central é o tratamento de dados de saúde combinado com transparência incorreta, ausência de base legal documentada e eliminação apenas local. O app não deve alegar que os dados ficam somente no dispositivo enquanto os sincroniza automaticamente.

## Matriz de gaps

| # | Status | Tema | Evidência | Severidade | Fundamento |
| --- | --- | --- | --- | --- | --- |
| 1 | RED | Transparência e aviso de privacidade | `paciente.html:225` contradiz `js/db.js:171` e `js/db.js:199` | crítica | LGPD arts. 6º e 9º |
| 2 | RED | Hipótese legal para dados sensíveis | conteúdo de saúde em `001_initial_schema.sql:38`, sem base documentada | crítica | LGPD arts. 5º, II, e 11 |
| 3 | RED | ROPA e avaliação de impacto | nenhum registro de operações ou RIPD | crítica | LGPD arts. 37 e 38 |
| 4 | RED | Direitos, eliminação e retenção | exclusão é só local e dados voltam do backend (`js/db.js:190`, `js/db.js:237`) | crítica | LGPD arts. 6º, 18 e 19 |
| 5 | RED | Resposta a incidentes | nenhum runbook ou registro | crítica | LGPD arts. 46 e 48; Res. 15/2024 |
| 6 | RED | Encarregado/canal público | nenhuma designação ou contato público | alta | LGPD art. 41; observar eventual regime ATPP |
| 7 | RED | Operadores e DPA | Supabase e Resend sem documentação no repo | alta | LGPD arts. 39 e 46 |
| 8 | YELLOW | Transferência internacional | provedores externos presentes; região e entidade contratante desconhecidas | alta | LGPD arts. 33–36; Res. 19/2024 |
| 9 | RED | Auditabilidade de acesso a PII | apenas timestamps e logs de erro | alta | LGPD arts. 37 e 46 |
| 10 | YELLOW | Proteção local e em repouso | dados sensíveis em `localStorage`; controles gerenciados não verificados | alta | LGPD art. 46 |
| 11 | YELLOW | Minimização | RPC retorna `settings` inteiro e Edge devolve destinatário | alta | LGPD art. 6º, III |
| 12 | YELLOW | Crianças e adolescentes | não há restrição etária ou fluxo de responsável; público real desconhecido | alta | LGPD art. 14; avaliar Lei 15.211/2025 |
| 13 | RED | Governança e treinamento | nenhum artefato ou evidência no repositório | média | LGPD arts. 6º, X, e 50 |
| 14 | GREEN | RLS autenticada | políticas vinculam registros ao usuário/paciente e ao profissional | controle | `003_patient_auth_ptbr_routes.sql:187` |
| 15 | GREEN | Convite de uso único | `invite_used_at` invalida convite vinculado | controle | `006_invite_single_use.sql:4` |
| 16 | YELLOW | Cadeia de fornecimento frontend | scripts remotos sem CSP/SRI e endpoint legado duplicado | média | LGPD art. 46 |
| 17 | RED | Injeção e segurança de interfaces | HTML de e-mail sem escape; nome interpolado em `onclick`; payload sem limites | alta | LGPD art. 46 |

## Ações imediatas

1. **Corrigir a transparência do produto**
   - Remover alegações absolutas incompatíveis com a sincronização.
   - Informar controlador, canal de contato, categorias de dados, finalidades, Supabase, Resend/e-mail, retenção, direitos e possíveis transferências.
   - Documentar e revisar juridicamente a hipótese do art. 11 antes de publicar uma política definitiva.
   - Skills: `lgpd-data-mapping`, `lgpd-legal-basis`, `lgpd-privacy-policy`.

2. **Implementar eliminação remota e canal DSAR mínimo**
   - Excluir registro local e remoto de forma autenticada.
   - Impedir que dados eliminados reapareçam no próximo login.
   - Definir retenção, tratamento de backups, confirmação e fluxo de solicitação.
   - Skill: `lgpd-dsar` e `lgpd-retention-erasure`.

3. **Endurecer o envio de relatórios**
   - Validar schema, tipos, quantidades e tamanhos.
   - Escapar todo conteúdo inserido no HTML e não devolver o e-mail destinatário ao cliente.
   - Remover handlers inline construídos com dados e usar `addEventListener`/`dataset` seguro no painel.
   - Restringir origens, remover detalhes internos das respostas e eliminar a janela de exposição do convite na URL.
   - Aplicar a correção aos dois endpoints ou remover a duplicação com migração segura.
   - Fundamento: medidas técnicas e prevenção (LGPD arts. 6º, VIII, e 46).

4. **Remover exposição desnecessária do portfólio**
   - Retirar e-mail pessoal, referência real do Supabase em documentação e instruções de deploy específicas.
   - Externalizar o remetente operacional como `REPORT_FROM_EMAIL`.
   - Ampliar o `.gitignore` para `.env.*` com exceção explícita para `.env.example` e cobrir chaves/certificados.
   - Separar configuração publicável de exemplos e documentar que a chave `anon` depende de RLS.
   - Avaliar rotação e limpeza do histórico em etapa explicitamente autorizada.

## Próximas etapas do pipeline

### Próximas 2–4 semanas de trabalho priorizado

- Inventário completo de tratamentos e ROPA: `lgpd-data-mapping` + `lgpd-ropa`.
- Base legal por atividade e finalidade: `lgpd-legal-basis`.
- Inventário, DPA e transferências de operadores: `lgpd-vendor-audit` + `lgpd-dpa` + `lgpd-international-transfer`.
- Runbook e registro de incidentes: `lgpd-incident-response`.

### Planejamento subsequente

- Retenção e eliminação automatizadas: `lgpd-retention-erasure`.
- Trilha de auditoria proporcional ao risco: `lgpd-audit-logging`.
- RIPD do tratamento de dados terapêuticos: `lgpd-ripd`.
- Avaliação de usuários menores e eventual ECA Digital: `lgpd-eca-digital-minors`.
- Definição do encarregado ou canal exigível conforme porte/risco: `lgpd-dpo-encarregado`.

## Decisões humanas pendentes

- Quem é o controlador e qual contato deve aparecer publicamente?
- Qual hipótese do art. 11 sustenta cada tratamento de dados de saúde?
- O produto admite menores? Em quais faixas etárias?
- Qual o porte do agente de tratamento e o regime ATPP aplicável?
- Onde Supabase, Resend e hospedagem processam os dados e quais contratos estão vigentes?
- Quais prazos de retenção são clínica, legal e operacionalmente justificáveis?

## Top 3 para aprovação

1. Corrigir texto de privacidade e mapear/basear os tratamentos.
2. Corrigir exclusão local/remota e criar DSAR mínimo.
3. Escapar/validar relatórios e fechar governança de incidentes e fornecedores.

> Checkpoint L1: revisar este artefato antes de iniciar L2 (`lgpd-data-mapping`).
