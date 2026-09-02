/**
 * Site content.
 *
 * Ultra-minimal, visual-first copy tailored for non-technical small business owners:
 * - 1-line punchy value props
 * - Crisp "Problem -> Fix" structure
 * - No paragraphs or filler text
 */

const ZERO_PAPERWORK_HEADLINE = "One order. Six steps. Zero paperwork.";

export const site = {
  name: "Potentiaa",
  tagline: "Unlock. Transform. Grow.",

  contact: {
    email: "hello@potentiaa.com",
    whatsapp: "+91 82678 39736",
  },

  hero: {
    eyebrow: "Operational software for growing businesses",
    titleLead: ["Run your business from"],
    titlePrefix: "one ",
    titleGradient: "connected system.",
    titleAccent: [] as string[],
    subtitle:
      "Potentiaa builds tailored billing, inventory, workflow and management software that replaces scattered registers, spreadsheets and WhatsApp handoffs.",
    primary: "Book a workflow audit",
    secondary: "See how it works",
    hint: ["Move your mouse", "to explore"],
    badges: [
      "Built around your workflow",
      "Works on phone and desktop",
      "Implementation and ongoing support",
    ],
  },

  /**
   * The 5 flow stages - representing the live operational pipeline.
   */
  flow: [
    { title: "Order Capture", note: "Front Desk / Sales" },
    { title: "Capacity & Approval", note: "Operations Manager" },
    { title: "Stock Movement", note: "Warehouse / Fulfilment" },
    { title: "Billing & Ledger", note: "Accounts Team" },
    { title: "Owner Visibility", note: "Business Owner" },
  ],

  flowSection: {
    eyebrow: "The Bottleneck",
    title: ZERO_PAPERWORK_HEADLINE,
    body: "No phone calls, handwritten registers, or WhatsApp confusion. One simple screen from order to profit.",
  },

  intro: {
    eyebrow: "Daily Headaches",
    title: "Sound familiar?",
    punchline: "Replace daily guesswork with instant clarity on your phone.",
    problems: [
      {
        index: "01",
        quote: "“I call 3 people to check today's sales.”",
        diagnosis: "Live revenue, expenses, and cashflow on your phone.",
      },
      {
        index: "02",
        quote: "“We write in a notebook, then type it later.”",
        diagnosis: "Enter once. Invoices and stock update everywhere instantly.",
      },
      {
        index: "03",
        quote: "“If one key person is absent, work stops.”",
        diagnosis: "Central records so any team member can step in.",
      },
      {
        index: "04",
        quote: "“Warehouse stock never matches our books.”",
        diagnosis: "Real-time inventory alerts on every sale or dispatch.",
      },
      {
        index: "05",
        quote: "“Staff waste hours in WhatsApp groups.”",
        diagnosis: "Automatic job handoffs between staff without calls.",
      },
      {
        index: "06",
        quote: "“Monthly profit takes days to calculate.”",
        diagnosis: "1-click daily P&L and expense summaries.",
      },
    ],
  },

  /**
   * Offerings: 5 Tailored Capability modules.
   */
  work: {
    title: "Our Offerings",
    eyebrow: "Tailored Capabilities",
    tabs: [
      {
        id: "billing",
        label: "Billing & Collections",
        eyebrow: "TAILORED CAPABILITY",
        title: "Billing & Collections",
        bottleneck: "Invoices created manually in separate tools delay collections and create accounting reconciliation headaches.",
        capabilities: [
          "GST-compliant invoicing & multi-tier tax rules",
          "Automated WhatsApp payment links & follow-up reminders",
          "Real-time customer ledger & outstanding tracking",
          "Direct reconciliation with bank feeds and accounting exports",
        ],
        whoUsesIt: "Billing Executives, Accountants & Owners",
        howItConnects: "Directly reads inventory dispatch logs; automatically updates owner cashflow.",
      },
      {
        id: "inventory",
        label: "Inventory & Stock Movement",
        eyebrow: "TAILORED CAPABILITY",
        title: "Inventory & Stock Movement",
        bottleneck: "Physical stock registers don't match computer numbers, leading to stockouts or dead inventory.",
        capabilities: [
          "Multi-location, branch & warehouse stock registers",
          "Barcode & QR scanning for receiving and dispatches",
          "Low-stock threshold alerts & automated reorder drafts",
          "Batch & expiry tracking with audit log of movements",
        ],
        whoUsesIt: "Store Managers, Dispatch Teams & Purchase Heads",
        howItConnects: "Locks reserved stock on sales order; triggers purchase workflows on low stock.",
      },
      {
        id: "workflows",
        label: "Workflows & Approvals",
        eyebrow: "TAILORED CAPABILITY",
        title: "Workflows & Approvals",
        bottleneck: "Critical jobs and approvals get trapped in WhatsApp chats and forgotten email threads.",
        capabilities: [
          "Configurable multi-step approval workflows (Discounts, POs, Leaves)",
          "Field team task assignment with mobile signoffs & photo verification",
          "Automated role-based escalation when tasks stall",
          "Real-time customer status notifications via SMS & WhatsApp",
        ],
        whoUsesIt: "Floor Supervisors, Field Technicians & Department Heads",
        howItConnects: "Passes completed field tasks directly into the billing engine.",
      },
      {
        id: "dashboards",
        label: "Management Dashboards",
        eyebrow: "TAILORED CAPABILITY",
        title: "Management Dashboards",
        bottleneck: "Business owners spend hours asking three managers for reports before knowing where things stand.",
        capabilities: [
          "Live business pulse: daily orders, dispatches, margins & pending tasks",
          "Branch-by-branch comparative performance charts",
          "Automated end-of-day operational summary reports to mobile",
          "Role-based permission controls to protect sensitive financial data",
        ],
        whoUsesIt: "Founders, Managing Directors & Operational Leaders",
        howItConnects: "Pulls real-time aggregates from all active operational modules.",
      },
      {
        id: "integrations",
        label: "Integrations & Migration",
        eyebrow: "TAILORED CAPABILITY",
        title: "Integrations & Migration",
        bottleneck: "Existing spreadsheets and isolated legacy tools trap historical data in silos.",
        capabilities: [
          "Clean historical data import from Excel, Google Sheets, or legacy databases",
          "Connectors for WhatsApp Business API, SMS Gateways, and Payment Links",
          "Integration with Tally, Zoho Books, or custom internal ERPs",
          "Automated daily cloud backups and 1-click customer data export",
        ],
        whoUsesIt: "IT Leads, Operations Managers & Systems Admins",
        howItConnects: "Provides the underlying data bridge keeping all tools in sync.",
      },
    ],
  },

  /**
   * The method: simplified, direct 6 steps.
   */
  method: {
    eyebrow: "Method",
    title: "How we work",
    chain: ["Understand", "Map", "Identify", "Build", "Train", "Scale"],
    steps: [
      {
        n: "01",
        label: "Understand",
        title: "We learn your daily routine.",
        detail: {
          lead: "We sit with you to see where time and money get lost:",
          chips: [
            "Customer orders",
            "Paper registers",
            "Stock tracking",
            "Staff handoffs",
            "Payment delays",
            "Owner time",
          ],
          close: "We observe your real operations.",
        },
      },
      {
        n: "02",
        label: "Map",
        title: "We map the entire workflow.",
        detail: {
          lead: "Every step visible on one screen:",
          flow: [
            "Customer enquiry",
            "Front desk",
            "Staff execution",
            "Stock update",
            "GST billing",
            "Owner report",
          ],
          close: "We remove double entry and phone call bottlenecks.",
        },
      },
      {
        n: "03",
        label: "Identify",
        title: "We target high-impact fixes.",
        detail: {
          lead: "We focus on changes that save the most hours:",
          chips: [
            "Remove paper registers",
            "WhatsApp bills & receipts",
            "Live mobile stock",
            "1-click P&L reports",
            "Multi-branch sync",
          ],
        },
      },
      {
        n: "04",
        label: "Build",
        title: "We build screens for your team.",
        body: "Tailored to your exact workflow—simple, fast, and easy to use.",
      },
      {
        n: "05",
        label: "Train",
        title: "Hands-on staff training.",
        body: "If your team can use WhatsApp, they can use our system. Zero tech skills needed.",
      },
      {
        n: "06",
        label: "Scale",
        title: "Grows with your business.",
        body: "Add branches, staff, or products without starting from scratch.",
        accent: true,
      },
    ],
  },

  process: {
    eyebrow: "How it works",
    title: "Start. Connect. Scale.",
    lede: "Live results in weeks, not months.",
    steps: [
      {
        name: "Start",
        active: 1,
        body: "We fix your biggest bottleneck (billing or stock) first. Live in 2 to 3 weeks.",
      },
      {
        name: "Connect",
        active: 2,
        body: "We sync your billing, inventory, and staff tasks. Stop entering data twice.",
      },
      {
        name: "Scale",
        active: 3,
        body: "Grow with modern websites, customer portals, and multi-branch dashboards.",
      },
    ],
  },

  testimonials: {
    eyebrow: "What owners say",
    title: "Hours back in your week.",
    lede: "Real results from business owners who simplified their operations.",
    items: [
      {
        quote:
          "Closing the daily books used to take 4 hours every evening. Now it takes 15 minutes on a tablet.",
        name: "Ramesh Aggarwal",
        role: "Aggarwal Wholesale & Distribution",
        avatar: "/assets/testimonials/anita.svg",
      },
      {
        quote:
          "Stock and billing sync automatically now. We stopped paying for items we already had in the back.",
        name: "Devraj Mehta",
        role: "Mehta Hardware & Electricals",
        avatar: "/assets/testimonials/devraj.svg",
      },
      {
        quote:
          "I run three clinic branches from my phone. I see patient visits and collections without calling staff.",
        name: "Dr. Farah Sheikh",
        role: "CarePlus Clinics (3 Branches)",
        avatar: "/assets/testimonials/farah.svg",
      },
      {
        quote:
          "They built the exact billing tool we needed in under 3 weeks. Fast, simple, and zero confusion.",
        name: "Gopal Nair",
        role: "Nair Logistics & Freight",
        avatar: "/assets/testimonials/gopal.svg",
      },
      {
        quote:
          "Two staff members used to spend every Friday re-typing orders. Now invoices generate in 1 click.",
        name: "Meera Krishnan",
        role: "Krishnan Packaged Foods",
        avatar: "/assets/testimonials/meera.svg",
      },
      {
        quote:
          "They told me honestly what not to build. The custom system we did build paid for itself in 2 months.",
        name: "Suresh Pillai",
        role: "Pillai Auto & Heavy Repair Works",
        avatar: "/assets/testimonials/suresh.svg",
      },
    ],
  },

  cta: {
    title: "Ready to run your business on autopilot?",
    body: "Book a free 15-minute call. Plain words, zero tech jargon.",
  },

  nav: [
    { label: "What we build", href: "#offerings" },
    { label: "Our Work", href: "#projects" },
    { label: "How we work", href: "#method" },
  ],

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
