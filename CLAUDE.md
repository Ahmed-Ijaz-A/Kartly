# CLAUDE.md — working rules for Kartly

Kartly is a 24-hour build of a general merchandise store, judged on **speed,
product judgement and UX**. These rules exist to protect those three. They
override default behaviour and convenience.

Read alongside [docs/spec.md](docs/spec.md),
[docs/tech-stack.md](docs/tech-stack.md) and [roadmap.md](roadmap.md).

## Process

**One roadmap step at a time. Stop for approval after each.**

- Work the steps in `roadmap.md` in order. Do not start the next step because the current one finished early.
- When a step is done, say what was built, how it was verified, and stop. Do not begin the next step in the same turn.
- Do not implement a later step's work "while in the area". If something is genuinely needed earlier, say so and ask to reorder.
- If a step turns out to be bigger than one sitting, stop and propose splitting it rather than quietly running long.
- If something outside the step is broken, report it — don't silently fix it and don't silently leave it.

**Before finishing any step, run `npm run lint` and `npm run typecheck`.** Both
must pass. Never disable a rule, add `any`, cast away a type or set
`ignoreBuildErrors` to make them pass — fix the actual problem. If a rule is
genuinely wrong, say so and ask.

**Verify before claiming done.** Every roadmap step has a verification line.
Actually perform it. If something was not verified, say that plainly. Never
report a step complete on the assumption it works.

## Money

**All money is integer cents.** Database columns, cart maths, Stripe amounts,
order totals — integers, everywhere.

- Never `float`, never `parseFloat`, never a `numeric`/`money` column.
- Convert to a display string only at the render boundary, in one shared formatter.
- Never recompute a total on the client and send it to the server. The server recomputes from the database cart; a client-supplied amount is untrusted input.

## Security

**Every mutation re-checks ownership server-side.**

- Read the session on the server inside the Server Action or Route Handler. Never trust a user id, cart id or order id supplied by the client as proof of anything.
- Before reading or writing any row that belongs to a user — cart, order, wishlist, review — confirm from the session that it is *this* user's row. Filter by the session user id in the query itself.
- A resource belonging to another user returns 404. Never leak existence through a different error.
- Validate and parse all input at the server boundary. Treat `searchParams`, form data and webhook bodies as hostile.
- Verify the Stripe webhook signature. Order creation is idempotent on the payment intent id, enforced by the unique constraint.

**Never put secrets in prompts, code, logs, comments or commits.**

- Secrets live in `.env.local` (gitignored) and Vercel's environment settings. `.env.example` carries names only, never values.
- Never paste a real key, connection string or session secret into a prompt, a file, a commit message or terminal output.
- Only the Stripe publishable key may be `NEXT_PUBLIC_`. Everything else is server-only.
- Never log a password, token, session cookie or full connection string. Never return a password hash from a query that feeds a response.
- If a secret is ever exposed, say so immediately and treat it as needing rotation.

## Keep it simple

- Build what the current step needs. No abstraction until there is a second real caller.
- No new dependency without saying why it beats a few lines of our own code. Prefer the platform and what is already in the stack.
- Server Components by default; a Client Component only where there is real interactivity.
- URL is the state for search and filters. No client-side filter store.
- Delete dead code rather than commenting it out. No speculative config, no unused flags.
- Match the file layout, naming and patterns already in the repo.
- If a step can be done well in a simpler way than the roadmap implies, say so before building.

## Scope

- `docs/spec.md`'s cut list is the contract. Do not build anything on it without asking first.
- The recon in `/recon` is reference for mechanics and hierarchy. **Kartly is its own brand** — never copy Amazon's logo, colours, wording or page copy.
- Suggesting a scope change is welcome; making one unilaterally is not.

## Communicating

- Report honestly. If tests or checks fail, show the output. If a step was skipped or partly done, say which part and why.
- Flag real problems in one or two sentences, then continue — don't stop the build to debate.
- No invented progress, no placeholder passed off as working, no "should work" where it has not been run.
