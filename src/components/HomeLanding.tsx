import { For, createEffect, createSignal } from "solid-js";

import LocaleLink from "~/components/LocaleLink.tsx";

const DARK_MODE_STORAGE_KEY = "pm-navbar-dark-mode-toggle";

interface ParticipationSection {
  index: string;
  badge: string;
  secondaryBadge?: string;
  title: string;
  copy: string[];
  stats: Array<{ value: string; label: string }>;
  bullets: string[];
  visual: "stacks" | "composites" | "earn";
}

interface InfrastructureCard {
  index: string;
  badge: string;
  title: string;
  copy: string;
}

const participationSections: ParticipationSection[] = [
  {
    index: "01",
    badge: "STACKS",
    title: "Custom Stacks",
    copy: [
      "Combine 2 or 3 prediction markets into a single correlated position.",
      "Each quote is priced for dependency before it is signed and verified on-chain.",
    ],
    stats: [
      { value: "3", label: "Legs max" },
      { value: "$10", label: "Min entry" },
      { value: "100x", label: "Max payout" },
    ],
    bullets: [
      "Correlation adjusts pricing before the quote is signed.",
      "Quotes expire in seconds and stale fills are rejected.",
      "Position terms are issued on-chain at placement.",
      "Risk checks run before capital moves.",
    ],
    visual: "stacks",
  },
  {
    index: "02",
    badge: "COMPOSITES",
    title: "Composites",
    copy: [
      "Curated themed stacks package related markets into one reusable thesis.",
      "Each leg still settles independently, but the bundle gives one entry point, one narrative, and one shareable product.",
    ],
    stats: [
      { value: "3", label: "Legs" },
      { value: "Themed", label: "Structure" },
      { value: "Reusable", label: "Flow" },
    ],
    bullets: [
      "Themes turn related markets into one cleaner product surface.",
      "Shared theses make discovery, sharing, and copying much easier.",
      "Leg-level settlement keeps every outcome explicit and inspectable.",
      "The whole stack remains simple enough to reopen, explain, and reuse.",
    ],
    visual: "composites",
  },
  {
    index: "03",
    badge: "LIQUIDITY",
    title: "Earn",
    copy: [
      "Deposit USDC to underwrite active prediction markets through the vault.",
      "Protocol fees and defaulted position flow accrue to the LP side of the stack engine.",
    ],
    stats: [
      { value: "2", label: "Yield streams" },
      { value: "ERC-4626", label: "Vault" },
      { value: "7d", label: "Delay" },
    ],
    bullets: [
      "Vault capital is separated from wallet cash until you deposit.",
      "Withdrawal delay is enforced on-chain for stability.",
      "Reserved liquidity is tracked against active stack exposure.",
      "Portfolio and earn state stay visible in the app in real time.",
    ],
    visual: "earn",
  },
];

const infrastructureCards: InfrastructureCard[] = [
  {
    index: "01",
    badge: "ON-CHAIN",
    title: "Smart Contracts",
    copy: "Signed quotes, ERC-4626 vault accounting, and position receipts settle against immutable contract state.",
  },
  {
    index: "02",
    badge: "REAL-TIME",
    title: "Oracle Resolution",
    copy: "Resolution workers, executors, and indexed state keep market settlement and portfolio status synchronized.",
  },
  {
    index: "03",
    badge: "ADVANCED",
    title: "Risk Engine",
    copy: "Semantic correlation scoring plus copula-based pricing tighten stack quotes before the on-chain checks approve execution.",
  },
];

function applyDocumentTheme(enabled: boolean) {
  if (typeof document === "undefined") {
    return;
  }

  const theme = enabled ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function readInitialDarkModePreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const storedValue = window.localStorage.getItem(DARK_MODE_STORAGE_KEY);

    if (storedValue === "1") {
      return true;
    }

    if (storedValue === "0") {
      return false;
    }
  } catch {
    // Ignore storage failures and fall through to the current document value.
  }

  const currentTheme = document.documentElement.dataset.theme;

  if (currentTheme === "light") {
    return false;
  }

  if (currentTheme === "dark") {
    return true;
  }

  return false;
}

function ThemeToggle(props: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      class="pm-marketing__theme-toggle"
      onClick={props.onToggle}
      aria-label={props.enabled ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span aria-hidden="true">{props.enabled ? "☀" : "☾"}</span>
    </button>
  );
}

function SectionVisual(props: { visual: ParticipationSection["visual"] }) {
  if (props.visual === "stacks") {
    return (
      <div class="pm-marketing__visual-card pm-marketing__visual-card--stacks">
        <p class="pm-marketing__visual-kicker">Payout range</p>
        <div class="pm-marketing__visual-axis">
          <span>10x</span>
          <span>5x</span>
          <span>0</span>
        </div>
        <div class="pm-marketing__stack-bars">
          <div class="pm-marketing__stack-bar pm-marketing__stack-bar--two">
            <strong>~4x</strong>
            <span>2 legs</span>
          </div>
          <div class="pm-marketing__stack-bar pm-marketing__stack-bar--three">
            <strong>~10x</strong>
            <span>3 legs</span>
          </div>
        </div>
      </div>
    );
  }

  if (props.visual === "composites") {
    return (
      <div class="pm-marketing__visual-card pm-marketing__visual-card--composites">
        <p class="pm-marketing__visual-kicker">Proportional outcome</p>
        <div class="pm-marketing__outcome-row">
          <span>Leg A</span>
          <div class="pm-marketing__outcome-track">
            <div class="pm-marketing__outcome-fill pm-marketing__outcome-fill--win">WIN</div>
            <small>pro-rata payout</small>
          </div>
        </div>
        <div class="pm-marketing__outcome-row">
          <span>Leg B</span>
          <div class="pm-marketing__outcome-track pm-marketing__outcome-track--lose">
            <div class="pm-marketing__outcome-fill pm-marketing__outcome-fill--lose">LOSE</div>
            <small>$0</small>
          </div>
        </div>
        <div class="pm-marketing__outcome-row">
          <span>Leg C</span>
          <div class="pm-marketing__outcome-track pm-marketing__outcome-track--void">
            <div class="pm-marketing__outcome-fill pm-marketing__outcome-fill--void">VOID</div>
            <small>refunded</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="pm-marketing__visual-card pm-marketing__visual-card--earn">
      <p class="pm-marketing__visual-kicker">Fee distribution</p>
      <div class="pm-marketing__fee-stack">
        <div class="pm-marketing__fee-fill pm-marketing__fee-fill--lp">LPs</div>
        <div class="pm-marketing__fee-fill pm-marketing__fee-fill--treasury">Treasury</div>
        <div class="pm-marketing__fee-fill pm-marketing__fee-fill--reserve">Reserve</div>
      </div>
      <div class="pm-marketing__fee-row">
        <span>Entry flow</span>
        <div class="pm-marketing__fee-track">
          <div class="pm-marketing__fee-chip">Deposits</div>
          <small>reserved against live stack exposure</small>
        </div>
      </div>
      <div class="pm-marketing__fee-row">
        <span>Withdrawals</span>
        <div class="pm-marketing__fee-track">
          <div class="pm-marketing__fee-chip pm-marketing__fee-chip--secondary">7 day delay</div>
          <small>claim after unlock</small>
        </div>
      </div>
    </div>
  );
}

export default function HomeLanding() {
  const [darkMode, setDarkMode] = createSignal(false);

  createEffect(() => {
    const enabled = readInitialDarkModePreference();
    setDarkMode(enabled);
    applyDocumentTheme(enabled);
  });

  const toggleTheme = () => {
    const next = !darkMode();
    setDarkMode(next);
    applyDocumentTheme(next);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(DARK_MODE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Ignore storage failures and keep the in-memory toggle.
      }
    }
  };

  return (
    <section class="pm-marketing">
      <section class="pm-marketing__hero">
        <header class="pm-marketing__topbar">
          <LocaleLink href="/" class="pm-marketing__brand" aria-label="Lattice home">
            LATTICE
          </LocaleLink>
          <div class="pm-marketing__topbar-actions">
            <ThemeToggle enabled={darkMode()} onToggle={toggleTheme} />
            <LocaleLink href="/" class="pm-marketing__enter-button">
              Enter App
            </LocaleLink>
          </div>
        </header>

        <div class="pm-marketing__hero-inner">
          <div class="pm-marketing__mesh" aria-hidden="true">
            <span class="pm-marketing__mesh-ring pm-marketing__mesh-ring--1" />
            <span class="pm-marketing__mesh-ring pm-marketing__mesh-ring--2" />
            <span class="pm-marketing__mesh-ring pm-marketing__mesh-ring--3" />
            <span class="pm-marketing__mesh-ring pm-marketing__mesh-ring--4" />
            <span class="pm-marketing__mesh-column pm-marketing__mesh-column--1" />
            <span class="pm-marketing__mesh-column pm-marketing__mesh-column--2" />
            <span class="pm-marketing__mesh-column pm-marketing__mesh-column--3" />
          </div>

          <h1 class="pm-marketing__hero-title">LATTICE</h1>
          <p class="pm-marketing__hero-copy">
            Correlation-aware prediction markets on Robinhood Chain with{" "}
            <span>real-time on-chain settlement</span>
          </p>
        </div>
      </section>

      <section class="pm-marketing__content">
        <div class="pm-marketing__chapter-header">
          <p>Three ways to participate</p>
        </div>

        <For each={participationSections}>
          {section => (
            <article class="pm-marketing__chapter">
              <div class="pm-marketing__chapter-copy">
                <div class="pm-marketing__chapter-meta">
                  <span class="pm-marketing__chapter-index">{section.index}</span>
                  <span class="pm-marketing__chapter-badge">{section.badge}</span>
                  {section.secondaryBadge ? (
                    <span class="pm-marketing__chapter-badge pm-marketing__chapter-badge--muted">
                      {section.secondaryBadge}
                    </span>
                  ) : null}
                </div>

                <h2 class="pm-marketing__chapter-title">{section.title}</h2>
                <div class="pm-marketing__chapter-copy-block">
                  <For each={section.copy}>{line => <p>{line}</p>}</For>
                </div>

                <div class="pm-marketing__chapter-stats">
                  <For each={section.stats}>
                    {stat => (
                      <div class="pm-marketing__stat">
                        <strong>{stat.value}</strong>
                        <span>{stat.label}</span>
                      </div>
                    )}
                  </For>
                </div>

                <ul class="pm-marketing__chapter-bullets">
                  <For each={section.bullets}>{bullet => <li>{bullet}</li>}</For>
                </ul>
              </div>

              <div class="pm-marketing__chapter-visual">
                <SectionVisual visual={section.visual} />
              </div>
            </article>
          )}
        </For>

        <section class="pm-marketing__infrastructure">
          <div class="pm-marketing__section-heading">
            <span>Infrastructure</span>
            <h2>Built to last</h2>
          </div>

          <div class="pm-marketing__infrastructure-grid">
            <For each={infrastructureCards}>
              {card => (
                <article class="pm-marketing__infra-card">
                  <div class="pm-marketing__infra-head">
                    <span class="pm-marketing__infra-index">{card.index}</span>
                    <span class="pm-marketing__chapter-badge">{card.badge}</span>
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.copy}</p>
                </article>
              )}
            </For>
          </div>
        </section>

        <section class="pm-marketing__cta">
          <h2>Unlock the potential of prediction markets</h2>
          <p>Stack, compose, and earn on the structured market surface behind Lattice.</p>
          <LocaleLink href="/" class="pm-marketing__launch-button">
            Launch App
          </LocaleLink>
        </section>
      </section>
    </section>
  );
}
