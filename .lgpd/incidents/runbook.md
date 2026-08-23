# Runbook de Resposta a Incidentes — RDP Pro

> **MODO PREPARATÓRIO — NÃO REGISTRA INCIDENTE REAL.** Base: art. 48 da LGPD e Resolução CD/ANPD nº 15/2024.

## Responsáveis pendentes

- Controlador, CNPJ/CPF e endereço: `[PENDENTE]`
- Encarregado/representante: `[PENDENTE]`
- Líder técnico, jurídico/privacidade e comunicação: `[PENDENTE]`
- Operadores: `[SUPABASE, RESEND, HOSPEDAGEM — CONFIRMAR ENTIDADE/CONTATO]`
- Regime ATPP: `[NÃO AVALIADO]`

## Relógio regulatório

T0 é quando o controlador sabe que o incidente afetou dados pessoais.

- ANPD e titulares: até 3 dias úteis do T0.
- Complemento: até 20 dias úteis após comunicação preliminar.
- Se ATPP for formalmente confirmado, esses prazos contam em dobro, conforme arts. 6º, §8º, e 9º, §6º da Res. 15/2024.
- Registro de todos os incidentes: mínimo de 5 anos.

## Fluxo

### T+0 a T+4h

- abrir `INC-[ANO]-[SEQUENCIAL]` e registrar alerta e T0;
- acionar responsáveis em canal restrito;
- preservar logs, políticas RLS, eventos, versões e hashes sem copiar registros para chats/tickets;
- conter: desabilitar rota, revogar sessões/tokens ou restringir credenciais sem destruir evidência;
- acionar operadores e registrar respostas.

### T+4 a T+24h

Documentar vetor, período, ambientes, categorias, escopo e titulares. Aplicar o teste cumulativo do art. 5º:

1. há risco ou dano relevante aos direitos fundamentais?
2. envolve sensíveis, crianças/adolescentes/idosos, financeiros, autenticação, sigilo ou larga escala?

Se ambos: comunicar. Caso contrário: registrar decisão e evidência por 5 anos. Dados terapêuticos satisfazem a categoria sensível/sigilo; o risco relevante ainda exige fundamentação.

### Até 3 dias úteis

- preencher `templates/notification-anpd.md` e peticionar pelo SEI!ANPD;
- preencher `templates/notification-subject.md` e guardar versão, destinatários, canal e entrega;
- juntar prova de vínculo do encarregado ou representação no prazo aplicável;
- se comunicação individualizada for inviável ou titulares não forem identificáveis, divulgar nos meios disponíveis, no mesmo prazo e com os 7 itens, com visualização direta por pelo menos 3 meses (art. 9º, §3º).

### Pós-incidente

- complementar a ANPD quando necessário;
- concluir causa raiz, eficácia e plano;
- atualizar log, ROPA, RIPD, fornecedores, testes e runbook.

## Playbooks

### XSS e exfiltração terapêutica

Desabilitar o componente, preservar payload com segurança, revogar sessões, remover handlers inseguros, identificar painéis/sessões/registros expostos e tratar como possível exposição sensível/autenticação até prova em contrário.

### Falha de RLS

Bloquear a operação ou restaurar policy segura, capturar policies/grants/migrations, delimitar intervalo/contas/linhas, validar isolamento positivo e negativo e avaliar exposição de saúde e sigilo profissional.

## Tabletop anual

**Ainda não executado/agendado.** Data, participantes e resultados: `[PENDENTES]`.

Simular sem payload funcional nem dados reais: (A) XSS com acesso a registros sintéticos; (B) conta lendo registros sintéticos de outro vínculo por RLS incorreta. Medir T0, contenção, delimitação, decisão, rascunhos e lacunas. Falha do exercício: exceder 3 dias úteis simulados sem comunicação preliminar fundamentada.

## Fontes

- Res. 15/2024: https://bibliotecadigital.mj.gov.br/bitstream/1/12879/2/RES_ANPD_2024_15.html
- Canal CIS/SEI!ANPD: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis
