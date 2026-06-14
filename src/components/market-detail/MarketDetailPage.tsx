import { Show } from "solid-js";

import MarketDetailFacts from "./MarketDetailFacts.tsx";
import MarketDetailHeader from "./MarketDetailHeader.tsx";
import MarketDetailList from "./MarketDetailList.tsx";
import MarketPricePanel from "./MarketPricePanel.tsx";
import MarketDetailTabs from "./MarketDetailTabs.tsx";
import MarketTradePanel from "./MarketTradePanel.tsx";
import type { EventDetailViewModel } from "./types.ts";

interface MarketDetailPageProps {
  data: EventDetailViewModel;
  selectedOutcomeIndex: number;
  onSelectMarket: (marketSlug: string) => void;
  onSelectOutcome: (marketSlug: string, outcomeIndex: number) => void;
}

export default function MarketDetailPage(props: MarketDetailPageProps) {
  return (
    <div class="pm-event-page__shell">
      <MarketDetailHeader data={props.data} />
      <div class="pm-event-page__layout">
        <div class="pm-event-page__main">
          <section class="pm-event-page__board">
            <MarketPricePanel
              market={props.data.selectedMarket}
              question={props.data.selectedMarketQuestion}
              status={props.data.selectedMarketStatus}
              volumeLabel={props.data.selectedMarketVolumeLabel}
              eventVolumeLabel={props.data.eventVolumeLabel}
              endsAt={props.data.selectedMarketEndsAt}
              orderbook={props.data.selectedMarketOrderbook}
              priceHistory={props.data.selectedMarketPriceHistory}
              chartSeries={props.data.chartSeries}
              selectedOutcomeIndex={props.selectedOutcomeIndex}
              onSelectOutcome={outcomeIndex =>
                props.onSelectOutcome(props.data.selectedMarket.slug, outcomeIndex)
              }
            />
            <Show when={props.data.marketList.length > 0}>
              <MarketDetailList
                markets={props.data.marketList}
                selectedOutcomeIndex={props.selectedOutcomeIndex}
                onSelectMarket={props.onSelectMarket}
                onSelectOutcome={props.onSelectOutcome}
              />
            </Show>
          </section>
          <MarketDetailFacts facts={props.data.facts} />
          <MarketDetailTabs
            rules={props.data.rules}
            context={props.data.context}
            resolutionSources={props.data.resolutionSources}
            resolution={props.data.resolution}
            market={props.data.selectedMarket}
          />
        </div>

        <div class="pm-event-page__aside">
          <MarketTradePanel
            market={props.data.selectedMarket}
            question={props.data.selectedMarketQuestion}
            selectedOutcomeIndex={props.selectedOutcomeIndex}
            onSelectOutcome={outcomeIndex =>
              props.onSelectOutcome(props.data.selectedMarket.slug, outcomeIndex)
            }
          />
        </div>
      </div>
    </div>
  );
}
