import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `The terms that govern your use of the ${site.name} website.`,
  alternates: { canonical: "/terms" },
};

const { legal, contact } = site;
const domain = site.url.replace(/^https?:\/\//, "");
const courts = legal.jurisdictionCity
  ? `the courts at ${legal.jurisdictionCity}, India`
  : "the competent courts in India";

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of these terms",
    body: (
      <>
        <p>
          These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access to and use of{" "}
          {domain} (the &ldquo;Website&rdquo;), operated by {legal.entityName}{" "}
          (&ldquo;{site.name}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;).
          {legal.address ? ` Our principal place of business is at ${legal.address}.` : ""}
        </p>
        <p>
          By using the Website you agree to these Terms and to our{" "}
          <a href="/privacy">Privacy Policy</a>. If you do not agree, please do not use the
          Website. You must be at least 18 years old, or otherwise legally able to enter into a
          contract under the Indian Contract Act, 1872, to use the Website.
        </p>
      </>
    ),
  },
  {
    id: "our-services",
    title: "About our services",
    body: (
      <>
        <p>
          The Website describes the custom software, websites, consulting, implementation, training
          and support services we offer. It is for general information only.
        </p>
        <p>
          Nothing on the Website is a binding offer. Timelines (for example &ldquo;live in 2 to 3
          weeks&rdquo;), features, integrations and outcomes described here are typical examples
          and are not guaranteed. Every engagement is scoped individually.
        </p>
      </>
    ),
  },
  {
    id: "client-agreements",
    title: "Client projects and agreements",
    body: (
      <p>
        Any project we undertake is governed by a separate written proposal, quotation, statement
        of work or service agreement signed or accepted by both parties (a &ldquo;Client
        Agreement&rdquo;). The Client Agreement sets out the scope, fees, payment terms, delivery,
        ownership of deliverables, support, warranties and data-protection obligations. If a
        Client Agreement conflicts with these Terms, the Client Agreement prevails for that
        project.
      </p>
    ),
  },
  {
    id: "enquiries",
    title: "Enquiries and communications",
    body: (
      <>
        <p>
          When you submit an enquiry or contact us, you confirm that the information you give is
          accurate and that you are authorised to share it, including on behalf of your business.
          Please do not send passwords, card or bank details, or other confidential information
          through the enquiry form.
        </p>
        <p>
          A free call or workflow audit does not create any obligation on either side. Any
          recommendations we make before a Client Agreement is in place are given in good faith,
          for discussion only.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>use the Website for any unlawful, fraudulent or harmful purpose;</li>
          <li>
            submit false information, impersonate any person or business, or send spam or
            unsolicited messages through our forms;
          </li>
          <li>
            try to gain unauthorised access to the Website, its servers or any connected system, or
            interfere with its security or normal operation;
          </li>
          <li>
            introduce viruses, malware or any other harmful code, or overload the Website with
            automated requests;
          </li>
          <li>
            scrape, copy or harvest content or data from the Website using automated means without
            our written permission;
          </li>
          <li>
            use the Website in any way that breaches the Information Technology Act, 2000 or any
            other applicable law.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "Intellectual property",
    body: (
      <>
        <p>
          The Website and its content, including text, graphics, animations, illustrations, the
          {" "}{site.name} name and logo, design and code, are owned by or licensed to{" "}
          {site.name} and are protected by Indian and international copyright and trademark laws.
        </p>
        <p>
          You may view and print pages for your own, non-commercial reference. You may not copy,
          reproduce, modify, distribute, republish or create derivative works from any part of the
          Website without our prior written consent.
        </p>
        <p>
          Ownership of software and other deliverables created for a client is governed solely by
          that client&rsquo;s Client Agreement.
        </p>
      </>
    ),
  },
  {
    id: "case-studies",
    title: "Case studies and testimonials",
    body: (
      <p>
        Case studies, screenshots and testimonials on the Website are shared with the permission of
        the clients concerned and reflect their individual experience. Client names, logos and
        trademarks belong to their respective owners. Results vary from business to business, and
        past results do not guarantee future outcomes.
      </p>
    ),
  },
  {
    id: "third-party-links",
    title: "Third-party links and services",
    body: (
      <p>
        The Website links to third-party services such as WhatsApp and Instagram, and uses
        third-party tools to deliver enquiries. We do not control those services and are not
        responsible for their content, availability or privacy practices. Your use of them is
        governed by their own terms and policies.
      </p>
    ),
  },
  {
    id: "disclaimer",
    title: "Disclaimer",
    body: (
      <p>
        The Website and its content are provided on an &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo; basis. While we try to keep information accurate and up to date, we make
        no warranties, express or implied, about its completeness, accuracy, reliability or
        suitability for any purpose, or that the Website will be uninterrupted, secure or
        error-free. Nothing on the Website is legal, tax, accounting or financial advice.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <>
        <p>
          To the fullest extent permitted by law, {site.name} and its proprietors, directors,
          employees and partners will not be liable for any indirect, incidental, special,
          consequential or punitive loss, or for any loss of profits, revenue, data or business
          opportunity, arising from your use of, or inability to use, the Website.
        </p>
        <p>
          Our liability for services delivered under a Client Agreement is set out only in that
          agreement. Nothing in these Terms limits any liability that cannot be limited under
          Indian law.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    body: (
      <p>
        You agree to indemnify and hold {site.name} harmless from any claims, losses, damages and
        reasonable costs (including legal fees) arising from your breach of these Terms or your
        misuse of the Website.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to the Website and these Terms",
    body: (
      <p>
        We may change, suspend or withdraw any part of the Website at any time. We may also update
        these Terms. The &ldquo;Last updated&rdquo; date above shows the latest version, and your
        continued use of the Website after a change means you accept the updated Terms.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law and disputes",
    body: (
      <>
        <p>
          These Terms are governed by the laws of India. We will first try to resolve any dispute
          amicably. Write to us at {contact.email} and we will respond in good faith.
        </p>
        <p>
          If a dispute cannot be resolved within 30 days, it will be subject to the exclusive
          jurisdiction of {courts}.
        </p>
      </>
    ),
  },
  {
    id: "general",
    title: "General",
    body: (
      <p>
        If any part of these Terms is found to be invalid or unenforceable, the rest will remain in
        full effect. Our failure to enforce any provision is not a waiver of it. These Terms,
        together with our Privacy Policy, form the entire agreement between you and us about the
        use of the Website.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact and grievances",
    body: (
      <>
        <p>
          For questions about these Terms, or to report content or a grievance under the
          Information Technology Act, 2000 and its rules, contact:
        </p>
        <address className="legal__card">
          <strong>{legal.grievanceOfficer || `Grievance Officer, ${legal.entityName}`}</strong>
          {legal.grievanceOfficer ? <span>{legal.entityName}</span> : null}
          {legal.address ? <span>{legal.address}</span> : null}
          <span>
            Email: <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </span>
          <span>
            Phone: <a href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}>{contact.phoneDisplay}</a>
          </span>
        </address>
        <p>We will acknowledge complaints promptly and aim to resolve them within 30 days.</p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms & Conditions"
      intro={
        <p>
          Please read these terms carefully. They explain the rules for using the {site.name}{" "}
          website. Work we do for clients is covered by a separate agreement signed for each
          project.
        </p>
      }
      sections={sections}
    />
  );
}
