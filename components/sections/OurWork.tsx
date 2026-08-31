"use client";

import React from "react";
import Reveal from "../Reveal";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";

export interface ProjectCardData {
  id: string;
  title: string;
  description: string;
  imagePlaceholder: string;
  imageAlt: string;
  features: string[];
}

const PROJECTS: ProjectCardData[] = [
  {
    id: "fquad-website",
    title: "FQUAD Website",
    description: "Website, SEO engine, real-time analytics & custom CMS.",
    imagePlaceholder:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "FQUAD Website Analytics & CMS Dashboard",
    features: ["Website", "SEO Engine", "Analytics", "CMS"],
  },
  {
    id: "raghuvansh-website",
    title: "Raghuvansh Website",
    description: "Luxury brand website, SEO engine, real-time analytics & CMS.",
    imagePlaceholder:
      "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Raghuvansh Luxury Flagship Web Platform",
    features: ["Website", "SEO Engine", "Analytics", "CMS"],
  },
  {
    id: "dental-erp",
    title: "Dental Practice Management",
    description: "Revenue tracking, patient history, lab work pipeline, clinic ledger & chemist management.",
    imagePlaceholder:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Dental Practice Management System Dashboard",
    features: ["Revenue Tracking", "Patient History", "Lab Pipeline", "Clinic Ledger", "Chemist"],
  },
  {
    id: "event-erp",
    title: "Event Management App",
    description: "Complete organisation billing, inventory, labour tracking & revenue tracking.",
    imagePlaceholder:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Event Operations & Production Management System",
    features: ["Billing", "Inventory", "Labour Tracking", "Revenue Tracking"],
  },
  {
    id: "warehouse-hub",
    title: "Warehouse & Dispatch Hub",
    description: "Barcode scanning, 1-click challans, inventory tracking & multi-godown stock sync.",
    imagePlaceholder:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Warehouse & Logistics Inventory Management System",
    features: ["Warehouse ERP", "Barcode Scanner", "1-Click Challans", "Stock Sync"],
  },
  {
    id: "retail-pos",
    title: "Retail POS & Multi-Store",
    description: "1-click GST retail billing, customer credit ledgers & live profit margin tracking.",
    imagePlaceholder:
      "https://images.unsplash.com/photo-1556742049-0a67c5576839?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Retail Cloud POS & Multi-Store Dashboard",
    features: ["Retail POS", "1-Click GST", "Customer Ledger", "Profit Tracking"],
  },
];

export default function OurWork() {
  return (
    <section className="section our-work-section" id="projects" data-theme-key="work">
      <div className="container our-work__container">
        {/* Section Header */}
        <div className="our-work__head">
          <Reveal>
            <p className="eyebrow">Selected Builds</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="section-title">Our Work</h2>
          </Reveal>
        </div>

        {/* 6 Ultra-Transparent Glass 3D Cards with Creative Staggered Placement */}
        <div className="our-work__cards-grid">
          {PROJECTS.map((project, idx) => (
            <div key={project.id} className={`our-work__slot our-work__slot--${idx}`}>
              <Reveal delay={60 * (idx % 3)}>
                <CardContainer className="w-full">
                  <CardBody className="our-work__glass-card group/card">
                    {/* Popping 3D Parallax Image expanding beyond card on hover */}
                    <CardItem
                      translateZ={90}
                      scaleHover={1.12}
                      className="our-work__image-wrapper"
                    >
                      <div className="our-work__image-box">
                        <img
                          src={project.imagePlaceholder}
                          alt={project.imageAlt}
                          loading="lazy"
                          className="our-work__image"
                        />
                        <div className="our-work__image-overlay" />
                      </div>
                    </CardItem>

                    <div className="our-work__content-box">
                      {/* Title */}
                      <CardItem
                        translateZ={45}
                        className="our-work__card-title"
                      >
                        {project.title}
                      </CardItem>

                      {/* Short Feature Description */}
                      <CardItem
                        as="p"
                        translateZ={30}
                        className="our-work__card-desc"
                      >
                        {project.description}
                      </CardItem>

                      {/* Feature Tags */}
                      <CardItem translateZ={40} className="our-work__tags-row">
                        {project.features.map((feat) => (
                          <span key={feat} className="our-work__tag-pill">
                            {feat}
                          </span>
                        ))}
                      </CardItem>
                    </div>
                  </CardBody>
                </CardContainer>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
