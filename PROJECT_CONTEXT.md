# RDP Pro — Contexto público do projeto

## Produto

O RDP Pro é uma PWA B2B de apoio ao Registro de Pensamentos em Terapia Cognitivo-Comportamental. O profissional cria um convite de uso único; o paciente adulto registra suas reflexões entre sessões e decide quando exportar, excluir ou enviar um relatório ao profissional vinculado.

O produto é um projeto de portfólio em evolução. Não substitui prontuário clínico, orientação profissional ou serviço de emergência e, na versão atual, destina-se exclusivamente a pessoas com 18 anos ou mais.

## Stack e arquitetura

- HTML, CSS e JavaScript vanilla, sem framework, bundler ou build step;
- PWA com service worker e funcionamento offline;
- `localStorage` isolado por paciente para a cópia local;
- Supabase Auth, PostgreSQL, RLS, RPCs e Edge Functions para autenticação e sincronização;
- Resend para relatórios enviados por ação do paciente;
- Chart.js e jsPDF carregados no frontend.

Rotas públicas:

- `/paciente.html`: experiência do paciente;
- `/psicologo.html`: painel profissional;
- `/index.html` e `/therapist.html`: aliases de compatibilidade.

## Decisões atuais

- O convite estabelece o vínculo inicial, mas não funciona como credencial permanente.
- Registros ainda não sincronizados são preservados localmente; registros já sincronizados são reconciliados com o servidor para refletir exclusões feitas em outro dispositivo.
- Exportação, exclusão, segurança e controles de privacidade não são itens premium.
- A chave pública do frontend deve ter apenas privilégios compatíveis com o papel `anon`; segredos administrativos não pertencem ao repositório.
- A política de privacidade em `.lgpd/` é uma minuta técnica, não um documento jurídico vigente.
- A restrição a adultos deve ser formalizada nos termos e no processo operacional antes de uso em produção; qualquer mudança para admitir menores exige nova avaliação jurídica e técnica.

## Estado de validação

A suíte local cobre autenticação, isolamento de dados, direitos do titular, RLS/RPC, Edge Functions, XSS, acessibilidade, cache e política do repositório. Integrações reais, entrega de e-mail, comportamento de atualização offline e controles operacionais de privacidade ainda precisam de staging e revisão humana.

Consulte o [README](README.md), a [estratégia de precificação](docs/pricing-strategy.md) e o [status técnico da auditoria LGPD](.lgpd/STATUS.md) para detalhes.
