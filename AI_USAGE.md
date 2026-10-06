# AI Usage

## Tools used

- Cursor (Grok 4.6)

## How I used AI

- Explored the repo and diagnosed `GET /requests` slowness.
- Drafted the SQL aggregate list query, index migration, and list correctness test.

## What I changed or rejected

- Rejected paginating `GET /requests` for this task. The UI already slices to 25 rows; the bug was N+1 note loading, and the list contract should stay the same.

## Trade-offs

Kept the full-list payload ( ~1200 rows ) and fixed note aggregation in SQL instead.

## Team workflow (optional stretch)

If relevant: how you would set standards for AI-assisted development on a team.

## Team workflow (optional stretch)

If relevant: how you would set standards for AI-assisted development on a team.
