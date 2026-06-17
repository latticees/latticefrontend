# Lattice Frontend

Lattice Frontend is the SolidStart application for the Lattice structured prediction market. It exposes the public market board, stack builder, market detail pages, rooms, comments, leaderboards, portfolio, Earn vault controls, docs, share cards, multilingual discovery, and account onboarding.

The frontend is intentionally product-first. The root route opens the market experience directly, while `/home` is the optional landing page. Stack creation, bet-code replay, and vault actions are wired to the Rust backend and Robinhood Chain contracts through the backend API.

## Product Summary

Lattice lets users combine prediction-market outcomes into structured stacks. Unlike ordinary parlays, Lattice shows correlation-aware pricing:

- Independent joint probability.
- Correlation-adjusted joint probability.
- Correlation premium or compression.
- Protocol edge.
- Capital multiple.
- Potential return.
- Payout-cap status.

The user sees why a stack pays less when legs are related, why diversified stacks keep more upside, and why extreme long-tail payouts are capped.

## Repository Layout

```text
src/
  app.tsx                         app shell, routing frame, providers
  app.css                         global design system and app chrome
  components/
    Navbar.tsx                    top nav, account menu, language, theme
    PublicMarketSections.tsx      market feed sections
    HomeLanding.tsx               optional /home landing page
    AuthModal.tsx                 Google sign-in flow
    BetCodeModal.tsx              bet-code paste/reload flow
    DepositModal.tsx              wallet funding/deposit surface
    market-detail/                market detail, stack builder actions, comments
  lib/
    api.ts                        fetch wrapper and URL builder
    auth/                         Google auth, session storage, wallet state
    comment/                      market comment client
    config/                       public backend config
    docs/                         in-app docs content
    faucet/                       test USDC funding client
    i18n/                         locale config, messages, context
    market/                       market feeds, detail, cache, view transforms
    order/                        legacy compatibility shell
    share/                        PNG stack card and social-share helpers
  routes/
    index.tsx                     main product surface
    home.tsx                      landing page
    markets/                      market list, detail, condition lookup
    event/ and events/            event routes
    categories/                   category routes
    rooms/                        themed rooms
    leaderboard.tsx               builder leaderboard
    portfolio.tsx                 user portfolio and story
    earn.tsx                      LP vault page
    bets/[betCode].tsx            shared stack reload page
    docs/                         docs index and detail pages
    search.tsx                    search route
    google/callback.tsx           OAuth callback
public/
  flag images, fonts, favicon, social assets
```

## Main Routes

- `/` - primary market product surface.
- `/home` - optional landing/launch page.
- `/markets` - full market list.
- `/markets/:marketId` - market detail with stack-builder action and comments.
- `/markets/by-condition/:conditionId` - condition-id lookup.
- `/event/:eventSlug/:marketSlug` - event market detail.
- `/events/:eventId` - event detail.
- `/categories/:slug` - category feed.
- `/rooms` - room index.
- `/rooms/:slug` - room detail, posts, presence, linked stacks.
- `/leaderboard` - builder rankings.
- `/portfolio` - account portfolio and stack history.
- `/earn` - LP vault deposit/redeem controls.
- `/bets/:betCode` - shared bet-code reload.
- `/docs` and `/docs/:slug` - protocol docs.
- `/search` - search page.

## Feature Surfaces

### Market Board

The market board consumes cached backend feeds. It supports trending, breaking, new, politics, sports, crypto, esports, Iran, finance, geopolitics, technology, culture, economy, weather, mentions, elections, and all-market views.

Markets should load more only through the explicit "Show more markets" action, not infinite scroll.

### Market Detail

Market detail pages show:

- normalized question and outcomes
- market probability and price history
- related event markets
- stack-builder action for any outcome
- market comments
- room/event context when available

The UI does not expose unsupported single-market buy/sell actions. If a user wants exposure, they add the outcome to a structured stack.

### Stack Builder

The stack builder composes multiple outcomes and requests a quote from `POST /stacks/quote`. The quote response drives the visible payout, correlation adjustment, blockers, and execution state.

Executable stacks can be submitted through `POST /stacks/execute`. Successful positions receive a bet code and can be reopened through `/bets/:betCode`.

### Share Cards

Booked stacks can become shareable cards. The share surface includes:

- leg count
- stake
- potential return
- payout multiple
- risk premium/correlation signal
- bet code
- deep link back into the stack

Where a social platform cannot upload the PNG directly through the browser, the page still exposes rich metadata and a copyable image/link flow.

### Rooms

Rooms are themed surfaces around market narratives. They contain linked markets, posts, reactions, presence, and room-specific stack context. They are designed to make prediction theses feel alive rather than isolated in a flat market grid.

### Leaderboard

The leaderboard is not just raw PnL. It is designed around stack behavior:

- top builder
- best stack return
- accuracy
- streak
- biggest hit
- recent activity

### Portfolio

Portfolio is a story surface, not only a table. It highlights best call, worst call, live exposure, biggest multiplier hit, recent wins/losses, stack status, and booked bet-code history.

### Earn

Earn exposes the LP vault:

- wallet cash
- deposited vault value
- vault shares
- share price
- available/reserved liquidity
- utilization
- withdrawal delay
- pending redeem and claimable state

The holding-horizon slider is a projection helper, not an additional lock beyond the protocol withdrawal delay.

### AI Explainer

AI explains the deterministic model output. It should describe:

- why legs fit together
- where correlation came from
- why payout changed versus naive multiplication
- what risk premium means

The AI does not set odds or override the backend quote.

### Multilingual Discovery

The app includes a frontend locale system inspired by Polymarket's locale UX. It supports language selection, localized navigation, translated market labels when available, and country flag assets from `public/`.

Supported assets currently include:

- `usa.png`
- `esp.png`
- `fra.png`
- `deu.png`
- `chn.png`
- `jpn.png`
- `idn.png`
- `bgd.png`

## Runtime Environment

Create `.env` from `env.example`:

```sh
cp env.example .env
```

Important variables:

- `VITE_API_BASE_URL` - backend base URL.
- `VITE_DEV_API_PROXY_TARGET` - backend proxy target for local development.
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client id.

For local backend development:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_DEV_API_PROXY_TARGET=http://localhost:8080
```

For deployed frontend:

```env
VITE_API_BASE_URL=https://your-backend.example
```

## Development

Install dependencies:

```sh
pnpm install
```

Start the app:

```sh
pnpm dev
```

Build:

```sh
pnpm build
```

Preview:

```sh
pnpm preview
```

Run available node tests:

```sh
node --test src/lib/*.test.ts
```

## Backend Contract

The frontend expects the backend to provide:

- `/markets/*`
- `/stacks/*`
- `/me/*`
- `/auth/*`
- `/public-config`
- comment routes
- faucet routes

The backend owns signing, execution, settlement, and all private keys. The frontend never holds the quote signer, operator key, paymaster key, or database credentials.

## Design Direction

The product UI uses a clean white/blue market interface with dark mode support. It should stay dense enough for trading, but still clear enough for hackathon judges to understand:

- what the market is
- what the user selected
- why the stack pays what it pays
- how to copy or share it
- where LP yield comes from

Avoid adding unsupported trading controls. The smart contracts support structured stack execution and composite buys; they do not support arbitrary single-market order-book buy/sell through this frontend.

## Deployment

Vercel should build with:

```sh
pnpm build
```

The SPA fallback must route unknown paths back to the app entry so deep links like `/bets/ABC123`, `/rooms/iran`, and `/markets/:id` do not 404 on refresh.

## Troubleshooting

### Deep link returns Vercel 404

Check the Vercel rewrite/fallback config and make sure all app routes serve the SolidStart app.

### App shows stale market text after locale change

Make sure the locale context and route link helpers are using the selected locale, then refresh after switching if the source data was cached.

### Market detail has no buy/sell

That is expected. Lattice is stack-first. Add an outcome to the stack builder.

### Earn or portfolio feels slow

Those pages depend on authenticated backend read models and on-chain vault reads. The backend caches marked positions and vault snapshots to keep navigation fast.

### Share card does not attach directly to X

Browser share APIs cannot reliably attach generated PNGs to every social composer. Use the generated image download/copy flow plus the bet-code link and metadata preview.

## Security Notes

- Do not put backend secrets in frontend env vars.
- Only `VITE_*` variables are exposed to the client.
- Google client id is public; backend JWT secret and contract operator keys are not.
- Never commit `.env`.
