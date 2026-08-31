/**
 * Site content.
 *
 * Copy follows design.md 2 (Voice & content): direct, practical, owner-to-owner;
 * talks about time and money; second person for the reader, "we" for Potentiaa;
 * sentence case everywhere; no emoji; no hype.
 *
 * THE RULE THIS FILE IS HELD TO: nothing here may claim something that is not
 * true. No invented client, no invented metric, no invented quotation, no
 * capability the business does not have.
 *
 * That rule was stated at the top of this file and then broken inside it. The
 * header used to end "No metrics, client names or testimonials are invented
 * anywhere in this file" while `testimonials` below carried six fabricated
 * people with names, businesses and quantified outcomes - and the section's own
 * lede told the reader they were samples. `trustSlots` published six "Client
 * logo" placeholders on the homepage. Both are gone.
 *
 * If something cannot be said truthfully, it does not go here. Missing facts
 * belong in CONTENT_INPUTS_REQUIRED.md, which is not published.
 */

/**
 * The page's central claim, kept in one place.
 *
 * It used to be said twice - the flow section shows the beat, and the old
 * `helping` section retold it in prose - which is why it is a const rather than
 * a string literal. `helping` has since been replaced by `method`, so this now
 * has a single caller. It stays named because the line is the thesis the whole
 * page argues, and a future second use must not reword it independently.
 */
const LIVES_IN_YOUR_HEAD = "It all works. It just lives in your head.";

export const site = {
  name: "Potentiaa",
  tagline: "Unlock. Transform. Grow.",

  /**
   * Every contact channel the site publishes, in one place.
   *
   * `whatsapp` used to be "" here while a hardcoded +91 82678 39736 was
   * rendered in the footer, so the data layer said there was no number and the
   * page showed one. Whatever is true, it is true in one place now.
   *
   * `instagram` is deliberately empty. The footer linked to instagram.com - the
   * service's homepage, not a Potentiaa profile - which is worse than no link:
   * it looks like a social presence and delivers a stranger's feed. The footer
   * renders this row only when the value is non-empty.
   *
   * TODO(owner): confirm `email` is monitored, confirm the WhatsApp number is
   * the right public one, and supply real social URLs or leave them blank.
   * See CONTENT_INPUTS_REQUIRED.md.
   */
  contact: {
    email: "hello@potentiaa.com",
    whatsapp: "918267839736",
    whatsappDisplay: "+91 82678 39736",
    instagram: "",
    linkedin: "",
  },

  /**
   * THE HERO LEADS WITH THE CATEGORY NOW, not with the insight.
   *
   * It used to open on "Your business already has a system. It just isn't
   * connected." That is the best line on the site and it has not been thrown
   * away - it moves to `support` below, where it does the job it is actually
   * good at: naming the reader's problem once they know who is talking.
   *
   * What it could not do was answer "what is this company". A visitor arriving
   * cold could not tell whether Potentiaa sells software they log into, a team
   * that builds software, or consulting - the title tag said billing and
   * inventory, the offerings said custom internal tools, the footer added
   * websites and mobile apps. The eyebrow and H1 below settle that in the first
   * two lines a reader sees.
   *
   * `assurances` are capability statements, not outcomes, and each one has to
   * be true of the actual offer. No metric, no percentage, no promise of a
   * result. If one of these stops being true, delete it rather than soften it.
   */
  hero: {
    eyebrow: "Operational software for growing businesses",
    /* Two lines by design at desktop widths; the break is not load-bearing, so
       this is a single string and the type scale is free to re-wrap it. */
    title: "Run your business from one connected system.",
    body: "Potentiaa builds tailored billing, inventory, workflow and management software that replaces scattered registers, spreadsheets and WhatsApp handoffs.",
    support: "Your business already has a system. It just isn't connected.",
    primary: "Book a workflow audit",
    secondary: "See how it works",
    assurances: [
      "Built around your workflow",
      "Works on phone and desktop",
      "Implementation and ongoing support",
    ],
  },

  /**
   * The flow cards - the hands one job passes through in a business that has
   * no system joining them up.
   *
   * ORDER IS MEANING, not decoration. These are read as a sequence: the
   * enquiry enters at `Customer` and the answer is wanted back at `Owner`,
   * and the whole point of the section is that today it travels that far by
   * hand. The cards are tinted along the brand ramp by their index, so first
   * is deep blue and last is coral - see lib/brandGradient sampleGradientCss,
   * which is the same ramp the particles themselves are coloured from.
   *
   * `note` is set in the mono face deliberately: it is the artefact the step
   * leaves behind (a line in a register, a message, a request), not prose.
   */
  flow: [
    { title: "Customer", note: "enquiry" },
    { title: "Reception", note: "writes it down" },
    { title: "Staff", note: "does the work" },
    { title: "Records", note: "register updated" },
    { title: "Accounts", note: "asks again" },
    { title: "Owner", note: "wants a report" },
  ],

  /** The section the flow cards settle into as the hero scrolls away. */
  flowSection: {
    eyebrow: "Where the time goes",
    title: LIVES_IN_YOUR_HEAD,
    body: "One enquiry, six pairs of hands, and nothing between them but memory. Every step here is someone doing their job properly - the cost is in the handover, not the work.",
  },

  intro: {
    eyebrow: "Operational Bottlenecks",
    title: "If your business works like this, we should talk.",
    punchline: "These aren't software problems. They're workflow problems.",
    problems: [
      {
        index: "01",
        quote: "“We already have software. People still use WhatsApp.”",
        diagnosis: "Different information lives in different places, so employees keep switching between them.",
      },
      {
        index: "02",
        quote: "“The owner has to call someone to know what is happening.”",
        diagnosis: "There is no simple place to see the current state of the business.",
      },
      {
        index: "03",
        quote: "“We write it down first and enter it into a computer later.”",
        diagnosis: "The same information gets recorded more than once.",
      },
      {
        index: "04",
        quote: "“If one person is absent, nobody knows where things are.”",
        diagnosis: "Important knowledge lives with individuals rather than inside the business.",
      },
      {
        index: "05",
        quote: "“We have records, but getting a useful report takes hours.”",
        diagnosis: "Information exists, but isn’t easily connected or accessible.",
      },
      {
        index: "06",
        quote: "“Everyone has their own way of doing things.”",
        diagnosis: "The business works because experienced employees know what to do – not because the process is clearly connected.",
      },
    ],
  },

  /**
   * Two answers to the same question, behind one switch.
   *
   * "What we build" is the capability list; "Who we help" is the same offer read
   * from the reader's side of the table. They are tabs rather than two sections
   * because an owner arrives as one or the other - either they know the piece
   * they are missing, or they know the business they run - and making them
   * scroll past the half that is not about them is what the switch avoids.
   *
   * Both panels carry SIX items on purpose: the grid is 3x2 at desktop and the
   * two panels have to be the same height, or switching tabs jumps the page.
   */
  work: {
    /**
     * ONE HEADING FOR BOTH PANELS. It used to retitle itself to whichever tab
     * was selected, which made the tab press look like it had rewritten the
     * section rather than filtered it - and left the reader with no fixed name
     * for the thing they were looking at. "Our offerings" is what both lists
     * are; the tabs say which cut of it is on screen.
     */
    title: "Our Offerings",
    tabs: [
      {
        id: "build",
        label: "What We Build",
        lede: "We don't sell a fixed list of software products. We build the pieces your business actually needs.",
        items: [
          {
            icon: "network" as const,
            title: "Connected Operations",
            body: "Connect the different people, processes and records involved in getting work done.",
          },
          {
            icon: "database" as const,
            title: "Digital Records",
            body: "Replace paper registers and scattered files with structured records that are easier to update, find and use.",
          },
          {
            icon: "wrench" as const,
            title: "Internal Tools",
            body: "Build simple applications for the work that existing software doesn't handle well.",
          },
          {
            icon: "cycle" as const,
            title: "Workflow Automation",
            body: "Remove repetitive steps such as copying information, sending routine updates, and chasing the same approval twice.",
          },
          {
            icon: "chart" as const,
            title: "Management Visibility",
            body: "Give owners and managers a clear view of what is happening without asking three people for an update.",
          },
          {
            icon: "link" as const,
            title: "System Integration",
            body: "Connect the tools you already use so information doesn't have to be moved by hand between them.",
          },
        ],
      },
      {
        id: "help",
        label: "Who We Help",
        lede: "Businesses that already work, run by people who are tired of holding the whole thing together by hand.",
        items: [
          {
            icon: "pulse" as const,
            title: "Clinics",
            body: "Reception, doctors, pharmacy, laboratory, billing and management often operate separately.",
          },
          {
            icon: "package" as const,
            title: "Distributors & Traders",
            body: "Orders, inventory, dispatch, payments and accounts depend on information moving between people.",
          },
          {
            icon: "headset" as const,
            title: "Service Businesses",
            body: "Customer requests, staff assignments, work completion, billing and follow-ups often happen through a mixture of calls, messages and records.",
          },
          {
            icon: "factory" as const,
            title: "Manufacturers",
            body: "Production, inventory, procurement, quality checks and accounts need to stay in sync.",
          },
          {
            icon: "graduation" as const,
            title: "Educational & Training Organisations",
            body: "Admissions, student records, attendance, assessments, fees and communication often live in separate systems.",
          },
          {
            icon: "bell" as const,
            title: "Hospitality & Event Businesses",
            body: "Bookings, staff, inventory, vendors, payments and execution require constant coordination.",
          },
        ],
      },
    ],
  },

  /**
   * The method, as six numbered steps.
   *
   * TWO KINDS OF STEP, and the difference is deliberate rather than an
   * inconsistency to tidy up. The first three are what we do TO understand the
   * business, and each one opens to show its own working - the questions asked,
   * the chain drawn, the shortlist of what might change. Those lists are long
   * and would bury the sequence if they were always on screen, so they sit
   * behind "What that involves" and the reader chooses.
   *
   * The last three are what we do WITH the business, and each is a single
   * paragraph that is short enough to simply read. Putting those behind a
   * disclosure too would be uniformity for its own sake: it would hide three
   * sentences and cost a click to recover them.
   *
   * `accent` marks the last step coral rather than blue - the same ramp the
   * flow cards and the particles run, where blue is where the work starts and
   * coral is where it ends up. Improve is not a seventh thing after the six; it
   * is the point the sequence arrives at, and the colour says so.
   */
  method: {
    eyebrow: "Method",
    title: "How we work",
    chain: ["Understand", "Map", "Identify", "Build", "Implement", "Improve"],
    steps: [
      {
        n: "01",
        label: "Understand",
        title: "We learn how your business actually works.",
        detail: {
          lead: "We talk to the people involved in the day-to-day operation. We understand:",
          chips: [
            "how work enters the business",
            "who handles it",
            "what gets recorded",
            "where information goes",
            "what people have to do manually",
            "where approvals happen",
            "where information gets lost",
            "what currently takes too much time",
          ],
          close: "We don't assume. We observe.",
        },
      },
      {
        n: "02",
        label: "Map",
        title: "We map the movement of work and information.",
        detail: {
          lead: "We turn your existing process into something we can see clearly. For example:",
          /* The same journey the flow section animates - see `flow` above. It is
             one claim told twice on purpose: shown there, named here. */
          flow: [
            "Customer request",
            "Reception",
            "Staff assignment",
            "Work completed",
            "Record updated",
            "Payment",
            "Accounts",
            "Owner report",
          ],
          close:
            "Then we identify the gaps. Where does information disappear? Where is it entered twice? Where does someone have to manually tell someone else? Where does the business depend on one person remembering?",
        },
      },
      {
        n: "03",
        label: "Identify",
        title: "We find the work that shouldn't require so much work.",
        detail: {
          lead: "Not every problem needs software. We prioritise the areas where a better system can create a meaningful difference. That might mean:",
          chips: [
            "removing repeated data entry",
            "automatically sharing information between teams",
            "replacing paper-based records",
            "creating a central record",
            "automating routine notifications",
            "simplifying approvals",
            "creating management reports",
            "connecting existing software",
            "creating a custom internal application",
          ],
        },
      },
      {
        n: "04",
        label: "Build",
        title: "We build around your business.",
        body: "The solution is designed around your actual workflow. Not around a generic template. Not around what another business does. And not around what happens to be fashionable in technology.",
      },
      {
        n: "05",
        label: "Implement",
        title: "We introduce it without disrupting the business.",
        body: "People don't need to become technology experts to use the system. We work with the people who will actually use it, help them adopt the new workflow, and refine the system based on what happens in practice.",
      },
      {
        n: "06",
        label: "Improve",
        title: "The first version isn't the finish line.",
        body: "Once the system is being used, we can see where further improvements are possible. As your business changes, the system can change with it.",
        accent: true,
      },
    ],
  },

  /**
   * WHAT REPLACED THE TESTIMONIALS.
   *
   * This block used to hold six quotations attributed to six named people at six
   * named businesses - Anita Rao of Rao Textiles, Devraj Mehta of Mehta
   * Hardware, four more - with quantified outcomes attached: "three days a month
   * I got back", "it was live in six weeks", "paid for itself twice". None of
   * those people exist. The comment above them said so in the source, and the
   * section's own lede said so to the reader, in production: "These are samples
   * until the real ones are signed off."
   *
   * A testimonial is a factual claim that a named human said a thing. Six
   * invented ones, on a site asking businesses to trust it with their
   * operational data, was the most damaging thing on this page - and printing an
   * admission beside them did not make it honest. It made it worse: it told
   * every reader that the proof on this site is decorative.
   *
   * They are NOT replaced with empty placeholder cards. A row of dashed slots
   * advertises the absence more loudly than the absence itself does.
   *
   * They are replaced with something true. Nothing below claims a result,
   * because results are not ours to promise. Every line describes how the work
   * is done - which is verifiable by anyone who engages us, and is the one form
   * of proof a young company actually owns.
   *
   * When real, written, approved quotations exist, they belong in a section of
   * their own, with real names and real permission. Not here, and not before.
   * See CONTENT_INPUTS_REQUIRED.md.
   */
  practice: {
    eyebrow: "How we work with you",
    title: "What you actually get, start to finish.",
    lede: "We do not have client stories we are able to name yet. So here is the part we can be precise about: how the work runs, and what lands on your side of it.",
    items: [
      {
        title: "A workflow map before a quote",
        body: "We sit with the people who do the job and follow one order end to end - who touches it, what each person writes down, where it waits. You keep that map whether or not you hire us.",
      },
      {
        title: "The smallest system that clears the bottleneck",
        body: "Not a platform. We scope the one connection costing you the most and build that, so the first version is small enough to genuinely go live and be judged.",
      },
      {
        title: "Built around your vocabulary",
        body: "Your forms, your terms, your steps. Staff should recognise the screens as their own process - software that demands a new vocabulary gets worked around rather than used.",
      },
      {
        title: "Your data stays yours",
        body: "Records are exportable in a standard format from the first day. If you stop working with us, you leave with everything you put in.",
      },
      {
        title: "We are there when it goes live",
        body: "Launch is staged, not flipped. We train the people who will use it daily and stay close through the first cycles, which is when the real gaps surface.",
      },
      {
        title: "It changes as the business changes",
        body: "Operations move. We keep the system in step rather than handing over a build and disappearing.",
      },
    ],
  },

  /**
   * WHAT REPLACED THE CASE STUDIES.
   *
   * components/sections/OurWork.tsx held four of them, hardcoded outside this
   * file so they escaped the discipline the header states: "NexLogix Warehouse
   * & Dispatch Hub", "ReconcileHub Multi-tier Billing Engine", "FieldOps Pro",
   * "Strata Executive Intelligence Portal" - with quantified outcomes attached
   * (+45% faster dispatch, -80% bookkeeping overhead, doubled job capacity,
   * 4-hour reports replaced by sub-second metrics), a "GST Compliant" claim, and
   * four rendered dashboard mockups carrying an invented brand, an invented user
   * named "Alek P.", and European dispatch routes on a site selling to Indian
   * businesses.
   *
   * The section framed all of it as delivered work: eyebrow "Case Studies &
   * Systems", lede "systems we have engineered". Nothing anywhere marked it as
   * illustrative.
   *
   * WHY ONE EXAMPLE AND NOT FOUR. Four honest capability blurbs would have
   * restated the Offerings section directly above, which already lists what gets
   * built. What that section cannot do is show the shape of the work, and that
   * is what this does: one order followed end to end, the same six hands the
   * flow section names, before and after.
   *
   * IT IS LABELLED, prominently and in the markup, not in a footnote. An
   * illustrative example presented without that label is a case study, whatever
   * the intent.
   *
   * When a real client agrees to be named, this section is where their story
   * goes - with their name, their numbers and their permission. See
   * CONTENT_INPUTS_REQUIRED.md.
   */
  example: {
    eyebrow: "Illustrative example",
    title: "How a disconnected workflow becomes one system.",
    label: "Illustrative example - not a client case study",
    lede: "The same enquiry, followed through the same six pairs of hands, before and after. This is the shape of the work rather than an account of a particular client.",
    before: {
      heading: "Today",
      steps: [
        "The enquiry arrives on WhatsApp and is written into a register.",
        "Someone checks stock by walking to the shelf, or by calling whoever knows.",
        "The job is done and noted on paper, to be entered on a computer later.",
        "Accounts asks for the same details again at the end of the week.",
        "The owner phones three people to find out where anything stands.",
      ],
    },
    after: {
      heading: "With one connected system",
      steps: [
        "The enquiry is recorded once, by whoever takes it, on a phone.",
        "Stock is checked against the same record the counter and store share.",
        "Completing the job updates the record - there is no later re-entry.",
        "Billing reads what was already entered instead of asking again.",
        "The owner sees the current state without phoning anyone.",
      ],
    },
    note: "Nothing above is a promise of a result. What it describes is how the pieces connect - what that is worth in your business is exactly what a workflow audit is for.",
  },

  cta: {
    title: "Tell us where the time goes.",
    body: "One call, no deck. We will tell you honestly whether software is worth it for you.",
  },

  /* Drives both the header and the mobile wheel - see components/MobileNav,
     which prepends Home and appends the CTA. An entry here must point at a
     section that exists, or the anchor scrolls nowhere.

     THAT RULE WAS BEING BROKEN BY TWO OF THREE ENTRIES. "What we build" pointed
     at #work while the section renders id="offerings", and "How it works"
     pointed at #process - a section that is not mounted on this page at all, so
     no id existed to find. Both failed silently: SmoothScroll's handler returns
     before preventDefault when querySelector finds nothing, so the click fell
     through to native behaviour, the URL gained a hash, and the page did not
     move.

     The third entry now points at #projects, which is a real section that had
     no nav entry at all - so fixing the dead link also surfaces something that
     was unreachable from the header. */
  nav: [
    { label: "What we build", href: "#offerings" },
    { label: "How we work", href: "#method" },
    { label: "Our work", href: "#projects" },
  ],

  /**
   * The footer's link columns.
   *
   * These used to be nine <a> elements pointing at #work - one dead anchor,
   * nine times, under two headings that named services with no destination
   * between them. Nine links to one place is not navigation; it is the
   * appearance of navigation.
   *
   * So the columns are honest about what exists: a section link where there is
   * a section, a route where there is a route, and nothing where there is
   * neither. Per-service pages are not invented here - when they exist, they go
   * in this list and not before.
   */
  footerNav: [
    {
      heading: "Explore",
      links: [
        { label: "What we build", href: "#offerings" },
        { label: "How we work", href: "#method" },
        { label: "Our work", href: "#projects" },
        { label: "What owners say", href: "#testimonials" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "Contact", href: "/contact" },
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
      ],
    },
  ],
};

export type Site = typeof site;
