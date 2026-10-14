import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} collects, uses, shares and protects personal data, and the rights you have over it.`,
  alternates: { canonical: "/privacy" },
};

const { legal, contact } = site;
const domain = site.url.replace(/^https?:\/\//, "");
const officer = legal.grievanceOfficer || `Grievance Officer, ${legal.entityName}`;

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <p>
          {legal.entityName} (&ldquo;{site.name}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;,
          &ldquo;our&rdquo;) designs, builds and maintains custom business software, including
          billing, inventory, workflow and management systems, and websites, for businesses in
          India and elsewhere.
          {legal.address ? ` Our principal place of business is at ${legal.address}.` : ""}
        </p>
        <p>
          For personal data collected through this website, we are the &ldquo;Data
          Fiduciary&rdquo; within the meaning of the Digital Personal Data Protection Act, 2023
          (the &ldquo;DPDP Act&rdquo;), meaning we decide why and how that data is processed.
        </p>
      </>
    ),
  },
  {
    id: "scope",
    title: "Scope of this policy",
    body: (
      <>
        <p>
          This policy covers personal data we collect when you visit {domain}, submit
          our enquiry form, or contact us by email, phone, WhatsApp or Instagram.
        </p>
        <p>
          It does <strong>not</strong> cover data that our clients put into the software we build
          or host for them. For that data, the client is the Data Fiduciary and we act only as
          their &ldquo;Data Processor&rdquo;. We process it on their instructions and under our
          written agreement with them. If you are a client&rsquo;s customer or employee, please
          contact that business about your data.
        </p>
      </>
    ),
  },
  {
    id: "data-we-collect",
    title: "Personal data we collect",
    body: (
      <>
        <h3>Information you give us</h3>
        <ul>
          <li>
            <strong>Enquiry form:</strong> your name and business name, phone or WhatsApp number,
            email address (optional), and the message you write.
          </li>
          <li>
            <strong>Direct contact:</strong> whatever you choose to share when you email, call,
            WhatsApp or message us, such as your contact details and information about your
            business and its processes.
          </li>
          <li>
            <strong>Prospective and existing clients:</strong> business contact details, billing
            and GST details, and the correspondence needed to quote for, deliver and invoice a
            project.
          </li>
        </ul>
        <h3>Information collected automatically</h3>
        <p>
          Like any website, our hosting infrastructure may record standard technical data when you
          visit: your IP address, browser and device type, the pages you request, and the date and
          time. We use this only to keep the site secure and working, and it is kept for a limited
          period.
        </p>
        <h3>Cookies and tracking</h3>
        <p>
          This website does not currently use advertising cookies, analytics trackers or
          third-party tracking pixels, and we do not build profiles of visitors. If we add
          analytics in future, we will update this policy and, where the law requires, ask for
          your consent first.
        </p>
        <p>
          The only thing the site stores on your device is the time you last sent an enquiry,
          kept in your browser&rsquo;s local storage so the form can stop an accidental repeat
          submission within a minute. It never leaves your device, and you can clear it at any
          time by clearing your browser&rsquo;s site data.
        </p>
        <p>
          We do not knowingly collect sensitive personal data such as passwords, financial account
          or card details, health or biometric data through this website. Please do not send such
          information in the enquiry form.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use your data",
    body: (
      <>
        <p>We use personal data only for the following purposes:</p>
        <ul>
          <li>to reply to your enquiry and arrange the call or workflow audit you asked for;</li>
          <li>to prepare proposals and quotes, and to enter into and perform a contract with you;</li>
          <li>to provide implementation, training and ongoing support to clients;</li>
          <li>to issue invoices and keep the business and tax records the law requires;</li>
          <li>to keep the website and our systems secure and to prevent misuse;</li>
          <li>to comply with legal obligations and lawful requests from authorities.</li>
        </ul>
        <p>
          We do not sell, rent or trade your personal data. We will not send you marketing
          messages unless you have asked for them, and you can opt out of any such messages at any
          time.
        </p>
      </>
    ),
  },
  {
    id: "legal-basis",
    title: "Why we are allowed to process it",
    body: (
      <>
        <p>
          When you submit the enquiry form or contact us, you give us your consent to use the
          details you provide for the purpose of responding to you. Where you are a client, we also
          process data for &ldquo;legitimate uses&rdquo; permitted under Section 7 of the DPDP Act,
          such as data you voluntarily provide for a specified purpose, and compliance with law.
        </p>
        <p>
          You may withdraw your consent at any time by writing to {contact.email}. This does not
          affect processing that took place before you withdrew it, or records we must keep by law.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who we share it with",
    body: (
      <>
        <p>
          We share personal data only with service providers who help us run our business, and
          only as much as they need:
        </p>
        <ul>
          <li>
            <strong>EmailJS</strong> (emailjs.com), which delivers enquiry-form submissions to our
            inbox;
          </li>
          <li>
            <strong>Vercel</strong>, which hosts this website and processes the technical data
            described above;
          </li>
          <li>our email and cloud infrastructure providers;</li>
          <li>
            <strong>WhatsApp and Instagram</strong> (Meta Platforms), when you choose to contact us
            through them. Their own privacy policies apply to data you share on those platforms;
          </li>
          <li>professional advisers such as accountants, auditors and lawyers, under confidentiality;</li>
          <li>
            government, regulatory or law-enforcement authorities, where required by law or a valid
            legal order.
          </li>
        </ul>
        <p>
          If {site.name} is involved in a merger, acquisition or sale of assets, personal data may
          pass to the new owner, who will be bound by this policy.
        </p>
      </>
    ),
  },
  {
    id: "transfers",
    title: "Transfers outside India",
    body: (
      <p>
        Some of our service providers, including EmailJS, Vercel and our email and cloud providers, may
        store or process data on servers outside India. Where this happens, we transfer data only
        to countries not restricted by the Central Government under Section 16 of the DPDP Act,
        and we rely on providers with recognised security practices.
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <ul>
        <li>
          <strong>Enquiries that do not become projects:</strong> up to 24 months from our last
          contact with you, then deleted.
        </li>
        <li>
          <strong>Client records, contracts and invoices:</strong> for the duration of our
          relationship and afterwards for as long as tax, accounting and other laws require
          (generally up to 8 years).
        </li>
        <li>
          <strong>Technical logs:</strong> for a short, limited period for security purposes.
        </li>
      </ul>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <p>
        We use reasonable security practices and procedures, as required by Section 43A of the
        Information Technology Act, 2000 and the rules made under it, and Section 8(5) of the DPDP
        Act. These include encrypted (HTTPS) connections, access limited to people who need it,
        and trusted service providers. No method of transmission or storage is completely secure,
        but if a personal data breach affecting you occurs, we will notify you and the Data
        Protection Board of India as the law requires.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <p>Under applicable Indian law, you have the right to:</p>
        <ul>
          <li>
            <strong>access</strong> a summary of the personal data we hold about you and how it is
            processed;
          </li>
          <li>
            <strong>correct, complete or update</strong> inaccurate or incomplete data;
          </li>
          <li>
            <strong>erase</strong> your data where it is no longer needed for the purpose it was
            collected for, unless the law requires us to keep it;
          </li>
          <li>
            <strong>withdraw consent</strong> at any time;
          </li>
          <li>
            <strong>nominate</strong> another person to exercise these rights if you die or become
            incapacitated;
          </li>
          <li>
            <strong>have your grievances redressed</strong> by us, and then by the Data Protection
            Board of India if you are not satisfied.
          </li>
        </ul>
        <p>
          To exercise any of these rights, email {contact.email}. We may need to verify your
          identity before acting on a request.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        This website and our services are meant for businesses and are not directed at anyone
        under 18. We do not knowingly collect personal data from children. If you believe a child
        has sent us their data, please contact us and we will delete it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy as our services or the law change. The &ldquo;Last
        updated&rdquo; date at the top shows when it was last revised. If we make significant
        changes, we will highlight them on this website.
      </p>
    ),
  },
  {
    id: "grievance-officer",
    title: "Grievance Officer and contact",
    body: (
      <>
        <p>
          In accordance with the Information Technology Act, 2000, the rules made under it, and the
          DPDP Act, our Grievance Officer is:
        </p>
        <address className="legal__card">
          <strong>{officer}</strong>
          {legal.grievanceOfficer ? <span>{legal.entityName}</span> : null}
          {legal.address ? <span>{legal.address}</span> : null}
          <span>
            Email: <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </span>
          <span>
            Phone: <a href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}>{contact.phoneDisplay}</a>
          </span>
        </address>
        <p>
          We will acknowledge your complaint promptly and resolve it within 30 days. If you are
          not satisfied with our response, you may complain to the Data Protection Board of India.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro={
        <p>
          Your privacy matters to us. This policy explains what personal data {site.name} collects,
          why, who we share it with, and the rights you have. We have written it to comply with the
          Information Technology Act, 2000, the Information Technology (Reasonable Security
          Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and the
          Digital Personal Data Protection Act, 2023 and its rules, to the extent they are in force.
        </p>
      }
      sections={sections}
    />
  );
}
