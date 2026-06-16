export interface DocsCard {
  title: string;
  body: string;
  badge?: string;
}

export interface DocsTable {
  columns: string[];
  rows: string[][];
}

export type DocsBlock =
  | { type: "paragraphs"; values: string[] }
  | { type: "callout"; value: string }
  | { type: "bullets"; values: string[] }
  | { type: "ordered"; values: string[] }
  | { type: "cards"; columns?: 2 | 3; values: DocsCard[] }
  | { type: "table"; value: DocsTable }
  | { type: "code"; language?: string; value: string };

export interface DocsSection {
  id: string;
  title: string;
  blocks: DocsBlock[];
}

export interface DocsPage {
  slug: string;
  group: string;
  label: string;
  eyebrow: string;
  title: string;
  summary: string;
  sections: DocsSection[];
}

export interface DocsGroup {
  title: string;
  pages: Array<Pick<DocsPage, "slug" | "label">>;
}

export const DOCS_PAGES: DocsPage[] = [
  {
    slug: "overview",
    group: "Getting Started",
    label: "Overview",
    eyebrow: "Getting Started",
    title: "Lattice Overview",
    summary:
      "Lattice is a correlation-aware structured prediction market. It replaces naive parlay multiplication with deterministic joint pricing, executes stacks through sponsored smart accounts, and turns positions into shareable, copyable financial products.",
    sections: [
      {
        id: "what-lattice-fixes",
        title: "What Lattice fixes",
        blocks: [
          {
            type: "paragraphs",
            values: [
              "Traditional multi-outcome products estimate a stack by multiplying raw leg probabilities as if every event were independent. That assumption breaks quickly in real prediction markets, where elections, rates, oil, wars, sports tournaments, and crypto prices often share the same entities, timelines, catalysts, or logical implications.",
              "Lattice replaces cosmetic parlay logic with correlation-aware pricing. The product uses a deterministic semantic engine, a Gaussian-copula joint model, and on-chain quote verification so the consumer surface can stay simple while the protocol layer stays economically defensible.",
            ],
          },
          {
            type: "code",
            language: "text",
            value:
              "Naive baseline: P(stack) = P1 * P2 * ... * Pn\nEffective joint probability: C_rho(P1, P2, ... Pn)\nPayout multiple: (1 - protocol risk premium) / effective joint probability",
          },
        ],
      },
      {
        id: "product-pillars",
        title: "Product pillars",
        blocks: [
          {
            type: "cards",
            values: [
              {
                badge: "Pricing",
                title: "Correlation-aware stacks",
                body: "Every stack is priced from a joint model instead of pretending every leg is independent.",
              },
              {
                badge: "Liquidity",
                title: "Vault-backed execution",
                body: "USDC liquidity sits behind the structured product engine with reservation logic and delayed withdrawals.",
              },
              {
                badge: "Distribution",
                title: "Social stack surfaces",
                body: "Bet codes, share cards, rooms, comments, copying, and leaderboards turn positions into reusable content.",
              },
            ],
          },
          {
            type: "callout",
            value:
              "Lattice is not AI generating arbitrary odds. The pricing path is deterministic and bounded. AI is used as an explanation layer on top of the same quote math.",
          },
        ],
      },
    ],
  },
  {
    slug: "buildathon-progress",
    group: "Getting Started",
    label: "Buildathon Progress",
    eyebrow: "Getting Started",
    title: "Buildathon Progress",
    summary:
      "During the buildathon, Lattice moved from a multi-market execution prototype into a complete correlation-priced prediction market with liquidity, social distribution, account abstraction, and cached read models.",
    sections: [
      {
        id: "what-shipped",
        title: "What shipped",
        blocks: [
          {
            type: "bullets",
            values: [
              "Stack Engine V3 Gaussian Copula pricing with semantic fingerprints, signed pairwise relationships, positive-definite correlation matrices, Cholesky transforms, antithetic Halton sampling, Frechet bounds, and a strict 100x cap.",
              "Full stack lifecycle from live market ingestion and quote generation to EIP-712 signing, sponsored execution, position receipts, indexing, settlement tracking, and reusable bet-code generation.",
              "Live LP experience with wallet funding, vault deposits, vault shares, ownership tracking, utilization, delayed redemptions, and claim surfaces backed by on-chain reads.",
              "Social and distribution surfaces including market rooms, posts, threaded comments, reactions, presence, builder leaderboards, shareable PNG stack cards, rich social previews, one-click stack copying, onboarding, localization, and portfolio storytelling.",
            ],
          },
        ],
      },
      {
        id: "math-hardening",
        title: "Math and reliability hardening",
        blocks: [
          {
            type: "paragraphs",
            values: [
              "The buildathon work was not only UI work. The biggest upgrade was replacing naive multiplication with a bounded joint-pricing engine that can explain why correlated legs compress payouts and why unrelated legs stay closer to the independence baseline.",
              "Execution was also hardened against real account-abstraction failure modes. The backend now handles bundler receipt propagation, delayed RPC indexing, consumed quotes, asynchronous position hydration, and transaction reconciliation without mislabeling successful executions as failures.",
            ],
          },
        ],
      },
      {
        id: "quote-visibility",
        title: "What users can see now",
        blocks: [
          {
            type: "cards",
            columns: 2,
            values: [
              {
                badge: "Quote",
                title: "Transparent math",
                body: "Quotes can expose the independence baseline, effective probability, protocol edge, correlation adjustment, return multiple, and payout-cap status.",
              },
              {
                badge: "Read models",
                title: "Market-fast pages",
                body: "Portfolio, Earn, Leaderboard, rooms, and share-card views are cached so they behave like trading surfaces, not slow admin dashboards.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "system-architecture",
    group: "Getting Started",
    label: "System Architecture",
    eyebrow: "Getting Started",
    title: "System Architecture",
    summary:
      "Lattice is split into a Solid frontend, a Rust backend, and a Solidity contract system on Robinhood Chain Testnet. Each layer has a hard responsibility boundary.",
    sections: [
      {
        id: "three-layers",
        title: "Three layers",
        blocks: [
          {
            type: "cards",
            values: [
              {
                badge: "Frontend",
                title: "Solid app",
                body: "Discovery, builder UX, portfolio, earn, leaderboard, rooms, localization, onboarding, share cards, and docs.",
              },
              {
                badge: "Backend",
                title: "Rust services",
                body: "Market ingestion, quote math, AI explainers, caching, portfolio reads, smart-account execution, indexing, and settlement orchestration.",
              },
              {
                badge: "Contracts",
                title: "Protocol layer",
                body: "QuoteVerifier, LatticeCore, LPVault, PositionToken, ReferenceRegistry, SettlementManager, and CompositeVault.",
              },
            ],
          },
        ],
      },
      {
        id: "request-lifecycle",
        title: "Request lifecycle",
        blocks: [
          {
            type: "ordered",
            values: [
              "User selects legs manually, loads a bet code, or copies a shared stack.",
              "Frontend requests a quote from the backend instead of pricing locally.",
              "Backend normalizes market inputs, computes the semantic relationship model, runs joint pricing, signs an executable quote, and persists canonical ordered legs.",
              "User executes the quote through the sponsored smart-account path.",
              "Contracts verify the quote, reserve liquidity, escrow stake, and mint a position receipt.",
              "Workers later reconcile the position, monitor outcome resolution, and settle deterministically with the original ordered leg list.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "custom-stacks",
    group: "Products",
    label: "Custom Stacks",
    eyebrow: "Products",
    title: "Custom Stacks",
    summary:
      "Custom Stacks are the main consumer product: 2 to 3 correlated legs, one signed quote, one on-chain execution, and one position receipt tied to a shareable thesis.",
    sections: [
      {
        id: "product-shape",
        title: "Product shape",
        blocks: [
          {
            type: "table",
            value: {
              columns: ["Parameter", "Current value", "Why it matters"],
              rows: [
                ["Minimum leg count", "2", "Keeps the product focused on structured positions rather than single-market flow."],
                ["Maximum leg count", "3", "Bounds pricing, execution, and current protocol risk."],
                ["Payout cap", "100x", "Prevents extreme long-tail payouts from draining LP liquidity."],
                ["Quote validity window", "30 days", "Signed quotes expire if not executed inside the configured window."],
              ],
            },
          },
        ],
      },
      {
        id: "share-and-copy",
        title: "Share and copy surfaces",
        blocks: [
          {
            type: "bullets",
            values: [
              "Every confirmed position can become a reusable bet code.",
              "Shared stacks can be reopened in the builder in one tap.",
              "The share surface includes a dedicated public stack page plus a PNG-style visual share card flow.",
              "Copying is not an afterthought. It is a first-class distribution primitive for the structured product.",
            ],
          },
          {
            type: "code",
            language: "text",
            value:
              "LatticeCore.executeStack(quote, legs, signature)\n  -> QuoteVerifier validates recipient, expiry, signature, and legs commitment\n  -> LPVault escrows stake and reserves payout exposure\n  -> PositionToken mints the receipt used by portfolio and share flows",
          },
        ],
      },
    ],
  },
  {
    slug: "social-and-distribution",
    group: "Products",
    label: "Social & Distribution",
    eyebrow: "Products",
    title: "Social And Distribution",
    summary:
      "Lattice is designed so structured prediction positions can move through the product as content, not only as private transactions.",
    sections: [
      {
        id: "social-surfaces",
        title: "Social surfaces",
        blocks: [
          {
            type: "cards",
            values: [
              {
                badge: "Rooms",
                title: "Live thesis rooms",
                body: "Market rooms let users post a thesis, attach bet codes, react, and track live presence around a category or event.",
              },
              {
                badge: "Comments",
                title: "Threaded market comments",
                body: "Market detail pages support comment threads, replies, and likes instead of forcing discussion into external channels.",
              },
              {
                badge: "Competition",
                title: "Builder leaderboard",
                body: "Realized PnL, accuracy, streak, biggest hit, and best multiple make the market feel alive and competitive.",
              },
            ],
          },
        ],
      },
      {
        id: "distribution-features",
        title: "Distribution features",
        blocks: [
          {
            type: "bullets",
            values: [
              "Shareable stack cards with a public deep link back into the exact stack.",
              "Rich social previews for shared stack pages.",
              "One-click stack copying from bet codes and public receipts.",
              "Curated composites and themed theses that make distribution easier than sharing raw leg lists.",
              "Guided onboarding and multilingual discovery so the product is legible before the first trade.",
              "Portfolio storytelling that turns positions into best calls, worst calls, biggest exposure, and recent outcomes instead of a flat table.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "earn",
    group: "Products",
    label: "Earn",
    eyebrow: "Products",
    title: "Earn",
    summary:
      "Earn is the LP-facing surface. Users deposit USDC into the vault, receive shares, reserve capital for live stack exposure, and redeem through a delayed withdrawal flow.",
    sections: [
      {
        id: "vault-mechanics",
        title: "Vault mechanics",
        blocks: [
          {
            type: "cards",
            values: [
              {
                badge: "Collateral",
                title: "USDC vault",
                body: "Mock USDC on Robinhood Chain Testnet is the collateral asset used by LP accounting in the live environment.",
              },
              {
                badge: "Delay",
                title: "7-day withdrawal delay",
                body: "Pending redeems wait through a delay before they become claimable, reducing bank-run behavior during live exposure.",
              },
              {
                badge: "Accounting",
                title: "Share-price model",
                body: "Users hold vault shares, not fixed promises. Ownership and asset value come from live vault accounting.",
              },
            ],
          },
        ],
      },
      {
        id: "lp-experience",
        title: "LP experience",
        blocks: [
          {
            type: "bullets",
            values: [
              "Fund wallet cash, then move that cash into the vault with a dedicated deposit flow.",
              "Track total deposited, available liquidity, reserved liquidity, escrowed stake, utilization, and user ownership.",
              "View pending redeems, unlock date, claim status, and live share price without leaving the main Earn surface.",
              "Projection surfaces can show how current yield assumptions translate into future value over longer holding horizons.",
            ],
          },
          {
            type: "table",
            value: {
              columns: ["Endpoint", "Purpose"],
              rows: [
                ["GET /me/earn", "Authenticated vault overview, LP ownership, pending redeem state, and live vault metrics."],
                ["POST /me/earn/deposit", "Move wallet cash into the vault and mint shares."],
                ["POST /me/earn/redeem/request", "Begin the delayed withdrawal flow."],
                ["POST /me/earn/redeem/cancel", "Cancel a pending redeem before claim."],
                ["POST /me/earn/redeem/claim", "Claim redeemable liquidity after the delay clears."],
              ],
            },
          },
        ],
      },
    ],
  },
  {
    slug: "backend-overview",
    group: "Backend",
    label: "Backend Overview",
    eyebrow: "Backend",
    title: "Backend Overview",
    summary:
      "The backend is the economic and operational control plane of Lattice. It owns quote math, canonical leg persistence, AI explainers, cached read models, execution orchestration, and settlement preparation.",
    sections: [
      {
        id: "responsibilities",
        title: "Primary responsibilities",
        blocks: [
          {
            type: "bullets",
            values: [
              "Ingest and normalize market data used by the stack engine.",
              "Compute correlation-aware stack pricing and sign executable quotes.",
              "Persist quote, leg-order, position, portfolio, and social read-model state.",
              "Expose authenticated product surfaces such as portfolio and earn.",
              "Run background workers for indexing, reconciliation, settlement, and cache refresh.",
              "Handle gas-sponsored account-abstraction execution on Robinhood Chain Testnet.",
            ],
          },
        ],
      },
      {
        id: "service-split",
        title: "Service split",
        blocks: [
          {
            type: "cards",
            values: [
              {
                badge: "Live routes",
                title: "Request path",
                body: "Quote generation, execution, AI endpoints, portfolio reads, earn reads, leaderboards, rooms, and share-card payloads.",
              },
              {
                badge: "Workers",
                title: "Background jobs",
                body: "Indexers, registry sync, position hydration, settlement workers, and cache refreshes keep the live pages fast.",
              },
              {
                badge: "Persistence",
                title: "Canonical state",
                body: "Quotes, ordered legs, positions, reactions, comments, leaderboard stats, and vault snapshots come from backend-managed records.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "quote-service",
    group: "Backend",
    label: "Quote Service",
    eyebrow: "Backend",
    title: "Quote Service",
    summary:
      "The quote service is the economic center of the product. The browser never computes the return multiple itself. The backend produces the effective probability, payout, and signed quote.",
    sections: [
      {
        id: "quote-endpoints",
        title: "Quote endpoints",
        blocks: [
          {
            type: "table",
            value: {
              columns: ["Endpoint", "Purpose"],
              rows: [
                ["POST /stacks/quote", "Validate legs, run the pricing engine, and return a signed executable quote."],
                ["POST /stacks/quotes/refresh", "Refresh an existing quote when inputs or validity need to be renewed."],
                ["POST /stacks/execute", "Execute an approved quote through the account-abstraction path."],
              ],
            },
          },
        ],
      },
      {
        id: "quote-visibility",
        title: "What the quote can surface",
        blocks: [
          {
            type: "bullets",
            values: [
              "Independence baseline probability.",
              "Correlation-adjusted effective probability.",
              "Correlation premium or compression versus naive multiplication.",
              "Protocol edge, return multiple, projected return, and payout-cap status.",
              "Execution blockers when market status, liquidity, or quote integrity would make the stack unsafe to open.",
            ],
          },
        ],
      },
      {
        id: "why-server-side",
        title: "Why the quote stays server-side",
        blocks: [
          {
            type: "callout",
            value:
              "Joint pricing, payout clamps, liquidity-aware checks, and the executable signature belong to the backend. The browser is a display and approval layer, not the pricing authority.",
          },
        ],
      },
    ],
  },
  {
    slug: "execution-and-indexing",
    group: "Backend",
    label: "Execution & Indexing",
    eyebrow: "Backend",
    title: "Execution And Indexing",
    summary:
      "Execution is only the opening act. The backend must later reconcile the on-chain position with the exact ordered legs used when the quote was signed.",
    sections: [
      {
        id: "canonical-order",
        title: "Why canonical leg order matters",
        blocks: [
          {
            type: "paragraphs",
            values: [
              "Lattice stores a compact commitment on-chain instead of writing every leg into the opened position record. The contracts rely on a legs hash and leg count, which keeps execution compact but makes off-chain canonical ordering mandatory.",
              "If the backend loses that exact leg order, settlement can fail even when the set of legs appears identical. Quote persistence is therefore not bookkeeping. It is part of protocol correctness.",
            ],
          },
        ],
      },
      {
        id: "reliability-path",
        title: "Reliability path",
        blocks: [
          {
            type: "bullets",
            values: [
              "Persist the quote digest and ordered legs before submission.",
              "Decode confirmed receipts and hydrate positions even when indexing lags.",
              "Reconcile consumed quotes and delayed PositionOpened visibility without telling the user a successful execution failed.",
              "Use workers to backfill opened positions and later connect them to resolution and settlement state.",
            ],
          },
        ],
      },
      {
        id: "position-model",
        title: "Position data model",
        blocks: [
          {
            type: "bullets",
            values: [
              "stack_quotes stores recipient, stake, return, validity, digest, and quote status.",
              "stack_quote_legs stores the canonical ordered leg list used by the signed quote.",
              "stack_positions stores the on-chain position identity, owner, legs commitment, and settlement status.",
              "stack_position_legs stores the ordered settlement list with resolved outcomes.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "portfolio-and-earn-apis",
    group: "Backend",
    label: "Portfolio & Earn APIs",
    eyebrow: "Backend",
    title: "Portfolio And Earn APIs",
    summary:
      "Portfolio and Earn are product read models, not generic wallet tabs. They translate live positions and vault state into opinionated user-facing surfaces.",
    sections: [
      {
        id: "portfolio-read-model",
        title: "Portfolio read model",
        blocks: [
          {
            type: "table",
            value: {
              columns: ["Endpoint", "Purpose"],
              rows: [
                ["GET /me/portfolio", "Funds-in-market summary plus story metrics such as best call, worst call, and biggest live exposure."],
                ["GET /me/portfolio/stacks", "Position feed with stake, marked value, PnL, status, bet code, and ordered legs."],
                ["GET /stacks/bets/:betCode", "Public stack-share detail used by copy and receipt flows."],
              ],
            },
          },
          {
            type: "paragraphs",
            values: [
              "The portfolio surface is intentionally narrative, not only tabular. It turns structured product activity into best calls, worst calls, live exposure, big hits, and recent outcomes so users can understand their own behavior quickly.",
            ],
          },
        ],
      },
      {
        id: "cached-reads",
        title: "Why these pages feel fast",
        blocks: [
          {
            type: "paragraphs",
            values: [
              "Portfolio, Earn, Leaderboard, rooms, and share-card routes are cached as backend read models. That avoids recomputing marked positions, vault ownership, or social aggregates on every request.",
              "The caching layer is what makes these pages feel closer to market browsing than to a slow back-office dashboard.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "account-abstraction",
    group: "Backend",
    label: "Account Abstraction",
    eyebrow: "Backend",
    title: "Account Abstraction",
    summary:
      "Lattice uses a backend-managed sponsored smart-account path so users can execute structured positions without raw contract UX or separate gas funding steps.",
    sections: [
      {
        id: "aa-flow",
        title: "AA flow",
        blocks: [
          {
            type: "ordered",
            values: [
              "User signs in and is associated with a smart-account owner profile.",
              "Backend builds the calls required for the stack or vault action.",
              "Gas is estimated and sponsorship is requested through the configured paymaster path.",
              "The bundler submits the user operation to Robinhood Chain Testnet.",
              "Receipt polling and background hydration update execution state and later connect it to indexed positions.",
            ],
          },
        ],
      },
      {
        id: "aa-hardening",
        title: "AA hardening",
        blocks: [
          {
            type: "bullets",
            values: [
              "Bundler receipt propagation is handled explicitly.",
              "Delayed RPC indexing does not automatically translate into visible execution failure.",
              "Consumed quotes are reconciled cleanly instead of creating duplicate submission confusion.",
              "Asynchronous position hydration allows the product to recover gracefully when on-chain events arrive later than the initial receipt surface.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "correlation-engine",
    group: "Intelligence",
    label: "Correlation Engine",
    eyebrow: "Intelligence",
    title: "Correlation Engine",
    summary:
      "Lattice uses a deterministic five-layer semantic engine to transform market relationships into signed pairwise coefficients before joint pricing is ever computed.",
    sections: [
      {
        id: "five-layers",
        title: "Five semantic layers",
        blocks: [
          {
            type: "cards",
            values: [
              {
                badge: "1",
                title: "Lexical overlap",
                body: "Shared language, repeated phrasing, and token-level title similarity.",
              },
              {
                badge: "2",
                title: "Named entities",
                body: "Countries, teams, politicians, exchanges, venues, companies, and other recurring references.",
              },
              {
                badge: "3",
                title: "Themes",
                body: "Category-level clustering such as World Cup, macro, elections, oil, or crypto.",
              },
              {
                badge: "4",
                title: "Time and event proximity",
                body: "Shared windows, same-event relationships, and close temporal structure.",
              },
              {
                badge: "5",
                title: "Logical alignment",
                body: "Implication, contradiction, overlap, or mutual exclusivity between outcomes.",
              },
            ],
          },
        ],
      },
      {
        id: "output",
        title: "What the engine emits",
        blocks: [
          {
            type: "paragraphs",
            values: [
              "The semantic layers are converted into signed pairwise correlation coefficients, usually described as rho_ij, and assembled into a valid correlation matrix for the pricing engine.",
              "This is what lets Lattice distinguish between positively related legs, genuinely diversified legs, and mutually exclusive outcomes that should not be treated like ordinary positive correlation.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "copula-pricing",
    group: "Intelligence",
    label: "Copula Pricing",
    eyebrow: "Intelligence",
    title: "Copula Pricing",
    summary:
      "The stack engine turns marginal market probabilities plus semantic relationship coefficients into a bounded joint probability using Gaussian-copula-style pricing.",
    sections: [
      {
        id: "pricing-flow",
        title: "Pricing flow",
        blocks: [
          {
            type: "ordered",
            values: [
              "Resolve marginal leg probabilities from normalized market inputs.",
              "Map pairwise semantic features into signed rho values.",
              "Assemble a valid correlation matrix for the stack.",
              "Transform marginals into normal thresholds and correlate them through Cholesky decomposition.",
              "Estimate joint probability using antithetic Halton quasi-Monte Carlo sampling.",
              "Clamp the result inside mathematically valid Frechet bounds.",
              "Apply protocol risk margins and payout caps before returning the final executable quote.",
            ],
          },
        ],
      },
      {
        id: "why-better-than-naive",
        title: "Why this is better than naive multiplication",
        blocks: [
          {
            type: "paragraphs",
            values: [
              "Positively correlated legs receive payout compression because their joint win path is less surprising than naive independence suggests. Truly diversified legs stay closer to the independence baseline. Mutually exclusive outcomes can be detected as negative or contradictory relationships instead of being priced like ordinary overlap.",
              "This directly reduces the classic failure mode in structured prediction products: inflated long-tail payouts that sophisticated users can exploit against passive liquidity.",
            ],
          },
          {
            type: "code",
            language: "text",
            value:
              "Effective joint probability = C_rho(P1, P2, ... Pn)\nPayout multiple = (1 - protocol risk premium) / effective joint probability\nMax payout = 100x",
          },
        ],
      },
      {
        id: "testable-engine",
        title: "Deterministic and testable",
        blocks: [
          {
            type: "bullets",
            values: [
              "Related outcomes increase effective joint probability and compress payouts.",
              "Mutually exclusive winners are recognized as contradictory relationships.",
              "Unrelated legs remain close to the independence baseline.",
              "Extreme longshots cannot create unbounded vault exposure because the engine is capped and bounded.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "ai-explainers",
    group: "Intelligence",
    label: "AI Explainers",
    eyebrow: "Intelligence",
    title: "AI Explainers",
    summary:
      "The AI layer does not set the price. It reads the same deterministic quote inputs and translates the math into plain language for the user.",
    sections: [
      {
        id: "explainer-scope",
        title: "Explainer scope",
        blocks: [
          {
            type: "bullets",
            values: [
              "Explain why these legs fit together.",
              "Show where the detected correlation came from.",
              "Explain why the payout changed versus naive independence.",
              "Describe what the protocol risk premium means in plain language.",
              "Summarize the shared entities, themes, dates, or logical relationships behind the quote.",
            ],
          },
        ],
      },
      {
        id: "endpoints",
        title: "Endpoints",
        blocks: [
          {
            type: "table",
            value: {
              columns: ["Endpoint", "Purpose"],
              rows: [
                ["POST /stacks/ai/suggest", "Return structured stack suggestions from prompt input."],
                ["POST /stacks/ai/explain", "Return a pricing and correlation explanation grounded in the same quote inputs."],
                ["GET /stacks/composites", "Return curated themed composites and structured market ideas."],
              ],
            },
          },
          {
            type: "callout",
            value:
              "AI is intentionally scoped as explanation and productization, not as an unbounded black-box odds engine.",
          },
        ],
      },
    ],
  },
  {
    slug: "smart-contracts",
    group: "Contracts",
    label: "Smart Contracts",
    eyebrow: "Contracts",
    title: "Smart Contracts",
    summary:
      "The on-chain layer is split across quote verification, execution, liquidity, settlement, registry, and token modules. Each contract has a narrow role in the lifecycle.",
    sections: [
      {
        id: "modules",
        title: "Core modules",
        blocks: [
          {
            type: "cards",
            values: [
              {
                title: "QuoteVerifier",
                body: "Validates EIP-712 signatures, recipients, expiries, and quote commitments.",
              },
              {
                title: "LatticeCore",
                body: "Executes stacks and stores compact commitments used later by settlement.",
              },
              {
                title: "LPVault",
                body: "Escrows stake, tracks vault liquidity, and reserves payout exposure.",
              },
              {
                title: "PositionToken",
                body: "Mints transferable ERC-721 receipts for opened positions.",
              },
              {
                title: "ReferenceRegistry",
                body: "Stores canonical market references and their final resolutions.",
              },
              {
                title: "SettlementManager",
                body: "Recomputes leg commitments and finalizes positions deterministically.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "risk-controls",
    group: "Contracts",
    label: "Risk Controls",
    eyebrow: "Contracts",
    title: "Risk Controls",
    summary:
      "Risk is enforced in layers: before signing, during execution, and again at settlement. The frontend is not trusted as the source of truth for safety checks.",
    sections: [
      {
        id: "quote-binding",
        title: "Quote binding",
        blocks: [
          {
            type: "paragraphs",
            values: [
              "Every executable quote is bound through EIP-712 to its recipient, stake, return, expiry, ordered legs, metadata, and Robinhood Chain domain.",
              "That means the user is not approving an abstract intent. They are approving a specific structured position with specific economics and a specific commitment.",
            ],
          },
        ],
      },
      {
        id: "control-layers",
        title: "Control layers",
        blocks: [
          {
            type: "bullets",
            values: [
              "Leg-count bounds and payout limits are enforced by protocol configuration.",
              "Quote integrity is enforced by QuoteVerifier.",
              "Liquidity reservation is enforced by LPVault before the position opens.",
              "Leg hash and leg count commitments are enforced by LatticeCore and SettlementManager.",
              "Delayed LP withdrawals are enforced by the vault to reduce liquidity shock risk.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "settlement-and-oracles",
    group: "Contracts",
    label: "Settlement & Oracles",
    eyebrow: "Contracts",
    title: "Settlement And Oracles",
    summary:
      "Settlement becomes deterministic once canonical market references are resolved. The registry is the bridge between external market outcomes and on-chain finality.",
    sections: [
      {
        id: "canonical-refs",
        title: "Canonical market references",
        blocks: [
          {
            type: "code",
            language: "text",
            value:
              "market_ref = keccak256(\"lattice:polymarket:condition:{condition_id}\")",
          },
          {
            type: "paragraphs",
            values: [
              "Quote generation, indexing, and settlement all have to agree on the exact market reference convention. If those layers drift, settlement correctness breaks even when they are all talking about the same external market in human terms.",
            ],
          },
        ],
      },
      {
        id: "settlement-principle",
        title: "Settlement principle",
        blocks: [
          {
            type: "callout",
            value:
              "Settlement only works if the original ordered leg list survives intact from quote generation, to execution, to final submission into SettlementManager.",
          },
        ],
      },
    ],
  },
  {
    slug: "deployed-contracts",
    group: "Contracts",
    label: "Deployed Contracts",
    eyebrow: "Contracts",
    title: "Deployed Contracts",
    summary:
      "The current live protocol deployment is on Robinhood Chain Testnet and includes the full quote, core, vault, registry, token, settlement, and composite contract set.",
    sections: [
      {
        id: "deployment-table",
        title: "Deployment table",
        blocks: [
          {
            type: "table",
            value: {
              columns: ["Contract", "Address", "Role"],
              rows: [
                ["QuoteVerifier", "0x9197...e2e6", "Signed quote verification"],
                ["ReferenceRegistry", "0xF177...d8C3", "Canonical market references and resolutions"],
                ["PositionToken", "0x9085...B526", "ERC-721 stack receipts"],
                ["LPVault", "0x754d...396e", "LP collateral and delayed redemption"],
                ["LatticeCore", "0xaE23...0964", "Structured stack execution core"],
                ["SettlementManager", "0x8332...e112", "Deterministic settlement"],
                ["CompositeVault", "0xb4B1...2D31", "Composite product support"],
              ],
            },
          },
        ],
      },
      {
        id: "network",
        title: "Network facts",
        blocks: [
          {
            type: "table",
            value: {
              columns: ["Field", "Value"],
              rows: [
                ["Network", "Robinhood Chain Testnet"],
                ["Chain ID", "46630"],
                ["Collateral", "Mock USDC"],
                ["Withdrawal delay", "7 days"],
                ["Stack bounds", "2 to 3 legs"],
              ],
            },
          },
        ],
      },
    ],
  },
  {
    slug: "api-surface",
    group: "Reference",
    label: "API Surface",
    eyebrow: "Reference",
    title: "API Surface",
    summary:
      "The frontend docs are consumer-oriented, but the backend route layer is what ties builder UX, copy flows, portfolio, earn, AI, rooms, and execution together.",
    sections: [
      {
        id: "public-routes",
        title: "Public routes",
        blocks: [
          {
            type: "table",
            value: {
              columns: ["Route", "Purpose"],
              rows: [
                ["GET /stacks/leaderboard", "Public leaderboard over settled structured positions."],
                ["GET /stacks/bets/:betCode", "Public stack share page and copy-source payload."],
                ["GET /stacks/composites", "Curated thematic stack and composite ideas."],
                ["GET /stacks/rooms", "Public room directory and featured thesis surfaces."],
                ["GET /stacks/rooms/:roomSlug", "Public room detail with composition, presence summary, and recent feed context."],
                ["GET /stacks/rooms/:roomSlug/feed", "Room feed payload for live post streams."],
                ["GET /markets/:marketId/comments", "Public threaded market comments."],
              ],
            },
          },
        ],
      },
      {
        id: "authenticated-routes",
        title: "Authenticated routes",
        blocks: [
          {
            type: "table",
            value: {
              columns: ["Route", "Purpose"],
              rows: [
                ["GET /me/portfolio", "Portfolio summary and story metrics."],
                ["GET /me/portfolio/stacks", "Full stack position feed."],
                ["GET /me/earn", "Vault overview and LP account state."],
                ["POST /stacks/quote", "Return a signed executable stack quote."],
                ["POST /stacks/execute", "Execute the stack through sponsored AA."],
                ["POST /stacks/ai/suggest", "Generate AI-assisted stack suggestions."],
                ["POST /stacks/ai/explain", "Generate pricing and correlation explanations."],
                ["POST /stacks/rooms/:roomSlug/posts", "Publish a room thesis post, optionally with a bet code."],
                ["POST /stacks/rooms/:roomSlug/posts/:postId/reactions/:reaction", "Toggle room-post reactions."],
                ["POST /stacks/rooms/:roomSlug/presence", "Heartbeat live room presence."],
                ["POST /markets/:marketId/comments", "Create a market comment."],
                ["POST /markets/:marketId/comments/:commentId/replies", "Create a threaded reply."],
                ["POST /comments/:commentId/likes", "Toggle a comment like."],
              ],
            },
          },
        ],
      },
    ],
  },
  {
    slug: "system-facts",
    group: "Reference",
    label: "System Facts",
    eyebrow: "Reference",
    title: "System Facts",
    summary:
      "This page collects the stable protocol and product facts that define the current live testnet configuration.",
    sections: [
      {
        id: "key-numbers",
        title: "Key numbers",
        blocks: [
          {
            type: "table",
            value: {
              columns: ["Parameter", "Value", "Description"],
              rows: [
                ["Chain ID", "46630", "Robinhood Chain Testnet binding used by the live environment."],
                ["Collateral token", "Mock USDC", "Current vault and settlement asset."],
                ["Minimum legs", "2", "Lower bound for structured stacks."],
                ["Maximum legs", "3", "Upper bound for structured stacks."],
                ["Payout cap", "100x", "Risk ceiling enforced by the protocol."],
                ["Withdrawal delay", "7 days", "LP redemption delay before claim."],
              ],
            },
          },
        ],
      },
      {
        id: "project-meta",
        title: "Project metadata",
        blocks: [
          {
            type: "table",
            value: {
              columns: ["Field", "Value"],
              rows: [
                ["Frontend", "SolidJS"],
                ["Backend", "Rust"],
                ["Contracts", "Solidity"],
                ["Chain", "Robinhood Chain Testnet"],
                ["Wallet execution", "Sponsored smart accounts"],
                ["Fundraising status", "N/A"],
              ],
            },
          },
        ],
      },
    ],
  },
];

export const DOCS_GROUPS: DocsGroup[] = DOCS_PAGES.reduce<DocsGroup[]>((groups, page) => {
  const existing = groups.find(group => group.title === page.group);

  if (existing) {
    existing.pages.push({ slug: page.slug, label: page.label });
    return groups;
  }

  groups.push({
    title: page.group,
    pages: [{ slug: page.slug, label: page.label }],
  });

  return groups;
}, []);

export function getDocsPage(slug: string): DocsPage | undefined {
  return DOCS_PAGES.find(page => page.slug === slug);
}

export function getDocsIndex(slug: string): number {
  return DOCS_PAGES.findIndex(page => page.slug === slug);
}
