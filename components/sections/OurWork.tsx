"use client";

import React, { useState, useCallback } from "react";
import Reveal from "../Reveal";
import DepthCarousel, { type DepthCarouselItem } from "../DepthCarousel";

export interface ProjectItem extends DepthCarouselItem {
  id: string;
  image: string;
  alt: string;
  title: string;
  category: string;
  industry: string;
  description: string;
  impact: string;
  features: string[];
  tags: string[];
}

const PROJECTS: ProjectItem[] = [
  {
    id: "erp-dispatch",
    image: "/assets/work/erp-dispatch.jpg",
    alt: "NexLogix Warehouse and Dispatch System",
    title: "NexLogix Warehouse Hub",
    category: "WAREHOUSE & STOCK",
    industry: "Wholesale & Distribution",
    description:
      "Tablet-based warehouse app replacing paper registers with barcode scanning and instant challans.",
    impact: "+45% faster dispatch • Zero lost stock",
    features: ["Barcode Scanner", "1-Click Challans", "Low-Stock Alerts"],
    tags: ["Tablet App", "Multi-godown", "Offline Ready"],
  },
  {
    id: "billing-reconcile",
    image: "/assets/work/billing-reconcile.jpg",
    alt: "ReconcileHub Automated Billing and Invoicing",
    title: "ReconcileHub 1-Click Billing",
    category: "BILLING & ACCOUNTS",
    industry: "B2B Supply & Manufacturing",
    description:
      "Fast GST invoicing with automated WhatsApp payment reminders and live daily cashflow reports.",
    impact: "Saves 2 hrs/day • Dues collected 14 days faster",
    features: ["WhatsApp Invoices", "Payment Reminders", "Live Profit Report"],
    tags: ["1-Click GST", "Customer Ledger", "Daily P&L"],
  },
  {
    id: "field-ops",
    image: "/assets/work/field-ops.jpg",
    alt: "FieldOps Mobile Service Management App",
    title: "FieldOps Service App",
    category: "FIELD & REPAIR SERVICES",
    industry: "On-site Repairs & Maintenance",
    description:
      "Mobile job assignments, spare parts tracking, and digital customer sign-off on the spot.",
    impact: "2x completed jobs • 100% digital receipts",
    features: ["Mobile Dispatch", "Digital Sign-off", "Instant Mobile Bills"],
    tags: ["Mobile App", "Live Status", "SMS & WhatsApp"],
  },
  {
    id: "strata-analytics",
    image: "/assets/work/strata-analytics.jpg",
    alt: "Strata Executive Business Dashboard",
    title: "Strata All-in-One Portal",
    category: "OWNER DASHBOARD",
    industry: "Multi-branch Retail & Commerce",
    description:
      "Multi-branch sales, stock, and expense dashboard accessible directly from the owner's phone.",
    impact: "Zero evening paperwork • Live phone metrics",
    features: ["Multi-Store Sales", "Expense Tracker", "Automated Daily P&L"],
    tags: ["Mobile Dashboard", "Multi-Store", "Live Metrics"],
  },
];

export default function OurWork() {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeProject = PROJECTS[activeIdx] || PROJECTS[0];

  const handleCarouselChange = useCallback((idx: number) => {
    setActiveIdx(idx);
  }, []);

  return (
    <section className="section our-work-section" id="projects" data-theme-key="work">
      <div className="container our-work__container">
        {/* Section Header */}
        <div className="our-work__head">
          <Reveal>
            <p className="eyebrow">Real Solutions & Results</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="section-title">Our Work</h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="lede our-work__lede">
              Real systems and dashboards we built for growing businesses to eliminate paperwork, connect staff, and track profits.
            </p>
          </Reveal>
        </div>

        {/* 1-Viewport Split: Carousel on Left, White Description Box on Right */}
        <div className="our-work__grid-layout">
          {/* Left: 3D DepthCarousel with Bigger Images */}
          <div className="our-work__carousel-pane">
            <DepthCarousel
              items={PROJECTS}
              cardWidth={500}
              cardHeight={360}
              radius={16}
              depth={190}
              spread={70}
              tilt={16}
              tiltDirection="right"
              perspective={1400}
              visibleCards={3}
              falloff={0.18}
              blur={4}
              autoplay={false}
              loop
              showControls
              showIndicators
              onChange={handleCarouselChange}
            />
          </div>

          {/* Right: White Description Card */}
          <div className="our-work__details-pane">
            <Reveal key={activeProject.id} delay={40}>
              <div className="our-work__white-card">
                <div className="our-work__card-header">
                  <span className="our-work__category-badge">{activeProject.category}</span>
                  <span className="our-work__industry-tag">{activeProject.industry}</span>
                </div>

                <h3 className="our-work__card-title">{activeProject.title}</h3>

                <p className="our-work__card-desc">{activeProject.description}</p>

                {/* Impact Highlight */}
                <div className="our-work__impact-card">
                  <span className="our-work__impact-label">Business Impact</span>
                  <p className="our-work__impact-text">{activeProject.impact}</p>
                </div>

                {/* Key Capabilities List */}
                <div className="our-work__features-list">
                  {activeProject.features.map((feat) => (
                    <div key={feat} className="our-work__feature-item">
                      <span className="our-work__feature-check">✓</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Tag Pills */}
                <div className="our-work__tags-row">
                  {activeProject.tags.map((tag) => (
                    <span key={tag} className="our-work__tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
