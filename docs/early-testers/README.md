# Early testers (M6)

M6 shares v0.x with 5–10 merchants, triages what they report, and then releases v1.0
(BUILD_PLAN). The app sends nothing anywhere, so what testers tell us is the only usage data
there is (PRD §1, D1). This page has the invite to send, what to ask, and how to triage it.

Start after usability round 1 ([round-1.md](../usability/round-1.md)) has no open blockers, and
after a 0.x release is live ([RELEASE.md](../RELEASE.md)).

## Who to invite

- 5–10 people who run a small online shop with repeat buyers: Shopify, WooCommerce or similar,
  roughly 500 to 50,000 customers (PRD §2). Not the round 1 participants: they have seen the app.
- Include at least two WooCommerce or "other platform" shops, so the non-Shopify presets get
  real use.
- Note each tester's platform, rough customer count and email tool outside the repository, the
  same way as the round 1 notes. Nothing about testers goes into the repository.

## How long

Four weeks, so that a second export a month later can show **Movement**:

| When | Tester does | You do |
| --- | --- | --- |
| Day 0 | Gets the invite | Send it with the app link |
| Week 1 | Runs it on their own export, exports a segment | Check in once: "Did it work? Anything odd?" |
| Week 4 | Adds a new export to the same project, looks at Movement | Send the feedback questions below |
| Week 5 | — | Triage, fix, release the next 0.x |

## The invite

Adjust the wording so it sounds like you.

> **Subject: Would you try a free tool that shows who to email this week?**
>
> Hi [name],
>
> I've built RFM Matrix, a free, open-source app that turns your shop's order export into
> customer segments: your best customers, the ones slipping away, and the ones already lost,
> with a suggested action for each and a CSV you can upload to your email tool.
>
> Your data stays on your computer. The app runs entirely in your browser: there's no server,
> no account and no analytics, and your file is never uploaded anywhere. You can check that in
> the code: https://github.com/andreacasonato/rfm-matrix
>
> Would you try it over the next four weeks?
>
> 1. This week: open https://andreacasonato.github.io/rfm-matrix/, upload your order export,
>    and export a segment you'd actually email. About 15 minutes.
> 2. In about four weeks: export your orders again and add the new file to the same project,
>    to see who moved between segments. About 5 minutes.
> 3. Then answer a few questions by replying to me. About 10 minutes.
>
> If something breaks, the error message has a **Diagnostics** section. Copy it and send it to
> me; it contains no customer data. Please never send me your order file or any customer
> details.
>
> It's an early version, so rough edges are expected and exactly what I need to hear about.
>
> Thanks,
> [your name]

## Feedback questions (week 4)

Send these by email. Testers answer however they like; a GitHub account is optional (the
issue templates are for those who have one).

1. Did you run it on your own export? Which platform did it come from?
2. Roughly how long did it take from opening the app to seeing your segments?
3. Did anything stop you, confuse you, or look wrong? What did you expect instead?
4. Which segment did you export, and what did you do with it? Did you send a campaign?
5. Did the suggested actions make sense for your shop?
6. Did you add a second export and look at Movement? Was it useful?
7. At any point, did you worry about where your customers' data was going?
8. Would you use it again next month? What would make you more likely to?
9. Anything else?

Questions 1 and 4 measure the PRD §1 adoption targets: merchants running it on their own data,
and merchants sending a campaign to an exported segment.

## Privacy

The AGENTS.md rule holds for testers too: no real merchant data in the repository, in issues
or in chat with an AI agent.

- Never ask for, accept or keep a tester's order file or exported segment. If one arrives,
  delete it and tell them you did.
- When you turn a report into an issue, rewrite it with no shop name, customer names, emails or
  amounts. Diagnostics reports are safe to paste as they are.
- If a bug only happens with their file, ask what shape it has (column names, date format, row
  count, platform), and reproduce it with a synthetic file built the same way.

## Triage

After each check-in, and at week 5, list every problem once, with how many testers hit it, and
the same severities as round 1:

- **Blocker:** stopped someone, or gave a wrong result they didn't notice, such as wrong scores,
  a wrong segment or a broken export. A GitHub issue labelled `blocker`, fixed before the next
  release.
- **Slows:** they got through, but with a workaround or confusion. An issue.
- **Polish and new ideas:** `backlog.md` (AGENTS.md: ideas are recorded, not built).

A wrong score or segment is always a blocker, even for one tester: check it against TRD §8 with
a synthetic file of the same shape.

## When v1.0 is ready

Proposed; the maintainer sets the final bar.

- No open issue labelled `blocker`.
- At least 5 testers ran it on their own export, and at least 3 exported a segment.
- Every "slows" issue is fixed, or the maintainer has chosen to leave it for after v1.0.
- The last 0.x release ran for a week with no new blocker.

Then follow [RELEASE.md](../RELEASE.md) with version `1.0.0`.
