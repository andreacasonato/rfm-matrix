# Usability round 1

M5 ends with a first usability round (BUILD_PLAN). This is everything needed to run it: who to
invite, how to set up, what to say, what to measure and what to do with the results. One
session takes about 30 minutes. Fill in one copy of
[session-notes-template.md](session-notes-template.md) per participant.

## What this round must answer

| Question | Target | Source |
| --- | --- | --- |
| Does example data reach the grid quickly? | Under 1 minute, unaided | PRD §11 |
| Can a first-time owner get from their export to the grid alone? | Unaided, under 5 minutes | PRD §1, TRD §2 |
| Can they get a segment out for their email tool? | Upload → grid → Export under 5 minutes | PRD §11, S11 |
| Do they understand what a segment means and what to do with it? | Explains one segment in their own words | APP_FLOW "Segment guidance" |
| Can they change a rule and undo it? | Unaided | APP_FLOW journey 3 |
| Can they keep a copy and then remove everything? | Unaided | APP_FLOW journey 5 |

The round passes when at least 4 of 5 participants meet each target. Any task that 2 or more
participants fail is a blocker for M6.

## Participants

- **Five people**, each running a small online shop (Shopify, WooCommerce or similar) with
  repeat buyers. Not developers. Nobody who has seen the app before.
- Ask in advance: their platform, roughly how many customers, which email tool they use, and
  whether they have ever exported orders. Note it on their sheet; do not choose them by it.
- They are thanked for their time. Nothing is collected beyond the session notes.

## Data and privacy

The app's own rule applies to the round: no real merchant data in the repository or in chat
(AGENTS.md).

- Every task uses **synthetic files**. Nobody needs to open their own shop's data.
- If a participant wants to try their own export afterwards, they do it on their own computer,
  after the timed tasks, with screen sharing off. Notes record only what they say, never
  customer names, emails or amounts.
- No video or screen recording. Notes by hand or in a text file.
- Ask for verbal consent to take notes at the start, and record that you asked.

## Setup (once, 15 minutes)

1. Use the production build, not the dev server: the deployed app, or
   `pnpm build && pnpm --filter @rfm-matrix/app exec vite preview`.
2. Make the "shop export" for task 2, a Shopify-style file of synthetic orders:
   ```sh
   node tools/bench/generate.ts --rows 20000 --seed 11
   cp bench-data/orders-20000.csv ~/Desktop/shop-orders-export.csv
   ```
   Every name, email and address in it is made up (`@example.test`).
3. Before **each** session, open a **new browser profile** (or a private window in a browser
   that allows IndexedDB there), so the participant sees the first-run questions and no earlier
   projects. Put `shop-orders-export.csv` where they can find it, such as the Desktop.
4. Have a stopwatch ready, and one printed or open copy of the notes sheet.

For a remote session, the participant shares their screen and opens the app on their own
computer; send them the synthetic file before the session.

## Script

Read the parts in quotes; adjust the wording so it sounds like you.

### Welcome (3 minutes)

> "Thanks for helping. We're testing the app, not you: if something is hard, that's the app's
> fault and exactly what we need to find. Please think aloud: say what you're looking at, what
> you expect and what surprises you. I mostly won't answer questions while you work, because
> I want to see what you'd do alone, but I'll help if you're stuck. Is it OK if I take notes?
> I'm not recording anything."

Warm-up questions:

1. "How do you decide today which customers to email?"
2. "Have you ever exported your orders from your shop? What did you do with the file?"

### Tasks

Read each task aloud, start the stopwatch when you finish reading, and stop it at the end point.
After each task ask: *"On a scale from 1 to 7, how easy was that?"* (1 = very hard, 7 = very
easy).

| # | Read aloud | Ends when | Watch for |
| --- | --- | --- | --- |
| 1 | "You've just found this app. Have a look at what it does, using its example data." | The grid is on screen | Do they find **Try sample data**? Do they read the tiles or the heatmap first? |
| 2 | "Now use this file, `shop-orders-export.csv`, as if it were your own shop's order export. Get to the point where you can see your customers in segments." | The grid is on screen | The three first-run questions; Map columns; anything on Clean and settings they hesitate over; whether they read the excluded counts |
| 3 | "Which customers would you try to win back this week? Get them into a file you could upload to your email tool." | The Export toast appears | Which segment they choose and why; whether they read the suggested action; whether the file name and row count make sense to them |
| 4 | "Pick one segment and tell me, in your own words, who is in it and what you'd do about them." | They answer | Whether they open the segment detail or **How scores work**; misreadings of R, F and M |
| 5 | "A colleague thinks customers who scored R3 and F3 should count as Loyal customers. Make the app do that. Then change your mind and put it back." | The grid shows the original segment again | Finding **Edit segment rules**; the Undo bar; Reset to default; whether they notice the grid updated |
| 6 | "You'd like to look at this again next month, but you're on a shared computer. Keep a copy for yourself, then make sure nothing about these customers stays on this computer." | **Delete all data** confirmed | Getting from the grid back to Start (**Start over**: do they fear it throws work away?), then Project and data; **Save project file**; typing DELETE |

Time for task 2 + task 3 together is the golden-path time (upload → grid → Export).

### When to step in

- Stay silent while they make progress, even slowly.
- After **3 minutes stuck** on the same step, or if they ask twice, give the smallest hint that
  unblocks them ("What do you think that button does?", then "Try the button that says…"). Mark
  the task **with help** and note the hint.
- If they hit a bug or an error message, let them read it first, then note the exact message and
  open **Diagnostics** with them; paste its report into the notes. It holds no customer data.

### Debrief (5 minutes)

1. "What would you do with what you exported, tomorrow?"
2. "Was anything confusing, or worded differently from what you expected?"
3. "At any point, did you worry about where your customers' data was going?"
4. "What did you expect to find that wasn't there?"
5. "Would you use this again next month? What would make you?"

## After all sessions

1. Fill in the results table below from the five notes sheets.
2. List every problem once, with how many participants hit it, and a severity:
   - **Blocker:** stopped someone, or made them do something wrong, such as exporting the wrong
     segment, without noticing.
   - **Slows:** they got through, but with a hint, a wrong turn or over a minute of hesitation.
   - **Polish:** wording, layout or a wish that did not change the outcome.
3. Blockers become GitHub issues to fix before M6. Slows become issues. Polish and new ideas go
   to `backlog.md` (AGENTS.md: ideas are recorded, not built).
4. If the 5-minute target is missed, note which step took the time.

## Results

Fill in after the round. "Unaided" counts only tasks completed without a hint.

| | P1 | P2 | P3 | P4 | P5 | Met target |
| --- | --- | --- | --- | --- | --- | --- |
| 1. Sample to grid (time, unaided?) | | | | | | __ / 5 under 1 min |
| 2. Export to grid (time, unaided?) | | | | | | __ / 5 unaided |
| 3. Grid to Export (time, unaided?) | | | | | | |
| Golden path, tasks 2 + 3 | | | | | | __ / 5 under 5 min |
| 4. Explains a segment (yes / partly / no) | | | | | | __ / 5 |
| 5. Rule change and undo (unaided?) | | | | | | __ / 5 |
| 6. Save project file, then Delete all data (unaided?) | | | | | | __ / 5 |
| Median ease, tasks 1–6 (1–7) | | | | | | |

### Problems found

| # | Problem | Screen | Participants | Severity | Issue or backlog |
| --- | --- | --- | --- | --- | --- |
| 1 | | | | | |

## Not covered in this round

- **Movement** (journey 4) needs two exports of the same shop a month apart; no synthetic pair
  exists yet. It is in `backlog.md` for round 2.
- Phones: desktop is primary (PRD §4).
