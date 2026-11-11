# Recicle Aqui

A aplicação principal está em `recicle-aqui-supabase-osm-corrigido/`.
Os comandos na raiz encaminham para essa pasta. A pasta `pasted_file_qmO4kR_recicle-aqui/` é uma cópia anterior e não é usada.
Edite as páginas em `recicle-aqui-supabase-osm-corrigido/client/src/`. O App.tsx da raiz apenas exporta a aplicação principal.

## Executar

Na raiz: `npm run dev`. Abra o endereço informado no terminal (normalmente http://localhost:3000).
Verificação: `npm run check`, `npm test`, `npm run build`.
Produção: `npm run build` e `npm start`. Requer hospedagem Node.js, não apenas arquivos estáticos.
Em uma instalação nova, instale as dependências dentro da pasta principal com `pnpm install`.

## Controle do projeto e conta administradora

A autenticação da aplicação usa e-mail e senha do Supabase.
Use um projeto Supabase e uma hospedagem sob sua conta. Configurar arquivos locais não transfere um domínio, uma hospedagem ou um banco existente.

1. No seu projeto Supabase, execute `recicle-aqui-supabase-osm-corrigido/supabase/schema.sql`.
2. Configure o `.env` dentro de `recicle-aqui-supabase-osm-corrigido/`, usando `.env.example` como referência. O `.env` da raiz não é carregado pelos comandos encaminhados.
3. Defina `JWT_SECRET` com um valor aleatório forte (por exemplo, gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
4. Crie sua conta em `/cadastro`. No Supabase, em Authentication > Users, copie o UUID da sua conta e defina `OWNER_OPEN_ID` com esse UUID no ambiente do servidor.
5. Reinicie o servidor e entre novamente. Sua conta terá acesso a `/admin`. Não use o UUID de outra pessoa.

As chaves do Supabase ficam somente no servidor, nunca em variáveis VITE_ nem no repositório. O cadastro atual cria contas sem confirmação de e-mail; o acesso de proprietário depende do UUID configurado, nunca apenas do e-mail informado.
Para mudar de proprietário, configure o novo UUID e remova explicitamente o papel admin da conta antiga no banco, se necessário.

A identidade visual continua como Recicle Aqui até serem informados o nome/marca e o contato do proprietário.

## Mapa

Leaflet usa OpenStreetMap sem chave de API. O mapa mantém a instância entre renderizações, recalcula seu tamanho e enquadra os pontos válidos. Apenas pontos aprovados aparecem publicamente.
A atribuição permanece visível conforme a política: https://operations.osmfoundation.org/policies/tiles/.
Os dados de pontos dependem da conexão com seu Supabase; o fundo do mapa depende de internet.
O GPS requer permissão do navegador e HTTPS (ou localhost). As rotas são calculadas pelo serviço público OSRM; em produção com maior tráfego, configure um provedor de roteamento próprio.

O envio de fotos usa o bucket público `recicle-images`, configurado pelo script `recicle-aqui-supabase-osm-corrigido/supabase/schema.sql`. Execute esse script também em projetos existentes para adicionar a coluna de avatar e preparar o armazenamento. As imagens são enviadas pelo servidor com a chave privada do Supabase.

## Tema escuro e diagnóstico

O tema escuro é o padrão desde o carregamento inicial, inclusive no mapa, nos formulários, nos alertas e na página 404. A atribuição do OpenStreetMap continua visível.

Execute `npm run doctor` na raiz para verificar a URL, o DNS, a configuração de sessão e o acesso às tabelas sem mostrar chaves. É necessário Node.js 22 ou mais recente.

`SUPABASE_URL` é o campo **Project URL**, no formato `https://identificador.supabase.co`. Uma chave que começa com `sb_publishable_` deve ir em `SUPABASE_PUBLISHABLE_KEY`; ela não substitui a URL nem a chave privada do servidor.

Se o serviço estiver indisponível, o mapa permanece navegável e a lista oferece tentar novamente. As estatísticas não simulam contagens zero. Dados não aprovados são visíveis somente ao autor e à administração.

A checagem de tipos, os 15 testes de regressão e a compilação foram validados. Os fluxos de cadastro, administração e logout foram verificados no navegador com respostas simuladas; o teste com o banco real depende de uma URL válida e da configuração do projeto.
