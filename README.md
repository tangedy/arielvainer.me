# GERMANY OR BUST

A video-led pixel-art browser game about Ariel Vainer trying to finish an entire
day of procrastinated tasks before his 5 PM flight to Germany.

## Play

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

## Controls

- **M** mute
- **Cooking:** drag pantry items onto cookware, ignite each pot, and lift it in
  the green window; in the steak view, drag and hold the steak on the pan, then
  pull away and release while its sear meter is green
- **Documents:** use the mouse to copy/paste recipients and cycle email pieces
- **Blackjack:** use the mouse, H to hit, and S or Space to stand
- **Sprint:** mash Space to reach the gate before 5 PM

## Test

```bash
npm test
npm run build
```

## Universal leaderboard

The departure board uses Supabase when credentials are present and falls back
to browser-local scores during development.

1. Create a Supabase project.
2. Run `supabase-schema.sql` in its SQL Editor.
3. Copy `.env.example` to `.env`.
4. Add the project URL and publishable/anon key, then restart Vite.
5. Add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` variables to
   the production host.

Leaderboard rank is raw completion time plus 10 seconds per failed email and
20 seconds per cooking, sprint, or casino bailout retry. The included row-level
security and constraints are suitable for a casual friends leaderboard, but a
public browser-submitted board is not cheat-proof.

## Edit the roast

Narrative text, document recipients, and email choices live in `src/copy.js`.
Core testable rules live in `src/gameLogic.js`.
