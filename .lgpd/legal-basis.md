# Bases Legais por Atividade — RDP Pro

**Última atualização**: 2026-08-23
**Status**: rascunho técnico para validação do controlador e revisão jurídica.

> Nenhuma entrada constitui decisão jurídica final. Para dados de saúde, execução de contrato e legítimo interesse não substituem as hipóteses do art. 11.

## Regras pendentes

1. Identificar o controlador em cada fluxo: plataforma, profissional/clínica ou controladoria conjunta.
2. Art. 11, II, `f` só pode ser adotado se houver tutela da saúde em procedimento realizado por profissional, serviço de saúde ou autoridade sanitária.
3. Sem essa condição, avaliar Art. 11, I: consentimento específico, destacado, versionado e revogável por finalidade.
4. Se houver menores, reavaliar também sob Art. 14 e legislação aplicável.
5. Retenção permanece a definir por falta de fonte legal, clínica, contratual e operacional confirmada.

## A001 — Conta e perfil do profissional

- **Finalidade**: autenticar, fornecer o painel e manter configurações necessárias.
- **Dados**: nome, e-mail, credencial, role, CRP, clínica, e-mail de relatório, plano e configurações.
- **Sensíveis?**: não evidenciado.
- **Base legal**: **HIPÓTESE A VALIDAR — Art. 7º, V**, se cada campo for necessário ao serviço solicitado/contratado.
- **Alternativas**: Art. 7º, I, ou Art. 7º, IX com LIA, para finalidades opcionais separadas.
- **Retenção**: a definir.
- **Questões**: quem contrata o app, quais campos são essenciais e como o CRP é validado?

## A002 — Convite e vínculo profissional–paciente

- **Finalidade**: criar convite de uso único e associar o paciente ao profissional correto.
- **Sensíveis?**: potencialmente, pois o vínculo pode revelar contexto de saúde.
- **Dados comuns**: **HIPÓTESE A VALIDAR — Art. 7º, V**, se o fluxo decorrer de serviço solicitado.
- **Vínculo sensível**: **HIPÓTESE A VALIDAR — Art. 11, II, `f`**; alternativa Art. 11, I.
- **Necessidade**: avaliar convite sem nome até o ingresso do titular.
- **Retenção**: a definir.
- **Questões**: quem informa o paciente antes do cadastro e o vínculo integra procedimento de saúde?

## A003 — Conta e autenticação do paciente

- **Finalidade**: autenticar e associar a conta ao vínculo correto.
- **Dados comuns**: **HIPÓTESE A VALIDAR — Art. 7º, V**.
- **Vínculo sensível**: **HIPÓTESE A VALIDAR — Art. 11, II, `f`**; alternativa Art. 11, I.
- **Limite**: Art. 11, II, `g` pode sustentar apenas dados sensíveis estritamente necessários à prevenção de fraude/segurança, não o vínculo ou prontuário inteiro.
- **Retenção**: a definir.
- **Questões**: a conta é indispensável, como `auth.users` é excluído e há menores?

## A004 — Registro terapêutico local

- **Finalidade**: permitir registro e consulta para uso terapêutico.
- **Dados**: conteúdo terapêutico e ansiedade.
- **Sensíveis?**: sim — Art. 5º, II.
- **Base legal**: **HIPÓTESE A VALIDAR — Art. 11, II, `f`**; alternativa Art. 11, I.
- **Justificativa pendente**: documentar participação/instrução do profissional e finalidade assistencial.
- **Retenção**: a definir, separando cópia local e nuvem.

## A005 — Sincronização e acesso clínico

- **Finalidade**: persistir, recuperar e disponibilizar registros ao profissional vinculado.
- **Sensíveis?**: sim.
- **Base legal**: **HIPÓTESE A VALIDAR — Art. 11, II, `f`**; alternativa Art. 11, I, específico para sincronização/acesso.
- **Transparência**: diferenciar registro local, nuvem e acesso profissional.
- **Retenção**: a definir, incluindo backups e término do vínculo.
- **Questões**: sync é opcional e acesso contínuo é necessário?

## A006 — Insights e exportação

- **Finalidade**: calcular indicadores e gerar cópia solicitada pelo paciente.
- **Sensíveis?**: sim.
- **Base legal**: **HIPÓTESE A VALIDAR — Art. 11, II, `f`**; alternativa Art. 11, I.
- **Transparência**: informar que arquivo baixado sai do ambiente controlado.
- **Retenção**: a definir no app; a cópia fica sob controle do titular.

## A007 — Relatório por e-mail

- **Finalidade**: enviar, sob ação do paciente, relatório ao profissional vinculado.
- **Sensíveis?**: sim.
- **Base legal**: **HIPÓTESE A VALIDAR — Art. 11, II, `f`**; alternativa Art. 11, I, específico para envio por e-mail.
- **Necessidade**: validar se e-mail é proporcional e se há alternativa mais segura.
- **Retenção**: a definir em Edge/logs, Resend, trânsito e caixa postal.
- **Questões**: destinatário verificado, prazo da caixa postal, DPA e transferência adequados?

## A008 — Entrega da PWA e ativos remotos

- **Finalidade**: servir o app e carregar recursos técnicos.
- **Dados**: IP, user-agent, URL/referer e logs técnicos potenciais.
- **Sensíveis?**: não evidenciado; reclassificar se URL/referer revelar contexto de saúde.
- **Base legal**: **HIPÓTESE A VALIDAR — Art. 7º, IX**, com LIA; considerar Art. 7º, V se indispensável.
- **Minimização**: avaliar self-host de fontes/scripts e referrer policy.
- **Retenção**: a definir com os provedores.

## Quadro de aprovação

| Atividade | Sensíveis | Hipótese pendente | Alternativa | Status |
| --- | ---: | --- | --- | --- |
| A001 | não evidenciado | Art. 7º, V | Art. 7º, I/IX | validar |
| A002–A003 | potencialmente | Art. 11, II, `f` + Art. 7º, V | Art. 11, I | validar |
| A004–A007 | sim | Art. 11, II, `f` | Art. 11, I | validar |
| A008 | não evidenciado | Art. 7º, IX + LIA | Art. 7º, V | validar |

## Bloqueios

- identificar controlador(es) e operadores;
- confirmar tutela da saúde nas condições do art. 11, II, `f`;
- decidir admissão de menores;
- definir retenção e backups;
- validar DPA, regiões, suboperadores e transferências;
- se houver consentimento, criar prova específica e destacada, sem checkbox pré-marcado.
