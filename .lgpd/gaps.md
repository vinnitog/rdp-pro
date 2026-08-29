# Gap Analysis e Plano de Remediação — atualizado em 2026-08-28

## Resumo executivo

- **4 gaps vermelhos**: obrigações ou controles estruturais ainda ausentes.
- **9 gaps amarelos**: controles parciais ou dependentes de validação operacional/jurídica.
- **4 controles verdes**: salvaguardas verificadas no código e nos artefatos locais, sem atestar o ambiente implantado.

Desde o diagnóstico inicial, o repositório ganhou autenticação do paciente, eliminação remota, exportação, hardening de interfaces e Edge Functions, inventários de privacidade e resposta a incidentes. Permanecem como riscos centrais a ausência de ROPA/RIPD finais, encarregado ou canal público, auditabilidade proporcional ao risco e governança operacional. O tratamento envolve dados sensíveis de saúde e continua sujeito aos princípios de necessidade, transparência, segurança, prevenção e responsabilização (LGPD arts. 6º, 11, 37, 38 e 46).

## Matriz atual

| # | Status | Tema | Evidência atual | Severidade | Fundamento |
| --- | --- | --- | --- | --- | --- |
| 1 | GREEN | Transparência funcional | `paciente.html` explica armazenamento local, sincronização, envio, exportação e exclusão; política final segue identificada como minuta | controle | LGPD arts. 6º e 9º |
| 2 | YELLOW | Hipótese legal para dados sensíveis | `.lgpd/legal-basis.md` documenta hipóteses, mas exige validação do controlador e revisão jurídica | crítica | LGPD arts. 5º, II, e 11 |
| 3 | RED | ROPA e avaliação de impacto | mapa de dados existe; ROPA e RIPD ainda não foram concluídos | crítica | LGPD arts. 37 e 38 |
| 4 | YELLOW | Direitos, eliminação e retenção | exclusão individual, em lote e de conta existe; reconciliação reflete exclusões entre dispositivos, mas retenção, backups e falha parcial de exclusão da conta dependem de processo operacional | crítica | LGPD arts. 6º, 18 e 19 |
| 5 | YELLOW | Resposta a incidentes | runbook, registro e modelos existem em `.lgpd/incidents/`; contatos, responsáveis e exercício de mesa não foram validados | alta | LGPD arts. 46 e 48; Res. 15/2024 |
| 6 | RED | Encarregado/canal público | responsável, regime aplicável e canal público continuam pendentes | alta | LGPD art. 41; Res. 18/2024; observar eventual regime ATPP |
| 7 | YELLOW | Operadores e DPA | inventário preliminar existe; contratos, DPAs, suboperadores e instruções documentadas não foram verificados | alta | LGPD arts. 39 e 46 |
| 8 | YELLOW | Transferência internacional | provedores externos presentes; regiões, entidades contratantes e mecanismo de transferência não foram confirmados | alta | LGPD arts. 33–36; Res. 19/2024 |
| 9 | RED | Auditabilidade de acesso a PII | não há trilha de auditoria proporcional para acesso e ações administrativas sobre dados sensíveis | alta | LGPD arts. 37 e 46 |
| 10 | YELLOW | Proteção local e em repouso | dados sensíveis permanecem em `localStorage`; falhas de gravação agora bloqueiam a confirmação de sucesso, mas controles do dispositivo e do backend não foram verificados em staging | alta | LGPD art. 46 |
| 11 | YELLOW | Minimização | payloads e respostas de erro foram reduzidos; algumas RPCs ainda retornam campos além do consumo observado no frontend | alta | LGPD art. 6º, III |
| 12 | YELLOW | Público 18+ | o controlador informou que não há usuários menores e a versão atual foi documentada como 18+; termos e processo operacional ainda devem formalizar a restrição | alta | LGPD art. 14; reavaliar Lei 15.211/2025 antes de admitir menores |
| 13 | RED | Governança e treinamento | não há evidência de programa, responsáveis, treinamento ou revisão periódica | média | LGPD arts. 6º, X, e 50 |
| 14 | GREEN | RLS autenticada | policies e testes vinculam registros ao paciente autenticado e ao profissional responsável | controle | `003_patient_auth_ptbr_routes.sql` e testes de regressão |
| 15 | GREEN | Convite de uso único | `invite_used_at` invalida o convite após o vínculo; token inválido não permanece pendente no dispositivo | controle | `006_invite_single_use.sql` e fluxo do paciente |
| 16 | YELLOW | Cadeia de fornecimento frontend | dependências remotas continuam sem CSP/SRI e o Supabase JS usa faixa de versão pública | média | LGPD art. 46 |
| 17 | GREEN | Injeção e segurança de interfaces | validação de payload, escape de conteúdo, CORS por allowlist, Bearer auth e testes regressivos estão presentes | controle | LGPD arts. 6º, VIII, e 46 |

## Ações priorizadas

### Antes de produção

1. Identificar controlador, canal público e eventual encarregado; validar as hipóteses do art. 11 e revisar juridicamente a política v0.1 antes de publicá-la.
2. Concluir ROPA e RIPD do tratamento de dados terapêuticos e do relatório por e-mail; confirmar porte, escala e regime aplicável.
3. Confirmar regiões, contratos, DPAs, suboperadores, transferências, retenção e tratamento de backups de Supabase, Resend e hospedagem.
4. Formalizar o público 18+ em termos e processo operacional. Qualquer intenção de admitir menores reabre a avaliação LGPD/ECA Digital antes da mudança.

### Hardening técnico subsequente

1. Validar migrations, RLS, RPCs e Edge Functions contra um ambiente de staging, incluindo casos permitidos e negados.
2. Reduzir campos retornados por RPCs públicas ao mínimo usado pelo cliente e revisar funções `SECURITY DEFINER`/grants como trabalho arquitetural separado.
3. Definir trilha de auditoria proporcional, observabilidade sem conteúdo terapêutico e reconciliação operacional de exclusões parciais.
4. Planejar CSP/SRI ou empacotamento de dependências e migrar a chave pública legada para o formato publishable quando a configuração estiver disponível.

## Decisões humanas pendentes

- Quem é o controlador e qual contato deve aparecer publicamente?
- Qual hipótese do art. 11 sustenta cada tratamento de dados de saúde?
- Qual o porte do agente de tratamento e o regime ATPP aplicável?
- Onde Supabase, Resend e hospedagem processam os dados e quais contratos estão vigentes?
- Quais prazos de retenção são clínica, legal e operacionalmente justificáveis?

> A política em `.lgpd/policies/privacy-policy-v0.1-draft.md` permanece minuta não vigente. Atualizar ou publicar o documento exige o checkpoint humano e revisão jurídica previstos em `.lgpd/STATUS.md`.
