import { For } from "solid-js";

import type { EventMarketListItem } from "./types.ts";

interface MarketDetailListProps {
  markets: EventMarketListItem[];
  selectedOutcomeIndex: number;
  selectedStackOutcomeByMarketId: ReadonlyMap<string, number>;
  onSelectMarket: (marketSlug: string) => void;
  onSelectOutcome: (marketSlug: string, outcomeIndex: number) => void;
  onToggleStackOutcome: (market: EventMarketListItem, outcomeIndex: number) => void;
}

export default function MarketDetailList(props: MarketDetailListProps) {
  return (
    <section class="pm-event-list">
      <For each={props.markets}>
        {market => (
          <article
            classList={{
              "pm-event-list__item": true,
              "pm-event-list__item--selected": market.isSelected,
            }}
          >
            <div class="pm-event-list__copy">
              <button
                type="button"
                class="pm-event-list__title-link"
                onClick={() => props.onSelectMarket(market.slug)}
              >
                <p class="pm-event-list__label">{market.label}</p>
              </button>
              <p class="pm-event-list__meta">{market.meta}</p>
            </div>

            <p class="pm-event-list__metric">{market.primaryMetric}</p>

            <div class="pm-event-list__actions">
              <For each={market.quotes.slice(0, 2)}>
                {quote => (
                  <div class="pm-event-list__action-group">
                    <button
                      type="button"
                      classList={{
                        "pm-event-list__action": true,
                        "pm-event-list__action--yes": quote.outcomeIndex === 0,
                        "pm-event-list__action--no": quote.outcomeIndex !== 0,
                        "pm-event-list__action--active":
                          market.isSelected && quote.outcomeIndex === props.selectedOutcomeIndex,
                      }}
                      onClick={() => props.onSelectOutcome(market.slug, quote.outcomeIndex)}
                    >
                      <span class="pm-event-list__action-label">Buy {quote.label}</span>
                      <span>{quote.centsLabel}</span>
                    </button>

                    <button
                      type="button"
                      classList={{
                        "pm-event-list__stack-toggle": true,
                        "pm-event-list__stack-toggle--active":
                          props.selectedStackOutcomeByMarketId.get(market.id) === quote.outcomeIndex,
                      }}
                      onClick={() => props.onToggleStackOutcome(market, quote.outcomeIndex)}
                      aria-label={`Add ${quote.label} from ${market.label} to stack`}
                    >
                      {props.selectedStackOutcomeByMarketId.get(market.id) === quote.outcomeIndex
                        ? "In stack"
                        : "+ Stack"}
                    </button>
                  </div>
                )}
              </For>
            </div>
          </article>
        )}
      </For>
    </section>
  );
}
