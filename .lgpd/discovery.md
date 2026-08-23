# Discovery LGPD — RDP Pro

**Data**: 2026-08-22
**Cenário**: sistema existente em retrofit
**Escopo**: análise estática do repositório. O estado implantado, contratos, região de hospedagem, backups e práticas operacionais não foram verificados.

## Produto e titulares

O RDP Pro é uma PWA B2B para registro de pensamentos em Terapia Cognitivo-Comportamental. Os titulares identificados no código são pacientes e profissionais de saúde mental. Não há restrição etária nem fluxo de responsável legal; a aplicabilidade a crianças e adolescentes precisa ser decidida com evidência de público-alvo e uso real.

## Dados tratados

| Grupo | Dados | Evidência |
| --- | --- | --- |
| Profissional | nome, e-mail, CRP, clínica, e-mail de relatório e configurações | `supabase/migrations/001_initial_schema.sql:9` |
| Paciente | nome, e-mail, identificadores de conta, vínculo com profissional, token de convite e atividade | `supabase/migrations/001_initial_schema.sql:26`; `supabase/migrations/003_patient_auth_ptbr_routes.sql:4` |
| Conteúdo terapêutico | situação, pensamentos, sentimentos, ansiedade, reação e pensamento alternativo | `supabase/migrations/001_initial_schema.sql:38` |
| Metadados | datas, horários, criação, sincronização e último acesso | `supabase/migrations/001_initial_schema.sql:23`; `supabase/migrations/001_initial_schema.sql:34`; `supabase/migrations/001_initial_schema.sql:52` |

O conteúdo terapêutico é dado pessoal sensível de saúde no contexto do produto (LGPD, art. 5º, II) e exige hipótese do art. 11, além dos princípios do art. 6º.

## Fluxos observados

1. Paciente e profissional criam conta no Supabase Auth (`js/db.js:68`, `js/db.js:284`).
2. Convite associa a conta autenticada ao cadastro do paciente; a migration 006 torna o convite de uso único (`supabase/migrations/006_invite_single_use.sql:52`).
3. Registros são gravados no `localStorage` e sincronizados automaticamente com o Supabase ao salvar ou editar (`js/db.js:156`, `js/db.js:171`, `js/db.js:199`).
4. Registros remotos são lidos e mesclados novamente no dispositivo (`js/db.js:237`).
5. O painel do profissional consulta pacientes e registros no Supabase (`js/db.js:365`).
6. O relatório completo passa por uma Edge Function e é enviado via Resend ao e-mail configurado (`js/db.js:442`; `supabase/functions/enviar-relatorio/index.ts:163`).

## Armazenamento e eliminação

- Navegador: sessão, convite pendente e conteúdo terapêutico em `localStorage` (`js/db.js:20`, `js/db.js:59`, `js/db.js:156`).
- Supabase: identidade, vínculo profissional-paciente e registros terapêuticos.
- Resend/e-mail: relatório terapêutico enviado ao destinatário configurado.
- `deleteRecord()` e `clearAll()` removem apenas o estado local; não há exclusão remota correspondente (`js/db.js:190`, `js/db.js:233`). Os dados podem reaparecer após `fetchAndMerge()` (`js/db.js:237`).
- Não há política de retenção, tratamento de backups ou procedimento de eliminação documentados.

## Operadores e terceiros observados

| Terceiro | Finalidade observada | Situação documental |
| --- | --- | --- |
| Supabase | autenticação, banco, RLS e Edge Functions | contrato, região, suboperadores e retenção não evidenciados |
| Resend | envio de relatórios por e-mail | DPA, retenção e suboperadores não evidenciados |
| Google Fonts | tipografia remota | requisição de recurso externo; avaliação documental ausente |
| jsDelivr e cdnjs | bibliotecas de frontend | scripts remotos sem SRI/CSP; avaliação documental ausente |
| Hospedagem | publicação da PWA | GitHub Pages aparece no README, mas o ambiente real não foi confirmado |

Transferência internacional não pode ser concluída apenas pelo código. Deve-se verificar entidade contratante, região e fluxos antes de aplicar a Resolução CD/ANPD nº 19/2024.

## Transparência e governança

- Não existe política de privacidade formal com os elementos do art. 9º.
- O texto atual afirma que os dados ficam apenas no dispositivo e nunca são enviados sem ação explícita (`paciente.html:225`), mas há sincronização automática com o Supabase.
- Não foram encontrados ROPA, RIPD, base legal por atividade, canal DSAR, encarregado público, runbook/registro de incidentes, política de retenção, inventário de operadores, DPA ou evidência de treinamento.
- Não há analytics, pixels ou anúncios encontrados no repositório. Requisições a fontes e CDNs externas continuam sendo fluxos de rede de terceiros.

## Segurança observável no código

### Controles positivos

- RLS final associa acesso do paciente a `auth.uid()` e do profissional ao próprio `therapist_id` (`supabase/migrations/003_patient_auth_ptbr_routes.sql:187`).
- Convites passam a ser de uso único (`supabase/migrations/006_invite_single_use.sql:4`).
- `SUPABASE_SERVICE_ROLE_KEY` e `RESEND_API_KEY` são lidas de variáveis de ambiente na Edge Function; não foram encontradas em claro.

Esses controles dependem de migrations manuais; o estado implantado não foi verificado.

### Riscos técnicos

- Conteúdo sensível e identificadores de sessão ficam em `localStorage`, acessível a JavaScript da origem.
- Scripts de terceiros são carregados sem CSP/SRI.
- Campos controlados pelo paciente entram no HTML do e-mail sem escape ou limites de tamanho (`supabase/functions/enviar-relatorio/index.ts:90`).
- O nome do paciente é interpolado em um `onclick` delimitado por aspas simples, enquanto `esc()` não trata aspas (`js/therapist.js:214`; `js/therapist.js:363`). Isso permite injeção de JavaScript persistente no painel do profissional.
- A Edge Function aceita CORS `*`, devolve detalhes internos de erro e retorna o e-mail destinatário ao cliente (`supabase/functions/enviar-relatorio/index.ts:4`; `supabase/functions/enviar-relatorio/index.ts:186`; `supabase/functions/enviar-relatorio/index.ts:201`).
- O token de convite só é removido da URL depois de uma chamada de rede (`js/app.js:15`), ampliando sua janela de exposição a histórico e referer.
- RPCs retornam `settings` inteiro, incluindo possível e-mail de relatório, quando o fluxo parece precisar apenas de configuração limitada (`supabase/migrations/006_invite_single_use.sql:16`).
- Há duas Edge Functions quase idênticas, ampliando risco de correções divergentes.

## Dados e identificadores expostos no repositório

- `js/config.js` contém e-mail pessoal de desenvolvimento.
- `js/config.js`, `context.md` e `README.md` vinculam o portfólio ao projeto Supabase real.
- A chave `anon` do Supabase é publicável por desenho e não equivale à `service_role`, mas deve operar apenas com RLS correta. Para um portfólio público, convém separar configuração de exemplo e ambiente implantado.
- O e-mail aparece também no histórico do conteúdo e nos metadados de autoria dos commits. Remover valores do estado atual não os remove do histórico Git; reescrita e `force-push` exigem decisão separada. Para commits futuros, recomenda-se um endereço `noreply`.
- O remetente da Edge Function expõe configuração operacional do domínio e deve vir de variável `REPORT_FROM_EMAIL`.
- Não foram encontrados segredos de servidor, chaves privadas, PATs ou arquivos `.env` rastreados nos snapshots auditados.

## Fontes normativas

- LGPD: arts. 5º, 6º, 7º, 9º, 11, 18, 19, 37, 38, 41, 46 e 48.
- Resolução CD/ANPD nº 15/2024: avaliação, comunicação e registro de incidentes.
- Resolução CD/ANPD nº 19/2024: transferências internacionais.

Este diagnóstico técnico não substitui revisão jurídica das hipóteses legais, contratos e textos publicados.
