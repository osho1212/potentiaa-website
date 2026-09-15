/**
 * The builds shown in the Our Work section, and the case study each one opens.
 *
 * DRAFT CONTENT - REVIEW BEFORE THIS GOES LIVE.
 *
 * - Every photo is an Unsplash stock image chosen to suit the story beat, not a
 *   screenshot of what was built; there are none in the repo yet. Swap each
 *   `src` for a capture of the real product (drop them in
 *   public/assets/work/<project-id>/ and reference them as
 *   "/assets/work/<project-id>/<file>"). The illustrations are the site's own
 *   Zeal scenes and can stay.
 * - The story copy (tagline, challenge, approach, shift, captions) is written
 *   from each project's existing description and feature list: it describes the
 *   problems those features exist to solve, not a record of what the client
 *   told us. It deliberately makes no numeric claims and quotes no one. Replace
 *   it with the real story wherever the details differ.
 */

/** An image and what it shows. Used for the hero slideshow and the story. */
export interface ProjectFigure {
  src: string;
  alt: string;
  caption: string;
  /** Illustrations are cut-outs, shown whole rather than cropped. */
  kind?: "photo" | "illustration";
}

export interface ProjectBuildItem {
  title: string;
  detail: string;
  figure: ProjectFigure;
}

/** One step of the site's own method (see the Method section). */
export interface ProjectStage {
  stage: "Understand" | "Map" | "Build" | "Train";
  body: string;
}

export interface ProjectShift {
  before: string;
  after: string;
}

export interface Project {
  id: string;
  title: string;
  /** One line, shown under the carousel. */
  description: string;
  /** The carousel card. */
  image: string;
  imageAlt: string;
  features: string[];
  /** The kind of business, in the case study's eyebrow and facts. */
  industry: string;
  /** The case study's one-line promise, opening the story. */
  tagline: string;
  /** Chapter 1 - the starting point. */
  challenge: {
    title: string;
    body: string;
    /** The specific frictions, one line each. */
    pains: string[];
    figure: ProjectFigure;
  };
  /** Chapter 2 - how it was worked out. */
  approach: ProjectStage[];
  approachFigure: ProjectFigure;
  /** Chapter 3 - what was built, one entry and one image per module. */
  built: ProjectBuildItem[];
  /** Chapter 4 - what changed day to day. */
  shift: ProjectShift[];
  outcomeFigure: ProjectFigure;
  /** The hero slideshow. */
  gallery: ProjectFigure[];
}

const unsplash = (id: string, width = 1600, height = 1000) =>
  `https://images.unsplash.com/photo-${id}?q=80&w=${width}&h=${height}&auto=format&fit=crop`;

/* The site's own illustrations - transparent cut-outs of Zeal, the mascot. */
const SCENE_PAPERWORK = "/assets/mascot/scenes/scene-paperwork.webp";
const SCENE_RUNNING = "/assets/mascot/scenes/scene-running.webp";
const SCENE_COUNTER = "/assets/mascot/scenes/scene-counter.webp";

const PAPERWORK_ALT =
  "Illustration: a worried business owner at a desk stacked with paper invoices, with Zeal the Potentiaa mascot beside him";
const RUNNING_ALT =
  "Illustration: a relaxed business owner checking his phone, with Zeal the Potentiaa mascot beside him";

export const PROJECTS: Project[] = [
  {
    id: "fquad-website",
    title: "FQUAD Website",
    description: "Website, SEO engine, real-time analytics & custom CMS.",
    image: unsplash("1460925895917-afdab827c52f", 1200, 1200),
    imageAlt: "FQUAD Website Analytics & CMS Dashboard",
    features: ["Website", "SEO Engine", "Analytics", "CMS"],
    industry: "Website platform",
    tagline: "A website the team can run themselves, and measure as they go.",
    challenge: {
      title: "A website shouldn't need a developer for every change",
      body: "FQUAD needed more than a brochure site. They wanted to be found in search, to know which pages were actually bringing in enquiries, and to keep their own content current without waiting on someone else to publish it.",
      pains: [
        "Content updates that depend on a developer",
        "No clear view of which pages bring in enquiries",
        "Search visibility left to chance",
      ],
      figure: {
        src: unsplash("1467232004584-a241de8bcf5d"),
        alt: "A developer's desk at night with code on two monitors",
        caption: "Where it started: every change to the site went through a developer's desk.",
      },
    },
    approach: [
      { stage: "Understand", body: "Who FQUAD needs to reach, and how they describe their own services." },
      { stage: "Map", body: "Each page matched to what people search for, and to the enquiry it should lead to." },
      { stage: "Build", body: "The site, SEO engine, analytics and CMS as one system on shared content." },
      { stage: "Train", body: "Publishing pages and reading the dashboard, handed over to the team." },
    ],
    approachFigure: {
      src: unsplash("1522542550221-31fd19575a2d"),
      alt: "Colourful page wireframes sketched on paper",
      caption: "Pages planned around what people search for, before any design.",
    },
    built: [
      {
        title: "Website",
        detail: "A fast, responsive site that presents FQUAD's services clearly on every screen size.",
        figure: {
          src: unsplash("1547658719-da2b51169166"),
          alt: "Landing page designs on a desktop monitor, tablet and phone",
          caption: "The site, laid out to read cleanly on every screen.",
        },
      },
      {
        title: "SEO engine",
        detail: "Page titles, descriptions, sitemaps and structured data generated from the content itself, so new pages are search-ready when they are published.",
        figure: {
          src: unsplash("1543286386-713bdd548da4"),
          alt: "A hand-drawn growth chart on paper beside a ruler and pens",
          caption: "Search structure planned once, then generated for every new page.",
        },
      },
      {
        title: "Real-time analytics",
        detail: "A live view of visitors, traffic sources and enquiries, so the team can see what is working.",
        figure: {
          src: unsplash("1551288049-bebda4e38f71"),
          alt: "Traffic and engagement charts on a tablet screen",
          caption: "Visitors, sources and enquiries, live.",
        },
      },
      {
        title: "Custom CMS",
        detail: "An editor built around FQUAD's own content, for updating pages, posts and media without touching code.",
        figure: {
          src: unsplash("1504868584819-f8e8b4b6d7e3"),
          alt: "A laptop showing a content dashboard",
          caption: "The editor the team publishes from.",
        },
      },
    ],
    shift: [
      { before: "Copy changes queued for a developer", after: "Pages and posts edited directly in the CMS" },
      { before: "Guessing which pages work", after: "Live visitors, sources and enquiries on one dashboard" },
      { before: "SEO handled page by page, if at all", after: "Metadata, sitemaps and structured data generated automatically" },
    ],
    outcomeFigure: {
      src: unsplash("1522071820081-009f0129c71c", 1800, 800),
      alt: "A team working together at laptops around a table",
      caption: "Where it landed: a team that publishes and measures on its own.",
    },
    gallery: [
      {
        src: unsplash("1460925895917-afdab827c52f"),
        alt: "Analytics dashboard open on a laptop",
        caption: "Real-time analytics dashboard",
      },
      {
        src: unsplash("1504868584819-f8e8b4b6d7e3"),
        alt: "A laptop showing a content dashboard",
        caption: "Content management",
      },
      {
        src: unsplash("1547658719-da2b51169166"),
        alt: "Landing page designs on a desktop monitor, tablet and phone",
        caption: "Responsive page layouts",
      },
      {
        src: unsplash("1498050108023-c5249f4df085"),
        alt: "A laptop with code open on a white desk",
        caption: "Site build",
      },
    ],
  },
  {
    id: "raghuvansh-website",
    title: "Raghuvansh Website",
    description: "Luxury brand website, SEO engine, real-time analytics & CMS.",
    image: unsplash("1507238691740-187a5b1d37b8", 1200, 1200),
    imageAlt: "Raghuvansh Luxury Flagship Web Platform",
    features: ["Website", "SEO Engine", "Analytics", "CMS"],
    industry: "Luxury brand",
    tagline: "A flagship site that feels like the brand, and runs like a tool.",
    challenge: {
      title: "A premium brand needs a site that looks the part",
      body: "For a luxury brand, the website is often the first impression, and it has to carry the same care as the product. Raghuvansh also needed that site to be discoverable, measurable, and easy for their own team to keep fresh.",
      pains: [
        "An online presence that has to match the product's quality",
        "Collections and content that should stay in the brand team's hands",
        "Visits and enquiries that need to be measurable",
      ],
      figure: {
        src: unsplash("1432888498266-38ffec3eaf0a"),
        alt: "A designer sketching layouts on paper beside a phone",
        caption: "Where it started: a brand that expects craft in every detail, online too.",
      },
    },
    approach: [
      { stage: "Understand", body: "The brand's tone and imagery, and how its customers expect to be spoken to." },
      { stage: "Map", body: "Page flow paced so the collections lead, with search structure built in from the start." },
      { stage: "Build", body: "A design-led front end on the same SEO, analytics and CMS foundation as our other web builds." },
      { stage: "Train", body: "Collections, pages and media, managed by the brand team." },
    ],
    approachFigure: {
      src: unsplash("1522542550221-31fd19575a2d"),
      alt: "Colourful page wireframes sketched on paper",
      caption: "The page flow, paced so the collections lead.",
    },
    built: [
      {
        title: "Luxury brand website",
        detail: "A design-led site with the pacing, imagery and typography a premium brand calls for.",
        figure: {
          src: unsplash("1507238691740-187a5b1d37b8"),
          alt: "A laptop showing a minimal brand website",
          caption: "The flagship homepage.",
        },
      },
      {
        title: "SEO engine",
        detail: "Search-ready metadata, sitemaps and structured data for every page, generated automatically.",
        figure: {
          src: unsplash("1543286386-713bdd548da4"),
          alt: "A hand-drawn growth chart on paper beside a ruler and pens",
          caption: "Search-ready from the first page published.",
        },
      },
      {
        title: "Real-time analytics",
        detail: "Live visitor and enquiry tracking in one dashboard.",
        figure: {
          src: unsplash("1504868584819-f8e8b4b6d7e3"),
          alt: "A laptop showing a dashboard of charts",
          caption: "Visitor and enquiry tracking in one place.",
        },
      },
      {
        title: "CMS",
        detail: "Collections, pages and media the brand team manages themselves.",
        figure: {
          src: unsplash("1517694712202-14dd9538aa97"),
          alt: "A code editor open on a laptop beside a plant",
          caption: "Collections, pages and media, managed in-house.",
        },
      },
    ],
    shift: [
      { before: "Every update briefed out to someone else", after: "Collections and pages managed in-house" },
      { before: "A brand story told in fragments", after: "One considered flagship experience" },
      { before: "No view of what visitors engage with", after: "Live visitor and enquiry tracking" },
    ],
    outcomeFigure: {
      src: unsplash("1498050108023-c5249f4df085", 1800, 800),
      alt: "A laptop on a bright, uncluttered desk",
      caption: "Where it landed: one considered flagship, kept fresh by the brand team.",
    },
    gallery: [
      {
        src: unsplash("1507238691740-187a5b1d37b8"),
        alt: "A laptop showing a minimal brand website",
        caption: "Brand homepage",
      },
      {
        src: unsplash("1547658719-da2b51169166"),
        alt: "Page designs on a desktop monitor, tablet and phone",
        caption: "Responsive layouts",
      },
      {
        src: unsplash("1432888498266-38ffec3eaf0a"),
        alt: "A designer sketching layouts on paper beside a phone",
        caption: "Design system",
      },
      {
        src: unsplash("1517694712202-14dd9538aa97"),
        alt: "A code editor open on a laptop beside a plant",
        caption: "CMS and site build",
      },
    ],
  },
  {
    id: "dental-erp",
    title: "Dental Practice Management",
    description: "Revenue tracking, patient history, lab work pipeline, clinic ledger & chemist management.",
    image: unsplash("1576091160399-112ba8d25d1d", 1200, 1200),
    imageAlt: "Dental Practice Management System Dashboard",
    features: ["Revenue Tracking", "Patient History", "Lab Pipeline", "Clinic Ledger", "Chemist"],
    industry: "Healthcare · Dental clinic",
    tagline: "Registers, lab slips and ledgers, replaced by one system the whole clinic uses.",
    challenge: {
      title: "A clinic running on registers and memory",
      body: "A busy dental practice juggles far more than appointments: every patient's treatment history, lab work going out and coming back, the clinic's own accounts, and a chemist counter on top. When those live in separate registers, the end of the month becomes an exercise in piecing it all back together.",
      pains: [
        "Patient history spread across files and registers",
        "Lab orders followed up by memory and phone calls",
        "Revenue only visible after a manual tally",
      ],
      figure: {
        src: SCENE_PAPERWORK,
        alt: PAPERWORK_ALT,
        caption: "Where it started: records, lab slips and accounts, all on paper.",
        kind: "illustration",
      },
    },
    approach: [
      { stage: "Understand", body: "A clinic day end to end: front desk, chair, lab and chemist counter." },
      { stage: "Map", body: "A visit, a lab order's round trip, a bill and a medicine sale, each traced step by step." },
      { stage: "Build", body: "Five modules on one patient record, so everything connects back to the person." },
      { stage: "Train", body: "Doctors and staff onboarded to the screens they actually use." },
    ],
    approachFigure: {
      src: unsplash("1629909613654-28e377c37b09"),
      alt: "A modern dental clinic treatment room",
      caption: "Every workflow traced through the clinic, from the front desk to the chair.",
    },
    built: [
      {
        title: "Revenue tracking",
        detail: "Earnings by treatment, doctor and day, updated as bills are raised.",
        figure: {
          src: unsplash("1551288049-bebda4e38f71"),
          alt: "Revenue charts on a tablet screen",
          caption: "Revenue by treatment, doctor and day.",
        },
      },
      {
        title: "Patient history",
        detail: "Visits, treatments, notes and records for every patient, in one place.",
        figure: {
          src: unsplash("1588776814546-1ffcf47267a5"),
          alt: "A dentist reviewing dental X-rays on a light board",
          caption: "Treatments, notes and imaging on the patient's record.",
        },
      },
      {
        title: "Lab work pipeline",
        detail: "Each lab order tracked from impression to delivery, so nothing is lost between the clinic and the lab.",
        figure: {
          src: unsplash("1566576721346-d4a3b4eaeb55"),
          alt: "A parcel being handed over for delivery",
          caption: "Each lab order tracked on its round trip.",
        },
      },
      {
        title: "Clinic ledger",
        detail: "Income and expenses recorded as they happen rather than reconciled later.",
        figure: {
          src: unsplash("1543286386-713bdd548da4"),
          alt: "A hand-drawn chart on paper beside a ruler and pens",
          caption: "Income and expenses, recorded as they happen.",
        },
      },
      {
        title: "Chemist management",
        detail: "Medicine stock and sales from the in-house chemist, tied to the same patient records.",
        figure: {
          src: unsplash("1604719312566-8912e9227c6a"),
          alt: "Long aisles of stocked shelves",
          caption: "Medicine stock and sales, tied to patient records.",
        },
      },
    ],
    shift: [
      { before: "Flipping through registers for a patient's past treatment", after: "The full history on one screen" },
      { before: "Lab work chased over the phone", after: "Every lab order tracked from impression to delivery" },
      { before: "A month-end tally to see what the clinic earned", after: "Revenue visible as bills are raised" },
      { before: "Chemist stock counted by hand", after: "Medicine stock and sales tied to the same records" },
    ],
    outcomeFigure: {
      src: SCENE_RUNNING,
      alt: RUNNING_ALT,
      caption: "Where it landed: the clinic's whole day, in one system.",
      kind: "illustration",
    },
    gallery: [
      {
        src: unsplash("1576091160399-112ba8d25d1d"),
        alt: "A doctor using an app on a phone",
        caption: "Practice app",
      },
      {
        src: unsplash("1629909613654-28e377c37b09"),
        alt: "A modern dental clinic treatment room",
        caption: "Chair-side patient records",
      },
      {
        src: unsplash("1588776814546-1ffcf47267a5"),
        alt: "A dentist reviewing dental X-rays on a light board",
        caption: "Patient history and imaging",
      },
      {
        src: unsplash("1551288049-bebda4e38f71"),
        alt: "Revenue charts on a tablet screen",
        caption: "Revenue and ledger reports",
      },
    ],
  },
  {
    id: "event-erp",
    title: "Event Management App",
    description: "Complete organisation billing, inventory, labour tracking & revenue tracking.",
    image: unsplash("1511578314322-379afb476865", 1200, 1200),
    imageAlt: "Event Operations & Production Management System",
    features: ["Billing", "Inventory", "Labour Tracking", "Revenue Tracking"],
    industry: "Events & production",
    tagline: "Every event's bills, gear and crew, accounted for in one place.",
    challenge: {
      title: "Every event is a small business of its own",
      body: "An events company runs dozens of short, intense projects: quoting the client, sending equipment out, booking crew, and collecting payment afterwards. When that lives across spreadsheets and chats, it is hard to know where the gear is, who is owed what, or whether an event actually made money.",
      pains: [
        "Equipment going out without a clear record of what came back",
        "Crew hours and payments worked out after the fact",
        "No clear picture of what each event earned",
      ],
      figure: {
        src: SCENE_PAPERWORK,
        alt: PAPERWORK_ALT,
        caption: "Where it started: quotes, gear lists and crew payments, spread across paper and chats.",
        kind: "illustration",
      },
    },
    approach: [
      { stage: "Understand", body: "An event from enquiry to wrap-up, and where time and money slip through." },
      { stage: "Map", body: "Billing, inventory, labour and revenue organised around the event itself." },
      { stage: "Build", body: "One app where every quote, equipment movement and crew shift belongs to an event." },
      { stage: "Train", body: "Office and on-ground teams onboarded to the parts they use." },
    ],
    approachFigure: {
      src: unsplash("1505373877841-8d25f7d46678"),
      alt: "A presenter on stage in front of a large screen",
      caption: "An event followed from the first enquiry to the final bow.",
    },
    built: [
      {
        title: "Billing",
        detail: "Quotes and invoices for every event, raised from the job itself.",
        figure: {
          src: unsplash("1563013544-824ae1b704d3"),
          alt: "A card payment being made on a laptop",
          caption: "Quotes and invoices raised from the event itself.",
        },
      },
      {
        title: "Inventory",
        detail: "Equipment booked out to events and checked back in, so stock is always accounted for.",
        figure: {
          src: unsplash("1511578314322-379afb476865"),
          alt: "An event hall set up with screens and seating",
          caption: "Equipment booked out to each event, and checked back in.",
        },
      },
      {
        title: "Labour tracking",
        detail: "Crew assigned to each event, with hours and payments recorded against the job.",
        figure: {
          src: unsplash("1522071820081-009f0129c71c"),
          alt: "A team working together at laptops around a table",
          caption: "Crew, hours and payments, against every job.",
        },
      },
      {
        title: "Revenue tracking",
        detail: "Income and costs per event and across the business, in one view.",
        figure: {
          src: unsplash("1551288049-bebda4e38f71"),
          alt: "Revenue charts on a tablet screen",
          caption: "Income and costs per event, side by side.",
        },
      },
    ],
    shift: [
      { before: "Gear lists on paper, checked back by memory", after: "Equipment booked out and checked in against each event" },
      { before: "Crew payments pieced together from messages", after: "Hours and payments recorded against the job" },
      { before: "Guessing which events were worth it", after: "Income and costs per event, side by side" },
    ],
    outcomeFigure: {
      src: SCENE_RUNNING,
      alt: RUNNING_ALT,
      caption: "Where it landed: every event accounted for, in one place.",
      kind: "illustration",
    },
    gallery: [
      {
        src: unsplash("1511578314322-379afb476865"),
        alt: "An event hall set up with screens and seating",
        caption: "Event setup and bookings",
      },
      {
        src: unsplash("1505373877841-8d25f7d46678"),
        alt: "A presenter on stage in front of a large screen",
        caption: "Event-day operations",
      },
      {
        src: unsplash("1540575467063-178a50c2df87"),
        alt: "An audience seated at a conference",
        caption: "Crew and labour tracking",
      },
      {
        src: unsplash("1492684223066-81342ee5ff30"),
        alt: "Confetti over a concert crowd",
        caption: "Revenue per event",
      },
    ],
  },
  {
    id: "warehouse-hub",
    title: "Warehouse & Dispatch Hub",
    description: "Barcode scanning, 1-click challans, inventory tracking & multi-godown stock sync.",
    image: unsplash("1586528116311-ad8dd3c8310d", 1200, 1200),
    imageAlt: "Warehouse & Logistics Inventory Management System",
    features: ["Warehouse ERP", "Barcode Scanner", "1-Click Challans", "Stock Sync"],
    industry: "Logistics & warehousing",
    tagline: "Stock that matches reality, across every godown.",
    challenge: {
      title: "Stock counts that never quite match",
      body: "Running more than one godown multiplies every stock problem. When goods move between locations and out to customers faster than registers can be updated, the numbers on paper drift away from what is on the shelves, and every dispatch still needs its challan written up by hand.",
      pains: [
        "A manual entry at every stock movement",
        "Challans prepared by hand for each dispatch",
        "Godowns out of step with each other",
      ],
      figure: {
        src: SCENE_PAPERWORK,
        alt: PAPERWORK_ALT,
        caption: "Where it started: stock registers and handwritten challans.",
        kind: "illustration",
      },
    },
    approach: [
      { stage: "Understand", body: "The flow of goods: receiving, storing, moving between godowns, dispatching." },
      { stage: "Map", body: "Every movement turned into a scan point, where stock physically changes hands." },
      { stage: "Build", body: "A warehouse ERP with barcode scanning, one-click challans and live godown sync." },
      { stage: "Train", body: "Scanning first for floor staff: the one habit everything else depends on." },
    ],
    approachFigure: {
      src: unsplash("1553413077-190dd305871c"),
      alt: "A long warehouse aisle with high racking",
      caption: "Every movement of goods mapped to a point where it can be scanned.",
    },
    built: [
      {
        title: "Warehouse ERP",
        detail: "Receiving, storage and dispatch run from one system instead of separate registers.",
        figure: {
          src: unsplash("1586528116311-ad8dd3c8310d"),
          alt: "A warehouse floor stacked with boxes",
          caption: "Receiving, storage and dispatch in one system.",
        },
      },
      {
        title: "Barcode scanning",
        detail: "Items scanned at every movement, so counts come from the scan rather than a manual entry.",
        figure: {
          src: unsplash("1587293852726-70cdb56c2866"),
          alt: "Warehouse shelves stocked with cartons",
          caption: "Stock counted by scan, not by hand.",
        },
      },
      {
        title: "1-click challans",
        detail: "Delivery challans generated straight from the dispatch, ready to print or share.",
        figure: {
          src: unsplash("1566576721346-d4a3b4eaeb55"),
          alt: "A parcel being handed over for delivery",
          caption: "A challan generated with every dispatch.",
        },
      },
      {
        title: "Multi-godown stock sync",
        detail: "Stock levels kept consistent across every godown as goods move between them.",
        figure: {
          src: unsplash("1504868584819-f8e8b4b6d7e3"),
          alt: "A laptop showing a dashboard of charts",
          caption: "One stock position across every godown.",
        },
      },
    ],
    shift: [
      { before: "Counts entered by hand and corrected later", after: "Every movement recorded by barcode scan" },
      { before: "A challan written up for each dispatch", after: "Challans generated from the dispatch in one click" },
      { before: "Each godown with its own version of the truth", after: "One stock position, synced across locations" },
    ],
    outcomeFigure: {
      src: SCENE_RUNNING,
      alt: RUNNING_ALT,
      caption: "Where it landed: stock numbers that match the shelves.",
      kind: "illustration",
    },
    gallery: [
      {
        src: unsplash("1586528116311-ad8dd3c8310d"),
        alt: "A warehouse floor stacked with boxes",
        caption: "Godown overview",
      },
      {
        src: unsplash("1553413077-190dd305871c"),
        alt: "A long warehouse aisle with high racking",
        caption: "Inventory by location",
      },
      {
        src: unsplash("1587293852726-70cdb56c2866"),
        alt: "Warehouse shelves stocked with cartons",
        caption: "Barcode stock counts",
      },
      {
        src: unsplash("1566576721346-d4a3b4eaeb55"),
        alt: "A parcel being handed over for delivery",
        caption: "Dispatch and challans",
      },
    ],
  },
  {
    id: "retail-pos",
    title: "Retail POS & Multi-Store",
    description: "1-click GST retail billing, customer credit ledgers & live profit margin tracking.",
    image: unsplash("1556740738-b6a63e27c4df", 1200, 1200),
    imageAlt: "Shopkeeper billing a customer on a tablet point-of-sale",
    features: ["Retail POS", "1-Click GST", "Customer Ledger", "Profit Tracking"],
    industry: "Retail · Multi-store",
    tagline: "Faster counters, clean GST bills, and margins you can see.",
    challenge: {
      title: "Busy counters, and profit nobody can see",
      body: "A retailer with several stores lives at the counter: bills need to be quick and GST-correct, regular customers buy on credit, and the owner wants to know which products and which stores are actually making money. Without one system across the stores, that picture only comes together much later.",
      pains: [
        "Tax worked out bill by bill at the counter",
        "Customer credit tracked outside the billing system",
        "Margins by store only visible long after the sale",
      ],
      figure: {
        src: SCENE_PAPERWORK,
        alt: PAPERWORK_ALT,
        caption: "Where it started: bills, tax and credit, worked out by hand.",
        kind: "illustration",
      },
    },
    approach: [
      { stage: "Understand", body: "What a bill looks like at rush hour, and what slows it down." },
      { stage: "Map", body: "Billing, credit and margins mapped to one catalogue shared by every store." },
      { stage: "Build", body: "A counter-first POS with GST, ledgers and profit tracking underneath." },
      { stage: "Train", body: "Cashiers on the billing screen; owners on the ledgers and profit views." },
    ],
    approachFigure: {
      src: unsplash("1556741533-6e6a62bd8b49"),
      alt: "A customer paying at a shop counter",
      caption: "A bill traced where it happens: at the counter.",
    },
    built: [
      {
        title: "Retail POS",
        detail: "A fast counter billing screen that works the same way in every store.",
        figure: {
          src: unsplash("1556740738-b6a63e27c4df"),
          alt: "A shopkeeper billing a customer on a tablet point-of-sale",
          caption: "The counter billing screen.",
        },
      },
      {
        title: "1-click GST billing",
        detail: "Tax calculated and applied automatically on every bill.",
        figure: {
          src: unsplash("1556742502-ec7c0e9f34b1"),
          alt: "A card payment on a handheld reader",
          caption: "A GST-correct bill and payment, in one step.",
        },
      },
      {
        title: "Customer credit ledger",
        detail: "Running balances for customers who buy on credit, with a record of every payment.",
        figure: {
          src: unsplash("1563013544-824ae1b704d3"),
          alt: "A card payment being made on a laptop",
          caption: "A running balance for every credit customer.",
        },
      },
      {
        title: "Live profit tracking",
        detail: "Margins by product and by store, updated with each sale.",
        figure: {
          src: unsplash("1551288049-bebda4e38f71"),
          alt: "Charts on a tablet screen",
          caption: "Margins by product and store, live.",
        },
      },
    ],
    shift: [
      { before: "GST calculated by hand on each bill", after: "A GST-correct bill in one click" },
      { before: "Credit balances kept separately from sales", after: "A running ledger for every credit customer" },
      { before: "Profit known at the end of the quarter", after: "Margins by product and store, live" },
    ],
    outcomeFigure: {
      src: SCENE_COUNTER,
      alt: "Illustration: a smiling shopkeeper at his counter while Zeal the Potentiaa mascot holds up a phone",
      caption: "Where it landed: a counter that bills in one click.",
      kind: "illustration",
    },
    gallery: [
      {
        src: unsplash("1556740738-b6a63e27c4df"),
        alt: "A shopkeeper billing a customer on a tablet point-of-sale",
        caption: "Counter billing",
      },
      {
        src: unsplash("1556741533-6e6a62bd8b49"),
        alt: "A customer paying at a shop counter",
        caption: "GST bills at checkout",
      },
      {
        src: unsplash("1441986300917-64674bd600d8"),
        alt: "The interior of a clothing store",
        caption: "Multi-store inventory",
      },
      {
        src: unsplash("1556742502-ec7c0e9f34b1"),
        alt: "A card payment on a handheld reader",
        caption: "Payments and credit ledger",
      },
    ],
  },
];
