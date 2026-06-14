import { createMemo, For, Show } from "solid-js";

import LocaleLink from "~/components/LocaleLink.tsx";
import StackSidebar from "~/components/stack/StackSidebar.tsx";
import { toStackSelectableMarket } from "~/components/stack/model.ts";
import { useStackSidebar } from "~/components/stack/useStackSidebar.ts";
import {
  getMarketDisplayLabel,
  sortMarketsForPreview,
  type GroupedMarketEvent,
  type PublicMarketCardResponse,
} from "~/lib/market/index.ts";

const EVENT_PRIMARY_MARKET_STORAGE_PREFIX = "pm-event-primary-market/v1:";

function buildEventHref(eventSlug: string): string {
  return `/event/${encodeURIComponent(eventSlug)}`;
}

function rememberPreferredMarket(eventSlug: string, marketSlug: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      `${EVENT_PRIMARY_MARKET_STORAGE_PREFIX}${eventSlug}`,
      JSON.stringify(marketSlug),
    );
  } catch {
    // Ignore storage failures and fall back to plain navigation.
  }
}

function formatCategoryLabel(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function formatNextEndTime(value: string | null): string {
  if (!value) {
    return "TBD";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function EventArtwork(props: { card: GroupedMarketEvent }) {
  const fallbackLetter = props.card.event.title.trim().charAt(0).toUpperCase() || "M";

  return (
    <div class="pm-market-card__art">
      <Show
        when={props.card.event.image_url}
        fallback={<span class="pm-market-card__art-fallback">{fallbackLetter}</span>}
      >
        <img
          src={props.card.event.image_url ?? ""}
          alt={`${props.card.event.title} card icon`}
          loading="lazy"
          decoding="async"
        />
      </Show>
    </div>
  );
}

function MarketOutcomeLinks(props: {
  eventSlug: string;
  market: PublicMarketCardResponse;
  selectedOutcomeByMarketId: ReadonlyMap<string, number>;
  onSelectOutcome: (market: PublicMarketCardResponse, outcomeIndex: number) => void;
}) {
  return (
    <div class="pm-market-card__actions">
      <For each={props.market.outcomes.slice(0, 2)}>
        {(outcome, index) => (
          <button
            type="button"
            classList={{
              "pm-market-card__outcome": true,
              "pm-market-card__outcome--yes": index() === 0,
              "pm-market-card__outcome--no": index() !== 0,
              "pm-market-card__outcome--active":
                props.selectedOutcomeByMarketId.get(props.market.id) === index(),
            }}
            onClick={event => {
              event.preventDefault();
              event.stopPropagation();

              rememberPreferredMarket(props.eventSlug, props.market.slug);
              props.onSelectOutcome(props.market, index());
            }}
          >
            {outcome}
          </button>
        )}
      </For>
    </div>
  );
}

function GroupedMarketCard(props: {
  card: GroupedMarketEvent;
  marketLimit?: number;
  selectedOutcomeByMarketId: ReadonlyMap<string, number>;
  onSelectOutcome: (market: PublicMarketCardResponse, outcomeIndex: number) => void;
}) {
  const previewSortedMarkets = createMemo(() => sortMarketsForPreview(props.card.markets));
  const visibleMarkets = () =>
    previewSortedMarkets().slice(0, props.marketLimit ?? props.card.markets.length);

  return (
    <article class="pm-market-card">
      <div class="pm-market-card__header">
        <EventArtwork card={props.card} />

        <div class="pm-market-card__heading">
          <div class="pm-market-card__eyebrow-row">
            <span class="pm-market-card__eyebrow">
              {formatCategoryLabel(props.card.event.category_slug)}
            </span>
            <span class="pm-market-card__status">{props.card.activeMarketsCount} active</span>
          </div>

          <LocaleLink
            href={buildEventHref(props.card.event.slug)}
            class="pm-market-card__title-link"
            onClick={() =>
              rememberPreferredMarket(props.card.event.slug, previewSortedMarkets()[0]?.slug ?? "")
            }
          >
            <h2 class="pm-market-card__title">{props.card.event.title}</h2>
          </LocaleLink>

          <Show when={props.card.event.summary}>
            <p class="pm-market-card__summary">{props.card.event.summary}</p>
          </Show>
        </div>
      </div>

      <div class="pm-market-card__markets">
        <For each={visibleMarkets()}>
          {market => {
            const label = getMarketDisplayLabel(market);
            const question = market.question.trim();

            return (
              <div class="pm-market-card__market-row">
                <div class="pm-market-card__market-copy">
                  <LocaleLink
                    href={buildEventHref(props.card.event.slug)}
                    class="pm-market-card__market-link"
                    onClick={() => rememberPreferredMarket(props.card.event.slug, market.slug)}
                  >
                    <p class="pm-market-card__market-label">{label}</p>
                  </LocaleLink>

                  <Show when={question.length > 0 && question.toLowerCase() !== label.toLowerCase()}>
                    <p class="pm-market-card__market-question">{question}</p>
                  </Show>
                </div>

                <MarketOutcomeLinks
                  eventSlug={props.card.event.slug}
                  market={market}
                  selectedOutcomeByMarketId={props.selectedOutcomeByMarketId}
                  onSelectOutcome={props.onSelectOutcome}
                />
              </div>
            );
          }}
        </For>
      </div>

      <div class="pm-market-card__footer">
        <div class="pm-market-card__footer-meta">
          <span class="pm-market-card__footer-pill">{props.card.marketCount} markets</span>
          <p class="pm-market-card__footer-text">Next close {formatNextEndTime(props.card.nextEndTime)}</p>
        </div>
      </div>
    </article>
  );
}

interface GroupedMarketCardGridProps {
  cards: readonly GroupedMarketEvent[];
  marketLimit?: number;
}

export default function GroupedMarketCardGrid(props: GroupedMarketCardGridProps) {
  const stackSidebar = useStackSidebar();
  const selectedOutcomeByMarketId = stackSidebar.selectedOutcomeByMarketId;

  return (
    <div
      classList={{
        "pm-stack-workspace": true,
        "pm-stack-workspace--sidebar-open": stackSidebar.isOpen(),
      }}
    >
      <div class="pm-stack-workspace__main">
        <div class="pm-market-grid">
          <For each={props.cards}>
            {card => (
              <GroupedMarketCard
                card={card}
                marketLimit={props.marketLimit}
                selectedOutcomeByMarketId={selectedOutcomeByMarketId()}
                onSelectOutcome={(market, outcomeIndex) => {
                  stackSidebar.toggleOutcome(toStackSelectableMarket(market), outcomeIndex);
                }}
              />
            )}
          </For>
        </div>
      </div>

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
  );
}
