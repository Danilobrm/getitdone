# SPEC: getitdone

## Objetivo
Ter num só lugar tudo que preciso fazer em cada dia: tarefas do plano de estudos (vindas de seed) e tarefas pessoais que eu mesmo crio, como "ir para a academia". Abro o app, vejo o dia, marco o que fiz e, quando começo algo, entro na tarefa, marco como "fazendo agora" e rodo um pomodoro.

## Fora do escopo do MVP
Compartilhamento entre usuários, notificações push agendadas, integração com calendário, IA. Não implementar.

## Modelo de dados

### categories
| campo | tipo | nota |
|---|---|---|
| id | uuid pk | |
| name | text | ex: IA, DSA, Espanhol, Eng. Software, Post, Pessoal, Saúde |
| color | text | token de cor, ex: `emerald` |
| sort_order | int | |

### tasks
| campo | tipo | nota |
|---|---|---|
| id | uuid pk | |
| title | text | obrigatório |
| notes | text null | markdown simples, links de material |
| category_id | uuid fk null | |
| date | date null | dia em que está planejada; null = backlog (sem dia) |
| status | enum `todo` \| `doing` \| `done` | só uma tarefa pode estar `doing` por vez |
| sort_order | int | ordem dentro do dia |
| estimated_pomodoros | int null | |
| time_spent_sec | int default 0 | soma das sessões de foco concluídas |
| completed_at | timestamptz null | |
| source | enum `manual` \| `seed` \| `recurring` | |
| recurring_rule_id | uuid fk null | quando gerada por uma rotina |
| created_at / updated_at | timestamptz | |

### recurring_rules
Para tarefas que se repetem, como academia ou espanhol diário.
| campo | tipo | nota |
|---|---|---|
| id | uuid pk | |
| title, notes, category_id, estimated_pomodoros | | copiados para cada tarefa gerada |
| weekdays | int[] | 0=dom ... 6=sáb, ex: [1,3,5] |
| start_date / end_date | date / date null | |
| active | bool | |

Geração: ao abrir um dia, se existir regra ativa que cobre aquele dia da semana e ainda não há tarefa com aquele `recurring_rule_id` naquela data, cria a tarefa (idempotente, com índice único em `(recurring_rule_id, date)`). Editar ou excluir uma tarefa gerada afeta só aquele dia.

### pomodoro_sessions
| campo | tipo | nota |
|---|---|---|
| id | uuid pk | |
| task_id | uuid fk null | null para pausa |
| kind | enum `focus` \| `short_break` \| `long_break` | |
| started_at | timestamptz | |
| planned_sec | int | 1500 / 300 / 900 por padrão |
| ended_at | timestamptz null | |
| completed | bool | false se interrompida |

Só pode haver uma sessão aberta (`ended_at is null`). O estado do timer vive no servidor: o cliente calcula o tempo restante a partir de `started_at + planned_sec`, então o timer sobrevive a recarregar a página e trocar de aparelho.

### settings
Linha única: duração de foco, pausa curta, pausa longa, pomodoros até a pausa longa.

## Telas (mobile-first)

1. **Hoje** (`/`)
   Data e progresso do dia (x de y feitas). Card fixo no topo se houver tarefa `doing` ou pomodoro rodando, com o tempo restante.
   Lista do dia agrupada por categoria, com checkbox para concluir, tocar no título abre o detalhe.
   Campo de adicionar rápido no fim da lista: título + categoria opcional, cai no dia que está aberto.
   Setas para dia anterior e próximo, e botão "Hoje".
   Tarefas atrasadas (dias anteriores, não feitas) aparecem num bloco recolhível "Pendentes" com ação "trazer para hoje".

2. **Detalhe da tarefa** (`/tarefas/[id]`)
   Editar título, notas, categoria, data, estimativa.
   Botão "Fazer agora": muda para `doing` (e qualquer outra `doing` volta para `todo`) e inicia um pomodoro de foco.
   Timer grande com pausar não existe no pomodoro clássico: só "interromper" e "concluir sessão". Ao terminar o foco, sugere a pausa correta e conta pomodoros feitos.
   Botão "Concluir tarefa". Mostra tempo total gasto e pomodoros feitos vs estimados.
   Ao terminar uma sessão: som curto e Notification API do navegador se permitido.

3. **Semana** (`/semana`)
   7 colunas (no celular, lista por dia) com contagem e as tarefas; arrastar ou "mover para" outro dia.

4. **Gerenciar** (`/gerenciar`)
   Abas: Backlog (tarefas sem dia, com "agendar"), Rotinas (CRUD de recurring_rules), Categorias (CRUD com cor), Configurações (durações do pomodoro).

5. **Login e cadastro** (`/login`, `/cadastro`)
   Usuário e senha (hash scrypt). Cada usuário tem seu ambiente isolado. Cadastro exige `SIGNUP_CODE` (fechado em produção se ausente). O primeiro cadastro adota os dados criados antes do suporte a múltiplos usuários. Cookie httpOnly assinado com `SESSION_SECRET` (contém o id do usuário), validade de 30 dias. O proxy protege todas as rotas exceto `/login`, `/cadastro`, manifest e assets.

## PWA
Manifest com nome "getitdone", ícones, `display: standalone`, tema escuro e claro. Service worker cacheando o shell. Offline só leitura no MVP.

## Marcos (implementar nesta ordem, parando ao fim de cada um)
1. Setup: Next.js, Tailwind, docker-compose com Postgres local, Drizzle, schema completo, primeira migration, login por senha e middleware. Scripts `pnpm db:up`, `db:generate`, `db:migrate`.
2. Hoje: listar tarefas do dia, adicionar rápido, concluir, navegar entre dias, pendentes.
3. Detalhe e CRUD de tarefa, categorias.
4. Pomodoro: sessões no servidor, "fazer agora", timer, som e notificação, tempo acumulado. **Pausado**: removido da interface (código em `archive/pomodoro/`, dados e tabelas mantidos).
5. Rotinas recorrentes e geração idempotente.
6. Semana e Backlog com mover entre dias.
7. PWA, polimento mobile e deploy no Railway (web + Postgres, migrations no deploy).
8. Script `pnpm db:seed` lendo `seed/data.json` (formato a definir depois).

## Critérios de pronto do MVP
- Crio "Academia" como rotina seg/qua/sex e ela aparece sozinha nesses dias.
- Pelo celular, abro o dia, toco numa tarefa, inicio um pomodoro, fecho o app e ao reabrir o tempo continua certo.
- Concluir uma tarefa no celular aparece concluída no computador ao recarregar.
