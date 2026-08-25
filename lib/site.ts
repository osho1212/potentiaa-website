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
 * Said twice on the page, so it lives in one place.
 *
 * The flow section shows this beat - the six hands a job passes through - and
 * `helping.beats[0]` tells the same beat in prose further down. They are the
 * same claim and must read identically; a const rather than two string
 * literals is what stops one being reworded without the other.
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

  hero: {
    /* The headline breaks across four lines by design - the last two carry the
       gradient, so they are held separately rather than being found by a
       word count at render time. */
    titleLead: ["Your business", "already has a system."],
    titleAccent: ["It just isn't", "connected."],
    primary: "Explore Solutions",
    secondary: "See how it works",
    hint: ["Move your mouse", "to explore"],
  },

  /**
   * The flow cards - the hands one job passes through in a business that has
   * no system joining them up.
   *
   * ORDER IS MEANING, not decoration. These are read as a sequence: the
   * enquiry enters at `Customer` and the answer is wanted back at `Owner`,
   * and the whole point of the section is that today it travels that far by
   * hand. The cards are tinted along the brand ramp by their index, so first
   * is deep blue and last is coral - see lib/heroParticles sampleGradientCss,
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

  work: {
    eyebrow: "What we build",
    title: "Systems that replace the notebook",
    lede: "Every build starts as a conversation about where your time actually goes.",
    items: [
      {
        title: "Billing and inventory software",
        body: "Raise an invoice, cut stock, and see what is running low - from the counter or the road. Built around how you already price and sell.",
        tags: ["Business App", "GST-ready billing", "Stock alerts"],
        slot: "Product shot",
        size: "wide" as const,
      },
      {
        title: "Marketing websites",
        body: "A site that explains what you do and brings in enquiries, instead of sitting there as a digital business card.",
        tags: ["Next.js", "Webflow", "SEO"],
        slot: "Site mockup",
        size: "narrow" as const,
      },
      {
        title: "Management apps",
        body: "Orders, staff, jobs, deliveries. Whatever the moving part is in your business, it gets a screen and a single source of truth.",
        tags: ["Mobile-first", "Roles", "Reporting"],
        slot: "App screens",
        size: "half" as const,
      },
      {
        title: "Consulting and system audits",
        body: "Sometimes you do not need new software. We map what you run today, find what is leaking time, and tell you the cheapest way to fix it.",
        tags: ["Process mapping", "Tooling review", "Roadmap"],
        slot: "Audit board",
        size: "half" as const,
      },
    ],
  },

  /**
   * The one place Zeal is shown helping a PERSON rather than pointing at a menu
   * (bar.md M9). Deliberately NOT a case study: no client name, no quote, no
   * numbers. A named business here would read as a testimonial, and inventing a
   * customer is not something this site gets to do. It is an illustrated
   * sequence of how the work goes, and nothing in the copy claims otherwise.
   *
   * `aside` is Zeal's own line. The Brief critic's point was that his
   * contribution to this site was "exactly zero words", and that a held wrench
   * saying "maintenance" adds nothing the label did not. Each line says the
   * thing the copy leaves out.
   */
  helping: {
    eyebrow: "How this actually goes",
    title: "Someone else's Monday",
    lede: "Not a case study. Just how the work tends to go.",
    beats: [
      {
        scene: "scene-paperwork",
        stage: "Before",
        title: LIVES_IN_YOUR_HEAD,
        body: "Three notebooks, a spreadsheet, and the one person who knows where everything is. Nothing is broken - it simply cannot grow.",
        aside: "Most owners think they need software. Often they need one process fixed.",
      },
      {
        scene: "scene-counter",
        stage: "We build",
        title: "One system, around the thing costing you most.",
        body: "We sit with you, follow the work as you actually do it, and build the smallest thing that removes the worst of it.",
        aside: "If you cannot use it by the end of the week, we built the wrong thing.",
      },
      {
        scene: "scene-running",
        stage: "After",
        title: "You run it. Not us.",
        body: "Billing at the counter, stock on your phone, orders wherever you are. It is your business - we just took the paperwork out of it.",
        aside: "Maintenance is part of the deal. It is not a second invoice.",
      },
    ],
  },

  services: {
    eyebrow: "Services",
    title: "Consult, build, maintain",
    groups: [
      {
        title: "Consulting",
        items: "Process mapping, system audit, tool selection, cost and time analysis, build-or-buy advice",
      },
      {
        title: "Business software",
        items: "Billing, inventory, orders, purchase and vendor tracking, staff and role management, reporting",
      },
      {
        title: "Websites",
        items: "Marketing sites, landing pages, catalogues, enquiry capture, analytics and SEO groundwork",
      },
      {
        title: "Mobile apps",
        items: "Android and iOS management apps, offline-first capture, notifications, on-site and field workflows",
      },
      {
        title: "Maintenance",
        items: "Hosting, backups, monitoring, changes as your business changes, training for new staff",
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

  cta: {
    title: "Tell us where the time goes.",
    body: "One call, no deck. We will tell you honestly whether software is worth it for you.",
  },

  nav: [
    { label: "What we build", href: "#work" },
    { label: "Services", href: "#services" },
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
