# RDP Pro

PWA B2B para Registro de Pensamentos em Terapia Cognitivo-Comportamental (TCC). O produto conecta o exercício do paciente ao acompanhamento do profissional, com funcionamento offline, sincronização autenticada e controles de privacidade.

> Projeto de portfólio em evolução. Não substitui prontuário clínico, orientação profissional ou serviço de emergência.

## Visão geral

O RDP Pro organiza o acompanhamento entre sessões em duas experiências:

- **Paciente**: registra situação, pensamento automático, sentimento, ansiedade, reação e pensamento alternativo; consulta histórico e insights; exporta ou exclui seus dados.
- **Profissional**: cria convites de uso único, acompanha pacientes vinculados, consulta registros e configura o recebimento de relatórios.

O frontend é uma PWA em HTML, CSS e JavaScript vanilla, sem framework, bundler ou build step. Supabase fornece autenticação, PostgreSQL, RLS, RPCs e Edge Functions. O app mantém uma cópia local por paciente para uso offline e sincroniza quando há sessão e conexão.

## Funcionalidades

### Experiência do paciente

- cadastro e login vinculados a convite profissional de uso único;
- formulário estruturado de Registro de Pensamentos;
- persistência offline e sincronização com isolamento por usuário;
- histórico editável, indicadores do ciclo e exportação JSON;
- relatório enviado somente após ação do paciente;
- exclusão individual, limpeza do ciclo e exclusão da conta;
- tema claro/escuro, PWA instalável e interface mobile-first.

### Painel profissional

- autenticação e perfil profissional;
- criação, renovação e invalidação de convites;
- busca e acompanhamento de pacientes vinculados;
- leitura dos registros por paciente;
- configuração de e-mail para relatórios e duração do ciclo;
- layout responsivo para consultório e dispositivos menores.

### Segurança e privacidade

- RLS vinculada ao `auth.uid()` para pacientes e profissionais;
- convite removido da URL e da sessão após o vínculo;
- CORS por allowlist e autenticação Bearer nas Edge Functions;
- validação de schema, tipos, UUIDs, tamanhos e limites de payload;
- escape de conteúdo em HTML, assunto de e-mail e interfaces dinâmicas;
- respostas de erro sem stack, destinatário ou detalhes de provedores;
- exportação e exclusão autenticadas, sem usar o convite como credencial;
- reconciliação local/remota que preserva pendências offline e reflete exclusões feitas em outro dispositivo;
- suíte regressiva para XSS, RLS/RPC, auth, segredos e direitos do titular.

Os artefatos técnicos da adequação estão em [`.lgpd/`](.lgpd/). A política de privacidade permanece como minuta para revisão jurídica; o app exibe apenas uma explicação funcional resumida.

## Arquitetura

```text
Paciente / Profissional
        │
        ├── PWA vanilla ── localStorage por paciente
        │       │
        │       └── Service Worker (network-first para app shell)
        │
        └── Supabase
                ├── Auth
                ├── PostgreSQL + RLS
                ├── RPCs de convite, perfil e exportação
                └── Edge Functions
                        ├── enviar-relatorio ── Resend
                        └── excluir-conta ── Auth Admin
```

Fluxo principal:

1. O profissional cria um convite.
2. O paciente abre `paciente.html?convite=<token>` e vincula sua conta.
3. O convite é invalidado e deixa de funcionar como credencial.
4. Registros são salvos localmente e sincronizados sob RLS.
5. O paciente pode enviar um relatório, exportar ou excluir seus dados.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Interface | HTML5, CSS3, JavaScript vanilla |
| Tipografia | Lora + DM Sans |
| Backend | Supabase PostgreSQL, Auth, RLS, RPCs e Edge Functions |
| E-mail | Resend via Edge Function autenticada |
| Gráficos | Chart.js |
| Exportação | JSON e jsPDF |
| PWA | Web App Manifest + Service Worker |
| Testes | Node.js, `node:assert` e `node:vm` |

## Estrutura do projeto

```text
rdp-pro/
├── paciente.html                    # PWA do paciente
├── psicologo.html                   # painel do profissional
├── index.html                       # redirecionamento legado
├── therapist.html                   # alias legado do painel
├── css/
│   ├── app.css
│   └── therapist.css
├── js/
│   ├── config.js
│   ├── db.js
│   ├── app.js
│   └── therapist.js
├── supabase/
│   ├── migrations/                  # migrations 001–007
│   ├── templates/                   # confirmação de cadastro
│   └── functions/
│       ├── _shared/
│       ├── enviar-relatorio/
│       ├── excluir-conta/
│       └── send-report/             # alias legado
├── tests/                            # regressão funcional e de segurança
├── .lgpd/                            # auditoria e governança técnica
├── .agents/skills/                   # skills incorporadas ao projeto
├── PROJECT_CONTEXT.md                # contexto público sem configuração local
└── docs/pricing-strategy.md          # hipótese de monetização
```

## Como executar

### Pré-requisitos

- Node.js para a suíte de testes;
- projeto Supabase para autenticação e sincronização;
- Supabase CLI para publicar Edge Functions;
- conta Resend para envio de relatórios.

O frontend não exige instalação de dependências nem compilação. Sirva a raiz com um servidor estático de sua preferência para trabalhar com as rotas de autenticação.

### 1. Configuração do frontend

Preencha em `js/config.js`:

```js
supabase: {
  url: "https://SEU_PROJECT_REF.supabase.co",
  anonKey: "SUA_CHAVE_ANON_PUBLICA"
}
```

A chave `anon` é pública por arquitetura. Ela deve permanecer limitada ao papel `anon`; nunca coloque `service_role`, chaves Resend ou outros segredos no frontend. A proteção dos dados depende de RLS corretamente aplicada.

### 2. Banco de dados

No SQL Editor do Supabase, aplique em ordem todas as migrations de `001` a `007`:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_fix_rls_security.sql
supabase/migrations/003_patient_auth_ptbr_routes.sql
supabase/migrations/004_repair_patient_auth_rpc.sql
supabase/migrations/005_fix_claim_patient_invite_ambiguity.sql
supabase/migrations/006_invite_single_use.sql
supabase/migrations/007_patient_data_rights.sql
```

A migration 007 é obrigatória para DELETE autenticado e exportação dos dados do paciente.

### 3. Edge Functions

Configure os secrets no ambiente Supabase:

```text
RESEND_API_KEY
REPORT_FROM_EMAIL
ALLOWED_ORIGINS
```

- `REPORT_FROM_EMAIL`: remetente verificado no Resend.
- `ALLOWED_ORIGINS`: origens exatas permitidas, separadas conforme a configuração da função.

Publique os endpoints:

```bash
supabase functions deploy enviar-relatorio --project-ref SEU_PROJECT_REF
supabase functions deploy excluir-conta --project-ref SEU_PROJECT_REF
```

`send-report` é mantido apenas para compatibilidade e delega à mesma implementação segura.

### 4. URLs de autenticação

Exemplo para GitHub Pages:

```text
Site URL: https://SEU_USUARIO.github.io/RDP-Pro/paciente.html

Redirect URLs:
https://SEU_USUARIO.github.io/RDP-Pro/paciente.html
https://SEU_USUARIO.github.io/RDP-Pro/psicologo.html
https://SEU_USUARIO.github.io/RDP-Pro/**
```

Em `Authentication > Email Templates > Confirm signup`, utilize:

```text
Subject: supabase/templates/confirm-signup-subject.txt
Body: supabase/templates/confirm-signup.html
```

## Testes

No Windows, use preferencialmente:

```powershell
.\test.cmd
```

Alternativa:

```powershell
npm.cmd test
```

A suíte cobre:

- callbacks PKCE, limpeza de URL e logout offline;
- exclusão remota/local e isolamento entre pacientes;
- migration 007, RLS, RPC de exportação e cascata;
- CORS, autenticação e validação das Edge Functions;
- XSS, UUIDs, aliases legados e HTML dinâmico;
- consistência visual, versões, cache e varredura de segredos;
- políticas de branch e arquivos de governança.

## Decisões de produto

- **Offline-first**: o dispositivo continua útil sem conexão; a nuvem permite recuperação e acesso autenticado.
- **Convite não é credencial**: ele serve apenas para estabelecer o vínculo inicial.
- **Privacidade não é feature premium**: exportação, exclusão e controles de segurança não devem ser limitados por plano.
- **Público adulto**: a versão atual destina-se exclusivamente a pessoas com 18 anos ou mais; admitir menores exige nova avaliação jurídica e técnica.
- **Precificação ainda é hipótese**: a recomendação e os experimentos estão em [`docs/pricing-strategy.md`](docs/pricing-strategy.md); nenhuma cobrança está implementada.
- **Compatibilidade gradual**: rotas e endpoint antigos continuam como aliases enquanto os novos nomes são adotados.

## Limitações conhecidas

- a exclusão do perfil no banco e do usuário Auth ocorre em duas etapas e requer reconciliação operacional em caso de falha parcial;
- contratos, regiões, backups e retenções de operadores precisam de validação antes de produção;
- a política de privacidade ainda requer identificação do controlador, encarregado e revisão jurídica;
- a restrição a maiores de 18 anos ainda precisa ser formalizada nos termos e no processo operacional antes de produção;
- pagamentos, equipes multi-profissionais e papéis administrativos não estão implementados;
- testes com Supabase/Resend reais, atualização offline do PWA e entrega do e-mail permanecem cenários de staging.

## Próximos passos

1. Validar migrations e Edge Functions em ambiente de staging.
2. Concluir revisão jurídica e governança LGPD operacional.
3. Instrumentar métricas mínimas sem conteúdo terapêutico.
4. Executar o piloto de precificação com profissionais.
5. Implementar observabilidade e testes E2E dos fluxos críticos.
