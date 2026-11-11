# Prompt log

A representative sample of the significant prompts used to build this project, not the full conversation. Responses are summarised. How AI was used overall is in [AI_USAGE.md](./AI_USAGE.md).

## 1. Architecture

**Prompt:**
"Frontend -> API -> queue -> Service -> DB / Realtime."

**Outcome:**
Claude turned the flow into C4 diagrams and sequences and offered options for the open questions, such as three ways to authenticate the socket. Jenerson chose RabbitMQ behind a `MessageBus` interface, NestJS and Socket.IO, and single-use socket tickets, and signed off [ARCHITECTURE.md](./ARCHITECTURE.md).

## 2. Latest versions

**Prompt:**
"Why not use the latest versions?"

**Outcome:**
Claude had pinned older majors out of caution, so it upgraded everything as a spike and reran the tests and the Docker build. The upgrades were kept, except TypeScript 7, which was rejected because the linter and Nest CLI don't support it yet; the project uses TypeScript 6.

## 3. Folder layout and UI components

**Prompt:**
"backend/service should be backend/services then initial service for trade should be present as initial service. Let us use shadcn with Base UI for the component factory."

**Outcome:**
Claude's `backend/service` was renamed to `backend/services/trade` so more services can sit beside it. The UI uses shadcn on Base UI instead of Radix.

## 4. Building locally

**Prompt:**
"Why are you building it on a cloud sandbox? Do it on my local, even all the build. I need to see the app realtime working and building."

**Outcome:**
All building and running moved from the cloud sandbox to Jenerson's Mac. The shadcn components were regenerated with the real CLI, and its broken `cn` imports were fixed by hand.

## 5. Commits

**Prompt:**
"Why do we need to add a commit on each change you are doing?"

**Outcome:**
Claude explained that one commit per feature keeps each piece reviewable and revertable, and offered to squash or leave changes uncommitted instead. Jenerson kept one commit per feature.

## 6. UI refinements

**Prompt:**
"The positions table is not using AG Grid and its header is not fixed, make it behave similar to the main grid. For the trade form, use the side bar as well, similar to the audit trail."

**Outcome:**
Claude's plain positions table was replaced with AG Grid, using the blotter's theme, a fixed header and a pinned totals row. The trade form moved from a dialog into the same side drawer as the audit trail.
