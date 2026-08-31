# Content inputs required

**Internal. Not published, not linked from the site.**

Everything below was removed from the live site or left unbuilt because it could
not be stated truthfully from what is in this repository. Nothing on this list
has been invented to fill a gap — where a fact was missing, the honest version
shipped and the gap was recorded here.

Each item says what is needed, why it is blocked, and what changes when you
supply it.

---

## 1. Blocking — things that were removed and have no replacement

### Client testimonials

**Removed:** six quotations attributed to Anita Rao (Rao Textiles), Devraj Mehta
(Mehta Hardware), Farah Sheikh (Sheikh Pharmacy), Gopal Nair (Nair Logistics),
Meera Krishnan (Krishnan Foods) and Suresh Pillai (Pillai Auto Works). None of
these people exist. The section's own lede told readers they were samples.

**Needed for each real one:** the person's name and role, their company name,
the quotation in their own words, and **written permission to publish all
three**. A photograph is optional — if you have none we will set a brand
monogram rather than a stock face.

**Until then:** the section publishes how the work runs instead. That is honest
and it is working, so there is no rush to fill it badly.

### Client case studies

**Removed:** four, with quantified outcomes — "+45% faster dispatch speed",
"-80% manual bookkeeping overhead", "14-day reduction in DSO", "Doubled daily
completed job capacity", "4-hour reports replaced by sub-second metrics" — plus
four dashboard mockups carrying an invented brand and an invented user.

**Needed for one real one:** the client's name and permission, what their
workflow looked like beforehand, what was built, how long it took, and any
outcome figure **they have approved in writing**. One real case study is worth
more than four invented ones, and it is what this section is shaped for.

### Client logos

**Removed:** six "Client logo" placeholder chips that were rendering on the
homepage.

**Needed:** the logo files, and permission from each client to display them.
Permission is not implied by having done the work.

### Product screenshots

**Needed:** real screens from something you have actually shipped, captured at a
size where the labels are readable. Real data can be blurred or substituted, but
the interface itself has to be real.

**Why it matters:** this is the single biggest credibility gap left. The site
currently describes what gets built without showing any of it.

---

## 2. Blocking — facts the code needs

### Contact details

- **`hello@potentiaa.com`** — is this monitored? It is now published in the
  footer, on `/contact`, on both legal pages, and is the fallback the contact
  form points at.
- **WhatsApp `+91 82678 39736`** — confirm this is the right public number.
- **Instagram / LinkedIn** — the footer previously linked to `instagram.com`,
  the service's homepage rather than a Potentiaa profile. Social links now
  render only when a real URL is set in `lib/site.ts` → `contact`. Supply real
  ones or leave them blank; blank is fine.

### Legal and company identity

Needed for `/privacy` and `/terms`, both of which currently carry a visible
"draft pending review" notice:

- registered entity name and address
- jurisdiction / governing law
- how long enquiry data is kept
- any processor used to deliver form submissions (see §3)

**Do not remove the review notices** until someone qualified has read the pages.

### Security and support facts

There is no `/security` page yet, and there should not be one until these are
answered. Every item is a claim a buyer may rely on:

- where data is hosted, and in which region
- encryption in transit and at rest
- backup frequency and recovery process
- who on your side can access client data
- support channel and hours
- what happens in an incident
- whether clients can export their data, and in what format

### Commercial model

- Is there a price range you are willing to publish, even a broad one?
- Is the engagement audit → build → subscription, audit → build → maintenance,
  or something else?
- Typical implementation timeline, if you have enough delivered work to know it.

### Industries

The site deliberately does not claim vertical expertise. If you have genuinely
delivered in specific sectors, say which — that unlocks honest industry pages.
If not, we keep describing the operational characteristics instead, which is
working.

---

## 3. Configuration — not content, but needed before launch

### Contact form delivery

The form has no provider configured. Until one is, it degrades honestly: it
tells the reader no backend is connected and opens a prefilled mail draft.

Set `CONTACT_PROVIDER` in the environment to switch it on — see `.env.example`
for the variables each option needs. Either a transactional email service or a
generic webhook works; the code does not care which.

### Analytics

There is none, and no cookie banner, because there is nothing to consent to.
That is a defensible position. If you want analytics, say so — it changes the
privacy policy, and it may introduce a consent requirement.

---

## 4. Decisions for you, not blockers

### The Zeal mascot

`components/ZealIdle.tsx` and `components/ZealExplainer.tsx` are complete,
working, and **not mounted anywhere** — along with roughly 40MB of generated
mascot artwork in `public/assets/mascot/`. They were deliberate work, so they
have not been deleted.

Either reinstate them or let us remove them and the artwork. Right now they are
shipping weight for something no visitor sees.

### `/studio`

The internal frame-baking tool now returns 404 outside development. If you want
it reachable in production, that needs a real access control, not the absence of
one.

---

## 5. What was verified as fine — no action needed

Stated so nobody re-audits them:

- **No invented awards, certifications, uptime figures, customer counts or
  years-of-experience claims** exist anywhere in the codebase. An external audit
  implied these; they were searched for and are not there.
- **The API routes are not an exposed write surface.** Both are `NODE_ENV`
  guarded as their first statement.
- **No trackers, cookies, localStorage or third-party requests.** Verified by
  search before the privacy policy was written, which is why it is short.
