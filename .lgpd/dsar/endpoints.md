# Endpoints e RPCs DSAR — RDP Pro

| Operação | Interface | Autorização | Resultado |
| --- | --- | --- | --- |
| Exportar dados | `rpc('export_current_patient_data')` | `authenticated`; filtro `auth.uid()` | JSON do perfil mínimo + registros próprios |
| Excluir registro | REST DELETE `records` | RLS `patient_delete_own_records` | remove remoto e depois local |
| Limpar registros | REST DELETE `records` por `patient_id` | mesma RLS | remove ciclo remoto e local |
| Excluir conta | `POST functions/v1/excluir-conta` | Bearer JWT + perfil de paciente | remove `patients`, cascata de registros e Auth user |
| Corrigir nome | `rpc('update_current_patient_name')` | `authenticated` | atualiza nome do paciente atual |

## Restrições

- CORS usa allowlist `ALLOWED_ORIGINS` e não aceita wildcard.
- Respostas não expõem destinatários, IDs internos desnecessários, stack ou detalhes de provedor.
- A função de exclusão completa é destrutiva e deve ser validada em staging antes do deploy.
