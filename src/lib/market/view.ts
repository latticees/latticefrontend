import type {
  PublicEventCardResponse,
  PublicEventTeaserResponse,
  PublicMarketCardResponse,
} from "./types.ts";

export interface GroupedMarketEvent {
  event: PublicEventTeaserResponse;
  markets: PublicMarketCardResponse[];
  marketCount: number;
  nextEndTime: string | null;
  activeMarketsCount: number;
}

interface MarketOrderSortable {
  end_time: string;
  sort_order: number;
}

interface MarketPreviewSortable extends MarketOrderSortable {
  trading_status: string;
  current_prices?: {
    yes_bps: number;
  } | null;
  quote_summary?: {
    buy_yes_bps: number;
  } | null;
  stats?: {
    volume_usd: string;
  } | null;
}

function compareMarketOrder(left: MarketOrderSortable, right: MarketOrderSortable): number {
  if (left.sort_order !== right.sort_order) {
    return left.sort_order - right.sort_order;
  }

  return left.end_time.localeCompare(right.end_time);
}

function compareMarkets(left: PublicMarketCardResponse, right: PublicMarketCardResponse): number {
  return compareMarketOrder(left, right);
}

function getMarketPreviewProbabilityBps(market: MarketPreviewSortable): number | null {
  if (typeof market.quote_summary?.buy_yes_bps === "number") {
    return market.quote_summary.buy_yes_bps;
  }

  if (typeof market.current_prices?.yes_bps === "number") {
    return market.current_prices.yes_bps;
  }

  return null;
}

function getMarketPreviewVolume(market: MarketPreviewSortable): number | null {
  const rawVolume = market.stats?.volume_usd;

  if (typeof rawVolume !== "string" || rawVolume.length === 0) {
    return null;
  }

  const parsedVolume = Number(rawVolume);

  if (!Number.isFinite(parsedVolume)) {
    return null;
  }

  return parsedVolume;
}

function comparePreviewMarkets(left: MarketPreviewSortable, right: MarketPreviewSortable): number {
  const leftIsActive = left.trading_status === "active";
  const rightIsActive = right.trading_status === "active";

  if (leftIsActive !== rightIsActive) {
    return leftIsActive ? -1 : 1;
  }

  const leftProbability = getMarketPreviewProbabilityBps(left);
  const rightProbability = getMarketPreviewProbabilityBps(right);

  if (leftProbability !== null || rightProbability !== null) {
    if (leftProbability === null) {
      return 1;
    }

    if (rightProbability === null) {
      return -1;
    }

    if (leftProbability !== rightProbability) {
      return rightProbability - leftProbability;
    }
  }

  const leftVolume = getMarketPreviewVolume(left);
  const rightVolume = getMarketPreviewVolume(right);

  if (leftVolume !== null || rightVolume !== null) {
    if (leftVolume === null) {
      return 1;
    }

    if (rightVolume === null) {
      return -1;
    }

    if (leftVolume !== rightVolume) {
      return rightVolume - leftVolume;
    }
  }

  return compareMarketOrder(left, right);
}

export function sortMarketsForPreview<T extends MarketPreviewSortable>(
  markets: readonly T[],
): T[] {
  return [...markets].sort(comparePreviewMarkets);
}

export function groupMarketsByEvent(
  markets: readonly PublicMarketCardResponse[],
): GroupedMarketEvent[] {
  const groups = new Map<string, GroupedMarketEvent>();

  for (const market of markets) {
    const groupKey = market.event.slug || market.event.id;
    const existing = groups.get(groupKey);

    if (existing) {
      existing.markets.push(market);
      if (!existing.event.image_url && market.event.image_url) {
        existing.event = market.event;
      }
      continue;
    }

    groups.set(groupKey, {
      event: market.event,
      markets: [market],
      marketCount: 0,
      nextEndTime: null,
      activeMarketsCount: 0,
    });
  }

  return Array.from(groups.values()).map(group => {
    const sortedMarkets = [...group.markets].sort(compareMarkets);
    const nextEndTime =
      sortedMarkets
        .map(market => market.end_time)
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right))[0] ?? null;
    const activeMarketsCount = sortedMarkets.filter(
      market => market.trading_status === "active",
    ).length;

    return {
      ...group,
      markets: sortedMarkets,
      marketCount: sortedMarkets.length,
      nextEndTime,
      activeMarketsCount,
    };
  });
}

export function groupEventCardsWithMarkets(
  events: readonly PublicEventCardResponse[],
): GroupedMarketEvent[] {
  return events.map(event => {
    const sortedMarkets = [...(event.markets ?? [])].sort(compareMarkets);
    const nextEndTime =
      sortedMarkets
        .map(market => market.end_time)
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right))[0] ?? null;
    const activeMarketsCount = sortedMarkets.filter(
      market => market.trading_status === "active",
    ).length;

    return {
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        category_slug: event.category_slug,
        subcategory_slug: event.subcategory_slug,
        tag_slugs: event.tag_slugs,
        image_url: event.image_url,
        summary: event.summary,
        featured: event.featured,
        breaking: event.breaking,
        neg_risk: event.neg_risk,
      },
      markets: sortedMarkets,
      marketCount: event.market_count,
      nextEndTime,
      activeMarketsCount,
    };
  });
}

export function mergeUniqueMarketCards(
  current: readonly PublicMarketCardResponse[],
  incoming: readonly PublicMarketCardResponse[],
): PublicMarketCardResponse[] {
  if (current.length === 0) {
    return [...incoming];
  }

  if (incoming.length === 0) {
    return [...current];
  }

  const seenMarketIds = new Set(current.map(market => market.id));
  const merged = [...current];

  for (const market of incoming) {
    if (seenMarketIds.has(market.id)) {
      continue;
    }

    seenMarketIds.add(market.id);
    merged.push(market);
  }

  return merged;
}

export function formatSlugLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function getMarketDisplayLabel(market: PublicMarketCardResponse): string {
  const label = market.label.trim();
  const question = market.question.trim();

  if (label.length > 0 && label.toLowerCase() !== question.toLowerCase()) {
    return label;
  }

  return question;
}
