/**
 * The builds shown in the Our Work section, and the case study each one opens.
 *
 * - Every screenshot is a capture of the real product, served from
 *   public/assets/work/<project-id>/. card.webp is the square crop the
 *   carousel shows; the rest are full screens (kind: "screenshot"), shown
 *   whole in the case study rather than cropped like a photo. The
 *   illustrations are the site's own Zeal scenes, used for the "where it
 *   started" and "where it landed" beats, which no screenshot can show.
 * - The story copy (tagline, challenge, approach, shift, captions) describes
 *   the problems each product's screens exist to solve. It makes no numeric
 *   claims and quotes no one. Replace it with the real story wherever the
 *   details differ.
 */

/** An image and what it shows. Used for the hero slideshow and the story. */
export interface ProjectFigure {
  src: string;
  alt: string;
  caption: string;
  /**
   * Photos are cropped to fill their frame. Illustrations are cut-outs and
   * screenshots are interfaces, so both are shown whole.
   */
  kind?: "photo" | "illustration" | "screenshot";
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

/** A capture of the real product, from public/assets/work/<project>/<file>.webp. */
const shot = (project: string, file: string, alt: string, caption: string): ProjectFigure => ({
  src: `/assets/work/${project}/${file}.webp`,
  alt,
  caption,
  kind: "screenshot",
});

/* The site's own illustrations - transparent cut-outs of Zeal, the mascot. */
const SCENE_PAPERWORK = "/assets/mascot/scenes/scene-paperwork.webp";
const SCENE_RUNNING = "/assets/mascot/scenes/scene-running.webp";

const PAPERWORK_ALT =
  "Illustration: a worried business owner at a desk stacked with paper invoices, with Zeal the Potentiaa mascot beside him";
const RUNNING_ALT =
  "Illustration: a relaxed business owner checking his phone, with Zeal the Potentiaa mascot beside him";

const started = (caption: string): ProjectFigure => ({
  src: SCENE_PAPERWORK,
  alt: PAPERWORK_ALT,
  caption,
  kind: "illustration",
});

const landed = (caption: string): ProjectFigure => ({
  src: SCENE_RUNNING,
  alt: RUNNING_ALT,
  caption,
  kind: "illustration",
});

/* ---- FQUAD ------------------------------------------------------------ */

const FQUAD = {
  homeHero: shot(
    "fquad-website",
    "home-hero",
    "The F.QUAD homepage: a modern house lit at dusk under the headline 'Space is our medium'",
    "The homepage, opening on the studio's own work.",
  ),
  featuredProjects: shot(
    "fquad-website",
    "featured-projects",
    "The F.QUAD featured projects gallery, led by the Juice Salon unisex salon and spa",
    "Featured projects, placed where visitors look first.",
  ),
  projectShowcase: shot(
    "fquad-website",
    "project-showcase",
    "The F.QUAD project showcase: an interior seen through carved wooden doors, beside the F.Quad wordmark",
    "Each project presented image first, one at a time.",
  ),
  contactFooter: shot(
    "fquad-website",
    "contact-footer",
    "The F.QUAD contact section with 'Have a project in mind?', WhatsApp and Start a Project buttons, above the footer",
    "Enquiries by WhatsApp or project brief, one step from any page.",
  ),
  processAndPress: shot(
    "fquad-website",
    "process-and-press",
    "The F.QUAD process in four steps - brief, concept, development, delivery - above press features and a client testimonial",
    "The studio's process, press and client words, told on the site.",
  ),
};

/* ---- Raghuvansh ------------------------------------------------------- */

const RAGHUVANSH = {
  ramayanHero: shot(
    "raghuvansh-website",
    "ramayan-hero",
    "The Raghuvansh Ki Ramayan page: an actor in costume on a lit stage, with Watch Ramayan and Book Us buttons",
    "Flagship shows presented front and centre, with a way to book them.",
  ),
  home: shot(
    "raghuvansh-website",
    "home",
    "The Raghuvansh homepage: 'Preserving the classical, pioneering the contemporary', a founder portrait and featured press coverage",
    "The homepage: the group's story, founder and press coverage.",
  ),
  productions: shot(
    "raghuvansh-website",
    "productions",
    "The Raghuvansh productions page showing posters for Baki Itihas, Baaki Itihaas and Saari Raat",
    "Productions and their posters, added as new shows open.",
  ),
  repertoire: shot(
    "raghuvansh-website",
    "repertoire",
    "The Raghuvansh repertoire section: Ramayan, Productions and Mehfil-e-Ghazal musical evenings",
    "The repertoire, from Ramayan to musical evenings.",
  ),
  bookingFooter: shot(
    "raghuvansh-website",
    "booking-footer",
    "The Raghuvansh footer: 'Bring Raghuvansh to your stage' with a WhatsApp enquiry link and contact details",
    "Booking enquiries, one tap from every page.",
  ),
};

/* ---- Dental ----------------------------------------------------------- */

const DPMS = {
  dashboard: shot(
    "dental-erp",
    "dashboard",
    "The DPMS dashboard greeting Dr. Rahul, with revenue, revenue breakdown, income and expense, and the lab work pipeline",
    "The dashboard: revenue, expenses and lab orders at a glance.",
  ),
  receptionDesk: shot(
    "dental-erp",
    "reception-desk",
    "The DPMS reception desk: patient intake and billing, the live patient queue, doctors' status and today's appointments",
    "Patients registered, billed and queued at the front desk.",
  ),
  labWork: shot(
    "dental-erp",
    "lab-work-pipeline",
    "The DPMS lab work and prosthetics pipeline, with orders moving from impression to dispatched, received and delivered",
    "Each lab order on its round trip, stage by stage.",
  ),
  inventory: shot(
    "dental-erp",
    "inventory",
    "The DPMS inventory: stock valuation, low-stock and expiry alerts, and medicine cards with stock levels and reorder points",
    "Medicine stock, reorder points and expiry dates.",
  ),
  assetsAndEmis: shot(
    "dental-erp",
    "assets-and-emis",
    "The DPMS financial ledger's Assets and EMIs tab: clinic equipment with total cost, monthly EMI and repayment progress",
    "The financial ledger, down to equipment EMIs.",
  ),
  clinicalTemplates: shot(
    "dental-erp",
    "clinical-templates",
    "The DPMS admin panel's clinical templates for procedures such as scaling, fillings, root canals and extractions",
    "Clinical notes turned into templates the doctors reuse.",
  ),
};

/* ---- Business MIS ----------------------------------------------------- */

const MIS = {
  executiveDashboard: shot(
    "business-mis",
    "executive-dashboard",
    "The MIS executive dashboard: financial overview, sales pipeline summary, at-risk projects and team capacity",
    "The executive dashboard: finance, pipeline, delivery and capacity.",
  ),
  salesCrm: shot(
    "business-mis",
    "sales-crm",
    "The MIS sales CRM board with leads in New, In Discussion, Proposal Sent and Closed Won columns",
    "Every lead by stage, with its value and follow-up date.",
  ),
  teamOperations: shot(
    "business-mis",
    "team-operations",
    "The MIS team and operations workload board, with tasks under To Do, In Progress, In Review, Blockers and Done",
    "Tasks by status, priority and owner, blockers included.",
  ),
  knowledgeBase: shot(
    "business-mis",
    "knowledge-base",
    "The MIS knowledge base: a company overview document beside folders for company, products, operations and go-to-market",
    "How the company works, written down in one place.",
  ),
  contentMarketing: shot(
    "business-mis",
    "content-marketing",
    "The MIS content and marketing hub comparing Instagram, LinkedIn, YouTube, X and newsletter by audience, reach, leads and cost per lead",
    "Every channel's reach, leads and cost per lead, side by side.",
  ),
};

export const PROJECTS: Project[] = [
  {
    id: "fquad-website",
    title: "FQUAD Website",
    description: "Website, SEO engine, real-time analytics & custom CMS.",
    image: "/assets/work/fquad-website/card.webp",
    imageAlt: "The F.QUAD homepage: a modern house lit at dusk",
    features: ["Website", "SEO Engine", "Analytics", "CMS"],
    industry: "Architecture & interior design",
    tagline: "A studio's work, shown the way it deserves, and a site the team runs itself.",
    challenge: {
      title: "A portfolio shouldn't need a developer for every change",
      body: "F.QUAD is an architecture and interior design studio, and its projects are its best argument. The studio needed a site that puts that work first, gets found in search, shows which pages bring in enquiries, and stays current without waiting on someone else to publish.",
      pains: [
        "Project updates that depend on a developer",
        "No clear view of which pages bring in enquiries",
        "Search visibility left to chance",
      ],
      figure: started("Where it started: every project update and enquiry handled by hand."),
    },
    approach: [
      { stage: "Understand", body: "Who the studio needs to reach, and how those clients look for a designer." },
      { stage: "Map", body: "Projects placed first, with each page matched to what people search for and the enquiry it leads to." },
      { stage: "Build", body: "The site, SEO engine, analytics and CMS as one system on shared content." },
      { stage: "Train", body: "Publishing projects and reading the dashboard, handed over to the team." },
    ],
    approachFigure: FQUAD.featuredProjects,
    built: [
      {
        title: "Website",
        detail: "A fast, responsive site that presents the studio's projects image first, on every screen size.",
        figure: FQUAD.homeHero,
      },
      {
        title: "SEO engine",
        detail: "Page titles, descriptions, sitemaps and structured data generated from the content itself, so new project pages are search-ready when they are published.",
        figure: FQUAD.projectShowcase,
      },
      {
        title: "Real-time analytics",
        detail: "A live view of visitors, traffic sources and enquiries, so the team can see what is working.",
        figure: FQUAD.contactFooter,
      },
      {
        title: "Custom CMS",
        detail: "An editor built around the studio's own content, for updating projects, process and press without touching code.",
        figure: FQUAD.processAndPress,
      },
    ],
    shift: [
      { before: "Project updates queued for a developer", after: "Projects and pages edited directly in the CMS" },
      { before: "Guessing which pages work", after: "Live visitors, sources and enquiries on one dashboard" },
      { before: "SEO handled page by page, if at all", after: "Metadata, sitemaps and structured data generated automatically" },
    ],
    outcomeFigure: landed("Where it landed: a studio that publishes and measures on its own."),
    gallery: [
      FQUAD.homeHero,
      FQUAD.featuredProjects,
      FQUAD.projectShowcase,
      FQUAD.processAndPress,
      FQUAD.contactFooter,
    ],
  },
  {
    id: "raghuvansh-website",
    title: "Raghuvansh Website",
    description: "Theatre group website, SEO engine, real-time analytics & CMS.",
    image: "/assets/work/raghuvansh-website/card.webp",
    imageAlt: "The Raghuvansh Ki Ramayan page: an actor in costume on a lit stage",
    features: ["Website", "SEO Engine", "Analytics", "CMS"],
    industry: "Performing arts · Theatre",
    tagline: "A stage online for a theatre group's productions, repertoire and bookings.",
    challenge: {
      title: "A stage presence that has to carry online",
      body: "Raghuvansh Group of Performing Arts has been bringing classical Indian theatre to the stage since 2000. Its website needed to present the productions and repertoire with the same grandeur, be found by people looking for shows, turn visits into bookings, and stay easy for the group to keep current.",
      pains: [
        "Productions and repertoire with no single home online",
        "Booking enquiries arriving through scattered channels",
        "Show updates that should stay in the group's own hands",
      ],
      figure: started("Where it started: productions, bookings and updates handled by hand."),
    },
    approach: [
      { stage: "Understand", body: "The group's story, its productions, and how audiences and organisers find a show." },
      { stage: "Map", body: "Pages paced around the productions and repertoire, with search structure built in from the start." },
      { stage: "Build", body: "A design-led site on the same SEO, analytics and CMS foundation as our other web builds." },
      { stage: "Train", body: "Productions, pages and media, managed by the group itself." },
    ],
    approachFigure: RAGHUVANSH.repertoire,
    built: [
      {
        title: "Performing arts website",
        detail: "A design-led site with the grandeur, imagery and typography of the stage.",
        figure: RAGHUVANSH.home,
      },
      {
        title: "SEO engine",
        detail: "Search-ready metadata, sitemaps and structured data for every page, generated automatically.",
        figure: RAGHUVANSH.ramayanHero,
      },
      {
        title: "Real-time analytics",
        detail: "Live visitor and booking-enquiry tracking in one dashboard.",
        figure: RAGHUVANSH.bookingFooter,
      },
      {
        title: "CMS",
        detail: "Productions, pages and media the group manages themselves.",
        figure: RAGHUVANSH.productions,
      },
    ],
    shift: [
      { before: "Productions scattered across posters and social posts", after: "Every production and the repertoire in one place" },
      { before: "Every update briefed out to someone else", after: "Productions and pages managed in-house" },
      { before: "No view of what visitors engage with", after: "Live visitor and booking-enquiry tracking" },
    ],
    outcomeFigure: landed("Where it landed: the group's stage, online and kept current by the group."),
    gallery: [
      RAGHUVANSH.ramayanHero,
      RAGHUVANSH.home,
      RAGHUVANSH.productions,
      RAGHUVANSH.repertoire,
      RAGHUVANSH.bookingFooter,
    ],
  },
  {
    id: "dental-erp",
    title: "Dental Practice Management",
    description: "Revenue dashboard, reception desk, lab work pipeline, clinic ledger & inventory.",
    image: "/assets/work/dental-erp/card.webp",
    imageAlt: "The DPMS dashboard greeting Dr. Rahul, with revenue charts",
    features: ["Revenue Dashboard", "Reception Desk", "Lab Pipeline", "Clinic Ledger", "Inventory"],
    industry: "Healthcare · Dental clinic",
    tagline: "Registers, lab slips and ledgers, replaced by one system the whole clinic uses.",
    challenge: {
      title: "A clinic running on registers and memory",
      body: "A busy dental practice juggles far more than appointments: patients arriving at the front desk, lab work going out and coming back, the clinic's own accounts and equipment loans, and medicine stock on top. When those live in separate registers, the end of the month becomes an exercise in piecing it all back together.",
      pains: [
        "Patient visits and bills spread across files and registers",
        "Lab orders followed up by memory and phone calls",
        "Revenue only visible after a manual tally",
      ],
      figure: started("Where it started: records, lab slips and accounts, all on paper."),
    },
    approach: [
      { stage: "Understand", body: "A clinic day end to end: front desk, chair, lab and medicine stock." },
      { stage: "Map", body: "A visit, a lab order's round trip, a bill and a treatment note, each traced step by step." },
      { stage: "Build", body: "Five modules on one patient record, so everything connects back to the person." },
      { stage: "Train", body: "Doctors and staff onboarded to the screens they actually use." },
    ],
    approachFigure: DPMS.clinicalTemplates,
    built: [
      {
        title: "Revenue dashboard",
        detail: "Revenue, expenses and profit over time, with the day's lab orders alongside.",
        figure: DPMS.dashboard,
      },
      {
        title: "Reception desk",
        detail: "Patients registered and billed at the front desk, with a live queue and each doctor's availability.",
        figure: DPMS.receptionDesk,
      },
      {
        title: "Lab work pipeline",
        detail: "Each lab order tracked from impression to delivery, so nothing is lost between the clinic and the lab.",
        figure: DPMS.labWork,
      },
      {
        title: "Clinic ledger",
        detail: "Income, expenses and dues recorded as they happen, down to the EMIs on clinic equipment.",
        figure: DPMS.assetsAndEmis,
      },
      {
        title: "Inventory",
        detail: "Medicine and supply stock with reorder points and expiry alerts.",
        figure: DPMS.inventory,
      },
    ],
    shift: [
      { before: "Patients and bills written up by hand at the desk", after: "Intake, billing and the queue on one screen" },
      { before: "Lab work chased over the phone", after: "Every lab order tracked from impression to delivery" },
      { before: "A month-end tally to see what the clinic earned", after: "Revenue visible as bills are raised" },
      { before: "Stock counted by hand, expiries missed", after: "Reorder points and expiry alerts in the inventory" },
    ],
    outcomeFigure: landed("Where it landed: the clinic's whole day, in one system."),
    gallery: [
      DPMS.dashboard,
      DPMS.receptionDesk,
      DPMS.labWork,
      DPMS.inventory,
      DPMS.assetsAndEmis,
      DPMS.clinicalTemplates,
    ],
  },
  {
    id: "business-mis",
    title: "Business MIS",
    description: "Executive dashboard, sales CRM, team operations, knowledge base & marketing hub.",
    image: "/assets/work/business-mis/card.webp",
    imageAlt: "The MIS executive dashboard with the financial overview and at-risk projects",
    features: ["Executive Dashboard", "Sales CRM", "Team Operations", "Knowledge Base", "Marketing Hub"],
    industry: "Services business · MIS",
    tagline: "Money, pipeline, people and knowledge, on one screen the founder checks first.",
    challenge: {
      title: "Running a growing team from too many tools",
      body: "A growing services business has a lot moving at once: leads working through a pipeline, projects at risk of slipping, a team with more work than hours, documents nobody can find, and marketing spread across several channels. When each lives in its own tool, the founder has to stitch the picture together before any decision can be made.",
      pains: [
        "Revenue, receivables and pipeline checked in separate places",
        "Delayed projects and overloaded people spotted too late",
        "Company knowledge scattered across chats and drives",
        "Marketing spend with no clear line to the leads it brings",
      ],
      figure: started("Where it started: numbers, tasks and documents, spread across tools."),
    },
    approach: [
      { stage: "Understand", body: "How the founder, sales and delivery teams actually spend their week." },
      { stage: "Map", body: "How the company works written down first, then each team's daily questions mapped to a screen." },
      { stage: "Build", body: "One MIS where every module feeds the executive dashboard." },
      { stage: "Train", body: "Each team onboarded to its own workspace, and the founder to the dashboard." },
    ],
    approachFigure: MIS.knowledgeBase,
    built: [
      {
        title: "Executive dashboard",
        detail: "Collections, receivables, payables and pipeline value, with at-risk projects and team capacity, on one customisable screen.",
        figure: MIS.executiveDashboard,
      },
      {
        title: "Sales CRM",
        detail: "Every lead on a board by stage, from first enquiry to won, with deal value and follow-up dates.",
        figure: MIS.salesCrm,
      },
      {
        title: "Team operations",
        detail: "A workload board of every task by status and priority, with daily tracking and a skill matrix.",
        figure: MIS.teamOperations,
      },
      {
        title: "Marketing hub",
        detail: "Each acquisition channel's audience, reach, leads and cost per lead, compared side by side.",
        figure: MIS.contentMarketing,
      },
    ],
    shift: [
      { before: "Revenue and pipeline pulled from separate tools", after: "Finance and pipeline together on the executive dashboard" },
      { before: "Delays and overload noticed after the deadline", after: "At-risk projects and team capacity flagged as they happen" },
      { before: "Documents lost across chats and drives", after: "One knowledge base the whole team works from" },
      { before: "Marketing spend judged by feel", after: "Leads and cost per lead compared by channel" },
    ],
    outcomeFigure: landed("Where it landed: the whole business, visible from one screen."),
    gallery: [
      MIS.executiveDashboard,
      MIS.salesCrm,
      MIS.teamOperations,
      MIS.contentMarketing,
      MIS.knowledgeBase,
    ],
  },
  {
    id: "warehouse-erp",
    title: "Warehouse ERP & Dispatch",
    description: "Multi-godown inventory sync, barcode receiving, 1-click challans & live vehicle dispatch.",
    image: "/assets/work/erp-dispatch.jpg",
    imageAlt: "Warehouse ERP dispatch management dashboard with inventory and orders",
    features: ["Warehouse ERP", "Barcode Scanning", "Multi-Godown Sync", "Dispatch Challans", "Live Tracking"],
    industry: "Logistics · Wholesale & Warehouse",
    tagline: "Every carton tracked from receiving dock to customer dispatch.",
    challenge: {
      title: "Stock registers that don't match the warehouse floor",
      body: "Wholesale distribution and warehousing involves inventory constantly in motion. Dispatches stall when staff can't locate pallets, and physical stock never matches what the sales team is promising to buyers.",
      pains: [
        "Manual registers causing dispatch bottlenecks",
        "Discrepancies between warehouse floor counts and sales orders",
        "No real-time tracking of multi-godown transfers",
        "Slow handwritten challans delaying delivery vehicles",
      ],
      figure: started("Where it started: handwritten registers, misplaced stock, and dispatch delays."),
    },
    approach: [
      { stage: "Understand", body: "Mapping the physical flow of goods from dock receiving to delivery vehicles." },
      { stage: "Map", body: "Configuring barcode scan points for every pallet movement, storage rack, and dispatch." },
      { stage: "Build", body: "A warehouse management system with real-time stock sync and instant delivery challans." },
      { stage: "Train", body: "Equipping warehouse staff and dispatch drivers with fast handheld mobile workflows." },
    ],
    approachFigure: {
      src: "/assets/work/erp-dispatch.jpg",
      alt: "Warehouse ERP dispatch management screen",
      caption: "Live dispatch overview across every warehouse location.",
      kind: "screenshot",
    },
    built: [
      {
        title: "Real-time dispatch management",
        detail: "Automated challan generation, dispatch queue sorting, and customer delivery notification.",
        figure: {
          src: "/assets/work/erp-dispatch.jpg",
          alt: "Warehouse ERP dispatch operations dashboard",
          caption: "Live dispatch queue and vehicle loading status.",
          kind: "screenshot",
        },
      },
      {
        title: "Floor inventory & barcode scan",
        detail: "Scan-based receiving, bin allocation, and automated low-threshold reorder alerts.",
        figure: {
          src: "/assets/work/field-ops.jpg",
          alt: "Floor operations and inventory tracking",
          caption: "Mobile barcode scanning on the warehouse floor.",
          kind: "screenshot",
        },
      },
      {
        title: "Billing & accounting sync",
        detail: "Direct connection between dispatch challans, customer invoices, and automated ledgers.",
        figure: {
          src: "/assets/work/billing-reconcile.jpg",
          alt: "Billing and reconciliation dashboard",
          caption: "One-click invoice generation from dispatched items.",
          kind: "screenshot",
        },
      },
      {
        title: "Operational analytics",
        detail: "Turnaround times, stock velocity, and fulfillment efficiency tracked by branch.",
        figure: {
          src: "/assets/work/strata-analytics.jpg",
          alt: "Analytics and performance charts",
          caption: "Fulfillment velocity and dispatch turnaround metrics.",
          kind: "screenshot",
        },
      },
    ],
    shift: [
      { before: "Handwritten gate passes and dispatch delays", after: "Instant barcode-verified delivery challans" },
      { before: "Disputed inventory counts between branches", after: "Unified multi-location inventory ledger" },
      { before: "Stockouts discovered only at the dispatch dock", after: "Automated low-threshold alerts and purchase reorders" },
    ],
    outcomeFigure: landed("Where it landed: zero stockouts, rapid turnaround, and complete audit transparency."),
    gallery: [
      { src: "/assets/work/erp-dispatch.jpg", alt: "ERP dispatch board", caption: "Dispatch operations", kind: "screenshot" },
      { src: "/assets/work/field-ops.jpg", alt: "Warehouse inventory ops", caption: "Field & floor operations", kind: "screenshot" },
      { src: "/assets/work/billing-reconcile.jpg", alt: "Billing reconciliation", caption: "Billing & collections", kind: "screenshot" },
      { src: "/assets/work/strata-analytics.jpg", alt: "Operational analytics", caption: "Performance analytics", kind: "screenshot" },
    ],
  },
];
