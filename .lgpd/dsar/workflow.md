# Direitos dos Titulares (DSAR) — RDP Pro

**Versão**: v0.1
**Data**: 2026-08-23
**SLA de referência**: resposta completa em 15 dias corridos (LGPD, art. 19, II); 30 dias somente se o regime ATPP for formalmente aplicável (Res. 2/2022, art. 14).

## Canais

1. **Self-service autenticado do paciente**: aba Privacidade.
2. **Canal do encarregado/representante**: pendente de definição pública.
3. **Fluxo para profissional e titular sem login**: pendente de formulário/processo autenticado.

O canal pendente é gap aberto; os controles self-service não substituem atendimento de casos especiais.

## Cobertura dos direitos

| Direito | Controle atual | Status |
| --- | --- | --- |
| Confirmação/acesso | exportação autenticada via `export_current_patient_data()` | MVP |
| Correção | atualização do nome do paciente autenticado | parcial; demais dados/processo pendentes |
| Anonimização/bloqueio/eliminação de excessos | exclusão de registros e conta | parcial; análise manual pendente |
| Portabilidade | download JSON estruturado | MVP; formato final sujeito à regulamentação |
| Eliminação | DELETE remoto/local por registro/ciclo e exclusão integral da conta | MVP |
| Informação de compartilhamentos | transparência factual na aba e inventário `.lgpd` | parcial; política final pendente |
| Informação sobre não consentir | depende da decisão de base legal | pendente |
| Revogação de consentimento | não implementar ledger antes de aprovar uso de consentimento | pendente |
| Revisão automatizada | não foram encontradas decisões automatizadas com efeito material | não aplicável no estado auditado |

## Fluxo self-service

1. Exigir sessão Supabase válida; não aceitar token de convite como autorização.
2. Para exportar, sincronizar pendências e chamar RPC filtrada por `auth.uid()`.
3. Para apagar registro/ciclo, executar DELETE remoto sob RLS; somente após sucesso remover cache local.
4. Para apagar conta, exigir dupla confirmação no cliente e JWT na Edge Function.
5. A Edge confirma que o usuário possui perfil de paciente, remove `patients`/registros e depois `auth.users`.
6. Limpar tokens, sessão e cache local após sucesso.
7. Falhas devem retornar mensagem genérica e preservar o estado local quando a exclusão remota não ocorreu.

## Exportação

Inclui apenas:

- perfil do paciente: ID, nome, e-mail e criação;
- registros do próprio paciente em ordem cronológica;
- data/hora da exportação.

Não inclui token, configurações/e-mail do profissional nem dados de outros titulares.

## Pendências operacionais

- definir controlador, encarregado/representante e contato público;
- criar protocolo/ticket, verificação de identidade e trilha `RECEIVED/VERIFIED/FULFILLED/REJECTED`;
- alertas de SLA e comunicação ao titular;
- propagar pedidos a operadores e documentar backups/retenções;
- reconciliar exclusão parcial entre banco e Auth;
- atender direitos do profissional e pessoas sem acesso à conta.

## Testes obrigatórios

- isolamento entre dois pacientes;
- exportação sem tokens/settings;
- DELETE individual/ciclo e ausência de ressurreição;
- falha remota sem perda local;
- usuário profissional recebe 403 na exclusão de conta de paciente;
- exclusão completa e retry em ambiente de teste.
