import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";

import LocaleLink from "~/components/LocaleLink.tsx";
import StackSidebar from "~/components/stack/StackSidebar.tsx";
import type { StackSelectableMarket } from "~/components/stack/model.ts";
import { useStackSidebar } from "~/components/stack/useStackSidebar.ts";
import {
  formatProbabilityFromBps,
  formatUsdVolume,
} from "~/components/market-detail/format.ts";
import {
  sortMarketsForPreview,
  type GroupedMarketEvent,
  type PublicMarketCardResponse,
} from "~/lib/market/index.ts";
import {
  fetchEventMarketsSnapshot,
  readStoredEventMarkets,
} from "~/lib/market/event-markets-cache.ts";
import type {
  MarketCurrentPricesResponse,
  MarketQuoteSummaryResponse,
  MarketResponse,
  MarketStatsResponse,
} from "~/lib/market/types.ts";
import { useI18n } from "~/lib/i18n/context.tsx";

interface PublicMarketSectionsProps {
  cards: GroupedMarketEvent[];
  title?: string;
  onRetry?: () => void;
  loading?: boolean;
  error?: string | null;
  canLoadMore?: boolean;
  loadingMore?: boolean;
  loadMoreError?: string | null;
  onLoadMore?: () => void;
}

const EVENT_PRIMARY_MARKET_STORAGE_PREFIX = "pm-event-primary-market/v1:";
const EAGER_CARD_IMAGE_COUNT = 12;
const EAGER_CARD_DATA_COUNT = 12;
const HOME_CARD_MARKET_PREVIEW_LIMIT = 2;

interface HomeCardMarket {
  id: string;
  slug: string;
  label: string;
  question: string;
  outcomes: string[];
  end_time: string;
  sort_order: number;
  trading_status: string;
  current_prices?: MarketCurrentPricesResponse | null;
  stats?: MarketStatsResponse | null;
  quote_summary?: MarketQuoteSummaryResponse | null;
}

function formatRowLabel(
  market: HomeCardMarket,
  intlLocale: string,
  openMarketLabel: string,
): string {
  const label = market.label.trim();

  if (label.length > 0) {
    return label;
  }

  const date = new Date(market.end_time);

  if (Number.isNaN(date.getTime())) {
    return openMarketLabel;
  }

  return new Intl.DateTimeFormat(intlLocale, {
    month: "long",
    day: "numeric",
  }).format(date);
}

function localizeOutcomeLabel(
  label: string | null | undefined,
  t: (key: "common.yes" | "common.no" | "common.draw") => string,
): string {
  const normalized = label?.trim().toLowerCase();

  if (!normalized) {
    return t("common.yes");
  }

  if (normalized === "yes" || normalized === "buy yes") {
    return normalized === "buy yes" ? `Buy ${t("common.yes")}` : t("common.yes");
  }

  if (normalized === "no" || normalized === "buy no") {
    return normalized === "buy no" ? `Buy ${t("common.no")}` : t("common.no");
  }

  if (normalized === "draw") {
    return t("common.draw");
  }

  return label ?? t("common.yes");
}

function formatMarketMetric(market: HomeCardMarket): string {
  const probability =
    formatProbabilityFromBps(market.quote_summary?.buy_yes_bps) ??
    formatProbabilityFromBps(market.current_prices?.yes_bps);

  if (probability) {
    return probability;
  }

  const volume = formatUsdVolume(market.stats?.volume_usd, true);

  if (volume) {
    return volume;
  }

  return "--";
}

function toHomeCardMarket(market: PublicMarketCardResponse | MarketResponse): HomeCardMarket {
  return {
    id: market.id,
    slug: market.slug,
    label: market.label,
    question: market.question,
    outcomes: market.outcomes,
    end_time: market.end_time,
    sort_order: market.sort_order,
    trading_status: market.trading_status,
    current_prices: "current_prices" in market ? market.current_prices ?? null : null,
    stats: "stats" in market ? market.stats ?? null : null,
    quote_summary: "quote_summary" in market ? market.quote_summary ?? null : null,
  };
}

function toStackSelectableHomeMarket(
  eventSlug: string,
  market: HomeCardMarket,
): StackSelectableMarket {
  return {
    marketId: market.id,
    marketSlug: market.slug,
    eventSlug,
    label: formatRowLabel(market),
    question: market.question,
    outcomes: market.outcomes,
    yesBps: market.quote_summary?.buy_yes_bps ?? market.current_prices?.yes_bps ?? null,
    noBps:
      market.quote_summary?.buy_no_bps ??
      market.current_prices?.no_bps ??
      (typeof market.quote_summary?.buy_yes_bps === "number"
        ? Math.max(0, 10000 - market.quote_summary.buy_yes_bps)
        : typeof market.current_prices?.yes_bps === "number"
          ? Math.max(0, 10000 - market.current_prices.yes_bps)
          : null),
  };
}

function buildEventHref(eventSlug: string, marketSlug?: string): string {
  return `/event/${encodeURIComponent(eventSlug)}`;
}

function buildMarketHref(eventSlug: string, marketSlug: string): string {
  return buildEventHref(eventSlug, marketSlug);
}

function rememberPreferredMarket(eventSlug: string, marketSlug?: string) {
  if (!marketSlug || typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      `${EVENT_PRIMARY_MARKET_STORAGE_PREFIX}${eventSlug}`,
      JSON.stringify(marketSlug),
    );
  } catch {
    // Ignore storage failures and fall back to route-only navigation.
  }
}

function EventArtwork(props: { card: GroupedMarketEvent; eager?: boolean }) {
  const title = props.card.event.title.trim();
  const fallbackLetter = title.charAt(0).toUpperCase() || "M";

  return (
    <div class="pm-compact-card__art">
      <Show
        when={props.card.event.image_url}
        fallback={<span class="pm-compact-card__art-fallback">{fallbackLetter}</span>}
      >
        <img
          src={props.card.event.image_url ?? ""}
          alt={`${props.card.event.title} card icon`}
          loading={props.eager ? "eager" : "lazy"}
          decoding={props.eager ? "sync" : "async"}
          fetchpriority={props.eager ? "high" : "auto"}
        />
      </Show>
    </div>
  );
}

function OutcomeButton(props: {
  market: HomeCardMarket;
  label: string;
  outcomeIndex: number;
  isActive: boolean;
  onSelect: (market: HomeCardMarket, outcomeIndex: number) => void;
}) {
  return (
    <button
      type="button"
      classList={{
        "pm-compact-card__outcome": true,
        "pm-compact-card__outcome--yes": props.outcomeIndex === 0,
        "pm-compact-card__outcome--no": props.outcomeIndex !== 0,
        "pm-compact-card__outcome--active": props.isActive,
      }}
      onClick={event => {
        event.preventDefault();
        event.stopPropagation();
        props.onSelect(props.market, props.outcomeIndex);
      }}
    >
      {props.label}
    </button>
  );
}

function CompactMarketCard(props: {
  card: GroupedMarketEvent;
  eagerData?: boolean;
  eagerImage?: boolean;
  selectedOutcomeByMarketId: ReadonlyMap<string, number>;
  onSelectOutcome: (market: HomeCardMarket, outcomeIndex: number) => void;
}) {
  const { intlLocale, t } = useI18n();
  const [snapshotMarkets, setSnapshotMarkets] = createSignal<HomeCardMarket[] | null>(null);
  let cardRef: HTMLElement | undefined;
  const displayedMarkets = createMemo<HomeCardMarket[]>(() => {
    const hydrated = snapshotMarkets();

    if (hydrated && hydrated.length > 0) {
      return hydrated;
    }

    return sortMarketsForPreview(props.card.markets.map(toHomeCardMarket));
  });
  const previewMarkets = createMemo(() =>
    displayedMarkets().slice(0, HOME_CARD_MARKET_PREVIEW_LIMIT),
  );
  const primaryMarketSlug = createMemo(() => displayedMarkets()[0]?.slug ?? props.card.markets[0]?.slug);
  const totalMarketCount = createMemo(() =>
    Math.max(props.card.marketCount, displayedMarkets().length),
  );

  const syncStoredSnapshot = () => {
    const storedMarkets = readStoredEventMarkets(props.card.event.id);

    if (!storedMarkets || storedMarkets.length === 0) {
      return null;
    }

    const normalizedMarkets = sortMarketsForPreview(storedMarkets.map(toHomeCardMarket));
    setSnapshotMarkets(normalizedMarkets);
    return normalizedMarkets;
  };

  const warmEventSnapshot = () => {
    if (syncStoredSnapshot()) {
      return;
    }

    void fetchEventMarketsSnapshot(props.card.event.id).then(response => {
      if (!response?.markets?.length) {
        return;
      }

      setSnapshotMarkets(sortMarketsForPreview(response.markets.map(toHomeCardMarket)));
    });
  };

  createEffect(() => {
    setSnapshotMarkets(null);
    syncStoredSnapshot();

    if (props.eagerData) {
      warmEventSnapshot();
    }
  });

  createEffect(() => {
    const card = cardRef;

    if (!card || snapshotMarkets() || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            warmEventSnapshot();
            observer.disconnect();
            break;
          }
        }
      },
      {
        rootMargin: "160px",
      },
    );

    observer.observe(card);

    onCleanup(() => {
      observer.disconnect();
    });
  });

  return (
    <div class="pm-compact-card-shell">
      <article
        class="pm-compact-card"
        ref={cardRef}
        onPointerEnter={warmEventSnapshot}
      >
        <div class="pm-compact-card__header">
          <EventArtwork card={props.card} eager={props.eagerImage} />
          <div class="pm-compact-card__title-wrap">
            <LocaleLink
              href={buildEventHref(props.card.event.slug)}
              class="pm-compact-card__title-link"
              onClick={() => rememberPreferredMarket(props.card.event.slug, primaryMarketSlug())}
            >
              <div class="pm-compact-card__title-box">
                <h2 class="pm-compact-card__title">{props.card.event.title}</h2>
              </div>
            </LocaleLink>
          </div>
        </div>

        <div class="pm-compact-card__body">
          <div class="pm-compact-card__rows">
            <For each={previewMarkets()}>
              {market => (
                <div class="pm-compact-card__row">
                  <div class="pm-compact-card__row-copy">
                    <LocaleLink
                      href={buildMarketHref(props.card.event.slug, market.slug)}
                      class="pm-compact-card__row-link"
                      onClick={() => rememberPreferredMarket(props.card.event.slug, market.slug)}
                    >
                      <p class="pm-compact-card__row-label">
                        {formatRowLabel(market, intlLocale(), t("home.openMarket"))}
                      </p>
                    </LocaleLink>
                  </div>

                  <div class="pm-compact-card__row-actions">
                    <p class="pm-compact-card__metric">
                      {formatMarketMetric(market)}
                    </p>
                    <OutcomeButton
                      market={market}
                      label={localizeOutcomeLabel(market.outcomes[0], t)}
                      outcomeIndex={0}
                      isActive={props.selectedOutcomeByMarketId.get(market.id) === 0}
                      onSelect={props.onSelectOutcome}
                    />
                    <OutcomeButton
                      market={market}
                      label={localizeOutcomeLabel(market.outcomes[1], t)}
                      outcomeIndex={1}
                      isActive={props.selectedOutcomeByMarketId.get(market.id) === 1}
                      onSelect={props.onSelectOutcome}
                    />
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        <div class="pm-compact-card__footer">
          <p class="pm-compact-card__footer-text">
            {totalMarketCount()} {totalMarketCount() === 1 ? t("home.market") : t("home.markets")}
          </p>
        </div>
      </article>
    </div>
  );
}

function CompactCardSkeleton() {
  return (
    <div class="pm-compact-card-shell">
      <article class="pm-compact-card pm-compact-card--skeleton" aria-hidden="true">
        <div class="pm-compact-card__header">
          <div class="pm-compact-card__art pm-compact-card__placeholder" />
          <div class="pm-compact-card__title-wrap">
            <div class="pm-compact-card__title-box">
              <div class="pm-compact-card__line pm-compact-card__line--title" />
            </div>
          </div>
        </div>

        <div class="pm-compact-card__body">
          <div class="pm-compact-card__rows">
            <For each={Array.from({ length: 2 })}>
              {() => (
                <div class="pm-compact-card__row">
                  <div class="pm-compact-card__row-copy">
                    <div class="pm-compact-card__line pm-compact-card__line--row" />
                  </div>
                  <div class="pm-compact-card__row-actions">
                    <div class="pm-compact-card__line pm-compact-card__line--metric" />
                    <div class="pm-compact-card__chip-placeholder" />
                    <div class="pm-compact-card__chip-placeholder" />
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        <div class="pm-compact-card__footer">
          <div class="pm-compact-card__line pm-compact-card__line--footer" />
        </div>
      </article>
    </div>
  );
}

export default function PublicMarketSections(props: PublicMarketSectionsProps) {
  const { t } = useI18n();
  const stackSidebar = useStackSidebar();
  const selectedOutcomeByMarketId = stackSidebar.selectedOutcomeByMarketId;

  return (
    <section class="pm-all-markets">
      <div
        classList={{
          "pm-stack-workspace": true,
          "pm-stack-workspace--sidebar-open": stackSidebar.isOpen(),
        }}
      >
        <section class="pm-all-markets__section pm-stack-workspace__main">
          <div class="pm-all-markets__head">
            <h1 class="pm-all-markets__title">{props.title ?? t("home.allMarkets")}</h1>
          </div>

          <Show
            when={!props.loading}
            fallback={
              <div class="pm-all-markets__grid">
                <For each={Array.from({ length: 12 })}>{() => <CompactCardSkeleton />}</For>
              </div>
            }
          >
            <Show
              when={!props.error}
              fallback={
                <div class="pm-home__state">
                  <p class="pm-home__state-title">{t("home.unableToLoad")}</p>
                  <p class="pm-home__state-copy">{props.error}</p>
                  <Show when={props.onRetry}>
                    <button class="pm-button pm-button--primary" onClick={() => props.onRetry?.()}>
                      {t("home.retry")}
                    </button>
                  </Show>
                </div>
              }
            >
              <div class="pm-all-markets__grid">
                <For each={props.cards}>
                  {(card, index) => (
                    <CompactMarketCard
                      card={card}
                      eagerData={index() < EAGER_CARD_DATA_COUNT}
                      eagerImage={index() < EAGER_CARD_IMAGE_COUNT}
                      selectedOutcomeByMarketId={selectedOutcomeByMarketId()}
                      onSelectOutcome={(market, outcomeIndex) => {
                        rememberPreferredMarket(card.event.slug, market.slug);
                        stackSidebar.toggleOutcome(
                          toStackSelectableHomeMarket(card.event.slug, market),
                          outcomeIndex,
                        );
                      }}
                    />
                  )}
                </For>
                <Show when={props.loadingMore}>
                  <For each={Array.from({ length: 3 })}>{() => <CompactCardSkeleton />}</For>
                </Show>
              </div>

              <Show when={props.loadMoreError}>
                <div class="pm-all-markets__load-state">
                  <p class="pm-home__state-copy">{props.loadMoreError}</p>
                  <Show when={props.onLoadMore}>
                    <button
                      type="button"
                      class="pm-button pm-button--primary"
                      onClick={() => props.onLoadMore?.()}
                    >
                      {t("home.tryAgain")}
                    </button>
                  </Show>
                </div>
              </Show>

              <Show when={props.canLoadMore || props.loadingMore}>
                <div class="pm-all-markets__load-state">
                  <Show when={!props.loadMoreError}>
                    <button
                      type="button"
                      class="pm-button pm-button--ghost"
                      onClick={() => props.onLoadMore?.()}
                      disabled={props.loadingMore}
                    >
                      {props.loadingMore ? t("home.loadingMore") : t("home.showMore")}
                    </button>
                  </Show>
                </div>
              </Show>
            </Show>
          </Show>
        </section>

        <StackSidebar
          isOpen={stackSidebar.isOpen()}
          mode={stackSidebar.mode()}
          legs={stackSidebar.legs()}
          amount={stackSidebar.amount()}
          quote={stackSidebar.quote()}
          errorMessage={stackSidebar.errorMessage()}
          statusMessage={stackSidebar.statusMessage()}
          isQuoting={stackSidebar.isQuoting()}
          isExecuting={stackSidebar.isExecuting()}
          hasWallet={stackSidebar.hasWallet()}
          hasSmartAccount={stackSidebar.hasSmartAccount()}
          maxAmount={stackSidebar.maxAmount()}
          executionResult={stackSidebar.executionResult()}
          betCodeInput={stackSidebar.betCodeInput()}
          betCodeError={stackSidebar.betCodeError()}
          isLookingUpBetCode={stackSidebar.isLookingUpBetCode()}
          lookedUpBet={stackSidebar.lookedUpBet()}
          aiPrompt={stackSidebar.aiPrompt()}
          aiError={stackSidebar.aiError()}
          isSuggesting={stackSidebar.isSuggesting()}
          aiSuggestions={stackSidebar.aiSuggestions()}
          aiComposites={stackSidebar.aiComposites()}
          isLoadingAiComposites={stackSidebar.isLoadingAiComposites()}
          aiExplainError={stackSidebar.aiExplainError()}
          isExplaining={stackSidebar.isExplaining()}
          aiExplanation={stackSidebar.aiExplanation()}
          aiExplanationLabel={stackSidebar.aiExplanationLabel()}
          onOpen={stackSidebar.openSidebar}
          onModeChange={stackSidebar.openMode}
          onClose={stackSidebar.closeSidebar}
          onClearLegs={stackSidebar.clearLegs}
          onRemoveLeg={stackSidebar.removeLeg}
          onAmountChange={stackSidebar.setAmount}
          onBetCodeInputChange={stackSidebar.setBetCodeInput}
          onAiPromptChange={stackSidebar.setAiPrompt}
          onUseMaxAmount={stackSidebar.useMaxAmount}
          onRequestAiSuggestions={() => void stackSidebar.requestAiSuggestions()}
          onApplyAiSuggestion={stackSidebar.applyAiSuggestion}
          onApplyAiComposite={composite => void stackSidebar.applyAiComposite(composite)}
          onRequestAiExplanationForCurrentStack={() =>
            void stackSidebar.requestAiExplanationForCurrentStack()
          }
          onRequestAiExplanationForSuggestion={suggestion =>
            void stackSidebar.requestAiExplanationForSuggestion(suggestion)
          }
          onRequestQuote={() => void stackSidebar.requestQuote()}
          onExecute={() => void stackSidebar.executeStack()}
          onLookupBetCode={() => void stackSidebar.lookupBetCode()}
          onApplyLookedUpBet={stackSidebar.applyLookedUpBet}
          onDismissExecutionResult={stackSidebar.dismissExecutionResult}
        />
      </div>
    </section>
  );
}
