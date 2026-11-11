# Prompt Log

A representative sample of how the project was built with Claude Code, in the order it happened: reading the brief, proposing an architecture, brainstorming and disagreeing, then building, testing and improving. Prompts are quoted as written (typos fixed); outcomes are summarised.

## 1. Understanding the requirements

**Prompt:**
"Can you analyze this document and prepare a plan of execution. Before doing anything let us brainstorm first." _(with the take-home brief attached)_

**Outcome:**
Claude summarised the brief (real-time equity trade blotter; create, amend and cancel; React + TypeScript, a TypeScript backend, a database, live updates; README, AI usage report and prompt log required) and the grading weights. It proposed a starting plan and asked about the stack, how to submit, which bonus features to build, and how the work would be split between us.

## 2. The first architecture suggestion

**Prompt:**
"1. I want to use NestJS and Socket.IO. A separate realtime server should be built. 2. We will submit a GitHub repo. 3. All of it."

**Outcome:**
Claude's first suggestion was Fastify with native WebSockets in a single backend, skipping auth and P&L unless time allowed. That was replaced: NestJS, Socket.IO on its own realtime server, and every bonus feature. Claude then proposed the next layer of decisions (Redis pub/sub between API and realtime, Prisma, a pnpm monorepo, JWT auth, a mock price feed, amend in place with an audit table).

## 3. Setting the shape of the system

**Prompt:**
"I want to implement a clean code, each endpoint fast and real time. In theory I want it to work this way: Frontend -> API -> queue -> service -> DB/Socket. … Realtime server should not transport sensitive data, it should just give an event type and simple event data … API should not hold business logic, not touch database or realtime, it should be the facade to the backend, should be BFF … Service - CLEAN and CQRS with Repository pattern. Prisma for ORM … Frontend - Feature based … ShadCN, Tailwind and Base UI (NOT Radix). Realtime - agnostic but authenticated on subscription … abstract Socket.IO so we can always change the tech in future."

**Outcome:**
This replaced Claude's Redis pub/sub suggestion with a queue between every layer. Claude adopted it as the backbone of the design and came back with eight follow-up questions: queue technology, whether reads also go through the queue, what a mutation returns, how the service tells realtime to emit, socket auth, rooms, where validation lives, and shared contracts.

## 4. Brainstorming, and where the suggestions were pushed back

**Prompt:**
"1. RabbitMQ. 2. Go to queue. Service should be isolated; at start we can use one service to host all business logic … 3. Do A. I never said realtime should have the response from API call, that is anti-pattern. Realtime emits events and frontend listens to it … 5. What are your suggestions? I guess auth is still business logic, so call service by queue? 6. There should be a theoretical grouping and never per user. That is n+1."

**Outcome:**
Claude had offered an option where the outcome of a write arrived over the socket; Jenerson rejected it as coupling events to requests, so writes are request/reply and events stay independent. Claude's suggestion of RabbitMQ was accepted. Socket emits use topic groups (`trades`, `positions`, `prices`) chosen by the service, never per-user fan-out. On auth, Claude agreed it is business logic and proposed a handshake RPC from realtime to the service.

**Prompt:**
"For 1, let us use NestJS event on realtime so that we can use the offered NestJS RabbitMQ. … 6. What is more secured? Isn't cookie?"

**Outcome:**
Claude had suggested plain `amqplib` for one message format; Jenerson chose NestJS's built-in RabbitMQ transport instead, which made realtime a NestJS app too. Claude had suggested keeping the access token in memory with only the refresh token in a cookie; Jenerson chose both tokens in httpOnly cookies, so Claude added CSRF protection on every write.

**Prompt:**
"Another thing I forgot, we should abstract the RabbitMQ as well and expose the following methods: 1. Request - expects a response … 2. Publish - does not expect a response, useful for event publishing."

**Outcome:**
Added to the design as a `MessageBus` interface in `packages/messaging` with `request()` and `publish()`, a RabbitMQ adapter, and an in-memory adapter for unit tests.

**Prompt:**
"Also for frontend let us use Next.js."

**Outcome:**
Claude had recommended against Next.js because its server would overlap the NestJS BFF. Jenerson chose it anyway, and Claude kept the BFF rule by using Next.js as a client-rendered shell that only proxies `/api` and `/socket.io`.

**Prompt:**
"One question before we proceed: when the client connects to realtime, does it mean realtime needs to accept the request? Can it be still in API?"

**Outcome:**
Claude explained three options and recommended keeping the handshake on realtime (A). Jenerson chose B instead: the client asks the API for a 30-second one-time ticket, then connects to realtime with it, so every permission decision starts at the API.

## 5. Building, and changing course on the way

**Prompt:**
"Why not use the latest versions?"

**Outcome:**
Claude had pinned proven major versions. It ran an upgrade spike instead and kept what passed: NestJS 12, Prisma 7, Vitest 5, ESLint 10, Next 16 and Node 24. TypeScript 7 was rejected after testing (no stable JS API yet, and typescript-eslint and the Nest CLI don't support it), so TypeScript 6.0 is used.

**Prompt:**
"backend/service should be backend/services, then the initial service for trade should be present as initial service. Let us use shadcn with Base UI for the component factory."

**Outcome:**
The service moved to `backend/services/trade`, leaving room for more services beside it, and the frontend was set up with shadcn's Base UI style.

## 6. Testing the app and improving it

**Prompt:**
"Few enhancements I want: 1. The positions table is not using AG Grid and its header is not fixed, make it use similar behaviour as the main grid. 2. For the trade form, use the side bar as well, similar to the audit trail."

**Outcome:**
After trying the running app, Jenerson asked for these changes. The positions panel moved to AG Grid, sharing one theme and config with the blotter, with a fixed header, sortable columns and a pinned totals row. Create and amend moved from a dialog into the same side drawer as the audit trail. Toasts moved to the bottom left so they no longer covered the drawer's buttons.
