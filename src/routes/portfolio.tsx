import { Title } from "@solidjs/meta";
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";

import Navbar from "~/components/Navbar";
import LocaleLink from "~/components/LocaleLink.tsx";
import PublicState from "~/components/public-browser/PublicState.tsx";
import { useI18n } from "~/lib/i18n/context.tsx";
import {
  AUTH_SESSION_CHANGE_EVENT,
  readStoredAuthSession,
  type StoredAuthSession,
} from "~/lib/auth/session.ts";
import { faucetClient, formatUsdcBaseUnits } from "~/lib/faucet/index.ts";
import {
  orderClient,
  type PortfolioPositionLegResponse,
  type PortfolioPositionResponse,
  type PortfolioStoryItemResponse,
  type MyPortfolioResponse,
} from "~/lib/order/index.ts";

type PortfolioPageStatus = "loading" | "ready" | "error" | "unauthenticated";
type CashBalanceStatus = "idle" | "loading" | "ready" | "error";
type PortfolioTab = "active" | "history";
type PortfolioRange = "1H" | "24H" | "7D" | "30D" | "ALL";

function formatUsdAmount(value: number | string): string {
  const parsedValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsedValue)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsedValue);
}

function formatSignedUsdAmount(value: number | string): string {
  const parsedValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsedValue)) {
    return "$0.00";
  }

  const absoluteLabel = formatUsdAmount(Math.abs(parsedValue));

  if (parsedValue > 0) {
    return `+${absoluteLabel}`;
  }

  if (parsedValue < 0) {
    return `-${absoluteLabel}`;
  }

  return absoluteLabel;
}

function formatWalletAddress(value: string): string {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatPositionDate(value: string): string {
  const parsedValue = Date.parse(value);

  if (Number.isNaN(parsedValue)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(parsedValue));
}

function formatPositionTimestamp(value: string): string {
  const parsedValue = Date.parse(value);

  if (Number.isNaN(parsedValue)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(parsedValue));
}

function compareAmountRaw(raw: string | null | undefined): number {
  if (!raw) {
    return 0;
  }

  try {
    const parsed = BigInt(raw);
    return parsed > 0n ? 1 : parsed < 0n ? -1 : 0;
  } catch {
    const parsed = Number(raw);

    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return parsed > 0 ? 1 : parsed < 0 ? -1 : 0;
  }
}

function buildPositionTitle(position: PortfolioPositionResponse): string {
  if (position.legs.length === 0) {
    return position.title;
  }

  return position.legs
    .map((leg: PortfolioPositionLegResponse) => `${leg.question} ${leg.outcome_label}`)
    .join(" · ");
}

function buildPositionDetail(position: PortfolioPositionResponse): string {
  const parts = [
    `Stake ${formatUsdAmount(position.stake.display)}`,
    `Max return ${formatUsdAmount(position.total_return.display)}`,
    `${position.capital_multiple} payout`,
  ];

  if (position.bet_code?.trim()) {
    parts.push(`Code ${position.bet_code.trim()}`);
  }

  return parts.join(" · ");
}

function buildStoryHref(item: PortfolioStoryItemResponse | null | undefined): string | null {
  const code = item?.bet_code?.trim();
  return code ? `/bets/${encodeURIComponent(code)}` : null;
}

function statusBadgeLabel(status: string): string {
  const normalizedStatus = status.trim().toLowerCase();

  switch (normalizedStatus) {
    case "open":
      return "LIVE";
    case "won":
      return "WON";
    case "lost":
      return "LOST";
    case "voided":
      return "VOIDED";
    default:
      return normalizedStatus.toUpperCase();
  }
}

function statusTone(status: string): "live" | "won" | "lost" | "voided" | "neutral" {
  const normalizedStatus = status.trim().toLowerCase();

  switch (normalizedStatus) {
    case "open":
      return "live";
    case "won":
      return "won";
    case "lost":
      return "lost";
    case "voided":
      return "voided";
    default:
      return "neutral";
  }
}

function openAuthModal() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("sabi:open-auth-modal"));
}

function PortfolioIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="4.25"
        y="7.25"
        width="15.5"
        height="12.5"
        rx="2.75"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.75"
      />
      <path
        d="M8 7V6.25C8 4.73122 9.23122 3.5 10.75 3.5H13.25C14.7688 3.5 16 4.73122 16 6.25V7"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.75"
      />
      <path
        d="M4.5 11.5H19.5"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.75"
      />
      <path
        d="M11 11.5V13.25H13V11.5"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.75"
      />
    </svg>
  );
}

function PortfolioHeroChart(props: { positive: boolean }) {
  const linePath = () =>
    props.positive
      ? "M 18 156 C 150 156, 248 154, 360 154 S 596 154, 748 152 S 914 150, 1062 150"
      : "M 18 152 C 152 152, 258 154, 368 155 S 604 160, 760 162 S 922 166, 1062 168";
  const areaPath = () => `${linePath()} L 1062 226 L 18 226 Z`;

  return (
    <svg
      class="pm-portfolio__hero-chart-svg"
      viewBox="0 0 1080 240"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pm-portfolio-chart-fill" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(80, 212, 144, 0.32)" />
          <stop offset="100%" stop-color="rgba(80, 212, 144, 0)" />
        </linearGradient>
      </defs>
      <path d={areaPath()} fill="url(#pm-portfolio-chart-fill)" />
      <path
        d={linePath()}
        fill="none"
        stroke={props.positive ? "#53d089" : "#f59e0b"}
        stroke-linecap="round"
        stroke-width="4"
      />
      <circle cx="1062" cy={props.positive ? "150" : "168"} r="7.5" fill="#ffffff" />
      <circle
        cx="1062"
        cy={props.positive ? "150" : "168"}
        r="5"
        fill={props.positive ? "#53d089" : "#f59e0b"}
      />
    </svg>
  );
}

export default function PortfolioRoute() {
  const { t } = useI18n();
  const [session, setSession] = createSignal<StoredAuthSession | null>(null);
  const [didReadSession, setDidReadSession] = createSignal(false);
  const [portfolio, setPortfolio] = createSignal<MyPortfolioResponse | null>(null);
  const [status, setStatus] = createSignal<PortfolioPageStatus>("loading");
  const [cashStatus, setCashStatus] = createSignal<CashBalanceStatus>("idle");
  const [cashBalanceDisplay, setCashBalanceDisplay] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [activeTab, setActiveTab] = createSignal<PortfolioTab>("active");
  const [selectedRange, setSelectedRange] = createSignal<PortfolioRange>("ALL");
  let portfolioRequestVersion = 0;
  let cashBalanceRequestVersion = 0;

  onMount(() => {
    setSession(readStoredAuthSession());
    setDidReadSession(true);

    const handleSessionChange = (event: Event) => {
      const nextSession = (event as CustomEvent<StoredAuthSession | null>).detail;
      setSession(nextSession ?? readStoredAuthSession());
      setDidReadSession(true);
    };

    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, handleSessionChange);

    onCleanup(() => {
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, handleSessionChange);
    });
  });

  createEffect(() => {
    if (!didReadSession()) {
      setStatus("loading");
      return;
    }

    const token = session()?.token?.trim() ?? "";

    if (token.length === 0) {
      setPortfolio(null);
      setError(null);
      setStatus("unauthenticated");
      return;
    }

    const requestId = ++portfolioRequestVersion;
    setStatus("loading");
    setError(null);

    void orderClient
      .fetchMyPortfolio(token)
      .then(response => {
        if (requestId !== portfolioRequestVersion) {
          return;
        }

        setPortfolio(response);
        setStatus("ready");
      })
      .catch(caughtError => {
        if (requestId !== portfolioRequestVersion) {
          return;
        }

        setPortfolio(null);
        setError(
          caughtError instanceof Error ? caughtError.message : "Unable to load your portfolio.",
        );
        setStatus("error");
      });
  });

  const walletAddress = createMemo(
    () => session()?.user.wallet?.wallet_address?.trim() ?? portfolio()?.wallet_address?.trim() ?? "",
  );

  createEffect(() => {
    if (!didReadSession()) {
      setCashStatus("loading");
      return;
    }

    const address = walletAddress();

    if (address.length === 0) {
      setCashBalanceDisplay(null);
      setCashStatus("idle");
      return;
    }

    const requestId = ++cashBalanceRequestVersion;
    setCashStatus("loading");

    void faucetClient
      .fetchUsdcBalance(address)
      .then(response => {
        if (requestId !== cashBalanceRequestVersion) {
          return;
        }

        setCashBalanceDisplay(formatUsdcBaseUnits(response.balance));
        setCashStatus("ready");
      })
      .catch(() => {
        if (requestId !== cashBalanceRequestVersion) {
          return;
        }

        setCashBalanceDisplay(null);
        setCashStatus("error");
      });
  });

  const openPositions = createMemo(() =>
    (portfolio()?.positions ?? [])
      .filter(position => position.status === "open")
      .sort((left, right) => Date.parse(right.opened_at) - Date.parse(left.opened_at)),
  );

  const settledPositions = createMemo(() =>
    (portfolio()?.positions ?? [])
      .filter(position => position.status !== "open")
      .sort(
        (left, right) =>
          Date.parse(right.settled_at ?? right.opened_at) -
          Date.parse(left.settled_at ?? left.opened_at),
      ),
  );

  const visiblePositions = createMemo(() =>
    activeTab() === "active" ? openPositions() : settledPositions(),
  );

  const portfolioSummary = createMemo(() => portfolio()?.summary ?? null);
  const portfolioStory = createMemo(() => portfolio()?.story ?? null);

  const heroValueLabel = createMemo(() =>
    portfolioSummary() ? formatUsdAmount(portfolioSummary()!.live_marked_value.display) : "$0.00",
  );

  const unrealizedPnlLabel = createMemo(() =>
    portfolioSummary()
      ? formatSignedUsdAmount(portfolioSummary()!.unrealized_pnl.display)
      : "$0.00",
  );

  const cashBalanceLabel = createMemo(() => {
    if (cashStatus() === "loading") {
      return t("portfolio.cashLoading");
    }

    if (cashStatus() === "error") {
      return t("portfolio.cashUnavailable");
    }

    return formatUsdAmount(cashBalanceDisplay() ?? "0");
  });

  const totalTradeCount = createMemo(
    () =>
      (portfolioSummary()?.open_position_count ?? 0) +
      (portfolioSummary()?.settled_position_count ?? 0),
  );

  const headerStatusLabel = createMemo(() =>
    activeTab() === "active"
      ? `${portfolioSummary()?.open_position_count ?? 0} open`
      : `${portfolioSummary()?.settled_position_count ?? 0} settled`,
  );

  const retryLoad = () => {
    const activeSession = readStoredAuthSession();
    setSession(activeSession ? { ...activeSession } : null);
  };

  return (
    <div class="pm-page">
      <Title>{`${t("portfolio.title")} | Sabimarket`}</Title>
      <Navbar />

      <main class="pm-detail pm-portfolio">
        <section class="pm-portfolio__intro">
          <div class="pm-portfolio__intro-copy">
            <div class="pm-portfolio__intro-icon">
              <PortfolioIcon />
            </div>

            <div class="pm-portfolio__intro-text">
              <p class="pm-portfolio__eyebrow">{t("portfolio.eyebrow")}</p>
              <h1 class="pm-portfolio__title">{t("portfolio.title")}</h1>
              <p class="pm-portfolio__subtitle">{t("portfolio.subtitle")}</p>
            </div>
          </div>

          <Show when={session() || portfolio()}>
            <div class="pm-portfolio__intro-pills">
              <Show when={portfolio()?.account_kind || session()?.user.wallet?.account_kind}>
                <span class="pm-portfolio__pill">
                  {(portfolio()?.account_kind ?? session()?.user.wallet?.account_kind ?? "").replace(
                    /_/g,
                    " ",
                  )}
                </span>
              </Show>
              <Show when={walletAddress().length > 0}>
                <span class="pm-portfolio__pill pm-portfolio__pill--mono">
                  {formatWalletAddress(walletAddress())}
                </span>
              </Show>
            </div>
          </Show>
        </section>

        <Show when={status() === "loading"}>
          <PublicState
            title={t("portfolio.loadingTitle")}
            copy={t("portfolio.loadingCopy")}
          />
        </Show>

        <Show when={status() === "unauthenticated"}>
          <PublicState
            title={t("portfolio.signInTitle")}
            copy={t("portfolio.signInCopy")}
            actionLabel={t("portfolio.openSignIn")}
            onAction={openAuthModal}
          />
        </Show>

        <Show when={status() === "error"}>
          <PublicState
            title={t("portfolio.unableTitle")}
            copy={error() ?? "The authenticated portfolio endpoint could not be loaded."}
            actionLabel={t("portfolio.tryAgain")}
            onAction={retryLoad}
          />
        </Show>

        <Show when={status() === "ready" && portfolio() && portfolioSummary()}>
          {() => (
            <>
              <section class="pm-portfolio__hero">
                <article class="pm-portfolio__hero-card">
                  <div class="pm-portfolio__hero-copy">
                    <p class="pm-portfolio__hero-kicker">Portfolio value</p>
                    <h2 class="pm-portfolio__hero-value">{heroValueLabel()}</h2>
                    <div class="pm-portfolio__hero-meta">
                      <span
                        classList={{
                          "pm-portfolio__hero-pnl": true,
                          "pm-portfolio__hero-pnl--positive":
                            compareAmountRaw(portfolioSummary()!.unrealized_pnl.raw) >= 0,
                          "pm-portfolio__hero-pnl--negative":
                            compareAmountRaw(portfolioSummary()!.unrealized_pnl.raw) < 0,
                        }}
                      >
                        {unrealizedPnlLabel()}
                      </span>
                      <span class="pm-portfolio__hero-meta-label">Unrealized</span>
                    </div>
                    <p class="pm-portfolio__hero-caption">
                      {formatUsdAmount(portfolioSummary()!.total_staked.display)} currently staked
                      across {portfolioSummary()!.open_position_count} live{" "}
                      {portfolioSummary()!.open_position_count === 1 ? "position" : "positions"}.
                    </p>

                    <div class="pm-portfolio__range-row">
                      <For each={["1H", "24H", "7D", "30D", "ALL"] as const}>
                        {range => (
                          <button
                            type="button"
                            classList={{
                              "pm-portfolio__range-pill": true,
                              "pm-portfolio__range-pill--active": selectedRange() === range,
                            }}
                            onClick={() => setSelectedRange(range)}
                          >
                            {range}
                          </button>
                        )}
                      </For>
                    </div>
                  </div>

                  <div class="pm-portfolio__hero-chart">
                    <PortfolioHeroChart
                      positive={compareAmountRaw(portfolioSummary()!.unrealized_pnl.raw) >= 0}
                    />
                  </div>
                </article>

                <div class="pm-portfolio__summary-grid">
                  <article class="pm-portfolio__summary-card">
                    <p class="pm-portfolio__summary-kicker">Cash available</p>
                    <h3 class="pm-portfolio__summary-value">{cashBalanceLabel()}</h3>
                    <p class="pm-portfolio__summary-copy">
                      Wallet balance held outside active market exposure.
                    </p>
                  </article>

                  <article class="pm-portfolio__summary-card">
                    <p class="pm-portfolio__summary-kicker">Active</p>
                    <h3 class="pm-portfolio__summary-value">
                      {portfolioSummary()!.open_position_count.toLocaleString("en-US")}
                    </h3>
                    <p class="pm-portfolio__summary-copy">Open on-chain stacks still in market.</p>
                  </article>

                  <article class="pm-portfolio__summary-card">
                    <p class="pm-portfolio__summary-kicker">Total trades</p>
                    <h3 class="pm-portfolio__summary-value">
                      {totalTradeCount().toLocaleString("en-US")}
                    </h3>
                    <p class="pm-portfolio__summary-copy">
                      Combined open and settled stack positions.
                    </p>
                  </article>

                  <article class="pm-portfolio__summary-card">
                    <p class="pm-portfolio__summary-kicker">Realized P&amp;L</p>
                    <h3
                      classList={{
                        "pm-portfolio__summary-value": true,
                        "pm-portfolio__summary-value--positive":
                          compareAmountRaw(portfolioSummary()!.realized_pnl.raw) > 0,
                        "pm-portfolio__summary-value--negative":
                          compareAmountRaw(portfolioSummary()!.realized_pnl.raw) < 0,
                      }}
                    >
                      {formatSignedUsdAmount(portfolioSummary()!.realized_pnl.display)}
                    </h3>
                    <p class="pm-portfolio__summary-copy">
                      Settled profit and loss already locked in.
                    </p>
                  </article>
                </div>
              </section>

              <section class="pm-portfolio__story">
                <div class="pm-portfolio__story-head">
                  <div>
                    <p class="pm-portfolio__story-kicker">Portfolio story</p>
                    <h2 class="pm-portfolio__story-title">Your account as a set of calls</h2>
                  </div>
                </div>

                <div class="pm-portfolio__story-grid">
                  <article class="pm-portfolio__story-card">
                    <p class="pm-portfolio__story-label">Best call</p>
                    <Show
                      when={portfolioStory()?.best_call}
                      fallback={
                        <p class="pm-portfolio__story-empty">
                          Land a settled win and it will show up here.
                        </p>
                      }
                    >
                      {item => (
                        <>
                          <h3 class="pm-portfolio__story-card-title">{item().title}</h3>
                          <p class="pm-portfolio__story-metric">
                            {formatSignedUsdAmount(item().pnl.display)}
                          </p>
                          <p class="pm-portfolio__story-copy">
                            {item().capital_multiple} return on {formatPositionDate(item().settled_at ?? item().opened_at)}
                          </p>
                          <Show when={buildStoryHref(item())}>
                            {href => (
                              <LocaleLink class="pm-portfolio__story-link" href={href()}>
                                View slip
                              </LocaleLink>
                            )}
                          </Show>
                        </>
                      )}
                    </Show>
                  </article>

                  <article class="pm-portfolio__story-card">
                    <p class="pm-portfolio__story-label">Worst call</p>
                    <Show
                      when={portfolioStory()?.worst_call}
                      fallback={
                        <p class="pm-portfolio__story-empty">
                          Losses and reversals will surface here once they settle.
                        </p>
                      }
                    >
                      {item => (
                        <>
                          <h3 class="pm-portfolio__story-card-title">{item().title}</h3>
                          <p class="pm-portfolio__story-metric">
                            {formatSignedUsdAmount(item().pnl.display)}
                          </p>
                          <p class="pm-portfolio__story-copy">
                            {item().leg_count} {item().leg_count === 1 ? "leg" : "legs"} settled{" "}
                            {formatPositionDate(item().settled_at ?? item().opened_at)}
                          </p>
                          <Show when={buildStoryHref(item())}>
                            {href => (
                              <LocaleLink class="pm-portfolio__story-link" href={href()}>
                                View slip
                              </LocaleLink>
                            )}
                          </Show>
                        </>
                      )}
                    </Show>
                  </article>

                  <article class="pm-portfolio__story-card">
                    <p class="pm-portfolio__story-label">Biggest live exposure</p>
                    <Show
                      when={portfolioStory()?.biggest_live_exposure}
                      fallback={
                        <p class="pm-portfolio__story-empty">
                          Open positions will surface here once capital is live in market.
                        </p>
                      }
                    >
                      {item => (
                        <>
                          <h3 class="pm-portfolio__story-card-title">{item().title}</h3>
                          <p class="pm-portfolio__story-metric">
                            {formatUsdAmount(item().current_value.display)}
                          </p>
                          <p class="pm-portfolio__story-copy">
                            {formatUsdAmount(item().stake.display)} currently committed across{" "}
                            {item().leg_count} {item().leg_count === 1 ? "leg" : "legs"}.
                          </p>
                          <Show when={buildStoryHref(item())}>
                            {href => (
                              <LocaleLink class="pm-portfolio__story-link" href={href()}>
                                View slip
                              </LocaleLink>
                            )}
                          </Show>
                        </>
                      )}
                    </Show>
                  </article>

                  <article class="pm-portfolio__story-card">
                    <p class="pm-portfolio__story-label">Biggest multiplier hit</p>
                    <Show
                      when={portfolioStory()?.biggest_multiplier_hit}
                      fallback={
                        <p class="pm-portfolio__story-empty">
                          High-upside settled winners will appear here.
                        </p>
                      }
                    >
                      {item => (
                        <>
                          <h3 class="pm-portfolio__story-card-title">{item().title}</h3>
                          <p class="pm-portfolio__story-metric">{item().capital_multiple}</p>
                          <p class="pm-portfolio__story-copy">
                            Returned {formatSignedUsdAmount(item().pnl.display)} on a settled stack.
                          </p>
                          <Show when={buildStoryHref(item())}>
                            {href => (
                              <LocaleLink class="pm-portfolio__story-link" href={href()}>
                                View slip
                              </LocaleLink>
                            )}
                          </Show>
                        </>
                      )}
                    </Show>
                  </article>
                </div>

                <div class="pm-portfolio__story-lists">
                  <article class="pm-portfolio__story-list-card">
                    <div class="pm-portfolio__story-list-head">
                      <h3>Recent wins</h3>
                      <span>{portfolioStory()?.recent_wins.length ?? 0}</span>
                    </div>
                    <Show
                      when={(portfolioStory()?.recent_wins.length ?? 0) > 0}
                      fallback={
                        <p class="pm-portfolio__story-empty">
                          Your next settled winner will land here.
                        </p>
                      }
                    >
                      <div class="pm-portfolio__story-list">
                        <For each={portfolioStory()?.recent_wins ?? []}>
                          {item => (
                            <div class="pm-portfolio__story-list-item">
                              <div>
                                <p class="pm-portfolio__story-list-title">{item.title}</p>
                                <p class="pm-portfolio__story-list-copy">
                                  {formatPositionDate(item.settled_at ?? item.opened_at)}
                                </p>
                              </div>
                              <div class="pm-portfolio__story-list-metric">
                                <span>{formatSignedUsdAmount(item.pnl.display)}</span>
                                <Show when={buildStoryHref(item)}>
                                  {href => (
                                    <LocaleLink class="pm-portfolio__story-mini-link" href={href()}>
                                      Slip
                                    </LocaleLink>
                                  )}
                                </Show>
                              </div>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </article>

                  <article class="pm-portfolio__story-list-card">
                    <div class="pm-portfolio__story-list-head">
                      <h3>Recent losses</h3>
                      <span>{portfolioStory()?.recent_losses.length ?? 0}</span>
                    </div>
                    <Show
                      when={(portfolioStory()?.recent_losses.length ?? 0) > 0}
                      fallback={
                        <p class="pm-portfolio__story-empty">
                          Once a stack resolves against you, it will appear here.
                        </p>
                      }
                    >
                      <div class="pm-portfolio__story-list">
                        <For each={portfolioStory()?.recent_losses ?? []}>
                          {item => (
                            <div class="pm-portfolio__story-list-item">
                              <div>
                                <p class="pm-portfolio__story-list-title">{item.title}</p>
                                <p class="pm-portfolio__story-list-copy">
                                  {formatPositionDate(item.settled_at ?? item.opened_at)}
                                </p>
                              </div>
                              <div class="pm-portfolio__story-list-metric">
                                <span>{formatSignedUsdAmount(item.pnl.display)}</span>
                                <Show when={buildStoryHref(item)}>
                                  {href => (
                                    <LocaleLink class="pm-portfolio__story-mini-link" href={href()}>
                                      Slip
                                    </LocaleLink>
                                  )}
                                </Show>
                              </div>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </article>
                </div>
              </section>

              <section class="pm-portfolio__ledger">
                <div class="pm-portfolio__ledger-head">
                  <div class="pm-portfolio__tabs">
                    <button
                      type="button"
                      classList={{
                        "pm-portfolio__tab": true,
                        "pm-portfolio__tab--active": activeTab() === "active",
                      }}
                      onClick={() => setActiveTab("active")}
                    >
                      Active Positions
                    </button>
                    <button
                      type="button"
                      classList={{
                        "pm-portfolio__tab": true,
                        "pm-portfolio__tab--active": activeTab() === "history",
                      }}
                      onClick={() => setActiveTab("history")}
                    >
                      Trade History
                    </button>
                  </div>

                  <span class="pm-portfolio__ledger-status">{headerStatusLabel()}</span>
                </div>

                <Show
                  when={visiblePositions().length > 0}
                  fallback={
                    <div class="pm-portfolio__empty">
                      <h2 class="pm-portfolio__empty-title">
                        {activeTab() === "active"
                          ? "No active positions yet"
                          : "No settled stack history yet"}
                      </h2>
                      <p class="pm-portfolio__empty-copy">
                        {activeTab() === "active"
                          ? "Once you place a live stack, its staked amount and marked value will appear here."
                          : "Settled stacks will move into trade history once outcomes resolve on-chain."}
                      </p>
                    </div>
                  }
                >
                  <div class="pm-portfolio__position-list">
                    <For each={visiblePositions()}>
                      {position => (
                        <article class="pm-portfolio__position-row">
                          <div class="pm-portfolio__position-main">
                            <div class="pm-portfolio__position-badges">
                              <span
                                classList={{
                                  "pm-portfolio__chip": true,
                                  "pm-portfolio__chip--status": true,
                                  "pm-portfolio__chip--live":
                                    statusTone(position.status) === "live",
                                  "pm-portfolio__chip--won": statusTone(position.status) === "won",
                                  "pm-portfolio__chip--lost":
                                    statusTone(position.status) === "lost",
                                  "pm-portfolio__chip--voided":
                                    statusTone(position.status) === "voided",
                                }}
                              >
                                {statusBadgeLabel(position.status)}
                              </span>
                              <span class="pm-portfolio__chip pm-portfolio__chip--muted">
                                {position.source_label}
                              </span>
                              <span class="pm-portfolio__chip pm-portfolio__chip--muted">
                                {position.leg_count} {position.leg_count === 1 ? "leg" : "legs"}
                              </span>
                            </div>

                            <h3
                              class="pm-portfolio__position-title"
                              title={buildPositionTitle(position)}
                            >
                              {buildPositionTitle(position)}
                            </h3>
                            <p class="pm-portfolio__position-copy">
                              {buildPositionDetail(position)}
                            </p>
                          </div>

                          <dl class="pm-portfolio__position-metrics">
                            <div class="pm-portfolio__metric">
                              <dt class="pm-portfolio__metric-label">
                                {position.status === "open" ? "Opened" : "Settled"}
                              </dt>
                              <dd
                                class="pm-portfolio__metric-value pm-portfolio__metric-value--subtle"
                                title={formatPositionTimestamp(
                                  position.status === "open"
                                    ? position.opened_at
                                    : position.settled_at ?? position.opened_at,
                                )}
                              >
                                {formatPositionDate(
                                  position.status === "open"
                                    ? position.opened_at
                                    : position.settled_at ?? position.opened_at,
                                )}
                              </dd>
                            </div>

                            <div class="pm-portfolio__metric">
                              <dt class="pm-portfolio__metric-label">Staked</dt>
                              <dd class="pm-portfolio__metric-value">
                                {formatUsdAmount(position.stake.display)}
                              </dd>
                            </div>

                            <div class="pm-portfolio__metric">
                              <dt class="pm-portfolio__metric-label">Value</dt>
                              <dd class="pm-portfolio__metric-value">
                                {formatUsdAmount(position.current_value.display)}
                              </dd>
                            </div>

                            <div class="pm-portfolio__metric">
                              <dt class="pm-portfolio__metric-label">P&amp;L</dt>
                              <dd
                                classList={{
                                  "pm-portfolio__metric-value": true,
                                  "pm-portfolio__metric-value--positive":
                                    compareAmountRaw(position.pnl.raw) > 0,
                                  "pm-portfolio__metric-value--negative":
                                    compareAmountRaw(position.pnl.raw) < 0,
                                }}
                              >
                                {formatSignedUsdAmount(position.pnl.display)}
                              </dd>
                            </div>
                          </dl>
                        </article>
                      )}
                    </For>
                  </div>
                </Show>
              </section>
            </>
          )}
        </Show>
      </main>
    </div>
  );
}
