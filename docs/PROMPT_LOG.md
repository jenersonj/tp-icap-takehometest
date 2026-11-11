# Prompt log

A representative sample of the prompts and discussions behind this project, as the brief asks. The working model throughout: **Jenerson made the architecture and product decisions; Claude (Claude Code) proposed options, wrote the code and tests, and flagged trade-offs.** Responses are summarised.

Tool: Claude Code (Anthropic), used in a project chat with a coordinator thread for design and separate build threads for implementation.

---

## 1. Reading the brief

**Prompt (Jenerson):** Shared the take-home PDF and asked for a plan to build it.

**Outcome:** Claude summarised the core requirements (CRUD with cancel as a status change, sortable and filterable grid, refresh, live updates across clients, seeded random trades, tests, Docker, README, AI report and prompt log) and listed the bonus features. Jenerson decided to implement **all** bonus features (audit trail, positions, P&L, auth, validation rules, virtualised grid, Docker) and to deliver a Git repository.

## 2. Backend framework and realtime transport

**Prompt (Jenerson):** Asked for backend and realtime options.

**Outcome:** Claude compared Express, Fastify, Hono and NestJS, and WebSockets, Socket.IO and SSE. Jenerson chose **NestJS** and **Socket.IO**, and decided realtime should be a **separate server** rather than a gateway inside the API.

## 3. Overall flow

**Prompt (Jenerson):** "Frontend -> API -> queue -> Service -> DB / Realtime."

**Outcome:** Jenerson set the topology. Claude turned it into C4 context and container diagrams. Jenerson's rules for each part:

- API is a pure BFF: no business logic, no DB, no realtime; it trims service results into frontend DTOs and uses versioned endpoints.
- The service holds all business logic, using Clean Architecture, CQRS and the repository pattern, organised by business entity, starting as one process that can be split later.
- Realtime only emits when the service tells it to. Events carry a type and minimal non-sensitive data, and the frontend refetches through the API. Socket.IO sits behind an interface exposing `emitToClient`, `emitToGroup` and `broadcast`, with topic groups only.

## 4. Queue

**Prompt (Jenerson):** Asked which broker and library.

**Outcome:** Jenerson chose **RabbitMQ via NestJS's built-in transport**, abstracted behind a `MessageBus` interface with `request()` and `publish()`. All API -> service traffic goes over the queue and the API still answers HTTP synchronously; service -> realtime emits go over RabbitMQ as well.

## 5. Socket authentication

**Prompt (Claude):** Offered three options: (A) send the access token in the socket handshake, (B) a short-lived one-time ticket, (C) share the cookie through a same-origin proxy.

**Outcome:** Jenerson chose **option B**. The client calls `POST /api/v1/realtime/ticket`, the API gets a 30 s single-use ticket from the service, and realtime redeems it with the service and disconnects the socket when the session expires.

## 6. Tokens, validation, data and frontend

**Outcome (Jenerson's decisions):**

- Access and refresh tokens **both in httpOnly cookies**, with double-submit CSRF protection.
- **Zod** schemas shared between API shape validation and web forms; business rules stay in the service domain.
- A shared TypeScript package for contracts, types and events.
- Next.js (App Router) as a client-rendered shell only, proxying `/api` and `/socket.io`, so the NestJS API stays the only BFF. Feature-based folders, shadcn + Tailwind on **Base UI (not Radix)**.
- Events are emitted after the DB commit, without an outbox (clients refetch on reconnect).
- Server-side paging, sorting and filtering for the grid.
- Mock market price ticker in the service for P&L; positions computed per request.
- Amend: every business field is amendable, updated in place with audit rows. Cancel is final. Auth uses roles only (TRADER / VIEWER).
- Tooling: pnpm + Turborepo + Vitest, with folders named as the brief lists them.

The full design is in [ARCHITECTURE.md](./ARCHITECTURE.md), which Jenerson signed off on 2026-11-11.

## 7. Delivery

**Prompt (Jenerson):** "Do not push any changes, create a local repository for now and I will push it myself."

**Outcome:** Claude works in a local git repository only and copies it, with its history, to a folder on Jenerson's machine. Nothing is pushed.

## 8. Building the shared packages

**Prompt (Jenerson, via the signed-off doc):** Start with the monorepo skeleton, then contracts and the MessageBus.

**Outcome:** Claude built:

- `packages/contracts`: zod request schemas (shape only), service response records, frontend DTOs, the RPC catalogue (`RpcMap`, pattern -> request/reply types), the realtime event catalogue and error codes with their HTTP mapping.
- `packages/messaging`: the `MessageBus` interface with a RabbitMQ adapter on Nest's `ClientRMQ`/`ServerRMQ` (a topic exchange with `wildcards: true`, so each queue receives only the patterns it registered), an in-memory adapter for unit tests, a typed wrapper, correlation-id propagation and `@RpcRoute` decorators for Nest controllers.

Implementation choices Claude made within the decisions, for Jenerson to review:

- Only errors that extend `CodedError` cross the bus with their code; anything else becomes `INTERNAL`. A test caught that Node system errors such as `ECONNREFUSED` would otherwise have leaked through.
- Tooling versions were first pinned to proven majors (NestJS 11, Prisma 6, TypeScript 5.9); see the next entry.

## 9. Latest versions

**Prompt (Jenerson):** "Why not use the latest versions?"

**Outcome:** Claude admitted the pinning was caution rather than a verified incompatibility, and offered a spike: upgrade everything, rerun the tests and the Docker build, and keep anything that fails at its current version. Jenerson chose to upgrade. The results:

- **TypeScript 7 was rejected; TypeScript 6.0 is used instead.** TS 7 (the Go-native compiler) does emit decorator metadata, but it has no stable JS API yet. typescript-eslint supports up to `<6.1` and Nest CLI 12 bundles TS 6.0.
- **NestJS 12** is ESM-only, so every workspace package moved to `"type": "module"` with `NodeNext` imports. The RabbitMQ topic-exchange routing was retested against a real broker and still works. One typing change was needed: `EventPattern` is now generic.
- **Prisma 7.10** (the newest stable; npm's `latest` tag points at an 8.0 release candidate). It uses the new `prisma-client` generator, `prisma.config.ts`, and the `pg` driver adapter. With no query-engine binary, the Docker image no longer needs OpenSSL or `binaryTargets`.
- Vitest 5, ESLint 10, React 19.3, Next 16.4 and Testcontainers 12 upgraded without code changes.
- Runtime is **Node 24 LTS** (`node:24-alpine`), with `@types/node` 24 to match the runtime rather than the newest typings.

## 10. Skeleton corrections: services folder and shadcn on Base UI

**Prompt (Jenerson):** "backend/service should be backend/services then initial service for trade should be present as initial service. Let us use shadcn with Base UI for the component factory."

**Outcome:**

- The domain service moved to `backend/services/trade` (package `@blotter/trade-service`, queue `blotter.trade-service.rpc`, compose service `trade-service`). It still hosts audit, positions, pricing and auth, each as its own module, so any of them can later move into a sibling folder under `backend/services/`.
- The frontend now uses shadcn's **base-nova** style on **Base UI** (`components.json` with `"style": "base-nova"`). Components live in `frontend/src/shared/ui`, `cn` in `src/shared/lib/utils.ts`, and the neutral theme with light and dark tokens in `globals.css`, plus `--buy`/`--sell` colours for the blotter. A `Providers` component adds next-themes, the tooltip provider and the sonner toaster.
- The shadcn registry (ui.shadcn.com) could not be reached from the build sandbox, so Claude generated the components from the shadcn source repository with the same transforms the CLI uses (`createStyleMap`/`transformStyle` from `shadcn/utils`, lucide icons). The output matches what `npx shadcn add` produces for this style, and `components.json` lets later components be added with the CLI as normal.
