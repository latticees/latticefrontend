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
    title: "Sabimarket Overview",
    summary:
      "Sabimarket is the consumer product. Lattice is the protocol and contract stack beneath it. The app lets users build structured stacks, copy shared positions, and provide LP liquidity while the backend owns pricing, persistence, and execution.",
    sections: [
      {
        id: "what-is-sabimarket",
        title: "What is Sabimarket",
        blocks: [
          {
            type: "paragraphs",
            values: [
              "Sabimarket is a blue-chip style consumer interface for structured prediction positions. Users do not need to understand contract internals to build a stack, load a bet code, or deposit into the LP vault.",
              "Under the hood, the product is powered by the Lattice backend and contracts. The backend computes the joint probability model, signs executable quotes, stores canonical leg order off-chain, and later resubmits those exact legs when settlement happens.",
            ],
          },
          {
            type: "cards",
            values: [
              {
                badge: "Product",
                title: "Stacks",
                body: "Build 2 to 3 leg structured positions and receive an ERC-721 receipt when execution succeeds.",
              },
              {
                badge: "Liquidity",
                title: "Earn",
                body: "Deposit USDC into the LP vault and back live payout exposure with delayed redemption controls.",
              },
              {
                badge: "Distribution",
                title: "Share & Copy",
                body: "Bet codes, share cards, and copy flows let one structured position move through the product quickly.",
              },
            ],
          },
        ],
      },
      {
        id: "product-boundaries",
        title: "Product boundaries",
        blocks: [
          {
            type: "callout",
            value:
              "Sabimarket is the app surface. Lattice is the protocol layer. The docs use that distinction deliberately so frontend, backend, and contract responsibilities stay clear.",
          },
          {
            type: "bullets",
            values: [
              "Frontend: discovery, builder UX, portfolio, earn, docs, share surfaces, localization, onboarding.",
              "Backend: market ingestion, quote generation, AI suggestion/explainer, persistence, portfolio marking, leaderboard, vault reads, account abstraction orchestration.",
              "Contracts: quote verification, LP collateral, position NFTs, compact position commitments, registry resolution, deterministic settlement.",
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
      "The product is split into a Solid frontend, a Rust backend, and a Foundry-based contract system deployed on Robinhood Chain Testnet. Each layer has a hard responsibility boundary.",
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
                body: "Locale-aware routes, builder flows, share cards, portfolio, earn, leaderboard, and docs.",
              },
              {
                badge: "Backend",
                title: "Rust services",
                body: "Axum routes, SQLx persistence, quote math, AI endpoints, workers, and smart-account execution.",
              },
              {
                badge: "Contracts",
                title: "Lattice protocol",
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
              "User selects legs in the builder or loads them from a bet code.",
              "Frontend requests a quote from the backend instead of pricing locally.",
              "Backend fetches or resolves market inputs, computes correlation-aware pricing, signs the quote, and persists quote state.",
              "User executes through the backend account-abstraction flow using Robinhood Chain testnet infrastructure.",
              "Contracts reserve LP liquidity, escrow stake, and mint a transferable position NFT.",
              "Workers and resolution services monitor final outcomes and settle the position deterministically.",
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
      "Custom Stacks are the main consumer product: 2 to 3 legs, one signed quote, one on-chain execution, and one position NFT that represents the structured position.",
    sections: [
      {
        id: "stack-limits",
        title: "Current stack limits",
        blocks: [
          {
            type: "table",
            value: {
              columns: ["Parameter", "Current value", "Why it matters"],
              rows: [
                ["Minimum leg count", "2", "Prevents single-leg flow from bypassing the structured product model."],
                ["Maximum leg count", "3", "Keeps execution, pricing, and risk bounded on the current protocol version."],
                ["Payout cap", "100x", "Enforced by risk config on the core contract."],
                ["Quote validity window", "30 days", "Signed quotes expire if not used inside the configured window."],
              ],
            },
          },
        ],
      },
      {
        id: "execution-shape",
        title: "Execution shape",
        blocks: [
          {
            type: "paragraphs",
            values: [
              "The protocol does not store every leg on-chain after position creation. Instead, the quote commits to a legs hash and leg count. That keeps the on-chain position compact while still enforcing deterministic settlement later.",
              "Because of that compact commitment model, the backend becomes the canonical source for the ordered leg list used at quote time and submitted again during settlement.",
            ],
          },
          {
            type: "code",
            language: "text",
            value:
              "LatticeCore.executeStack(quote, legs, signature)\n  -> QuoteVerifier validates signature + expiry + recipient + legsHash\n  -> LPVault escrows stake + reserves payout\n  -> PositionToken mints ERC-721 receipt",
          },
        ],
      },
    ],
  },
  {
    slug: "composites",
    group: "Products",
    label: "Composites",
    eyebrow: "Products",
    title: "Composites",
    summary:
      "Composites are the thematic basket layer in the protocol. They sit next to custom stacks and allow weighted exposure to a curated theme rather than a single manually assembled parlay.",
    sections: [
      {
        id: "why-composites",
        title: "Why composites exist",
        blocks: [
          {
            type: "bullets",
            values: [
              "They let the product offer opinionated basket products such as macro, election, or World Cup themes.",
              "They reuse the same LP-backed liquidity architecture instead of introducing a separate collateral silo.",
              "They make distribution easier because the unit being shared is a named basket, not just a raw list of market refs.",
            ],
          },
        ],
      },
      {
        id: "current-state",
        title: "Current state",
        blocks: [
          {
            type: "paragraphs",
            values: [
              "CompositeVault is deployed in the contract layer, but the consumer surface is still earlier than stacks. In other words, the protocol support exists, while the product layer is still being expanded.",
              "This is why the docs treat Composites as a product lane with protocol support, not as the most mature user-facing flow today.",
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
      "Earn is the LP-facing surface. Users deposit USDC into the vault, hold vault shares, reserve liquidity for live stack exposure, and redeem with a withdrawal delay.",
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
                body: "Mock USDC on Robinhood Chain Testnet is the collateral asset used for LP accounting today.",
              },
              {
                badge: "Delay",
                title: "7-day redemption lock",
                body: "Pending redeems stay locked before they can be claimed, which is designed to reduce bank-run behavior.",
              },
              {
                badge: "Accounting",
                title: "Share price model",
                body: "Ownership is represented by vault shares, and current asset value comes from live vault accounting rather than a fixed promise.",
              },
            ],
          },
        ],
      },
      {
        id: "earn-api",
        title: "Earn API surface",
        blocks: [
          {
            type: "table",
            value: {
              columns: ["Endpoint", "Purpose"],
              rows: [
                ["GET /me/earn", "Return authenticated vault overview, personal LP balance, pending redeem state, and live vault metrics."],
                ["Wallet funding flow", "Adds test USDC to wallet cash before a deposit into the vault."],
                ["Deposit flow", "Moves wallet cash into the vault and returns vault shares."],
              ],
            },
          },
          {
            type: "paragraphs",
            values: [
              "The current page reads live vault state from the backend read model. Withdraw and claim write flows are separate actions on top of the same vault accounting surface.",
            ],
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
      "The backend is not a thin API wrapper. It owns quote math, canonical leg persistence, share/read models, settlement preparation, vault reads, AI endpoints, and smart-account execution.",
    sections: [
      {
        id: "backend-responsibilities",
        title: "Primary responsibilities",
        blocks: [
          {
            type: "bullets",
            values: [
              "Ingest and normalize market data used by the stack engine.",
              "Price stacks, compute correlation penalties, and sign executable quotes.",
              "Persist canonical quote and position state needed later for settlement.",
              "Expose authenticated read surfaces such as portfolio and earn.",
              "Run worker-style jobs for indexing, registry sync, settlement, and cached read models.",
              "Handle gasless smart-account execution on Robinhood Chain testnet.",
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
                badge: "Quote path",
                title: "Live request services",
                body: "Quote generation, AI suggestion/explain, stack execution, share-card reads, and authenticated account views.",
              },
              {
                badge: "Workers",
                title: "Background processing",
                body: "Indexers, registry sync, settlement workers, and read-model refreshes keep live routes fast.",
              },
              {
                badge: "Persistence",
                title: "Postgres-backed state",
                body: "Quotes, positions, legs, portfolio story data, leaderboard stats, and vault snapshots come from backend-managed data.",
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
      "The quote service is the economic center of the backend. The frontend never computes the multiple itself. The backend computes the full stack price and returns a signed quote.",
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
                ["POST /stacks/quote", "Validate legs, compute pricing, and return a signed executable quote or execution blockers."],
                ["POST /stacks/quotes/refresh", "Refresh an existing quote when inputs or validity need to be renewed."],
                ["POST /stacks/execute", "Submit the approved stack through the backend execution path."],
              ],
            },
          },
        ],
      },
      {
        id: "quote-ownership",
        title: "Why quote math stays server-side",
        blocks: [
          {
            type: "bullets",
            values: [
              "Leg probabilities and market refs are normalized server-side.",
              "The joint probability model is correlation-aware and should not drift between frontend builds.",
              "Risk caps, payout clamps, and liquidity-aware adjustments belong to the backend because they depend on protocol state.",
              "The signature and quote digest must be produced by a trusted signer, not by the browser.",
            ],
          },
        ],
      },
      {
        id: "quote-shape",
        title: "Quote payload shape",
        blocks: [
          {
            type: "code",
            language: "json",
            value: `{
  "recipient": "0x...",
  "stake": "100000000",
  "legs": [
    { "market_ref": "0x...", "outcome": 1 },
    { "market_ref": "0x...", "outcome": 0 }
  ]
}`,
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
    title: "Execution & Indexing",
    summary:
      "Execution is only half the job. Once a position opens, the backend has to reconcile the emitted on-chain position with the exact ordered legs used at quote time.",
    sections: [
      {
        id: "why-indexing-matters",
        title: "Why indexing matters",
        blocks: [
          {
            type: "paragraphs",
            values: [
              "The contracts no longer store every leg in the opened position record. They store legsHash and legCount. That means the backend must persist the canonical ordered legs when the quote is created and tie them back to the position ID after execution.",
              "If the backend loses or reorders the legs later, deterministic settlement fails even if the set of legs is technically the same.",
            ],
          },
        ],
      },
      {
        id: "position-data-model",
        title: "Position data model",
        blocks: [
          {
            type: "bullets",
            values: [
              "stack_quotes stores quote digest, recipient, stake, total return, validity, and status.",
              "stack_quote_legs stores ordered quote legs by position index.",
              "stack_positions stores position ID, owner, legs hash, total return, status, and settlement timestamps.",
              "stack_position_legs stores the ordered settlement list plus resolved outcomes.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "resolution-workers",
    group: "Backend",
    label: "Resolution Workers",
    eyebrow: "Backend",
    title: "Resolution Workers",
    summary:
      "Resolution workers watch external venues, map final outcomes into canonical market references, and call the registry plus settlement contracts once every leg can be finalized.",
    sections: [
      {
        id: "resolution-policy",
        title: "Resolution policy",
        blocks: [
          {
            type: "ordered",
            values: [
              "Auto-resolve only when the external venue exposes a clearly final state.",
              "Wait during post-close grace windows when the market is still proposed or ambiguous.",
              "Queue manual review when the external status is disputed, delayed, or price signals are not decisive.",
              "Store the exact external payload used to justify auto-resolution or review escalation.",
            ],
          },
        ],
      },
      {
        id: "settlement-call",
        title: "Settlement call shape",
        blocks: [
          {
            type: "code",
            language: "text",
            value:
              "SettlementManager.settlePosition(positionId, legs)\n\nThe submitted legs must match the original order used at quote time so the recomputed legsHash matches the stored commitment.",
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
    title: "Portfolio & Earn APIs",
    summary:
      "Portfolio and Earn are not generic wallet pages. They are backend read models built on top of stack positions and LP vault state, respectively.",
    sections: [
      {
        id: "portfolio-apis",
        title: "Portfolio APIs",
        blocks: [
          {
            type: "table",
            value: {
              columns: ["Endpoint", "Purpose"],
              rows: [
                ["GET /me/portfolio", "Return funds-in-market summary plus story metrics such as best call, worst call, and biggest live exposure."],
                ["GET /me/portfolio/stacks", "Return the position feed with stake, marked value, P&L, status, and ordered legs."],
                ["GET /stacks/bets/:betCode", "Return public stack-share detail for copy and receipt flows."],
              ],
            },
          },
        ],
      },
      {
        id: "earn-apis",
        title: "Earn APIs",
        blocks: [
          {
            type: "table",
            value: {
              columns: ["Endpoint", "Purpose"],
              rows: [
                ["GET /me/earn", "Return vault overview, user LP state, pending redeem information, and projected ownership figures."],
                ["GET /stacks/leaderboard", "Public aggregate surface over settled positions used by the competition layer."],
              ],
            },
          },
          {
            type: "paragraphs",
            values: [
              "These surfaces are cached as backend read models so they feel market-fast instead of recomputing every marked position on every request.",
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
      "Sabimarket uses a backend-managed smart-account path so the consumer product can expose a gasless flow without pushing the user through raw contract UX.",
    sections: [
      {
        id: "aa-flow",
        title: "AA flow",
        blocks: [
          {
            type: "ordered",
            values: [
              "User signs in with Google and receives an app session tied to a smart-account owner record.",
              "Backend prepares calls, estimates gas, and requests sponsorship from the configured paymaster path.",
              "The bundler submits the user operation to Robinhood Chain testnet.",
              "Receipt polling updates the stack execution state after submission.",
            ],
          },
        ],
      },
      {
        id: "aa-components",
        title: "AA components",
        blocks: [
          {
            type: "bullets",
            values: [
              "Bundler RPC and paymaster RPC are configured server-side.",
              "The backend owns user-operation packing, sponsorship application, and submission retries.",
              "Smart-account execution is integrated with the stack flow instead of existing as a separate wallet product.",
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
      "The current pricing engine is no longer naive independence. It uses a semantic pipeline to score market relationships before joint pricing is produced.",
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
                title: "Lexical tokens",
                body: "Overlap in titles, phrasing, and recurring market text.",
              },
              {
                badge: "2",
                title: "Entities",
                body: "Countries, teams, politicians, venues, and other named references.",
              },
              {
                badge: "3",
                title: "Themes",
                body: "Category-level clustering like World Cup, macro, politics, or crypto.",
              },
              {
                badge: "4",
                title: "Time/event overlap",
                body: "Shared windows, event proximity, and same-event structure.",
              },
              {
                badge: "5",
                title: "Logic",
                body: "Alignment, implication, or contradiction across outcomes.",
              },
            ],
          },
        ],
      },
      {
        id: "why-exists",
        title: "Why it exists",
        blocks: [
          {
            type: "paragraphs",
            values: [
              "A structured product is not credible if every stack simply multiplies raw leg probabilities while pretending every market is independent.",
              "The correlation engine is what lets Sabimarket defend a product story beyond a cosmetic parlay wrapper.",
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
      "The correlation signals are converted into signed pairwise rho values and then fed into a Gaussian-copula-style joint model that produces the effective probability used in the quote.",
    sections: [
      {
        id: "pricing-steps",
        title: "Pricing steps",
        blocks: [
          {
            type: "ordered",
            values: [
              "Resolve marginal leg probabilities from market inputs.",
              "Compute pairwise semantic features and map them into signed rho values.",
              "Build the correlation matrix used by the joint probability engine.",
              "Clamp outputs against protocol risk limits and payout caps.",
              "Return effective joint probability, correlation penalty, total return, and capital multiple.",
            ],
          },
        ],
      },
      {
        id: "frontend-contract",
        title: "Frontend contract",
        blocks: [
          {
            type: "callout",
            value:
              "The browser never owns this math. It receives the resulting numbers from the backend and displays them as the source of truth for quote and execution.",
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
      "The AI layer is more useful as an explainer than as an unbounded picker. It tells the user why a stack works and why the payout changed, instead of pretending to be a magic prediction engine.",
    sections: [
      {
        id: "explainer-scope",
        title: "Explainer scope",
        blocks: [
          {
            type: "bullets",
            values: [
              "Why these legs fit together.",
              "Where the detected correlation came from.",
              "Why the payout differs from naive independence.",
              "What the risk premium means in plain language.",
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
                ["POST /stacks/ai/explain", "Return an explanation for correlation, pricing, and risk interpretation."],
                ["GET /stacks/composites", "Return curated themed stack/composite ideas for the UI."],
              ],
            },
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
      "The on-chain layer is split across verification, liquidity, settlement, registry, and token modules. Each contract has a narrowly scoped role in the lifecycle.",
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
                body: "Validates signature, expiry, recipient, and quote commitment fields.",
              },
              {
                title: "LatticeCore",
                body: "Executes stacks and stores compact commitments for later settlement.",
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
                body: "Stores canonical market references and final resolutions.",
              },
              {
                title: "SettlementManager",
                body: "Recomputes submitted leg commitments and closes positions deterministically.",
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
      "Risk is enforced in layers: backend validation before signing, liquidity and quote checks during execution, and strict settlement verification after markets resolve.",
    sections: [
      {
        id: "control-layers",
        title: "Control layers",
        blocks: [
          {
            type: "bullets",
            values: [
              "Leg count bounds enforced by contract risk configuration.",
              "Quote integrity checks enforced by QuoteVerifier.",
              "LP liquidity reservation enforced by LPVault.",
              "Leg hash and leg count commitments enforced by LatticeCore and SettlementManager.",
              "Delayed vault redemption enforced by LPVault withdrawal delay.",
            ],
          },
        ],
      },
      {
        id: "risk-philosophy",
        title: "Risk philosophy",
        blocks: [
          {
            type: "paragraphs",
            values: [
              "The protocol assumes the frontend can be wrong, stale, or malicious. That is why quote integrity, payout reservation, and settlement validation are not delegated to UI state.",
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
    title: "Settlement & Oracles",
    summary:
      "Settlement is deterministic once canonical market references are resolved. The registry is the translation layer between external venue outcomes and on-chain finality.",
    sections: [
      {
        id: "market-ref-policy",
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
              "If the backend signs a quote using one market reference convention and the registry importer resolves a different reference, execution and settlement break even if the source market is the same.",
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
              "Settlement is deterministic only if the original ordered leg list survives intact from quote, to execution, to final submission into SettlementManager.",
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
      "The current deployment is on Robinhood Chain Testnet and includes the full quote, registry, core, vault, token, settlement, and composite contract set.",
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
                ["ReferenceRegistry", "0xF177...d8C3", "Canonical market refs and resolutions"],
                ["PositionToken", "0x9085...B526", "ERC-721 position receipts"],
                ["LPVault", "0x754d...396e", "LP collateral and redemption delay"],
                ["LatticeCore", "0xaE23...0964", "Stack execution core"],
                ["SettlementManager", "0x8332...e112", "Deterministic settlement"],
                ["CompositeVault", "0xb4B1...2D31", "Basket/composite support"],
              ],
            },
          },
        ],
      },
      {
        id: "network",
        title: "Network",
        blocks: [
          {
            type: "table",
            value: {
              columns: ["Field", "Value"],
              rows: [
                ["Network", "Robinhood Chain Testnet"],
                ["Chain ID", "46630"],
                ["Collateral", "Mock USDC"],
                ["Deployment date", "2026-06-11"],
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
      "The docs surface is consumer-oriented, but the backend route layer is what ties builder UX, copy flows, portfolio, earn, AI, and execution together.",
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
                ["GET /stacks/bets/:betCode", "Public stack share card and copy-source payload."],
                ["GET /stacks/composites", "Curated composite and themed stack ideas."],
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
                ["POST /stacks/quote", "Get a signed executable stack quote."],
                ["POST /stacks/execute", "Execute the stack via smart-account flow."],
                ["POST /stacks/ai/suggest", "Generate AI-assisted stack suggestions."],
                ["POST /stacks/ai/explain", "Generate pricing and correlation explanations."],
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
      "This page collects the stable protocol numbers that shape the current product configuration on testnet.",
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
                ["Chain ID", "46630", "Robinhood Chain Testnet binding used in the live environment."],
                ["Collateral token", "Mock USDC", "Current testnet settlement and vault asset."],
                ["Minimum legs", "2", "Configured lower bound for structured stacks."],
                ["Maximum legs", "3", "Configured upper bound for structured stacks."],
                ["Payout cap", "100x", "Maximum payout multiplier enforced by risk config."],
                ["Withdrawal delay", "7 days", "LPVault redemption delay before claim."],
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
