import { Show } from "solid-js";

import StackSidebar from "~/components/stack/StackSidebar.tsx";
import type { StackSelectableMarket } from "~/components/stack/model.ts";
import { useStackSidebar } from "~/components/stack/useStackSidebar.ts";

import CommentsSection from "./CommentsSection.tsx";
import MarketDetailFacts from "./MarketDetailFacts.tsx";
import MarketDetailHeader from "./MarketDetailHeader.tsx";
import MarketDetailList from "./MarketDetailList.tsx";
import MarketPricePanel from "./MarketPricePanel.tsx";
import MarketDetailTabs from "./MarketDetailTabs.tsx";
import MarketTradePanel from "./MarketTradePanel.tsx";
import { replaceCachedMarketComments } from "./data.ts";
import type { EventDetailViewModel } from "./types.ts";

interface MarketDetailPageProps {
  data: EventDetailViewModel;
  selectedOutcomeIndex: number;
  onSelectMarket: (marketSlug: string) => void;
  onSelectOutcome: (marketSlug: string, outcomeIndex: number) => void;
}

function toStackSelectableDetailMarket(
  market: EventDetailViewModel["selectedMarket"],
): StackSelectableMarket {
  return {
    marketId: market.id,
    marketSlug: market.slug,
    eventSlug: market.eventSlug,
    label: market.label,
    question: market.question,
    outcomes: market.outcomes,
    yesBps: market.yesBps,
    noBps: market.noBps,
  };
}

export default function MarketDetailPage(props: MarketDetailPageProps) {
  const stackSidebar = useStackSidebar();
  const selectedStackOutcomeByMarketId = stackSidebar.selectedOutcomeByMarketId;

  const toggleStackOutcome = (
    market: EventDetailViewModel["selectedMarket"],
    outcomeIndex: number,
  ) => {
    props.onSelectOutcome(market.slug, outcomeIndex);
    stackSidebar.toggleOutcome(toStackSelectableDetailMarket(market), outcomeIndex);
  };

  return (
    <div
      classList={{
        "pm-stack-workspace": true,
        "pm-stack-workspace--sidebar-open": stackSidebar.isOpen(),
      }}
    >
      <div class="pm-event-page__shell pm-stack-workspace__main">
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
                  selectedStackOutcomeByMarketId={selectedStackOutcomeByMarketId()}
                  onSelectMarket={props.onSelectMarket}
                  onSelectOutcome={props.onSelectOutcome}
                  onToggleStackOutcome={toggleStackOutcome}
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
            <CommentsSection
              marketId={props.data.selectedMarketId}
              items={props.data.comments}
              onCommentsChange={(marketId, comments) => {
                replaceCachedMarketComments(props.data.eventSlug, marketId, comments);
              }}
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
              isStackSelected={
                selectedStackOutcomeByMarketId().get(props.data.selectedMarketId) ===
                props.selectedOutcomeIndex
              }
              selectedStackOutcomeIndex={
                selectedStackOutcomeByMarketId().get(props.data.selectedMarketId) ?? null
              }
              onToggleStackOutcome={outcomeIndex =>
                toggleStackOutcome(props.data.selectedMarket, outcomeIndex)
              }
            />
          </div>
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
