import { Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";
import { For, Show, createMemo, createSignal, onMount } from "solid-js";

import LocaleLink from "~/components/LocaleLink";
import Navbar from "~/components/Navbar";
import PublicState from "~/components/public-browser/PublicState.tsx";
import { useI18n } from "~/lib/i18n/context.tsx";
import {
  marketClient,
  type StackRoomDetailResponse,
  type StackRoomMarketResponse,
  type StackRoomRecentStackResponse,
} from "~/lib/market/index.ts";

type RoomPageStatus = "loading" | "ready" | "error";

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

function formatPercentFromBps(value: number | null): string {
  if (typeof value !== "number") {
    return "N/A";
  }

  return `${(value / 100).toFixed(1)}%`;
}

function formatRelativeDate(value: string): string {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return value;
  }

  const deltaMs = Date.now() - timestamp;
  const deltaMinutes = Math.round(deltaMs / 60_000);

  if (deltaMinutes < 60) {
    return `${Math.max(deltaMinutes, 1)}m ago`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 48) {
    return `${deltaHours}h ago`;
  }

  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays}d ago`;
}

function FeaturedMarketCard(props: { market: StackRoomMarketResponse }) {
  return (
    <article class="pm-room-market-card">
      <div class="pm-room-market-card__head">
        <span class="pm-room-market-card__status">{props.market.trading_status}</span>
        <span class="pm-room-market-card__event">{props.market.event_title}</span>
      </div>
      <p class="pm-room-market-card__question">{props.market.question}</p>
      <div class="pm-room-market-card__prices">
        <Show when={props.market.primary_outcome_label}>
          <div class="pm-room-market-card__price">
            <span>{props.market.primary_outcome_label}</span>
            <strong>{formatPercentFromBps(props.market.primary_outcome_probability_bps)}</strong>
          </div>
        </Show>
        <Show when={props.market.secondary_outcome_label}>
          <div class="pm-room-market-card__price">
            <span>{props.market.secondary_outcome_label}</span>
            <strong>{formatPercentFromBps(props.market.secondary_outcome_probability_bps)}</strong>
          </div>
        </Show>
      </div>
      <div class="pm-room-market-card__meta">
        <span>{formatUsdAmount(props.market.volume)} vol</span>
        <LocaleLink href={`/event/${props.market.event_slug}/${props.market.market_slug}`}>
          Open market
        </LocaleLink>
      </div>
    </article>
  );
}

function RecentStackCard(props: { stack: StackRoomRecentStackResponse }) {
  return (
    <article class="pm-room-stack-card">
      <div class="pm-room-stack-card__head">
        <div>
          <p class="pm-room-stack-card__status">{props.stack.status}</p>
          <h3 class="pm-room-stack-card__headline">{props.stack.headline}</h3>
        </div>
        <span class="pm-room-stack-card__multiple">{props.stack.capital_multiple}</span>
      </div>

      <p class="pm-room-stack-card__summary">{props.stack.summary}</p>

      <dl class="pm-room-stack-card__metrics">
        <div>
          <dt>Stake</dt>
          <dd>{formatUsdAmount(props.stack.stake)}</dd>
        </div>
        <div>
          <dt>Return</dt>
          <dd>{formatUsdAmount(props.stack.total_return)}</dd>
        </div>
        <div>
          <dt>Legs</dt>
          <dd>{props.stack.leg_count}</dd>
        </div>
        <div>
          <dt>Opened</dt>
          <dd>{formatRelativeDate(props.stack.opened_at)}</dd>
        </div>
      </dl>

      <div class="pm-room-stack-card__legs">
        <For each={props.stack.legs.slice(0, 3)}>
          {leg => (
            <div class="pm-room-stack-card__leg">
              <span class="pm-room-stack-card__leg-outcome">{leg.outcome_label}</span>
              <span>{leg.question}</span>
            </div>
          )}
        </For>
      </div>

      <div class="pm-room-stack-card__actions">
        <LocaleLink class="pm-button pm-button--ghost" href={`/bets/${props.stack.bet_code}`}>
          Open card
        </LocaleLink>
        <LocaleLink
          class="pm-button pm-button--secondary"
          href={`/?betCode=${encodeURIComponent(props.stack.bet_code)}`}
        >
          Load stack
        </LocaleLink>
      </div>
    </article>
  );
}

export default function RoomDetailRoute() {
  const params = useParams<{ slug: string }>();
  const { t } = useI18n();
  const [status, setStatus] = createSignal<RoomPageStatus>("loading");
  const [roomDetail, setRoomDetail] = createSignal<StackRoomDetailResponse | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const loadRoom = async () => {
    setStatus("loading");
    setError(null);

    try {
      const response = await marketClient.fetchStackRoom(params.slug);
      setRoomDetail(response);
      setStatus("ready");
    } catch (caughtError) {
      setRoomDetail(null);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load room.");
      setStatus("error");
    }
  };

  onMount(() => {
    void loadRoom();
  });

  const room = createMemo(() => roomDetail()?.room ?? null);

  return (
    <div class="pm-page">
      <Title>{`${room()?.title ?? "Room"} | Sabimarket`}</Title>
      <Navbar />

      <main class="pm-detail pm-room-detail">
        <Show when={status() === "loading"}>
          <PublicState title={t("rooms.loadingTitle")} copy={t("rooms.loadingCopy")} />
        </Show>

        <Show when={status() === "error"}>
          <PublicState
            title={t("rooms.unableTitle")}
            copy={error() ?? "The room could not be loaded."}
            actionLabel={t("home.tryAgain")}
            onAction={() => void loadRoom()}
          />
        </Show>

        <Show when={status() === "ready" && roomDetail()}>
          {loaded => (
            <>
              <section class="pm-room-detail__hero">
                <div class="pm-room-detail__hero-copy">
                  <LocaleLink class="pm-room-detail__breadcrumb" href="/rooms">
                    {t("rooms.title")}
                  </LocaleLink>
                  <p class="pm-room-detail__eyebrow">{loaded().room.activity_label}</p>
                  <h1 class="pm-room-detail__title">{loaded().room.title}</h1>
                  <p class="pm-room-detail__subtitle">{loaded().room.summary}</p>
                  <div class="pm-room-detail__actions">
                    <LocaleLink class="pm-button pm-button--primary" href="/?stackBuilder=ai">
                      {t("rooms.openAiBuilder")}
                    </LocaleLink>
                    <Show when={loaded().recent_stacks[0]}>
                      <LocaleLink
                        class="pm-button pm-button--ghost"
                        href={`/bets/${loaded().recent_stacks[0]!.bet_code}`}
                      >
                        {t("rooms.openCard")}
                      </LocaleLink>
                    </Show>
                  </div>
                </div>

                <article class="pm-room-detail__hero-card">
                  <dl class="pm-room-detail__hero-metrics">
                    <div>
                      <dt>Markets</dt>
                      <dd>{loaded().room.matching_market_count}</dd>
                    </div>
                    <div>
                      <dt>{t("rooms.recentStacks")}</dt>
                      <dd>{loaded().room.recent_stack_count}</dd>
                    </div>
                    <div>
                      <dt>Open</dt>
                      <dd>{loaded().room.open_stack_count}</dd>
                    </div>
                    <div>
                      <dt>Settled</dt>
                      <dd>{loaded().room.settled_stack_count}</dd>
                    </div>
                  </dl>
                  <span class="pm-room-detail__updated-at">
                    {t("rooms.updatedAt", {
                      value: new Date(loaded().generated_at).toLocaleString("en-US"),
                    })}
                  </span>
                </article>
              </section>

              <section class="pm-room-detail__grid">
                <div class="pm-room-detail__main">
                  <article class="pm-room-detail__card">
                    <div class="pm-room-detail__section-head">
                      <h2>{t("rooms.theses")}</h2>
                      <span>{loaded().theses.length} live theses</span>
                    </div>
                    <div class="pm-room-detail__theses">
                      <For each={loaded().theses}>
                        {thesis => (
                          <article class="pm-room-detail__thesis">
                            <span class={`pm-room-detail__thesis-tone pm-room-detail__thesis-tone--${thesis.tone}`}>
                              {thesis.tone}
                            </span>
                            <h3>{thesis.title}</h3>
                            <p>{thesis.body}</p>
                          </article>
                        )}
                      </For>
                    </div>
                  </article>

                  <article class="pm-room-detail__card">
                    <div class="pm-room-detail__section-head">
                      <h2>{t("rooms.recentStacks")}</h2>
                      <span>{loaded().recent_stacks.length} featured receipts</span>
                    </div>
                    <Show
                      when={loaded().recent_stacks.length > 0}
                      fallback={
                        <p class="pm-room-detail__empty-copy">
                          No recent room stacks have been indexed yet.
                        </p>
                      }
                    >
                      <div class="pm-room-detail__stack-list">
                        <For each={loaded().recent_stacks}>
                          {stack => <RecentStackCard stack={stack} />}
                        </For>
                      </div>
                    </Show>
                  </article>
                </div>

                <aside class="pm-room-detail__side">
                  <Show when={loaded().featured_composite}>
                    {composite => (
                      <article class="pm-room-detail__card pm-room-detail__card--sticky">
                        <div class="pm-room-detail__section-head">
                          <h2>{t("rooms.featuredComposite")}</h2>
                          <span>{composite().risk_label}</span>
                        </div>
                        <p class="pm-room-detail__composite-title">{composite().title}</p>
                        <p class="pm-room-detail__composite-copy">{composite().summary}</p>
                        <div class="pm-room-detail__composite-prompt">{composite().prompt}</div>
                        <LocaleLink class="pm-button pm-button--secondary" href="/?stackBuilder=ai">
                          {t("rooms.openAiBuilder")}
                        </LocaleLink>
                      </article>
                    )}
                  </Show>

                  <article class="pm-room-detail__card">
                    <div class="pm-room-detail__section-head">
                      <h2>{t("rooms.featuredMarkets")}</h2>
                      <span>{loaded().featured_markets.length} live</span>
                    </div>
                    <Show
                      when={loaded().featured_markets.length > 0}
                      fallback={
                        <p class="pm-room-detail__empty-copy">
                          No matching markets are available in the current feed snapshot.
                        </p>
                      }
                    >
                      <div class="pm-room-detail__market-list">
                        <For each={loaded().featured_markets}>
                          {market => <FeaturedMarketCard market={market} />}
                        </For>
                      </div>
                    </Show>
                  </article>
                </aside>
              </section>
            </>
          )}
        </Show>
      </main>
    </div>
  );
}
