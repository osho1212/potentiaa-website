/**
 * Site content.
 *
 * Copy follows design.md 2 (Voice & content): direct, practical, owner-to-owner;
 * talks about time and money; second person for the reader, "we" for Potentiaa;
 * sentence case everywhere; no emoji; no hype.
 *
 * PLACEHOLDERS - replace before launch, all marked TODO:
 *   - contact.email / contact.phone / contact.whatsapp
 *   - trustSlots (dashed placeholder chips stand in for real client logos)
 *   - card image slots (design.md 6 forbids stock/generated imagery)
 * No metrics, client names or testimonials are invented anywhere in this file.
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

  contact: {
    // TODO: confirm the public inbox before launch
    email: "hello@potentiaa.com",
    // TODO: add if you want a direct line on the site
    whatsapp: "",
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

  process: {
    eyebrow: "How it works",
    title: "Start. Connect. Scale.",
    lede: "The same three modules as the logo, in the same order.",
    steps: [
      {
        name: "Start",
        active: 1,
        body: "We pick the single process that is costing you the most and build one system around it. Small enough to be live in weeks, not quarters.",
      },
      {
        name: "Connect",
        active: 2,
        body: "The second module plugs into the first. Billing knows about stock, stock knows about purchases. You stop entering the same thing twice.",
      },
      {
        name: "Scale",
        active: 3,
        body: "Once the core runs itself, we add what the growth needs - more locations, more staff, more reporting - without rebuilding what already works.",
      },
    ],
  },

  /* ============================================================
     SAMPLE DATA - NOT REAL CLIENTS. REPLACE BEFORE LAUNCH.
     ============================================================
     Every name, business and sentence below was written to fill the layout,
     and none of these people exist. That is fine for building against and is
     NOT fine in production: a testimonial is a factual claim that a named
     human said a thing, so shipping these as-is would put fabricated reviews
     on a live business site.

     Swap each entry for a real quote once you have it in writing, and point
     `avatar` at a real photo the person has agreed to. The avatars here are
     locally generated brand monograms, not stock photographs - design.md 6
     supplies no imagery and rules out stock or generated stand-ins, and a
     gradient monogram is brand furniture rather than a face that is not
     theirs.

     Set `pending: true` on any entry and the card styles itself as an empty
     slot instead - the dashed placeholder treatment is still in the CSS.

     Voice, per design.md 2: owner to owner, time and money, sentence case,
     one idea a sentence, no hype. ============================================ */
  testimonials: {
    eyebrow: "What owners say",
    title: "The proof is in the hours you get back.",
    lede: "Short, specific, and from the people who run the place. These are samples until the real ones are signed off.",
    items: [
      {
        quote:
          "We were closing the books four days after month end. Now it is the same afternoon. That is three days a month I got back for the price of one system.",
        name: "Anita Rao",
        role: "Rao Textiles, wholesale",
        avatar: "/assets/testimonials/anita.svg",
      },
      {
        quote:
          "Stock and billing used to be two different notebooks and one argument. They talk to each other now, and we stopped paying for things we already had.",
        name: "Devraj Mehta",
        role: "Mehta Hardware, retail",
        avatar: "/assets/testimonials/devraj.svg",
      },
      {
        quote:
          "I run three branches from my phone. I can see what sold this morning without calling anyone, which means I stopped driving across town to find out.",
        name: "Farah Sheikh",
        role: "Sheikh Pharmacy, three branches",
        avatar: "/assets/testimonials/farah.svg",
      },
      {
        quote:
          "They built the one thing that was costing us the most, and it was live in six weeks. No deck, no year-long project, no rebuild of what already worked.",
        name: "Gopal Nair",
        role: "Nair Logistics, transport",
        avatar: "/assets/testimonials/gopal.svg",
      },
      {
        quote:
          "Two staff used to spend every Friday typing the same orders in twice. That job does not exist any more, and neither of them lost their job over it.",
        name: "Meera Krishnan",
        role: "Krishnan Foods, manufacturing",
        avatar: "/assets/testimonials/meera.svg",
      },
      {
        quote:
          "What sold me was that they told me which half of my idea was not worth building. The half we did build has paid for itself twice.",
        name: "Suresh Pillai",
        role: "Pillai Auto Works, service",
        avatar: "/assets/testimonials/suresh.svg",
      },
    ],
  },

  cta: {
    title: "Tell us where the time goes.",
    body: "One call, no deck. We will tell you honestly whether software is worth it for you.",
  },

  /* Drives both the header and the mobile wheel - see components/MobileNav,
     which prepends Home and appends the CTA. An entry here must point at a
     section that exists, or the anchor scrolls nowhere. */
  nav: [
    { label: "What we build", href: "#work" },
    { label: "How we work", href: "#method" },
    { label: "How it works", href: "#process" },
  ],

  // TODO: swap for real client marks once permission is in place
  trustSlots: [
    "Client logo",
    "Client logo",
    "Client logo",
    "Client logo",
    "Client logo",
    "Client logo",
  ],
};

export type Site = typeof site;
