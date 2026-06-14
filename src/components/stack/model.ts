import { formatProbabilityFromBps } from "~/components/market-detail/format.ts";
import type {
  PublicMarketCardResponse,
  StackAiSuggestionLegResponse,
  StackBetLegResponse,
} from "~/lib/market/types.ts";

export const STACK_MIN_LEGS = 2;
export const STACK_MAX_LEGS = 3;

export interface StackSelectableMarket {
  marketId: string;
  marketSlug: string;
  eventSlug: string;
  label: string;
  question: string;
  outcomes: string[];
  yesBps: number | null;
  noBps: number | null;
}

export interface StackSidebarLeg {
  marketId: string;
  marketSlug: string;
  eventSlug: string;
  label: string;
  question: string;
  outcomeIndex: number;
  outcomeLabel: string;
  probabilityBps: number | null;
  probabilityLabel: string;
  centsLabel: string;
}

export interface ToggleStackSidebarLegResult {
  legs: StackSidebarLeg[];
  changed: boolean;
  limitReached: boolean;
}

function formatCentsFromBps(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const cents = value / 100;
  const rounded = Number(cents.toFixed(cents < 10 ? 1 : 0));
  return `${rounded}¢`;
}

function getOutcomeBps(
  market: Pick<StackSelectableMarket, "yesBps" | "noBps">,
  outcomeIndex: number,
): number | null {
  return outcomeIndex === 0 ? market.yesBps : market.noBps;
}

export function toStackSelectableMarket(
  market: PublicMarketCardResponse,
): StackSelectableMarket {
  const yesBps =
    typeof market.quote_summary?.buy_yes_bps === "number"
      ? market.quote_summary.buy_yes_bps
      : typeof market.current_prices?.yes_bps === "number"
        ? market.current_prices.yes_bps
        : null;
  const noBps =
    typeof market.quote_summary?.buy_no_bps === "number"
      ? market.quote_summary.buy_no_bps
      : typeof market.current_prices?.no_bps === "number"
        ? market.current_prices.no_bps
        : yesBps !== null
          ? Math.max(0, 10000 - yesBps)
          : null;

  return {
    marketId: market.id,
    marketSlug: market.slug,
    eventSlug: market.event.slug,
    label: market.label.trim().length > 0 ? market.label : market.question,
    question: market.question,
    outcomes: market.outcomes,
    yesBps,
    noBps,
  };
}

export function buildStackSidebarLeg(
  market: StackSelectableMarket,
  outcomeIndex: number,
): StackSidebarLeg {
  const probabilityBps = getOutcomeBps(market, outcomeIndex);

  return {
    marketId: market.marketId,
    marketSlug: market.marketSlug,
    eventSlug: market.eventSlug,
    label: market.label,
    question: market.question,
    outcomeIndex,
    outcomeLabel: market.outcomes[outcomeIndex] ?? `Outcome ${outcomeIndex + 1}`,
    probabilityBps,
    probabilityLabel: formatProbabilityFromBps(probabilityBps) ?? "--",
    centsLabel: formatCentsFromBps(probabilityBps),
  };
}

export function buildStackSidebarLegFromBetLeg(leg: StackBetLegResponse): StackSidebarLeg {
  const probabilityLabel =
    leg.probability_display ??
    (typeof leg.probability_bps === "number"
      ? formatProbabilityFromBps(leg.probability_bps) ?? "--"
      : "--");

  return {
    marketId: leg.market_id ?? leg.market_ref,
    marketSlug: leg.market_slug ?? leg.market_ref,
    eventSlug: leg.event_slug ?? "stack-bet",
    label: leg.question,
    question: leg.question,
    outcomeIndex: leg.outcome_index,
    outcomeLabel: leg.outcome_label,
    probabilityBps: leg.probability_bps,
    probabilityLabel,
    centsLabel: formatCentsFromBps(leg.probability_bps),
  };
}

export function buildStackSidebarLegFromAiSuggestionLeg(
  leg: StackAiSuggestionLegResponse,
): StackSidebarLeg {
  return {
    marketId: leg.market_id,
    marketSlug: leg.market_slug,
    eventSlug: leg.event_slug ?? "ai-stack",
    label: leg.question,
    question: leg.question,
    outcomeIndex: leg.outcome_index,
    outcomeLabel: leg.outcome_label,
    probabilityBps: leg.probability_bps,
    probabilityLabel: leg.probability_display,
    centsLabel: formatCentsFromBps(leg.probability_bps),
  };
}

export function buildSelectedOutcomeMap(
  legs: readonly StackSidebarLeg[],
): Map<string, number> {
  return new Map(legs.map(leg => [leg.marketId, leg.outcomeIndex]));
}

export function toggleStackSidebarLeg(
  legs: readonly StackSidebarLeg[],
  market: StackSelectableMarket,
  outcomeIndex: number,
  maxLegCount = STACK_MAX_LEGS,
): ToggleStackSidebarLegResult {
  const existingIndex = legs.findIndex(leg => leg.marketId === market.marketId);

  if (existingIndex >= 0) {
    const existingLeg = legs[existingIndex]!;

    if (existingLeg.outcomeIndex === outcomeIndex) {
      return {
        legs: legs.filter(leg => leg.marketId !== market.marketId),
        changed: true,
        limitReached: false,
      };
    }

    return {
      legs: legs.map((leg, index) =>
        index === existingIndex ? buildStackSidebarLeg(market, outcomeIndex) : leg,
      ),
      changed: true,
      limitReached: false,
    };
  }

  if (legs.length >= maxLegCount) {
    return {
      legs: [...legs],
      changed: false,
      limitReached: true,
    };
  }

  return {
    legs: [...legs, buildStackSidebarLeg(market, outcomeIndex)],
    changed: true,
    limitReached: false,
  };
}
