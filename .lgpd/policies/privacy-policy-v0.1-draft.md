# Política de Privacidade — RDP Pro

**Versão**: v0.1 — MINUTA PARA REVISÃO JURÍDICA
**Última atualização**: 23 de agosto de 2026
**Vigência**: não vigente; não publicar antes de preencher e validar todos os campos `[PENDENTE]`.

> Esta minuta descreve o comportamento identificado no código. Ela não define, por si só, o papel jurídico dos participantes nem substitui a validação da hipótese legal aplicável aos dados de saúde.

## Resumo

- O RDP Pro permite que pacientes registrem pensamentos, sentimentos, reações e níveis de ansiedade e compartilhem essas informações com o profissional ao qual estão vinculados.
- Os registros ficam no dispositivo para uso offline e também são sincronizados com a infraestrutura Supabase quando há sessão e conexão disponíveis.
- Relatórios só são enviados por ação do paciente e usam Supabase, Resend e a infraestrutura de e-mail do destinatário.
- O aplicativo não vende dados pessoais e não possui publicidade ou analytics identificados na versão auditada.
- O paciente autenticado pode exportar seus dados, apagar registros, limpar o histórico ou solicitar a exclusão da conta dentro do aplicativo. Outros pedidos dependerão do canal `[PENDENTE]`.

## 1. Quem trata os dados

Antes da publicação, é necessário definir se o controlador é a pessoa responsável pelo RDP Pro, o profissional ou clínica que oferece o serviço, ou se existe controladoria conjunta.

- **Controlador(es)**: `[PENDENTE — nome/razão social]`
- **CPF/CNPJ**: `[PENDENTE]`
- **Endereço**: `[PENDENTE]`
- **Site**: `[PENDENTE]`
- **Papel do profissional/clínica**: `[PENDENTE — controlador, conjunto ou operador]`

## 2. Encarregado e canal de privacidade

- **Encarregado ou representante**: `[PENDENTE]`
- **E-mail dedicado**: `[PENDENTE — não usar e-mail pessoal]`
- **Formulário ou canal autenticado**: `[PENDENTE]`

O canal deve aceitar solicitações de pacientes, profissionais e pessoas sem acesso à conta e fornecer protocolo de atendimento.

## 3. Dados, finalidades e hipóteses legais

As hipóteses abaixo são técnicas e permanecem sujeitas à confirmação do controlador e à revisão jurídica.

| Atividade | Dados tratados | Finalidade específica | Hipótese a validar |
| --- | --- | --- | --- |
| Conta do profissional | nome, e-mail, credencial, CRP, clínica, configurações e e-mail para relatórios | autenticar e operar o painel profissional | art. 7º, V; alternativas opcionais devem ser avaliadas separadamente |
| Convite e conta do paciente | nome, e-mail, credencial, identificadores, vínculo, token temporário e último acesso | criar a conta e associá-la ao profissional correto | art. 7º, V para dados comuns; art. 11, II, `f`, se confirmada tutela da saúde, ou art. 11, I |
| Registro terapêutico | situação, pensamentos, sentimentos, ansiedade, reação, data e hora | permitir o registro e acompanhamento no contexto terapêutico | art. 11, II, `f`, se aplicável, ou consentimento específico do art. 11, I |
| Sincronização e acesso | registros terapêuticos, vínculos, IDs e timestamps | manter os dados disponíveis entre sessões e ao profissional vinculado | mesma hipótese de dado sensível, a validar |
| Insights e exportação | registros, médias, contagens e sentimentos derivados | mostrar indicadores e fornecer cópia portátil ao paciente | mesma hipótese de dado sensível, a validar |
| Relatório por e-mail | nome, registros, datas, fuso e destinatário profissional | enviar, por ação do paciente, o histórico ao profissional vinculado | mesma hipótese de dado sensível, a validar; avaliar alternativa mais segura ao e-mail |
| Entrega técnica do app | IP, user-agent, URL/referer e logs que os provedores possam gerar | disponibilizar a PWA e seus recursos | art. 7º, IX, com teste de legítimo interesse, ou art. 7º, V se indispensável |

O RDP Pro não deve solicitar consentimento genérico para todas as operações. Se o consentimento for a hipótese aprovada, ele deve ser específico, destacado, versionado, comprovável e revogável por finalidade.

## 4. Como e por quanto tempo tratamos os dados

- **Dispositivo**: registros e dados de sessão são mantidos no armazenamento do navegador para permitir uso offline.
- **Nuvem**: contas, vínculos e registros são tratados pelo Supabase quando há autenticação e sincronização.
- **Relatório**: quando o paciente escolhe enviar um relatório, o conteúdo passa pela Edge Function e pelo Resend até a caixa postal do profissional.
- **Exportação**: o arquivo JSON baixado passa a ficar sob o controle do titular no próprio dispositivo.
- **Exclusão**: o paciente pode apagar um registro, todo o histórico ou sua conta. A remoção da conta alcança o perfil do paciente, os registros associados e o usuário de autenticação, ressalvadas falhas operacionais e retenções legalmente justificadas.

Os prazos definitivos para perfis inativos, convites, registros, e-mails, logs e backups estão `[PENDENTES]`. Até que sejam aprovados, não se deve prometer eliminação imediata de cópias mantidas por operadores, backups ou caixas postais. Dados somente poderão ser conservados após o término do tratamento nas hipóteses do art. 16 da LGPD.

## 5. Com quem os dados podem ser compartilhados

| Destinatário/operador | Uso observado | Local e salvaguardas |
| --- | --- | --- |
| Supabase | autenticação, banco de dados, controle de acesso, RPCs e Edge Functions | `[PENDENTE — entidade, região, DPA, subprocessadores e mecanismo de transferência]` |
| Resend | entrega do relatório solicitado pelo paciente | `[PENDENTE — entidade, região, retenção, DPA, subprocessadores e mecanismo de transferência]` |
| Provedor de hospedagem | entrega dos arquivos da PWA e logs técnicos possíveis | `[PENDENTE — identificar]` |
| Provedor de e-mail do profissional e agentes de trânsito | recebimento e armazenamento do relatório | varia conforme o destinatário; responsabilidades e retenção devem ser informadas pelo profissional |
| Google Fonts, jsDelivr e cdnjs | fontes e bibliotecas carregadas pela interface | podem receber metadados de conexão; país, retenção e salvaguardas `[PENDENTES]` |

Não foi identificado compartilhamento para publicidade, venda de dados ou analytics na versão auditada.

## 6. Transferência internacional

Alguns fornecedores podem tratar dados ou metadados fora do Brasil. Os países, entidades contratantes, regiões de processamento e mecanismos previstos nos arts. 33 a 36 da LGPD e na Resolução CD/ANPD nº 19/2024 ainda precisam ser confirmados. Esta seção deve ser atualizada antes da publicação.

## 7. Direitos do titular

Nos termos do art. 18 da LGPD, o titular pode solicitar:

- confirmação da existência de tratamento e acesso aos dados;
- correção de dados incompletos, inexatos ou desatualizados;
- anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade;
- portabilidade, observada a regulamentação aplicável;
- eliminação dos dados tratados com consentimento, quando essa for a hipótese aplicável;
- informação sobre compartilhamentos e sobre a possibilidade de não consentir;
- revogação do consentimento, quando aplicável;
- revisão e informações sobre decisões automatizadas, se vierem a existir.

O paciente autenticado já pode exportar dados, excluir registros, limpar o histórico e excluir a conta na área de privacidade. A correção do nome ocorre no onboarding; os demais pedidos de correção e solicitações adicionais devem ser enviados ao canal da seção 2, ainda `[PENDENTE]`. A resposta completa deve observar o prazo do art. 19, II, atualmente de até 15 dias, salvo regime legal específico comprovadamente aplicável.

## 8. Cookies e armazenamento local

Não foram identificados cookies de publicidade ou analytics. O aplicativo usa armazenamento local e tokens de sessão estritamente necessários para autenticação, operação offline, sincronização e segurança. Os provedores de infraestrutura podem utilizar tecnologias próprias, que devem ser confirmadas nos contratos e documentos dos fornecedores.

## 9. Crianças e adolescentes

A versão auditada não verifica idade nem implementa fluxo de responsável legal. O público admitido, as faixas etárias e os controles do art. 14 da LGPD e da legislação aplicável estão `[PENDENTES]`. Até essa decisão, o produto não deve ser apresentado publicamente como adequado a menores de idade.

## 10. Segurança

Foram observados autenticação, regras de acesso por usuário, convites de uso único, validação e escape de conteúdo, limites de payload, CORS restrito, exclusão autenticada e respostas de erro sem detalhes internos. O dispositivo continua sendo parte do perímetro de risco porque mantém dados para uso offline. Nenhuma medida elimina integralmente os riscos.

Se um incidente puder acarretar risco ou dano relevante aos titulares, o controlador deverá avaliar e realizar as comunicações previstas na LGPD e na Resolução CD/ANPD nº 15/2024, observando o prazo regulatório aplicável.

## 11. Alterações desta política

Mudanças materiais de finalidades, hipóteses legais, compartilhamentos, transferências, retenção ou direitos exigem nova versão e comunicação apropriada aos titulares ativos. As versões anteriores deverão permanecer acessíveis em uma URL estável.

## 12. Contato e autoridade

- **Canal do controlador/encarregado**: `[PENDENTE]`
- **Autoridade Nacional de Proteção de Dados**: https://www.gov.br/anpd

## Histórico

- **v0.1-draft — 23/08/2026**: primeira minuta técnica, não vigente e sujeita a revisão jurídica.
