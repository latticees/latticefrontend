import { Title } from "@solidjs/meta";
import { For, Show, createMemo, createSignal, onMount } from "solid-js";

import Navbar from "~/components/Navbar";
import PublicState from "~/components/public-browser/PublicState.tsx";
import { useI18n } from "~/lib/i18n/context.tsx";
import {
  marketClient,
  type StackLeaderboardEntryResponse,
  type StackLeaderboardResponse,
} from "~/lib/market/index.ts";

type LeaderboardPageStatus = "loading" | "ready" | "error";

function formatUsdAmount(value: string): string {
  const parsedValue = Number(value);

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

function formatSignedUsdAmount(value: string): string {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return "$0.00";
  }

  const absoluteLabel = formatUsdAmount(Math.abs(parsedValue).toFixed(2));

  if (parsedValue > 0) {
    return `+${absoluteLabel}`;
  }

  if (parsedValue < 0) {
    return `-${absoluteLabel}`;
  }

  return absoluteLabel;
}

function formatPercentFromBps(value: number): string {
  return `${(value / 100).toFixed(1)}%`;
}

function formatWalletAddress(value: string): string {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function LeaderboardRoute() {
  const { t } = useI18n();
  const [status, setStatus] = createSignal<LeaderboardPageStatus>("loading");
  const [leaderboard, setLeaderboard] = createSignal<StackLeaderboardResponse | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const loadLeaderboard = async () => {
    setStatus("loading");
    setError(null);

    try {
      const response = await marketClient.fetchStackLeaderboard();
      setLeaderboard(response);
      setStatus("ready");
    } catch (caughtError) {
      setLeaderboard(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load the stack leaderboard right now.",
      );
      setStatus("error");
    }
  };

  onMount(() => {
    void loadLeaderboard();
  });

  const podiumEntries = createMemo(() => (leaderboard()?.entries ?? []).slice(0, 3));
  const remainingEntries = createMemo(() => (leaderboard()?.entries ?? []).slice(3));
  const topBuilder = createMemo(() => podiumEntries()[0] ?? null);

  return (
    <div class="pm-page">
      <Title>{`${t("leaderboard.title")} | Sabimarket`}</Title>
      <Navbar />

      <main class="pm-detail pm-leaderboard">
        <section class="pm-leaderboard__intro">
          <div>
            <p class="pm-leaderboard__eyebrow">{t("leaderboard.eyebrow")}</p>
            <h1 class="pm-leaderboard__title">{t("leaderboard.title")}</h1>
            <p class="pm-leaderboard__subtitle">{t("leaderboard.subtitle")}</p>
          </div>

          <Show when={topBuilder()}>
            {entry => (
              <article class="pm-leaderboard__hero-card">
                <p class="pm-leaderboard__hero-kicker">{t("leaderboard.topBuilder")}</p>
                <h2 class="pm-leaderboard__hero-name">{entry().display_name}</h2>
                <p class="pm-leaderboard__hero-meta">{formatWalletAddress(entry().wallet_address)}</p>
                <div class="pm-leaderboard__hero-metrics">
                  <span>{formatSignedUsdAmount(entry().realized_pnl.display)} {t("leaderboard.realized").toLowerCase()}</span>
                  <span>{formatPercentFromBps(entry().accuracy_bps)} {t("leaderboard.accuracy").toLowerCase()}</span>
                  <span>{entry().current_streak} {t("leaderboard.streak").toLowerCase()}</span>
                </div>
              </article>
            )}
          </Show>
        </section>

        <Show when={status() === "loading"}>
          <PublicState
            title={t("leaderboard.loadingTitle")}
            copy={t("leaderboard.loadingCopy")}
          />
        </Show>

        <Show when={status() === "error"}>
          <PublicState
            title={t("leaderboard.unableTitle")}
            copy={error() ?? "The leaderboard endpoint could not be loaded."}
            actionLabel={t("portfolio.tryAgain")}
            onAction={() => void loadLeaderboard()}
          />
        </Show>

        <Show when={status() === "ready" && leaderboard()}>
          <>
            <Show
              when={podiumEntries().length > 0}
              fallback={
                <PublicState
                  title={t("leaderboard.emptyTitle")}
                  copy={t("leaderboard.emptyCopy")}
                />
              }
            >
              <section class="pm-leaderboard__podium">
                <For each={podiumEntries()}>
                  {entry => (
                    <article class="pm-leaderboard__podium-card">
                      <div class="pm-leaderboard__rank-badge">#{entry.rank}</div>
                      <p class="pm-leaderboard__podium-name">{entry.display_name}</p>
                      <p class="pm-leaderboard__podium-wallet">
                        {formatWalletAddress(entry.wallet_address)}
                      </p>
                      <dl class="pm-leaderboard__podium-stats">
                        <div>
                          <dt>{t("leaderboard.realized")}</dt>
                          <dd>{formatSignedUsdAmount(entry.realized_pnl.display)}</dd>
                        </div>
                        <div>
                          <dt>{t("leaderboard.accuracy")}</dt>
                          <dd>{formatPercentFromBps(entry.accuracy_bps)}</dd>
                        </div>
                        <div>
                          <dt>{t("leaderboard.biggestHit")}</dt>
                          <dd>{formatUsdAmount(entry.biggest_hit.display)}</dd>
                        </div>
                        <div>
                          <dt>{t("leaderboard.bestMultiple")}</dt>
                          <dd>{entry.best_capital_multiple}</dd>
                        </div>
                      </dl>
                    </article>
                  )}
                </For>
              </section>

              <section class="pm-leaderboard__table">
                <div class="pm-leaderboard__table-head">
                  <h2 class="pm-leaderboard__section-title">{t("leaderboard.globalRanking")}</h2>
                  <span class="pm-leaderboard__generated-at">
                    {t("leaderboard.updatedAt", {
                      value: new Date(leaderboard()!.generated_at).toLocaleString("en-US"),
                    })}
                  </span>
                </div>

                <div class="pm-leaderboard__rows">
                  <For each={remainingEntries().length > 0 ? remainingEntries() : podiumEntries()}>
                    {(entry: StackLeaderboardEntryResponse) => (
                      <article class="pm-leaderboard__row">
                        <div class="pm-leaderboard__row-main">
                          <div class="pm-leaderboard__row-rank">#{entry.rank}</div>
                          <div>
                            <p class="pm-leaderboard__row-name">{entry.display_name}</p>
                            <p class="pm-leaderboard__row-wallet">
                              {formatWalletAddress(entry.wallet_address)}
                            </p>
                          </div>
                        </div>

                        <dl class="pm-leaderboard__row-stats">
                          <div>
                            <dt>{t("leaderboard.realized")} P&amp;L</dt>
                            <dd>{formatSignedUsdAmount(entry.realized_pnl.display)}</dd>
                          </div>
                          <div>
                            <dt>{t("leaderboard.accuracy")}</dt>
                            <dd>{formatPercentFromBps(entry.accuracy_bps)}</dd>
                          </div>
                          <div>
                            <dt>Settled</dt>
                            <dd>{entry.settled_position_count}</dd>
                          </div>
                          <div>
                            <dt>{t("leaderboard.streak")}</dt>
                            <dd>{entry.current_streak}</dd>
                          </div>
                          <div>
                            <dt>{t("leaderboard.biggestHit")}</dt>
                            <dd>{formatUsdAmount(entry.biggest_hit.display)}</dd>
                          </div>
                          <div>
                            <dt>Best stack</dt>
                            <dd>{entry.best_capital_multiple}</dd>
                          </div>
                        </dl>
                      </article>
                    )}
                  </For>
                </div>
              </section>
            </Show>
          </>
        </Show>
      </main>
    </div>
  );
}
