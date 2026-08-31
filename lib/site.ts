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
    titleLead: ["Run your business", "without paperwork."],
    titleAccent: ["One live dashboard.", "Zero chaos."],
    primary: "Book a Free Call",
    secondary: "See How It Works",
    hint: ["Move your mouse", "to explore"],
  },

  /**
   * The 6 flow stages - short 2-3 word badges representing the live operational pipeline.
   */
  flow: [
    { title: "Customer", note: "Order placed" },
    { title: "Front Desk", note: "Logged on screen" },
    { title: "Team & Staff", note: "Job assigned" },
    { title: "Stock", note: "Auto-synced" },
    { title: "Billing", note: "1-click GST bill" },
    { title: "Owner", note: "Live profit report" },
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
   * Offerings: 1 short, visual sentence per card.
   */
  work: {
    title: "Our Offerings",
    tabs: [
      {
        id: "build",
        label: "What We Build",
        lede: "Simple custom tools built for how your business already works.",
        items: [
          {
            icon: "chart" as const,
            title: "Owner Dashboards",
            body: "Live sales, expenses, and profits on your phone or PC.",
          },
          {
            icon: "database" as const,
            title: "Paperless Billing",
            body: "Fast GST invoices and automated WhatsApp payment reminders.",
          },
          {
            icon: "package" as const,
            title: "Live Inventory",
            body: "Real-time stock tracking with low-stock alerts.",
          },
          {
            icon: "network" as const,
            title: "Staff & Tasks",
            body: "Assign jobs, track status, and stop miscommunications.",
          },
          {
            icon: "link" as const,
            title: "Growth Websites",
            body: "Modern, fast websites to attract local customers.",
          },
          {
            icon: "cycle" as const,
            title: "WhatsApp Automation",
            body: "Instant order receipts and automated customer updates.",
          },
        ],
      },
      {
        id: "help",
        label: "Who We Help",
        lede: "Built for business owners who want less chaos and faster growth.",
        items: [
          {
            icon: "package" as const,
            title: "Wholesale & Distribution",
            body: "Multi-godown stock, fast challans, and customer credit tracking.",
          },
          {
            icon: "pulse" as const,
            title: "Clinics & Diagnostics",
            body: "Patient visits, pharmacy stock, and 1-click billing.",
          },
          {
            icon: "headset" as const,
            title: "Workshops & Service",
            body: "Mobile job cards, spare parts tracking, and instant bills.",
          },
          {
            icon: "factory" as const,
            title: "Small Factories",
            body: "Raw materials, daily production output, and dispatch logs.",
          },
          {
            icon: "bell" as const,
            title: "Retail & Multi-Branch",
            body: "Central billing and stock sync across all your stores.",
          },
          {
            icon: "graduation" as const,
            title: "Institutes & Academies",
            body: "Student admissions, fee reminders, and attendance in one place.",
          },
        ],
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
