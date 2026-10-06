# Decisions

Use this file to record assumptions, trade-offs, prioritisation, and anything you cut.

## Prioritisation

1. **List performance** first — it is user-visible under seed load and has a clear backend cause.
2. Remaining core tasks next (UI freshness, CI, classify layering, history). Stretch only if time remains.

## Assumptions

- `GET /requests` should keep returning the full list in `createdAt DESC` order. The web UI already slices to 25 rows client-side; changing pagination would alter the current contract.

## Trade-offs

### List performance

`list()` loaded every request, then queried **all notes per row** just to compute `noteCount` and `latestNotePreview` (~1 + N queries, and note volume in memory).

Fix: one SQL query that joins a `COUNT(*)` subquery and a `DISTINCT ON (request_id)` latest-note subquery, plus an index on `(request_id, created_at DESC, id DESC)`.

I did **not** paginate the endpoint. That would make the payload smaller, but the task is to keep the list correct while scaling with seeded notes — the bottleneck was notes, not the 1200 request rows. Pagination is a follow-up if the payload itself becomes the problem.

### UI freshness

Create already called `invalidateQueries(['requests'])`. Status and classify did not, and the QueryClient is configured with `staleTime: 10s` plus `refetchOnWindowFocus: false`, so the table stayed on cached rows after a successful API write.

Fix is client-only:
- **Status:** optimistic cache patch so the controlled `<select>` does not snap back, rollback on error, invalidate on settle.
- **Classify:** patch `category` / `confidence` from the mutation result, and apply the current API rule (`open` → `in_progress`) so the row does not wait on a 360KB refetch. Then invalidate to reconcile with the server.

I left the QueryClient defaults in place. Turning on refetch-on-focus would hide the bug without fixing the mutations.

### CI

The workflow failed on a clean checkout for two “works on my machine” mismatches:

1. **Migrate URL** — the Postgres service creates `cami`, and the job `DATABASE_URL` is `cami`, but the migrate step overrode it to `cami_app` (database does not exist). Local `npm run migration:run` uses `cami`, so it passed. Removed the override and run migrate before tests.
2. **Web typecheck** — `next-env.d.ts` imports generated route types under `.next/`, which only exist after `next dev` / `next build`. CI has no `.next`. `typecheck` now runs `next typegen` first.

### Controller structure

`POST /requests/classify` mixed HTTP, validation, scoring policy, and persistence, with `body: any`.

I moved:
- input parsing into `parseClassifyBody` (typed body, `BadRequestException` instead of `{ error }` + 200)
- confidence / unknown rules into `applyClassificationPolicy`
- persist + `open` → `in_progress` into `RequestsService.classify`

The controller only parses the body and delegates. I did **not** add class-validator. The classifier provider interface landed with history (task 5). I left create/status handlers alone; they were not the problem.

Invalid classify payloads now return HTTP 400. The web client already treats non-OK as failure and only sends valid messages.

## Classification history scope

Append-only `classification_events` (not overwriting `customer_requests.category`). Each classify writes a row with message, category, confidence, provider id, optional request_id (`ON DELETE SET NULL`). `GET /requests/history?category=` returns the latest 100, optionally filtered.

Classifier is a `Classifier` interface (`id` + `classify()`). Nest injects `@Inject(CLASSIFIER)`. `RequestsModule` binds that token to `KeywordClassifier` today. `LlmClassifier` is an empty stub (`id = 'llm'`, classify returns unknown) so a real model can be swapped without touching `RequestsService`:

```
{ provide: CLASSIFIER, useExisting: LlmClassifier }
```

No API key, no vendor client. Timeouts/429/malformed JSON belong in `LlmClassifier` when it is filled in.

Assumptions / cuts:
- History is not backfilled from seed. Seeded requests have no `category` and no `classification_events` rows until someone clicks Classify. `/history` is not a search over the 1200 seed messages; the desk also only renders 25 rows and has no search box.
- Product policy (short message / weak confidence) stays outside the provider so an LLM swap does not drop those rules unless we choose to.
- Invalid `category` query params are ignored (show all) rather than 400.
- History cap is 100 rows. No pagination, no LLM failure table.
- Migrate **before** rolling API processes that insert into `classification_events` (Docker CMD and CI already run migrations first).

LLM failure modes to handle later: timeout, malformed JSON, 429/5xx — fail the classify call, do not write a fake category, do not update the request.

## Stretch (if any)

Not done. Persistence ports (task 6) and richer history/LLM failure handling (task 7) were cut under the timebox.

## What you would do with more time

- Paginate `GET /requests` and history.
- Return `status` from classify so the client does not copy `open` → `in_progress`.
- Wrap request update + history insert in one transaction.
- LLM adapter: timeout, parse errors, and a “failed” event rather than a guessed category.
