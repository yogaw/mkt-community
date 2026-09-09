import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proposal — Community Market Platform",
  description:
    "Commercial proposal for the development, infrastructure, maintenance and ongoing consulting of a Community Market platform.",
};

const css = `
  .pp { --ink:#16202e; --muted:#5b6779; --faint:#8a94a4; --accent:#1f4fd8; --accent-dark:#1a43b8;
        --accent-soft:#e8eefc; --border:#dfe5ec; --bg:#f6f8fa;
        background:#fff; color:var(--ink); font-size:15px; line-height:1.6; min-height:100vh; }
  .pp * { box-sizing:border-box; }
  .pp .wrap { max-width:1020px; margin:0 auto; padding:0 24px; }

  .pp-top { position:sticky; top:0; z-index:50; background:rgba(255,255,255,.92); backdrop-filter:blur(8px);
            border-bottom:1px solid var(--border); }
  .pp-top .in { max-width:1020px; margin:0 auto; padding:0 24px; height:58px; display:flex; align-items:center; gap:22px; }
  .pp-brand { display:flex; align-items:center; gap:9px; font-weight:700; font-size:15px; color:var(--ink); text-decoration:none; }
  .pp-mark { width:28px; height:28px; border-radius:8px; background:var(--accent); color:#fff; display:inline-flex;
             align-items:center; justify-content:center; font-weight:800; font-size:11px; }
  .pp-nav { display:flex; gap:4px; margin-left:8px; }
  .pp-nav a { padding:6px 11px; border-radius:8px; font-size:13px; font-weight:550; color:var(--muted); text-decoration:none; }
  .pp-nav a:hover { color:var(--ink); background:var(--bg); }

  .pp-hero { padding:76px 0 64px; background:linear-gradient(180deg,#eef2f8 0%,#fff 100%); border-bottom:1px solid var(--border); }
  .pp-kicker { display:inline-block; font-size:11px; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
               color:var(--accent); background:var(--accent-soft); border-radius:999px; padding:5px 14px; margin-bottom:18px; }
  .pp-hero h1 { font-size:clamp(30px,5vw,44px); line-height:1.12; letter-spacing:-.02em; max-width:720px; margin:0; }
  .pp-lead { margin:18px 0 0; font-size:17px; color:var(--muted); max-width:680px; }

  .pp-twocol { display:grid; grid-template-columns:1.1fr .9fr; gap:40px; align-items:start; margin-top:44px; }
  .pp-pillars { display:flex; flex-direction:column; gap:12px; }
  .pp-pillar { border:1px solid var(--border); border-radius:12px; background:#fff; padding:18px 20px; display:flex; gap:14px; }
  .pp-pillar .ic { width:36px; height:36px; flex-shrink:0; border-radius:9px; background:var(--accent-soft); color:var(--accent-dark);
                   display:inline-flex; align-items:center; justify-content:center; }
  .pp-pillar .ic svg { width:19px; height:19px; }
  .pp-pillar h3 { font-size:15px; margin:2px 0 4px; }
  .pp-pillar p { font-size:13px; color:var(--muted); margin:0; }

  .pp-infocard { border:1px solid var(--border); border-radius:14px; background:#fff; padding:6px 22px; }
  .pp-infocard .row { display:flex; justify-content:space-between; gap:18px; padding:13px 0; border-bottom:1px solid var(--border); }
  .pp-infocard .row:last-child { border-bottom:none; }
  .pp-infocard .l { font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--faint); padding-top:2px; }
  .pp-infocard .v { font-size:13.5px; font-weight:600; text-align:right; }

  .pp section { padding:64px 0; scroll-margin-top:70px; }
  .pp section.alt { background:var(--bg); border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
  .pp .sl { font-size:11px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); margin-bottom:10px; }
  .pp h2 { font-size:26px; letter-spacing:-.01em; margin:0 0 10px; }
  .pp .sub { color:var(--muted); max-width:680px; margin:0 0 30px; }

  .pp-grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
  .pp-card { border:1px solid var(--border); border-radius:12px; padding:22px; background:#fff; display:flex; flex-direction:column; }
  .pp-card .ic { width:38px; height:38px; border-radius:9px; background:var(--accent-soft); color:var(--accent-dark);
                 display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px; }
  .pp-card .ic svg { width:20px; height:20px; }
  .pp-card h3 { font-size:15.5px; margin:0 0 6px; }
  .pp-card .desc { font-size:13px; color:var(--muted); margin:0 0 14px; }
  .pp-card ul { list-style:none; margin:0 0 14px; padding:0; flex:1; }
  .pp-card li { font-size:13px; color:var(--muted); padding:4.5px 0 4.5px 16px; position:relative; }
  .pp-card li::before { content:""; position:absolute; left:0; top:12px; width:6px; height:6px; border-radius:2px; background:#c4cedb; }
  .pp-card .keep { font-size:12.5px; color:var(--ink); font-weight:600; border-top:1px solid var(--border); padding-top:12px; margin-top:auto; }

  .pp-phases { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:38px; }
  .pp-phase { border:1px solid var(--border); border-radius:12px; background:#fff; padding:18px 18px 16px; position:relative; }
  .pp-phase .ph { font-size:10.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--accent); }
  .pp-phase h3 { font-size:15px; margin:4px 0 2px; }
  .pp-phase .amt { font-size:17px; font-weight:750; letter-spacing:-.01em; margin:6px 0 4px; }
  .pp-phase p { font-size:12.5px; color:var(--muted); margin:0; }
  .pp-phase::after { content:""; position:absolute; right:-11px; top:50%; width:8px; height:8px; border-top:2px solid var(--faint);
                     border-right:2px solid var(--faint); transform:translateY(-50%) rotate(45deg); }
  .pp-phase:last-child::after { display:none; }

  .pp table { width:100%; border-collapse:collapse; background:#fff; font-size:13.5px; border:1px solid var(--border);
              border-radius:12px; overflow:hidden; }
  .pp th, .pp td { border-bottom:1px solid var(--border); padding:12px 16px; text-align:left; }
  .pp thead th { background:var(--bg); font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); }
  .pp tbody tr:last-child td { border-bottom:none; }
  .pp td.fee, .pp th.fee { text-align:right; }
  .pp td.fee { font-weight:650; white-space:nowrap; }

  .pp-block { margin-top:34px; }
  .pp-block h3 { font-size:17px; letter-spacing:-.01em; margin:0 0 10px; }
  .pp-block p { color:var(--muted); font-size:13.5px; margin:0 0 10px; max-width:760px; }
  .pp-block p b { color:var(--ink); }

  .pp-formula { border:1px solid var(--border); border-left:3px solid var(--accent); border-radius:10px; background:#fff;
                padding:14px 18px; font-size:13.5px; font-weight:600; color:var(--ink); margin:12px 0; }
  .pp-chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
  .pp-chips span { font-size:12px; font-weight:600; color:var(--muted); background:#fff; border:1px solid var(--border);
                   border-radius:999px; padding:5px 13px; }

  .pp-fineprint { margin-top:38px; border:1px solid var(--border); border-radius:12px; background:#fff; padding:18px 22px; }
  .pp-fineprint b.t { display:block; font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
                      color:var(--faint); margin-bottom:8px; }
  .pp-fineprint ul { list-style:none; margin:0; padding:0; columns:2; column-gap:32px; }
  .pp-fineprint li { font-size:12px; color:var(--muted); padding:3px 0; break-inside:avoid; }

  .pp-band { display:grid; grid-template-columns:auto 1fr; gap:34px; align-items:center; background:var(--accent-soft);
             border:1px solid var(--border); border-radius:14px; padding:30px 34px; margin-bottom:26px; }
  .pp-band .pct { font-size:clamp(40px,6vw,56px); font-weight:800; letter-spacing:-.03em; color:var(--accent); line-height:1; }
  .pp-band .pct small { display:block; font-size:12px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
                        color:var(--accent-dark); margin-top:6px; }
  .pp-band p { margin:0; font-size:14px; color:var(--muted); }
  .pp-band p b { color:var(--ink); }

  .pp-note { border:1px solid var(--border); border-left:3px solid var(--accent); border-radius:10px; background:#fff;
             padding:14px 18px; font-size:12.5px; color:var(--muted); }
  .pp-note b { color:var(--ink); display:block; margin-bottom:3px; font-size:13px; }
  .pp-note + .pp-note { margin-top:12px; }

  .pp-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:26px; }
  .pp-term { border:1px solid var(--border); border-radius:12px; padding:20px; background:#fff; }
  .pp-term h3 { font-size:14.5px; margin:0 0 6px; }
  .pp-term p { font-size:13px; color:var(--muted); margin:0; }
  .pp-term p b { color:var(--ink); }

  .pp-steps { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
  .pp-step { border:1px solid var(--border); border-radius:12px; padding:18px 20px; background:#fff; }
  .pp-step .n { font-size:12px; font-weight:750; color:var(--accent); }
  .pp-step h3 { font-size:14.5px; margin:4px 0 3px; }
  .pp-step p { font-size:13px; color:var(--muted); margin:0; }

  .pp-close { background:var(--accent); border-radius:16px; color:#fff; padding:34px 40px; margin-top:34px; }
  .pp-close h2 { color:#fff; font-size:22px; margin:0 0 6px; }
  .pp-close p { color:rgba(255,255,255,.85); margin:0; font-size:14px; max-width:640px; }

  .pp-footer { border-top:1px solid var(--border); margin-top:70px; padding:26px 0 40px; }
  .pp-footer .in { display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap; font-size:13px; color:var(--muted); }

  @media (max-width:900px) {
    .pp-twocol, .pp-grid2 { grid-template-columns:1fr; }
    .pp-grid3 { grid-template-columns:1fr; }
    .pp-phases { grid-template-columns:1fr 1fr; }
    .pp-phases .pp-phase::after { display:none; }
    .pp-steps { grid-template-columns:1fr 1fr; }
    .pp-fineprint ul { columns:1; }
    .pp-band { grid-template-columns:1fr; gap:14px; padding:26px; }
    .pp-nav { display:none; }
  }
  @media (max-width:560px) {
    .pp-phases, .pp-steps { grid-template-columns:1fr; }
  }
`;

const lifecyclePillars = [
  {
    title: "Product Development",
    body: "Design and develop the agreed platform capabilities until production release.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 6l-5 6 5 6" />
        <path d="M16 6l5 6-5 6" />
      </svg>
    ),
  },
  {
    title: "Cloud & Infrastructure",
    body: "Operate the technical infrastructure required to keep the platform available, secure, and scalable.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.5 18a4.5 4.5 0 0 0 .4-9A6 6 0 0 0 6.2 10 4 4 0 0 0 7 18z" />
      </svg>
    ),
  },
  {
    title: "Continuous Partnership",
    body: "Ongoing maintenance, product consultation, optimization, and technical support as the business grows.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      </svg>
    ),
  },
];

const deliveryCards = [
  {
    title: "Platform Setup",
    desc: "The initial technical and product foundation required before full development begins.",
    items: [
      "Product and technical discovery",
      "Platform architecture",
      "Repository and development environment",
      "Initial cloud architecture",
      "CI/CD and deployment setup",
      "Database and environment configuration",
      "Initial product planning",
      "Development roadmap",
    ],
    keep: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    title: "Custom Development",
    desc: "Continuous development of the mutually agreed product scope on a monthly engagement basis.",
    items: [
      "Product development",
      "Frontend and backend engineering",
      "API and integration development",
      "Admin and operational tools",
      "Testing and QA",
      "UAT support",
      "Production deployment",
      "Feature iteration",
    ],
    keep: "Development continues for the mutually agreed development period until the agreed release scope has been delivered.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 18l6-6-6-6" />
        <path d="M8 6l-6 6 6 6" />
      </svg>
    ),
  },
  {
    title: "Cloud, Maintenance & Growth",
    desc: "Once the platform is live, the provider continues to support platform operation and development.",
    items: [
      "Cloud infrastructure management",
      "Deployment",
      "Monitoring",
      "Backup",
      "Performance optimization",
      "Technical maintenance",
      "Bug fixing",
      "Product consultation",
      "Business and technology consultation",
      "Continuous platform improvement",
    ],
    keep: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </svg>
    ),
  },
];

const phases = [
  { phase: "Phase 1", name: "Establish", amount: "Rp15,000,000", desc: "One-time initial setup" },
  { phase: "Phase 2", name: "Build", amount: "Rp20,000,000 / month", desc: "Until the agreed platform scope is delivered" },
  { phase: "Phase 3", name: "Operate", amount: "Cloud + 20%", desc: "Actual cloud consumption plus management fee" },
  { phase: "Phase 4", name: "Grow Together", amount: "2.5% settled GMV", desc: "Continuous maintenance and consulting" },
];

const commercialRows = [
  { component: "Initial Setup", term: "Rp15,000,000 one-time" },
  { component: "Custom Development", term: "Rp20,000,000 / month" },
  { component: "Cloud & Infrastructure", term: "Actual cloud consumption + 20% management margin" },
  { component: "Maintenance & Consulting", term: "2.5% of settled GMV" },
  { component: "Commercial Partnership Term", term: "24 months" },
];

const commercialNotes = [
  "All fees are exclusive of applicable taxes unless otherwise stated.",
  "Third-party services, licenses, payment gateway fees, messaging services, and similar external costs are excluded unless specifically included.",
  "Material requirements outside the agreed development scope may require an adjustment to the development timeline and/or commercial arrangement, subject to mutual agreement.",
  "Cloud infrastructure charges will vary according to actual platform usage and infrastructure requirements.",
  "Revenue sharing will commence following commercial production launch.",
];

const termCards = [
  {
    title: "Development Period",
    body: "Approximately 3 to 6 months, based on the agreed product scope.",
  },
  {
    title: "Commercial Operation Period",
    body: "Continues following production release under the maintenance and revenue-sharing arrangement.",
  },
  {
    title: "Renewal",
    body: "Automatically renewed for successive 12-month periods.",
  },
  {
    title: "Non-Renewal Notice",
    body: "Written notice at least 60 days before the end of the applicable term.",
  },
];

const nextSteps = [
  { n: "01", title: "Commercial Agreement", body: "Confirm commercial structure and partnership terms." },
  { n: "02", title: "Product Scope", body: "Finalize MVP features, priorities, and initial development roadmap." },
  { n: "03", title: "Development & UAT", body: "Build, integrate, test, and validate the agreed platform scope." },
  { n: "04", title: "Go Live & Growth", body: "Launch the platform and transition into continuous maintenance, consulting, and optimization." },
];

export default function ProposalPage() {
  return (
    <div className="pp">
      <style>{css}</style>

      <nav className="pp-top">
        <div className="in">
          <a className="pp-brand" href="#top">
            <span className="pp-mark">CM</span>Community Market
          </a>
          <div className="pp-nav">
            <a href="#overview">Introduction</a>
            <a href="#deliver">Deliverables</a>
            <a href="#commercial">Commercial</a>
            <a href="#partnership">Partnership</a>
            <a href="#next">Next Steps</a>
          </div>
        </div>
      </nav>

      <header className="pp-hero" id="top">
        <div className="wrap">
          <span className="pp-kicker">Proposal · Community Market Platform</span>
          <h1>Build. Operate. Grow.</h1>
          <p className="pp-lead">
            We design, develop, deploy, and continuously support a digital commerce platform that enables
            communities and influencers to connect their audiences with selected products, merchants, and
            commercial opportunities.
          </p>

          <div className="pp-twocol">
            <div className="pp-pillars">
              {lifecyclePillars.map((pillar) => (
                <div className="pp-pillar" key={pillar.title}>
                  <span className="ic">{pillar.icon}</span>
                  <div>
                    <h3>{pillar.title}</h3>
                    <p>{pillar.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pp-infocard">
              <div className="row">
                <span className="l">Prepared For</span>
                <span className="v">[Owner / Company Name]</span>
              </div>
              <div className="row">
                <span className="l">Prepared By</span>
                <span className="v">[Provider / Team Name]</span>
              </div>
              <div className="row">
                <span className="l">Date of Issue</span>
                <span className="v">7 September 2026</span>
              </div>
              <div className="row">
                <span className="l">Validity</span>
                <span className="v">30 days</span>
              </div>
              <div className="row">
                <span className="l">Engagement</span>
                <span className="v">Platform Development &amp; Technology Partnership</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="overview">
        <div className="wrap">
          <div className="pp-twocol" style={{ marginTop: 0 }}>
            <div>
              <div className="sl">The Opportunity</div>
              <h2>From community to commerce</h2>
              <p className="sub" style={{ marginBottom: 0 }}>
                Communities and influencers already hold the attention of their audiences. What is usually
                missing is the commercial layer: a platform that turns that attention into product
                discovery, transactions, and recurring revenue, operated on infrastructure the business
                owns.
              </p>
            </div>
            <div>
              <div className="sl">The Relationship</div>
              <p className="sub" style={{ marginBottom: 0 }}>
                This proposal covers the complete technology lifecycle: establishing the platform,
                delivering the agreed product roadmap, and operating and improving the platform as
                transaction volume grows. It is structured as a long-term technology partnership rather
                than a one-off development engagement.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="deliver" className="alt">
        <div className="wrap">
          <div className="sl">01 · What We Deliver</div>
          <h2>One technology partner, from build to scale</h2>
          <p className="sub">
            The engagement is structured around three stages: establishing the platform, delivering the
            agreed product roadmap, and supporting the platform as transaction volume grows.
          </p>
          <div className="pp-grid3">
            {deliveryCards.map((card) => (
              <div className="pp-card" key={card.title}>
                <span className="ic">{card.icon}</span>
                <h3>{card.title}</h3>
                <p className="desc">{card.desc}</p>
                <ul>
                  {card.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {card.keep ? <p className="keep">{card.keep}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="commercial">
        <div className="wrap">
          <div className="sl">02 · Commercial Model</div>
          <h2>A commercial model aligned with platform growth</h2>
          <p className="sub">
            Rather than relying entirely on a large upfront implementation fee, the engagement combines a
            manageable initial setup, monthly development, transparent infrastructure costs, and a
            long-term revenue-sharing model.
          </p>

          <div className="pp-phases">
            {phases.map((phase) => (
              <div className="pp-phase" key={phase.phase}>
                <span className="ph">{phase.phase}</span>
                <h3>{phase.name}</h3>
                <div className="amt">{phase.amount}</div>
                <p>{phase.desc}</p>
              </div>
            ))}
          </div>

          <table>
            <thead>
              <tr>
                <th>Commercial Component</th>
                <th className="fee">Proposed Term</th>
              </tr>
            </thead>
            <tbody>
              {commercialRows.map((row) => (
                <tr key={row.component}>
                  <td>{row.component}</td>
                  <td className="fee">{row.term}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pp-block">
            <h3>Initial Setup</h3>
            <p>
              A one-time charge covering initial product planning, architecture, environment setup, cloud
              foundation, repository, deployment pipeline, and project initiation.
            </p>
          </div>

          <div className="pp-block">
            <h3>Monthly Custom Development</h3>
            <p>
              Development is charged monthly for an agreed development period. The initial development
              period is approximately <b>3 to 6 months</b>, subject to the final feature scope and roadmap.
              The exact delivery period is confirmed once the initial scope is mutually agreed.
            </p>
            <p>
              If new requirements are introduced that materially change the agreed scope, the development
              schedule may be extended by mutual agreement.
            </p>
          </div>

          <div className="pp-block">
            <h3>Cloud &amp; Infrastructure</h3>
            <div className="pp-formula">
              Monthly Infrastructure Charge = Actual Cloud Consumption + 20% Infrastructure Management Fee
            </div>
            <p>The infrastructure management component covers:</p>
            <div className="pp-chips">
              <span>Infrastructure administration</span>
              <span>Monitoring</span>
              <span>Deployment</span>
              <span>Backup</span>
              <span>Security configuration</span>
              <span>Scaling</span>
              <span>Performance optimization</span>
              <span>Cloud cost optimization</span>
            </div>
            <p style={{ marginTop: 12 }}>
              Cloud consumption is transparent and supported by the relevant cloud provider billing.
            </p>
          </div>

          <div className="pp-fineprint">
            <b className="t">Important Commercial Notes</b>
            <ul>
              {commercialNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="partnership" className="alt">
        <div className="wrap">
          <div className="sl">03 · Maintenance &amp; Continuous Partnership</div>
          <h2>Our incentives grow with the platform</h2>
          <p className="sub">
            After production release, ongoing maintenance and consulting move toward a performance-aligned
            commercial model.
          </p>

          <div className="pp-band">
            <div className="pct">
              2.5%
              <small>of Settled GMV</small>
            </div>
            <p>
              The revenue share compensates the provider for ongoing platform maintenance, technical
              consultation, product consultation, operational support, optimization, and continuous
              improvement. Revenue share is <b>reconciled monthly</b>.
            </p>
          </div>

          <div className="pp-note">
            <b>Definition of Settled GMV</b>
            The gross value of successfully completed and settled transactions processed through the
            platform, excluding cancelled transactions, failed transactions, refunds, and other reversed
            transactions.
          </div>
          <div className="pp-note">
            <b>Treated Separately from the Provider Revenue Share</b>
            Payment gateway charges, merchant commissions, influencer and community commissions,
            promotions, taxes, and other third-party costs are treated separately from the provider
            revenue share.
          </div>

          <div className="pp-block" style={{ marginTop: 44 }}>
            <div className="sl">04 · Partnership Term</div>
            <h2>Built for a long-term partnership</h2>
            <p className="sub">
              The platform requires an initial development period followed by commercial operation and
              optimization. A <b>24-month initial agreement term</b> provides sufficient continuity for
              both parties to develop, launch, stabilize, and scale the platform.
            </p>
            <div className="pp-grid2" style={{ marginBottom: 0 }}>
              {termCards.map((card) => (
                <div className="pp-term" key={card.title}>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </div>
              ))}
            </div>
            <div className="pp-note" style={{ marginTop: 14 }}>
              <b>Minimum Commercial Operation Period</b>
              The commercial operation period shall be no less than 18 months following the initial
              production launch, regardless of the duration of the initial development period.
            </div>
          </div>
        </div>
      </section>

      <section id="next">
        <div className="wrap">
          <div className="sl">05 · Next Steps</div>
          <h2>From agreement to market</h2>
          <p className="sub">Four steps from signing the agreement to operating a growing platform.</p>
          <div className="pp-steps">
            {nextSteps.map((step) => (
              <div className="pp-step" key={step.n}>
                <span className="n">{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>

          <div className="pp-close">
            <h2>Build. Operate. Grow. Together.</h2>
            <p>
              This proposal remains valid for 30 days from the date of issue. We look forward to building
              the Community Market platform with you.
            </p>
          </div>
        </div>
      </section>

      <footer className="pp-footer">
        <div className="wrap in">
          <div>Community Market Platform Proposal</div>
          <div>
            Prepared by [Provider / Team Name] · 7 September 2026 · Valid 30 days
          </div>
        </div>
      </footer>
    </div>
  );
}
