# AI Usage

## Tools used

- Cursor (Grok 4.6)

## How I used AI

- Explored the repo and diagnosed `GET /requests` slowness.
- Drafted the SQL aggregate list query, index migration, and list correctness test.
- Diagnosed stale TanStack Query cache after status/classify mutations.
- Compared the GitHub Actions workflow to a local run: migrate targeted `cami_app`, and web typecheck depended on generated `.next` types.
- Moved classify rules out of the Nest controller into a typed service + policy function.
- Implemented classification history (event table + provider interface) and a filtered `/history` page.
- Added an empty `LlmClassifier` stub and a module comment showing how to bind `CLASSIFIER` to it. Did not call a real model.

## What I changed or rejected

- Rejected paginating `GET /requests` for list performance. The UI already slices to 25 rows; the bug was N+1 note loading, and the list contract should stay the same.
- Rejected “fixing” UI freshness by only enabling `refetchOnWindowFocus`. That would mask missing mutation cache updates.
- Rejected creating a second `cami_app` database in CI. The service already provisioned `cami`; the step override was the bug.
- Rejected adding class-validator / a global ValidationPipe.
- Rejected backfilling history from seed data.
- Rejected wiring a real LLM. `LlmClassifier` is a no-op placeholder (`unknown` / 0); production scoring stays on `KeywordClassifier` until the module binding is changed.

## Trade-offs

Kept the full-list payload (~1200 rows) and fixed note aggregation in SQL instead.

For freshness, status uses an optimistic patch (controlled select); classify patches from the API result and invalidates both `requests` and `history`.

AI drafted the history table and provider seam; I kept history append-only (not overwriting request.category), left seed un-backfilled, and kept the LLM class empty rather than pretending to call a model.

## Team workflow (optional stretch)

Prefer a token + interface (`CLASSIFIER`) over importing a concrete class in the service. Reviewers can see the swap in one module line. Treat generated files (`next-env.d.ts`, `.next`) as local; CI must generate types itself (`next typegen`).
