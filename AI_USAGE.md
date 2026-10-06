# AI Usage

## Tools used

- Cursor (Grok 4.6)

## How I used AI

- Explored the repo and diagnosed `GET /requests` slowness.
- Drafted the SQL aggregate list query, index migration, and list correctness test.
- Diagnosed stale TanStack Query cache after status/classify mutations.

## What I changed or rejected

- Rejected paginating `GET /requests` for list performance. The UI already slices to 25 rows; the bug was N+1 note loading, and the list contract should stay the same.
- Rejected “fixing” UI freshness by only enabling `refetchOnWindowFocus`. That would mask missing mutation cache updates.

## Trade-offs

Kept the full-list payload (~1200 rows) and fixed note aggregation in SQL instead.

For freshness, status uses an optimistic patch (controlled select); classify patches from the API result and still invalidates so a later history feature can share the same query key.

## Team workflow (optional stretch)

If relevant: how you would set standards for AI-assisted development on a team.
