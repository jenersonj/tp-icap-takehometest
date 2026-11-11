# Prompt log

A representative sample of the prompts behind this project, in the order the work happened: understanding the brief, getting an architecture suggestion, brainstorming and pushing back on parts of it, then testing the result and asking for improvements. Responses are summarised; prompts in quotes are as written, the others are paraphrased. How AI was used overall is in [AI_USAGE.md](./AI_USAGE.md).

---

## 1. Feeding in the brief

The first step was to give Claude the take-home document and make sure the requirements were understood before any design.

**Prompt:** _(paraphrased)_ Shared the take-home PDF and asked Claude to read it and plan the build.

**Outcome:** Claude summarised the core requirements: create, amend and cancel trades (cancel as a status change), a sortable and filterable grid, a refresh action, live updates across clients, 100 to 1,000 seeded random trades, tests, Docker and a README. It then listed the bonus features separately. Jenerson decided to build all the bonus features too: audit trail, positions, P&L, auth, validation rules and a virtualised grid.

## 2. Asking for an architecture

With the scope agreed, Claude was asked for options rather than a finished design.

**Prompt:** _(paraphrased)_ What are the options for the backend framework and for realtime?

**Outcome:** Claude compared Express, Fastify, Hono and NestJS, and WebSockets, Socket.IO and Server-Sent Events, with the trade-offs of each. Jenerson chose NestJS and Socket.IO.

**Prompt:** "Frontend -> API -> queue -> Service -> DB / Realtime."

**Outcome:** Jenerson set the overall flow, and Claude turned it into C4 diagrams, request sequences, a data model and an API design. Jenerson added the rules for each part:

- The API is a pure BFF with no business logic and no database.
- The service holds all business logic, using Clean Architecture and CQRS.
- Realtime is a separate server rather than a gateway inside the API.
- Events carry ids only, and the frontend refetches through the API.

## 3. Brainstorming, and where Jenerson disagreed

The design was refined by going through Claude's suggestions one question at a time. Most were accepted; some were replaced with a different strategy.

**Prompt:** _(paraphrased)_ Which message broker and library should we use?

**Outcome:** Claude laid out the choices. Jenerson chose RabbitMQ through NestJS's built-in transport, hidden behind a `MessageBus` interface. Claude then added an in-memory adapter so every app can be unit-tested without a broker.

**Prompt:** _(Claude's suggestion)_ Three ways to authenticate the socket: (A) send the access token in the handshake, (B) use a short-lived one-time ticket, (C) share the cookie through a same-origin proxy.

**Outcome:** Jenerson chose B. The browser asks the API for a 30-second single-use ticket, realtime redeems it with the service, and the socket is disconnected when the session expires. Tokens never travel over the socket.

**Prompt:** "Why not use the latest versions?"

**Outcome:** Disagreement. Claude had pinned older major versions to be safe, and admitted that was caution, not a known incompatibility. It upgraded everything as a spike and reran the tests and Docker build. The latest NestJS, Prisma, Next.js and Node were kept. TypeScript 7 was rejected because the linter and Nest CLI don't support it yet, so the project stays on TypeScript 6.

**Prompt:** "backend/service should be backend/services then initial service for trade should be present as initial service. Let us use shadcn with Base UI for the component factory."

**Outcome:** Two changes to Claude's layout:

- Claude's single `backend/service` folder became `backend/services/trade`, so more domain services can be added beside it later.
- The UI uses shadcn on Base UI instead of shadcn's default, Radix.

## 4. Testing it and asking for improvements

Each feature was built and tested, then Jenerson used the running app and asked for changes where it fell short.

**Prompt:** _(paraphrased)_ Run the whole stack locally so I can see the app working in real time.

**Outcome:** Claude built and ran everything in Docker and checked it in two browsers at once: a trade created, amended and cancelled by one user appeared for the other within milliseconds. That gave Jenerson a working blotter to review.

**Prompt:** "The positions table is not using AG Grid and its header is not fixed, make it behave similar to the main grid."

**Outcome:** Claude's first positions panel was a plain table whose header scrolled away. It was rebuilt on AG Grid with the same theme as the trade grid, a fixed header, sortable columns, a totals row pinned to the bottom, and price and P&L cells that flash on each market tick.

**Prompt:** "For the trade form, use the side bar as well, similar to the audit trail."

**Outcome:** The create and amend form moved from a pop-up dialog into the same right-hand drawer as the audit trail, so trade details always open in one place. While checking this in the browser, Claude saw that the success messages covered the drawer's buttons and moved them to the other side of the screen.
