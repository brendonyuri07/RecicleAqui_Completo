# Recicle Aqui — Back-end full-stack

O front-end fornecido foi migrado para uma aplicação web full-stack com **API tipada tRPC**, banco de dados relacional MySQL/TiDB via **Drizzle ORM** e autenticação segura via **Manus OAuth**. O front preserva a experiência de pontos de coleta, mapa, chat e painel, porém não usa mais dados mockados nem sessão em `localStorage`.

## Arquitetura

| Camada | Implementação | Responsabilidade |
|---|---|---|
| Interface | React + Vite + Tailwind | Mapa, listagem, formulários, chat e painéis |
| API | Express + tRPC | Contratos tipados e validação de entrada com Zod |
| Autenticação | Manus OAuth | Sessão segura em cookie HTTP-only e identidade do usuário |
| Banco | MySQL/TiDB + Drizzle | Usuários, pontos, materiais, chat e auditoria |
| Mapa | Google Maps por proxy Manus | Exibição de marcadores de pontos aprovados |

## Modelo de dados

| Tabela | Objetivo |
|---|---|
| `users` | Identidade OAuth, telefone e papel comunitário (**Doador** ou **Catador**). O campo técnico `role` diferencia administradores. |
| `collection_points` | Endereço, coordenadas, horários, capacidade, aprovação, proprietário e imagem de cada ponto. |
| `point_materials` | Materiais aceitos por cada ponto. |
| `point_messages` | Mensagens do chat comunitário, relacionadas a ponto e autor. |
| `activity_logs` | Histórico de cadastro, revisão, atualização, exclusão e mensagens. |

As relações usam chaves estrangeiras e regras de exclusão para evitar registros órfãos. Pontos criados por usuários entram como `pendente`; apenas pontos `aprovado` aparecem nas telas públicas.

## API e regras de acesso

A API está em `server/routers.ts` e é consumida exclusivamente com hooks `trpc.*` no cliente.

| Grupo | Operações | Acesso |
|---|---|---|
| `public` | Métricas gerais | Público |
| `profile` | Consultar e atualizar perfil comunitário | Usuário autenticado |
| `points` | Listar, consultar, criar, consultar próprios, revisar, atualizar e excluir | Público para leitura; autenticado para criar; administrador para revisar/alterar/excluir |
| `messages` | Listar e enviar mensagens por ponto | Público para leitura; autenticado para enviar |
| `dashboard` | Métricas e pontos do próprio usuário | Usuário autenticado |
| `admin` | Indicadores, fila de aprovação e auditoria | Administrador |

Todas as mutações têm validação de campos, limites de tamanho e verificações de autorização no servidor. Assim, ocultar um botão no navegador não concede acesso a uma rota administrativa.

## Fluxos implementados

1. **Acesso seguro:** os botões de entrada usam OAuth; o projeto não armazena senha própria nem mantém credenciais no navegador.
2. **Perfil:** nome, telefone e papel comunitário são persistidos no banco.
3. **Pontos de coleta:** pesquisa e filtros são feitos sobre dados persistidos. O cadastro grava um ponto pendente com materiais, localização e imagem opcional por URL.
4. **Aprovação:** administradores aprovam ou recusam pontos. A aprovação libera o ponto automaticamente na listagem e mapa públicos.
5. **Chat:** cada ponto aprovado mantém sua própria conversa, com autor e data persistidos.
6. **Auditoria:** cadastros, revisões, atualizações, exclusões e mensagens são registrados para o painel administrativo.

## Dados iniciais

Os **20 pontos demonstrativos** do front fornecido foram migrados para o banco como pontos aprovados. A rotina é idempotente: não cria duplicatas quando executada em uma base que já contenha pontos.

## Operação local

```bash
pnpm test      # testes de contrato e autorização
pnpm check     # verificação TypeScript
pnpm build     # build de produção
pnpm dev       # servidor de desenvolvimento
```

Quando o proprietário do projeto fizer login por OAuth, ele será reconhecido como administrador por padrão. Para promover outro usuário, altere somente o campo técnico `users.role` para `admin` no banco, conforme a governança da plataforma.

## Observações de produção

O banco provisionado pelo projeto é o único repositório dos dados operacionais. Arquivos binários de fotos não são gravados no banco: atualmente o ponto aceita uma URL de imagem. Caso seja necessário envio de arquivo pelo formulário, a próxima evolução deve usar o armazenamento S3 integrado do projeto e salvar somente a referência do arquivo em `photoUrl`.
