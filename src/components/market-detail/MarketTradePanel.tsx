import { createMemo, For, Show } from "solid-js";

import type { EventMarketListItem } from "./types.ts";

interface MarketTradePanelProps {
  market: EventMarketListItem;
  question: string;
  selectedOutcomeIndex: number;
  onSelectOutcome: (outcomeIndex: number) => void;
  isStackSelected?: boolean;
  selectedStackOutcomeIndex?: number | null;
  onToggleStackOutcome?: (outcomeIndex: number) => void;
}

export default function MarketTradePanel(props: MarketTradePanelProps) {
  const selectedQuote = createMemo(
    () => props.market.quotes[props.selectedOutcomeIndex] ?? props.market.quotes[0],
  );
  const selectedStackQuote = createMemo(() =>
    props.market.quotes.find(quote => quote.outcomeIndex === props.selectedStackOutcomeIndex),
  );
  const stackActionLabel = createMemo(() => {
    if (props.isStackSelected === true) {
      return "Remove from stack";
    }

    if (typeof props.selectedStackOutcomeIndex === "number") {
      return `Switch stack to ${selectedQuote()?.label ?? "this outcome"}`;
    }

    return `Add ${selectedQuote()?.label ?? "this outcome"} to stack`;
  });
  const stackSelectionCopy = createMemo(() => {
    if (props.isStackSelected === true) {
      return "This exact outcome is already loaded in your structured stack.";
    }

    if (typeof props.selectedStackOutcomeIndex === "number") {
      return `This market is already in your stack as ${selectedStackQuote()?.label ?? "another outcome"}. Adding the current side will replace that leg.`;
    }

    return "Pick a side, add it to the builder, and execute it through a correlation-priced stack.";
  });

  return (
    <aside class="pm-trade-panel">
      <div class="pm-trade-panel__market">
        <p class="pm-trade-panel__label">{props.market.label}</p>
        <p class="pm-trade-panel__headline">
          {selectedQuote()?.label ?? "Quote"} {selectedQuote()?.centsLabel ?? "--"}
        </p>
        <p class="pm-trade-panel__subcopy">{props.question}</p>
      </div>

      <div class="pm-trade-panel__quote-grid">
        <For each={props.market.quotes.slice(0, 2)}>
          {quote => (
            <button
              type="button"
              classList={{
                "pm-trade-panel__quote": true,
                "pm-trade-panel__quote--yes": quote.outcomeIndex === 0,
                "pm-trade-panel__quote--no": quote.outcomeIndex !== 0,
                "pm-trade-panel__quote--selected":
                  quote.outcomeIndex === props.selectedOutcomeIndex,
              }}
              onClick={() => props.onSelectOutcome(quote.outcomeIndex)}
            >
              <span>{quote.label}</span>
              <strong>{quote.centsLabel}</strong>
            </button>
          )}
        </For>
      </div>

      <div class="pm-trade-panel__builder-card">
        <p class="pm-trade-panel__builder-kicker">Structured execution</p>
        <p class="pm-trade-panel__builder-copy">{stackSelectionCopy()}</p>
        <ol class="pm-trade-panel__builder-steps">
          <li>Select the outcome you want to keep.</li>
          <li>Add it to the stack builder.</li>
          <li>Price and execute the full thesis from the sidebar.</li>
        </ol>
      </div>

      <Show when={props.onToggleStackOutcome}>
        <button
          type="button"
          classList={{
            "pm-trade-panel__stack-button": true,
            "pm-trade-panel__stack-button--active": props.isStackSelected === true,
          }}
          onClick={() => props.onToggleStackOutcome?.(props.selectedOutcomeIndex)}
        >
          {stackActionLabel()}
        </button>
      </Show>

      <p class="pm-trade-panel__footnote">
        Lattice currently executes structured stacks and composite products on-chain. Single-market
        buy and sell actions are not exposed on this screen.
      </p>
    </aside>
  );
}
