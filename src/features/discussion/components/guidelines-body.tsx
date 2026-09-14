/**
 * The long form of the sidebar card. One component, rendered both in the modal
 * on the board and on /discussion/guidelines, so the two can never drift.
 */
const SECTIONS: Array<{ heading: string; body: string; points?: string[] }> = [
  {
    heading: "What this board is for",
    body:
      "Piranha's discussion board is a curated research space, not an open forum. Discussions are opened by the desk around a specific question — a market outlook, a sector, a stock, a decision you have to make. Your comments are the substance of it.",
  },
  {
    heading: "Who can start a discussion",
    body:
      "Only admins. This keeps the board a set of researched questions rather than a feed, and it is enforced by the API, not just by hiding a button. If there is a topic you want opened, raise it in the closest existing thread and the desk will pick it up.",
  },
  {
    heading: "How to comment well",
    body: "The useful comments on this board tend to share a few things.",
    points: [
      "Give the reasoning, not just the conclusion. \"I am long banks\" tells nobody anything; why you are tells them something.",
      "Say what would change your mind. A view with no invalidation point is a position, not an argument.",
      "Disagree with the argument rather than the person. The best threads here are ones where somebody changed their view.",
      "If you are holding the stock you are talking about, say so.",
    ],
  },
  {
    heading: "What gets removed",
    body:
      "Pump requests, referral links, undisclosed promotion, personal attacks, and anything presented as certainty that is not. Moderators hide comments rather than deleting them where a reply chain depends on them, so the conversation stays readable.",
  },
  {
    heading: "Signals are not instructions",
    body:
      "Everything published here — signals, outlooks, sector notes — is research. It is not financial advice and it is not sized for your portfolio. You are responsible for your own positions.",
  },
];

export function GuidelinesBody() {
  return (
    <div className="space-y-6">
      {SECTIONS.map((section) => (
        <section key={section.heading}>
          <h3 className="text-base font-semibold text-ink">{section.heading}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{section.body}</p>
          {section.points ? (
            <ul className="mt-3 space-y-2">
              {section.points.map((point) => (
                <li key={point} className="flex gap-3 text-sm leading-relaxed text-ink-muted">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {point}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
