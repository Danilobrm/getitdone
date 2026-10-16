# getitdone

App de tarefas diárias com pomodoro. Multiusuário: cada usuário tem seu próprio ambiente (tarefas, categorias, rotinas, sessões, configurações). Mobile-first, instalável como PWA.
Leia `docs/SPEC.md` antes de implementar qualquer coisa. Ele define escopo, modelo de dados, telas e a ordem dos marcos.

## Stack (fixa, não trocar sem perguntar)
- Next.js (App Router) + TypeScript strict
- Tailwind CSS
- Postgres local via `docker-compose.yml` (serviço `db`, Postgres 16, volume nomeado) no desenvolvimento; Railway depois. Acesso com Drizzle ORM e drizzle-kit para migrations
- Zod para validar toda entrada de server actions
- Deploy no Railway (um serviço web + um Postgres no mesmo projeto)
- pnpm

## Regras
- Todo dado pertence a um usuário: toda query em `src/db/queries.ts` recebe `userId` e filtra por ele; toda Server Action e página começa com `requireUserId()` (`src/lib/auth.ts`). Nunca leia ou escreva por `id` sem escopar por `user_id`.
- Mutations via Server Actions; leitura em Server Components. Rotas de API só quando o cliente precisar (ex: pomodoro).
- Todo acesso ao banco passa por `src/db/` (schema + queries). Componentes não importam o client do Drizzle direto.
- Datas: o "dia" de uma tarefa é uma data local (`YYYY-MM-DD`) no fuso `America/Sao_Paulo`. Nunca derive o dia de um timestamp UTC sem converter.
- Interface em português do Brasil. Código, nomes de tabelas e commits em inglês.
- Sem bibliotecas de UI pesadas. Componentes próprios com Tailwind; ícones com lucide-react.
- Implemente um marco do SPEC por vez, rode `pnpm lint` e `pnpm typecheck` antes de considerar pronto, e pare para eu revisar.
- Não crie o seed de dados do plano de estudos. Ele será discutido depois; só deixe o script `pnpm db:seed` preparado para ler `seed/data.json`.

## Variáveis de ambiente
- `DATABASE_URL` (local: `postgres://postgres:postgres@localhost:5432/getitdone`; depois a do Railway)
- Manter `.env.example` atualizado e `.env` no `.gitignore`
- `SIGNUP_CODE` (código de convite para criar conta; em produção o cadastro fica fechado se não estiver definido)
- `SESSION_SECRET` (assinar o cookie de sessão)
- `TZ_APP=America/Sao_Paulo`
