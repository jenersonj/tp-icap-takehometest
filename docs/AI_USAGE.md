# AI usage report

## Which AI tools were used

**Claude Code** (Claude, by Anthropic), used inside a Claude project. Work started in a cloud sandbox; at Jenerson's request all building and running then moved to a Claude Code session on Jenerson's Mac, working in a local Git repository. No other AI tools were used.

## How they were used

Jenerson set the architecture and made the product decisions. Claude proposed options with a recommendation where there was a real choice, then wrote the code, tests, Docker setup and documentation, ran them, and reported results. The design was agreed in [ARCHITECTURE.md](./ARCHITECTURE.md) before coding, and every later step followed it. Jenerson reviewed the running app at <http://localhost:8080> and redirected where something wasn't right.

## Examples of prompts

- "Frontend -> API -> queue -> Service -> DB / Realtime."
- "Why not use the latest versions?"
- "Why are you building it on a cloud sandbox? Do it on my local, even all the build."
- "The positions table is not using AG Grid and its header is not fixed, make it behave similar to the main grid."

More, with outcomes, in [PROMPT_LOG.md](./PROMPT_LOG.md).

## Key architectural or implementation decisions influenced by AI

The overall flow, the pure BFF, a separate realtime server, thin events with refetch, RabbitMQ and the frameworks were Jenerson's calls. Claude proposed these, and Jenerson accepted them:

- **Single-use socket tickets.** This was one of three socket-auth options Claude laid out. Tokens never travel over the socket and realtime makes no permission decisions.
- **One `MessageBus` over Nest's RabbitMQ transport.** It uses a topic exchange so each queue gets only its own patterns, and an in-memory adapter makes every app testable without a broker.
- **One error envelope with coded errors.** Only branded domain errors keep their code across the bus; anything else becomes `INTERNAL`, so internals never leak.
- **Amend in place.** It uses optimistic `version` checks, and the audit row is written in the same transaction as the change.
- **Positions with the average-cost method.** They come from one SQL `GROUP BY` per request, with realised and unrealised P&L marked to a mock price ticker.
- **Refresh-token rotation with reuse detection.** Tokens are stored hashed, and a replayed token signs the user out everywhere.
- **AG Grid's infinite row model**, so paging, sorting and filtering run on the server.

## Areas where suggestions were accepted or rejected

**Accepted:** the decisions above, one commit per feature, and making the Postgres host port configurable instead of stopping another project's container.

**Rejected or changed by Jenerson:**

- Claude pinned older framework versions → upgraded to the latest.
- `backend/service` → `backend/services/trade`, with room for more services.
- Building in a cloud sandbox → building and running locally. The UI components, first generated without the shadcn CLI, were regenerated with the real CLI.
- Positions as a plain HTML table → AG Grid, matching the main grid.
- The trade form in a dialog → the same side drawer as the audit trail.

**Rejected after Claude tested its own suggestion:**

- TypeScript 7, after the upgrade spike: the linter and Nest CLI don't support it yet.
- The shadcn CLI's generated imports and extra npm package, fixed by hand.
- The first blotter layout, which clipped grid columns on a 1440px screen in the browser screenshots and was reworked.

## Verification

Every AI change was checked the same way: Vitest unit tests (177 across the workspaces), TypeScript and ESLint, a rebuild of the Docker stack, and an end-to-end run in two browsers. In that run, one user creates, amends and cancels a trade while a second sees each change live.
