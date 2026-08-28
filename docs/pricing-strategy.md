# Estratégia de precificação e monetização — RDP Pro

**Versão**: v0.2
**Data**: 28 de agosto de 2026
**Status**: hipótese de produto; validar antes de implementar cobrança ou divulgar preços.

## Resumo executivo

O RDP Pro é uma ferramenta B2B focada em Registro de Pensamentos de TCC entre sessões. Ele não substitui agenda, prontuário, financeiro ou teleconsulta. Essa especialização justifica posicioná-lo abaixo das suítes clínicas completas e cobrar do profissional, nunca do paciente.

**Modelo recomendado para validação**: assinatura mensal por profissional, com limite por pacientes ativos.
**Métrica de valor**: pacientes ativos no ciclo, pois aproxima preço do valor clínico e do custo operacional sem cobrar por registro sensível ou por direito do titular.
**Primeiro preço a testar**: R$ 39/mês para profissional solo, após 30 dias de piloto sem cartão.

Não limitar por plano: autenticação, isolamento de dados, exportação, exclusão, segurança, privacidade, transparência e demais direitos LGPD.

## Valor entregue

- reduz o uso de papel, mensagens dispersas e formulários improvisados;
- organiza o exercício de TCC em um fluxo consistente para paciente e profissional;
- mantém o acompanhamento entre sessões sem exigir uma suíte de gestão clínica completa;
- oferece histórico, insights, exportação e relatório sob ação do paciente;
- funciona offline no dispositivo e sincroniza quando há conexão.

Alternativas atuais são planilhas/formulários, mensagens e PDFs manuais, ou uma plataforma clínica completa. O ganho precisa ser validado em minutos administrativos poupados, adesão dos pacientes e qualidade percebida das sessões — ainda não existem dados suficientes para afirmar um ROI.

## Referências competitivas atuais

| Produto | Preço público observado | Métrica/escopo | Leitura para o RDP Pro |
| --- | --- | --- | --- |
| PsicoManager | R$ 89/mês no Individual Pró e R$ 119/mês no Individual Plus | profissional individual; suíte com agenda, prontuário, financeiro e app do paciente | teto brasileiro de suíte completa; RDP Pro deve começar abaixo |
| iClinic | R$ 99 a R$ 299/mês por profissional | suíte médica por profissional e funcionalidades | confirma convenção B2B recorrente por profissional |
| Quenza | US$ 25, US$ 50, US$ 125 e US$ 160/mês para 10, 250, 400 e 500 clientes; anual com 20% de desconto | profissionais + clientes ativos e atividades terapêuticas | valida capacidade de clientes como métrica, mas em mercado e moeda diferentes |
| SimplePractice | US$ 49, US$ 79 e US$ 99/mês; profissionais adicionais a partir de US$ 69 | gestão completa de prática clínica | referência internacional de tiers, não comparação direta de disposição a pagar no Brasil |

PsicoManager, iClinic e Quenza foram revistos em 28/08/2026; SimplePractice permanece como referência consultada em 23/08/2026: [PsicoManager](https://www.psicomanager.com.br/planos), [iClinic](https://lps.iclinic.com.br/planos-e-precos/), [Quenza](https://help.quenza.com/article/138-quenza-plans-and-pricing) e [SimplePractice](https://support.simplepractice.com/hc/en-us/articles/115005956266-SimplePractice-pricing-and-subscription-FAQs).

## Estrutura recomendada

| Oferta | Preço a testar | Público | Capacidade e proposta | Status |
| --- | ---: | --- | --- | --- |
| Piloto | R$ 0 por 30 dias | psicólogo individual em validação | até 5 pacientes ativos; produto completo; sem cartão | implementar primeiro |
| Solo | R$ 39/mês ou R$ 379/ano | profissional individual | até 30 pacientes ativos; todos os recursos atuais e suporte assíncrono | principal hipótese |
| Clínica | R$ 99/mês ou R$ 949/ano | pequenas clínicas | até 3 profissionais; paciente compartilhado somente com permissões explícitas; R$ 25 por profissional adicional | não vender antes de suporte multi-profissional, papéis e auditoria |
| Institucional | sob proposta | organizações e programas | SSO, implantação, DPA, SLA, exportação administrativa e suporte | futuro; depende de governança e infraestrutura |

O plano Solo é o único preço que deve ser testado agora. Clínica e Institucional são direções de roadmap, não ofertas disponíveis. O anual sugerido representa aproximadamente 19% de desconto e só deve aparecer depois de retenção real ser conhecida.

## Hipóteses de sensibilidade a preço

Sem pesquisa de disposição a pagar, R$ 39 é apenas um ponto de teste. Ele fica materialmente abaixo das suítes brasileiras de R$ 89–99 na entrada e evita posicionar uma ferramenta clínica como produto barato demais para ser confiável.

Entrevistar pelo menos 12 profissionais usando Van Westendorp:

1. A partir de qual preço pareceria barato demais para confiar?
2. Qual preço pareceria uma boa compra?
3. A partir de qual preço começaria a ficar caro?
4. Qual preço seria caro demais para considerar?

Testar R$ 29, R$ 39 e R$ 49 apenas entre coortes equivalentes. Não fazer A/B público até haver tráfego suficiente e consentimento adequado para analytics.

## Estratégias de monetização avaliadas

### 1. Assinatura por profissional — recomendada

- **Como funciona**: mensalidade previsível para o profissional; pacientes não pagam.
- **Fit**: simples para consultório solo, acompanha o comprador e é padrão no mercado.
- **Risco**: cancelamento se o uso entre sessões for baixo.
- **Experimento**: 10 pilotos por 30 dias; oferecer R$ 39 ao final.
- **Sucesso**: pelo menos 6 profissionais ativados, 20% ou mais aceitando pagar e 70% usando semanalmente na quarta semana.

### 2. Base + pacientes ativos — segunda opção

- **Como funciona**: mensalidade menor com faixas de capacidade, sem cobrar por registro ou relatório.
- **Fit**: aproxima custo do tamanho da prática e facilita começar pequeno.
- **Risco**: ansiedade com limite e incentivo a excluir pacientes cedo demais.
- **Experimento**: apresentar R$ 29 até 10 ativos e R$ 49 até 40 em entrevistas, sem implementar bloqueio.
- **Sucesso**: preferência clara sobre plano único e ausência de objeção clínica ao conceito de “ativo”.

### 3. Licença para clínicas — futura

- **Como funciona**: preço-base por clínica e adicional por profissional.
- **Fit**: maior contrato e menor CAC relativo.
- **Risco**: o produto atual não possui papéis, permissões e governança suficientes para equipes.
- **Experimento**: 5 entrevistas com clínicas; não aceitar pagamento antes do roadmap técnico e LGPD.
- **Sucesso**: 3 cartas de intenção com requisitos convergentes.

### 4. Biblioteca profissional opcional — complementar

- **Como funciona**: modelos de exercícios, protocolos e materiais revisados vendidos como add-on ou incluídos em plano superior.
- **Fit**: monetiza conteúdo sem restringir segurança nem direitos.
- **Risco**: revisão clínica, propriedade intelectual e manutenção editorial.
- **Experimento**: protótipo de catálogo com 10 materiais; pré-venda sem dados de pacientes.
- **Sucesso**: 30% dos pilotos demonstrando intenção de compra.

### Modelos descartados

- **Publicidade ou patrocínio dentro do app**: incompatível com contexto de saúde, privacidade e confiança.
- **Cobrança do paciente**: desalinha o comprador B2B e pode prejudicar adesão ao exercício indicado.
- **Preço por registro, relatório ou exportação**: cria incentivo inadequado e nunca deve limitar direitos do titular.
- **Venda ou monetização de dados**: incompatível com a proposta e com a governança esperada.

## Unit economics — metas, não resultados

Não há dados reais de CAC, churn, custos por conta ou LTV. Para o piloto:

- margem bruta alvo: 80% ou mais, excluindo trabalho do fundador;
- churn mensal alvo após os três primeiros meses: abaixo de 4%;
- CAC orgânico/parcerias a testar: até R$ 150;
- LTV bruto de referência para 18 meses no Solo: R$ 702;
- LTV após margem de 85%: aproximadamente R$ 597;
- regra de decisão: CAC deve permanecer abaixo de um terço do LTV após margem.

Esses números devem ser substituídos por dados de Supabase, Resend, suporte, aquisição e cancelamentos antes de escalar mídia paga.

## Roadmap de validação

### Semanas 1–2 — problema e ativação

- recrutar 10 psicólogos por indicação/parcerias;
- medir sem conteúdo clínico: convite criado, paciente ativado, ciclo iniciado e relatório enviado;
- critério: 60% dos profissionais ativam 3 pacientes e voltam na semana seguinte.

### Semanas 3–4 — disposição a pagar

- entrevistas Van Westendorp e oferta real de R$ 39;
- critério: pelo menos 20% aceitam pagar e preço mediano “boa compra” não fica abaixo de R$ 29.

### Semanas 5–8 — retenção

- cobrar manualmente apenas após contratos, termos, política e processo de suporte estarem prontos;
- critério: retenção de 80% no segundo mês, uso semanal e até 5% de tickets críticos por conta.

### Decisão

- **manter R$ 39** se conversão e retenção passarem;
- **testar R$ 29** se ativação for boa e preço for a objeção dominante;
- **testar R$ 49** se profissionais relatarem valor alto, uso recorrente e baixa sensibilidade;
- **não monetizar ainda** se confiança, segurança, ativação ou suporte forem as objeções principais.

## Dependências antes da cobrança

- política de privacidade revisada juridicamente e controlador identificado;
- termos de uso e processo de suporte;
- definição de retenção, operadores e resposta a incidentes;
- cobrança, cancelamento e comunicação de falhas sem bloquear acesso/exportação de dados;
- métricas de produto minimizadas e sem conteúdo terapêutico;
- backups, observabilidade e reconciliação da exclusão de conta.
