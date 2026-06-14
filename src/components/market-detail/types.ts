import type { MarketCommentResponse } from "~/lib/comment/types.ts";
import type {
  MarketActivityItemResponse,
  MarketLiquidityResponse,
  MarketOrderbookResponse,
  MarketPriceHistoryResponse,
  MarketResolutionStateResponse,
  PublicMarketCardResponse,
} from "~/lib/market/types.ts";

export interface OutcomeQuote {
  outcomeIndex: number;
  label: string;
  price: number | null;
  centsLabel: string;
  probabilityLabel: string;
  href: string;
}

export interface EventMarketTabItem {
  label: string;
  href: string;
  marketSlug: string;
  isSelected: boolean;
}

export interface EventMarketListItem {
  id: string;
  slug: string;
  eventSlug: string;
  label: string;
  question: string;
  meta: string;
  href: string;
  primaryMetric: string;
  isSelected: boolean;
  outcomes: string[];
  yesBps: number | null;
  noBps: number | null;
  quotes: OutcomeQuote[];
  pill: EventMarketTabItem;
}

export interface EventFactItem {
  label: string;
  value: string;
  mono?: boolean;
}

export interface EventChartSeriesItem {
  marketId: string;
  marketSlug: string;
  label: string;
  probabilityLabel: string;
  price: number | null;
  isSelected: boolean;
}

export interface EventDetailViewModel {
  eventId: string | null;
  eventSlug: string;
  eventTitle: string;
  eventImageUrl: string | null;
  categorySlug: string;
  categoryLabel: string;
  subcategoryLabel: string | null;
  tagSlugs: string[];
  marketCount: number;
  selectedMarketId: string;
  selectedConditionId: string | null;
  selectedMarket: EventMarketListItem;
  selectedMarketQuestion: string;
  selectedMarketType: string;
  selectedMarketStatus: string;
  selectedMarketVolumeLabel: string | null;
  eventVolumeLabel: string | null;
  selectedMarketEndsAt: string;
  selectedMarketOrderbook: MarketOrderbookResponse | null;
  selectedMarketPriceHistory: MarketPriceHistoryResponse | null;
  rules: string;
  context: string | null;
  resolutionSources: string[];
  facts: EventFactItem[];
  marketTabs: EventMarketTabItem[];
  marketList: EventMarketListItem[];
  chartSeries: EventChartSeriesItem[];
  relatedMarkets: PublicMarketCardResponse[];
  comments: MarketCommentResponse[];
  activity: MarketActivityItemResponse[];
  liquidity: MarketLiquidityResponse | null;
  resolution: MarketResolutionStateResponse | null;
}
