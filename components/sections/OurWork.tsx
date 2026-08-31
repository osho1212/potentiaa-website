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
    title: "NexLogix Warehouse & Dispatch Hub",
    category: "WAREHOUSE & STOCK",
    industry: "Wholesale & Distribution",
    description:
      "A simple tablet-based warehouse system replacing handwritten paper registers and phone calls. Real-time stock counts, barcode scanning, and instant delivery challans.",
    impact: "+45% faster dispatch speed and zero lost inventory items.",
    features: ["Barcode Stock Scanner", "Instant Delivery Challans", "Low-Stock WhatsApp Alerts"],
    tags: ["Warehouse Tablet", "Multi-godown", "Offline Friendly"],
  },
  {
    id: "billing-reconcile",
    image: "/assets/work/billing-reconcile.jpg",
    alt: "ReconcileHub Automated Billing and Invoicing",
    title: "ReconcileHub 1-Click Billing Engine",
    category: "BILLING & ACCOUNTS",
    industry: "B2B Supply & Manufacturing",
    description:
      "Fast invoicing and payment tracking built for complex GST rules, credit cycles, and automated payment reminder messages sent directly to clients on WhatsApp.",
    impact: "Saves 2 hours of billing every evening; overdue payments collected 14 days faster.",
    features: ["WhatsApp Invoice Dispatch", "Automated Payment Reminders", "Daily Cash & Profit Report"],
    tags: ["1-Click GST Bills", "Customer Ledger", "Role Permissions"],
  },
  {
    id: "field-ops",
    image: "/assets/work/field-ops.jpg",
    alt: "FieldOps Mobile Service Management App",
    title: "FieldOps Service & Technician App",
    category: "FIELD & REPAIR SERVICES",
    industry: "On-site Repairs & Maintenance",
    description:
      "Technicians receive jobs on their phone, log spare parts used, capture customer signatures, and generate instant bills on-site.",
    impact: "Doubled daily completed service jobs without adding extra office staff.",
    features: ["Mobile Job Assignments", "Digital Customer Sign-off", "Instant Mobile Invoicing"],
    tags: ["Works on Mobile", "Live Job Status", "Customer SMS & WhatsApp"],
  },
  {
    id: "strata-analytics",
    image: "/assets/work/strata-analytics.jpg",
    alt: "Strata Executive Business Dashboard",
    title: "Strata All-in-One Owner Portal",
    category: "OWNER DASHBOARD",
    industry: "Multi-branch Retail & Commerce",
    description:
      "Combined sales and expense books from multiple store branches into a single live dashboard on the owner's mobile phone.",
    impact: "Replaced 4 hours of evening manual calculations with live daily profit and revenue reports.",
    features: ["Live Daily Sales & Expenses", "Multi-Branch Comparison", "Fast-Selling Item Alerts"],
    tags: ["Live on Mobile", "Owner Dashboard", "Automated Daily P&L"],
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
