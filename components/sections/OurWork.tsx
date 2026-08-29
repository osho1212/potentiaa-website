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
    alt: "NexLogix ERP & Warehouse Dispatch Terminal",
    title: "NexLogix Warehouse & Dispatch Hub",
    category: "LOGISTICS & INVENTORY",
    industry: "Wholesale & Distribution",
    description:
      "A complete warehouse management terminal replacing manual registers and phone calls. Real-time SKU tracking, barcode verification, and automated route dispatching.",
    impact: "+45% faster dispatch speed and zero lost inventory tickets.",
    features: ["Barcode SKU Scanner", "Live Route Optimization", "Auto-Generated Challans"],
    tags: ["Custom Terminal", "Multi-warehouse", "Offline Sync"],
  },
  {
    id: "billing-reconcile",
    image: "/assets/work/billing-reconcile.jpg",
    alt: "ReconcileHub Automated Billing & Ledger System",
    title: "ReconcileHub Multi-tier Billing Engine",
    category: "BILLING & ACCOUNTS",
    industry: "B2B Supply & Manufacturing",
    description:
      "Unified accounts and invoicing system designed for complex GST rules, credit cycles, and automated payment follow-ups directly over WhatsApp and email.",
    impact: "-80% manual bookkeeping overhead and 14-day reduction in DSO.",
    features: ["WhatsApp Invoice Dispatch", "Automated Bank Reconciliation", "Live Profit Margins"],
    tags: ["GST Compliant", "Automated Ledgers", "Role-based Access"],
  },
  {
    id: "field-ops",
    image: "/assets/work/field-ops.jpg",
    alt: "FieldOps Pro Workforce & Dispatch Suite",
    title: "FieldOps Pro Dispatch & Service Suite",
    category: "FIELD OPERATIONS",
    industry: "On-site Repairs & Services",
    description:
      "A synchronized technician management platform with live GPS dispatching, digital work-order signoffs, and customer SMS tracking.",
    impact: "Doubled daily completed job capacity with 100% digital audit trails.",
    features: ["Live Technician Telemetry", "Digital Customer Signatures", "Instant Billing on Mobile"],
    tags: ["Mobile First", "GPS Dispatch", "Client Portal"],
  },
  {
    id: "strata-analytics",
    image: "/assets/work/strata-analytics.jpg",
    alt: "Strata Executive Business Intelligence Portal",
    title: "Strata Executive Intelligence Portal",
    category: "BUSINESS INTELLIGENCE",
    industry: "Multi-branch Retail & Commerce",
    description:
      "Centralized executive dashboard aggregating fragmented store data into actionable daily cashflow reports, inventory health scores, and customer retention funnels.",
    impact: "Replaced 4-hour daily report generation with live sub-second metrics.",
    features: ["Predictive Stock Depletion", "Live Revenue Heatmaps", "Automated Weekly P&L"],
    tags: ["Real-time BI", "Executive Portal", "Data Pipelines"],
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
            <p className="eyebrow">Case Studies & Systems</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="section-title">Our Work</h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="lede our-work__lede">
              Custom software systems and operational terminals we have engineered for growing businesses to eliminate manual bottlenecks.
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
