/**
 * Site content.
 *
 * Copy targeted directly at small-to-medium business owners (ICP):
 * - Focuses on eliminating paper registers and manual data entry.
 * - Live visibility into revenue, expenses, and stock from mobile/PC.
 * - Seamless handoff between staff without constant phone calls or WhatsApp.
 * - Fast modern websites and digital tools to scale with minimal management overhead.
 */

const STOP_RUNNING_ON_PAPER = "Stop running your business on memory, calls, and paper.";

export const site = {
  name: "Potentiaa",
  tagline: "Unlock. Transform. Grow.",

  contact: {
    email: "hello@potentiaa.com",
    whatsapp: "+91 82678 39736",
  },

  hero: {
    titleLead: ["Run your entire business", "without the paperwork."],
    titleAccent: ["Custom software & dashboards", "built for your workflow."],
    primary: "Book a Free Call",
    secondary: "See how it works",
    hint: ["Move your mouse", "to explore"],
  },

  /**
   * The flow cards - the journey an order takes across your business.
   * Demonstrates how operations seamlessly connect from customer to owner.
   */
  flow: [
    { title: "Customer", note: "places order / enquiry" },
    { title: "Front Desk", note: "logs it once on screen" },
    { title: "Team & Staff", note: "sees job & executes" },
    { title: "Stock & Store", note: "inventory auto-updates" },
    { title: "Billing", note: "1-click GST invoice sent" },
    { title: "Owner", note: "live profit & sales report" },
  ],

  /** The section the flow cards settle into as the hero scrolls away. */
  flowSection: {
    eyebrow: "The Daily Bottleneck",
    title: STOP_RUNNING_ON_PAPER,
    body: "When an order arrives, it shouldn't take four phone calls, handwritten notebooks, and WhatsApp messages just to get it done. We connect your entire team on one simple screen.",
  },

  intro: {
    eyebrow: "Common Frustrations",
    title: "Do any of these sound familiar?",
    punchline: "You don't need complex IT. You just need a system that does the routine work for you.",
    problems: [
      {
        index: "01",
        quote: "“I have to call 3 different people just to know today's sales.”",
        diagnosis: "One live dashboard on your phone showing today's revenue, pending orders, and cash flow.",
      },
      {
        index: "02",
        quote: "“We write it in a register first, then type it into a computer later.”",
        diagnosis: "Enter data once. Invoices, stock counts, and customer records update across all screens instantly.",
      },
      {
        index: "03",
        quote: "“If my key manager is absent, work comes to a complete halt.”",
        diagnosis: "Your business procedures and customer records stay organized centrally so anyone can step in.",
      },
      {
        index: "04",
        quote: "“Stock is missing or we order items we already have in the back.”",
        diagnosis: "Live inventory alerts whenever an item is sold, transferred, or runs low.",
      },
      {
        index: "05",
        quote: "“Staff spend half their day forwarding WhatsApp messages and papers.”",
        diagnosis: "Automatic task handoffs between front-desk, field workers, and accounts without endless calls.",
      },
      {
        index: "06",
        quote: "“Calculating monthly profit and expense takes days of spreadsheet work.”",
        diagnosis: "Automated daily P&L reports and expense summaries ready with a single click.",
      },
    ],
  },

  /**
   * Offerings: "What We Build" (tools) and "Who We Help" (industries).
   */
  work: {
    title: "Our Offerings",
    tabs: [
      {
        id: "build",
        label: "What We Build",
        lede: "We don't sell complicated off-the-shelf software. We build simple, customized tools that match how you already work.",
        items: [
          {
            icon: "chart" as const,
            title: "Owner Dashboards",
            body: "See daily sales, total expenses, profit margins, and pending work at a glance on your mobile phone or laptop.",
          },
          {
            icon: "database" as const,
            title: "Paperless Billing & Accounts",
            body: "Create fast GST invoices, send automated payment reminders on WhatsApp, and track who owes you money.",
          },
          {
            icon: "package" as const,
            title: "Live Inventory Tracking",
            body: "Never run out of fast-moving items or lose track of warehouse stock with real-time barcode and batch tracking.",
          },
          {
            icon: "network" as const,
            title: "Staff & Task Management",
            body: "Assign work to team members, track job status in real time, and eliminate internal miscommunications.",
          },
          {
            icon: "link" as const,
            title: "Growth Websites & SEO",
            body: "Modern, high-converting websites to attract local customers, rank higher on Google, and build trust.",
          },
          {
            icon: "cycle" as const,
            title: "WhatsApp & SMS Automation",
            body: "Automatically send order confirmations, dispatch receipts, and customer updates without typing them by hand.",
          },
        ],
      },
      {
        id: "help",
        label: "Who We Help",
        lede: "Established businesses run by owners who want to spend less time micromanaging daily operations and more time expanding.",
        items: [
          {
            icon: "package" as const,
            title: "Wholesalers & Distributors",
            body: "Stop order mix-ups. Track multi-warehouse stock, dispatch challans, and customer credit limits effortlessly.",
          },
          {
            icon: "pulse" as const,
            title: "Clinics & Diagnostic Labs",
            body: "Connect patient appointments, doctor prescriptions, pharmacy inventory, and lab billing into one seamless flow.",
          },
          {
            icon: "headset" as const,
            title: "Service & Repair Workshops",
            body: "Track job cards, technician assignments, spare parts used, and generate instant bills upon completion.",
          },
          {
            icon: "factory" as const,
            title: "Manufacturers & Small Factories",
            body: "Track raw materials, daily production output, machine maintenance, and dispatch records accurately.",
          },
          {
            icon: "bell" as const,
            title: "Retail & Multi-Branch Stores",
            body: "Manage billing, stock transfers, and daily branch sales from a single central screen on your phone.",
          },
          {
            icon: "graduation" as const,
            title: "Training Institutes & Academies",
            body: "Manage student admissions, fee payment reminders, attendance, and batch scheduling in one place.",
          },
        ],
      },
    ],
  },

  /**
   * The method: straightforward 6-step onboarding designed for non-technical owners.
   */
  method: {
    eyebrow: "Method",
    title: "How we work",
    chain: ["Understand", "Map", "Identify", "Build", "Train", "Scale"],
    steps: [
      {
        n: "01",
        label: "Understand",
        title: "We learn how your business actually runs.",
        detail: {
          lead: "We sit down with you and your key team members to understand the daily routine:",
          chips: [
            "how customer orders come in",
            "who writes them down",
            "what gets recorded on paper",
            "where stock is tracked",
            "where money or receipts get delayed",
            "what staff have to do manually",
            "what causes daily confusion",
            "what takes up the owner's personal time",
          ],
          close: "No assumptions. We observe your real operations.",
        },
      },
      {
        n: "02",
        label: "Map",
        title: "We map the entire flow from enquiry to cash in bank.",
        detail: {
          lead: "We lay out every step so you can see your business clearly on one page:",
          flow: [
            "Customer enquiry",
            "Front desk / reception",
            "Staff assignment",
            "Work execution",
            "Stock update",
            "Billing & GST",
            "Payment collection",
            "Owner dashboard",
          ],
          close:
            "Then we spot the bottlenecks: Where is information entered twice? Where are staff calling each other? Where is money slipping through the cracks?",
        },
      },
      {
        n: "03",
        label: "Identify",
        title: "We pinpoint the high-impact fixes.",
        detail: {
          lead: "You don't need complicated tech everywhere. We focus on the high-ROI fixes that save the most time and money:",
          chips: [
            "eliminating handwritten paper registers",
            "automatic WhatsApp bills & receipts",
            "1-click daily cash & sales reports",
            "instant low-stock alerts",
            "connecting branch sales to head office",
            "streamlining staff job approvals",
            "automated customer follow-ups",
            "custom mobile-friendly screens",
          ],
        },
      },
      {
        n: "04",
        label: "Build",
        title: "We build custom screens for your exact workflow.",
        body: "Your software is tailored to your business terms and daily habits—not a rigid, generic template that forces your staff to change how they talk.",
      },
      {
        n: "05",
        label: "Train",
        title: "We train your team hands-on until they're 100% confident.",
        body: "Your staff don't need any computer expertise. If they can send a message on WhatsApp, they can use our software. We guide them step-by-step during launch.",
      },
      {
        n: "06",
        label: "Scale",
        title: "Your system grows as your business expands.",
        body: "When you open a new branch, hire more staff, or add new products, your system adapts seamlessly without rebuilding from scratch.",
        accent: true,
      },
    ],
  },

  process: {
    eyebrow: "How it works",
    title: "Start. Connect. Scale.",
    lede: "A practical 3-phase roadmap that delivers results in weeks, not months.",
    steps: [
      {
        name: "Start",
        active: 1,
        body: "We pick the single bottleneck costing you the most time or money (like manual billing or lost stock) and fix it first. Live in 2 to 3 weeks.",
      },
      {
        name: "Connect",
        active: 2,
        body: "We link your billing, inventory, and staff tasks together. You stop typing the same customer or product details twice.",
      },
      {
        name: "Scale",
        active: 3,
        body: "With the daily chaos automated, we help you grow with modern marketing websites, customer portals, and multi-branch dashboards.",
      },
    ],
  },

  testimonials: {
    eyebrow: "What owners say",
    title: "The proof is in the hours you get back.",
    lede: "Real experiences from business owners who simplified their operations.",
    items: [
      {
        quote:
          "We used to spend 4 hours every evening tallying paper registers and dispatch notes. Now it takes 15 minutes on a tablet, and I can see today's profit from home.",
        name: "Ramesh Aggarwal",
        role: "Aggarwal Wholesale & Distribution",
        avatar: "/assets/testimonials/anita.svg",
      },
      {
        quote:
          "Stock and billing used to cause endless arguments between our warehouse and sales desk. Now they sync automatically—we stopped ordering items we already had.",
        name: "Devraj Mehta",
        role: "Mehta Hardware & Electricals",
        avatar: "/assets/testimonials/devraj.svg",
      },
      {
        quote:
          "I run three clinic branches directly from my mobile phone. I know how many patients visited and total collections without having to call each receptionist.",
        name: "Dr. Farah Sheikh",
        role: "CarePlus Clinics (3 Branches)",
        avatar: "/assets/testimonials/farah.svg",
      },
      {
        quote:
          "They built the exact billing system we needed in under 3 weeks. No confusing menus, no expensive IT consultants—just a screen that works.",
        name: "Gopal Nair",
        role: "Nair Logistics & Freight",
        avatar: "/assets/testimonials/gopal.svg",
      },
      {
        quote:
          "Two staff members used to spend every Friday re-typing customer orders into spreadsheets. Now invoices and challans generate with one click.",
        name: "Meera Krishnan",
        role: "Krishnan Packaged Foods",
        avatar: "/assets/testimonials/meera.svg",
      },
      {
        quote:
          "What convinced me was their honesty: they told me which ideas were a waste of money. The custom system we built paid for itself in two months.",
        name: "Suresh Pillai",
        role: "Pillai Auto & Heavy Repair Works",
        avatar: "/assets/testimonials/suresh.svg",
      },
    ],
  },

  cta: {
    title: "Ready to get your business off paper and onto autopilot?",
    body: "Book a free 15-minute consultation. We'll show you exactly where software can save you hours every day—in plain words, no tech jargon.",
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
