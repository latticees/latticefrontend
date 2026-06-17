import { ApiError, normalizeApiBaseUrl, requestJson } from "../api.ts";
import {
  DEFAULT_LOCALE,
  extractLocaleFromPathname,
  normalizeLocale,
} from "../i18n/config.ts";
import type {
  CategoriesResponse,
  CategoryDetailResponse,
  CreateStackQuoteRequest,
  CreateStackRoomPostRequest,
  ExplainStackAiRequest,
  ExecuteStackRequest,
  ExecuteStackResponse,
  EventDetailResponse,
  EventListResponse,
  EventMarketsResponse,
  EventOnChainResponse,
  EventResponse,
  ListEventsQuery,
  ListMarketsQuery,
  MarketActivityResponse,
  MarketClientOptions,
  MarketCurrentPricesResponse,
  MarketDetailResponse,
  MarketLiquidityResponse,
  MarketListResponse,
  MarketOrderbookResponse,
  MarketOutcomesResponse,
  MarketPriceHistoryQuery,
  MarketPriceHistoryResponse,
  MarketQuoteResponse,
  MarketResolutionReadResponse,
  MarketResponse,
  MarketTradesResponse,
  MarketsHomeQuery,
  MarketsHomeResponse,
  PublicEventCardResponse,
  PublicEventTeaserResponse,
  PublicMarketCardResponse,
  RelatedMarketsResponse,
  SearchMarketsQuery,
  StackAiExplainResponse,
  StackAiSuggestResponse,
  StackBetResponse,
  StackCompositeCatalogResponse,
  StackRoomCatalogResponse,
  StackRoomDetailResponse,
  StackRoomFeedResponse,
  StackRoomPostWriteResponse,
  StackRoomPresenceResponse,
  StackRoomReactionWriteResponse,
  StackLeaderboardResponse,
  SuggestStackAiRequest,
  StackQuoteEnvelopeResponse,
  TagsResponse,
} from "./types.ts";

function readViteEnv(key: "VITE_API_BASE_URL"): string | undefined {
  return import.meta.env?.[key];
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

function resolveCurrentLocale(): string {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const pathLocale = extractLocaleFromPathname(window.location.pathname);

  if (pathLocale) {
    return pathLocale;
  }

  return normalizeLocale(document.documentElement.lang) ?? DEFAULT_LOCALE;
}

function appendLocaleQuery<T extends Record<string, string | number | boolean>>(
  query?: T,
): T {
  const locale = resolveCurrentLocale();

  if (locale === DEFAULT_LOCALE) {
    return { ...(query ?? {}) } as T;
  }

  return {
    ...(query ?? {}),
    locale,
  } as T;
}

type JsonRecord = Record<string, unknown>;

interface BackendMarketEventSummary {
  id: string;
  title: string;
  slug: string;
}

interface BackendMarketShape {
  id: string;
  question: string;
  slug: string;
  condition_id: string;
  group_item_title: string | null;
  description: string;
  image: string | null;
  icon: string | null;
  end_date: string | null;
  start_date: string | null;
  liquidity: string;
  volume: string;
  volume_24hr: string | null;
  volume_1wk: string | null;
  active: boolean;
  closed: boolean;
  archived: boolean;
  featured: boolean;
  accepting_orders: boolean;
  outcomes: string[];
  outcome_prices: string[];
  best_bid: number | null;
  best_ask: number | null;
  last_trade_price: number | null;
  spread: number | null;
  sort_order: number;
  events: BackendMarketEventSummary[];
}

interface BackendMarketDetailPayload {
  market?: {
    raw?: unknown;
    normalized?: unknown;
  };
}

interface NormalizedEventRecord {
  raw: JsonRecord;
  teaser: PublicEventTeaserResponse;
}

export interface MarketClient {
  fetchMarketsHome(query?: MarketsHomeQuery): Promise<MarketsHomeResponse>;
  listHomeEvents(query?: ListMarketsQuery): Promise<EventListResponse>;
  listMarkets(query?: ListMarketsQuery): Promise<MarketListResponse>;
  searchMarkets(query?: SearchMarketsQuery): Promise<MarketListResponse>;
  fetchMarket(marketId: string): Promise<MarketDetailResponse>;
  fetchMarketBySlug(slug: string): Promise<MarketDetailResponse>;
  fetchMarketByCondition(conditionId: string): Promise<MarketDetailResponse>;
  fetchMarketLiquidity(marketId: string): Promise<MarketLiquidityResponse>;
  fetchMarketResolution(marketId: string): Promise<MarketResolutionReadResponse>;
  fetchRelatedMarkets(marketId: string): Promise<RelatedMarketsResponse>;
  fetchMarketOutcomes(marketId: string): Promise<MarketOutcomesResponse>;
  fetchMarketActivity(marketId: string): Promise<MarketActivityResponse>;
  fetchMarketQuote(marketId: string): Promise<MarketQuoteResponse>;
  fetchMarketPriceHistory(
    marketId: string,
    query?: MarketPriceHistoryQuery,
  ): Promise<MarketPriceHistoryResponse>;
  fetchMarketOrderbook(marketId: string): Promise<MarketOrderbookResponse>;
  fetchMarketTrades(marketId: string): Promise<MarketTradesResponse>;
  listEvents(query?: ListEventsQuery): Promise<EventListResponse>;
  fetchEvent(eventId: string): Promise<EventDetailResponse>;
  fetchEventMarkets(eventId: string): Promise<EventMarketsResponse>;
  fetchEventMarketsBySlug(eventSlug: string): Promise<EventMarketsResponse>;
  listCategories(): Promise<CategoriesResponse>;
  fetchCategory(slug: string): Promise<CategoryDetailResponse>;
  listTags(): Promise<TagsResponse>;
  suggestStackIdeas(payload: SuggestStackAiRequest): Promise<StackAiSuggestResponse>;
  explainStack(payload: ExplainStackAiRequest): Promise<StackAiExplainResponse>;
  fetchStackComposites(): Promise<StackCompositeCatalogResponse>;
  fetchStackRooms(): Promise<StackRoomCatalogResponse>;
  fetchStackRoom(roomSlug: string): Promise<StackRoomDetailResponse>;
  fetchStackRoomFeed(roomSlug: string, token?: string): Promise<StackRoomFeedResponse>;
  createStackRoomPost(
    token: string,
    roomSlug: string,
    payload: CreateStackRoomPostRequest,
  ): Promise<StackRoomPostWriteResponse>;
  addStackRoomReaction(
    token: string,
    roomSlug: string,
    postId: string,
    reaction: string,
  ): Promise<StackRoomReactionWriteResponse>;
  removeStackRoomReaction(
    token: string,
    roomSlug: string,
    postId: string,
    reaction: string,
  ): Promise<StackRoomReactionWriteResponse>;
  heartbeatStackRoomPresence(
    token: string,
    roomSlug: string,
  ): Promise<StackRoomPresenceResponse>;
  createStackQuote(payload: CreateStackQuoteRequest): Promise<StackQuoteEnvelopeResponse>;
  fetchStackQuote(quoteId: string): Promise<StackQuoteEnvelopeResponse>;
  fetchStackBet(betCode: string): Promise<StackBetResponse>;
  fetchStackLeaderboard(): Promise<StackLeaderboardResponse>;
  executeStack(token: string, payload: ExecuteStackRequest): Promise<ExecuteStackResponse>;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readValue(record: JsonRecord, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  return undefined;
}

function readString(record: JsonRecord, ...keys: string[]): string | null {
  const value = readValue(record, ...keys);
  return typeof value === "string" ? value : null;
}

function readBoolean(record: JsonRecord, ...keys: string[]): boolean {
  const value = readValue(record, ...keys);
  return typeof value === "boolean" ? value : false;
}

function readNumber(record: JsonRecord, ...keys: string[]): number | null {
  const value = readValue(record, ...keys);

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  if (typeof value !== "string") {
    return [];
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalized) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [normalized];
  }
}

function normalizeTagSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(entry => {
      if (typeof entry === "string") {
        return entry;
      }

      if (isRecord(entry)) {
        return readString(entry, "slug", "label");
      }

      return null;
    })
    .filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function slugifyLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProbability(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  let probability = parsed;

  if (probability > 1 && probability <= 100) {
    probability /= 100;
  } else if (probability > 100) {
    probability /= 10000;
  }

  if (!Number.isFinite(probability)) {
    return null;
  }

  return Math.min(1, Math.max(0, probability));
}

function toBps(value: string | number | null | undefined): number | null {
  const probability = normalizeProbability(value);
  return probability === null ? null : Math.round(probability * 10000);
}

function deriveTradingStatus(market: BackendMarketShape): string {
  if (market.active) {
    return "active";
  }

  if (market.closed) {
    return "closed";
  }

  return "paused";
}

function deriveMarketType(market: BackendMarketShape): string {
  return market.outcomes.length <= 2 ? "binary" : "multi";
}

function resolveMarketLabel(market: BackendMarketShape): string {
  const groupItemTitle = market.group_item_title?.trim();

  if (groupItemTitle) {
    return groupItemTitle;
  }

  return market.question;
}

function deriveCurrentPrices(market: BackendMarketShape): MarketCurrentPricesResponse | null {
  const yesBps =
    toBps(market.outcome_prices[0] ?? null) ??
    toBps(market.last_trade_price) ??
    toBps(market.best_bid) ??
    toBps(market.best_ask);

  if (yesBps === null) {
    return null;
  }

  const noBps = toBps(market.outcome_prices[1] ?? null) ?? Math.max(0, 10000 - yesBps);

  return {
    yes_bps: yesBps,
    no_bps: noBps,
  };
}

function normalizeEventRecord(value: unknown): NormalizedEventRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value, "id", "event_id", "eventId") ?? "";
  const title = readString(value, "title") ?? "";
  const slug = readString(value, "slug") ?? "";

  if (!id || !title || !slug) {
    return null;
  }

  const categoryValue =
    readString(value, "category_slug", "categorySlug") ??
    readString(value, "category") ??
    "markets";

  return {
    raw: value,
    teaser: {
      id,
      title,
      slug,
      category_slug: slugifyLabel(categoryValue) || "markets",
      subcategory_slug: readString(value, "subcategory_slug", "subcategorySlug"),
      tag_slugs: normalizeTagSlugs(readValue(value, "tags", "tag_slugs", "tagSlugs")),
      image_url: readString(value, "image", "image_url", "imageUrl", "icon"),
      summary: readString(value, "description", "summary"),
      featured: readBoolean(value, "featured"),
      breaking: readBoolean(value, "breaking"),
      neg_risk: readBoolean(value, "negRisk", "neg_risk"),
    },
  };
}

function buildSyntheticEventTeaser(
  market: BackendMarketShape,
  eventOverride?: PublicEventTeaserResponse | BackendMarketEventSummary | null,
): PublicEventTeaserResponse {
  if (
    eventOverride &&
    "category_slug" in eventOverride &&
    typeof eventOverride.category_slug === "string"
  ) {
    return {
      ...eventOverride,
      image_url: eventOverride.image_url ?? market.image ?? market.icon,
      summary: eventOverride.summary ?? (market.description.trim() || null),
      featured: eventOverride.featured || market.featured,
    };
  }

  const event = eventOverride ?? market.events[0] ?? null;
  const title = event?.title?.trim() || market.question.trim() || "Market";
  const slug = event?.slug?.trim() || market.slug;
  const id = event?.id?.trim() || market.id;

  return {
    id,
    title,
    slug,
    category_slug: "markets",
    subcategory_slug: null,
    tag_slugs: [],
    image_url: market.image ?? market.icon,
    summary: market.description.trim() || null,
    featured: market.featured,
    breaking: false,
    neg_risk: false,
  };
}

function buildSyntheticEventResponse(
  market: BackendMarketShape,
  eventOverride?: PublicEventTeaserResponse | BackendMarketEventSummary | null,
): EventResponse {
  const event = buildSyntheticEventTeaser(market, eventOverride);

  return {
    title: event.title,
    slug: event.slug,
    category_slug: event.category_slug,
    subcategory_slug: event.subcategory_slug,
    tag_slugs: event.tag_slugs,
    image_url: event.image_url,
    summary: event.summary,
    rules: "",
    context: null,
    additional_context: null,
    resolution_sources: [],
    resolution_timezone: "UTC",
    starts_at: market.start_date,
    sort_at: market.end_date ?? market.start_date,
    featured: event.featured,
    breaking: event.breaking,
    searchable: true,
    visible: true,
    hide_resolved_by_default: false,
    publication_status: "published",
  };
}

function buildSyntheticOnChain(eventId: string | null): EventOnChainResponse {
  return {
    event_id: eventId ?? "",
    group_id: "",
    series_id: "",
    neg_risk: false,
    tx_hash: null,
  };
}

function normalizeEventSummaries(value: unknown): BackendMarketEventSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(entry => {
      if (!isRecord(entry)) {
        return null;
      }

      const id = readString(entry, "id") ?? "";
      const title = readString(entry, "title") ?? "";
      const slug = readString(entry, "slug") ?? "";

      if (!id && !slug) {
        return null;
      }

      return {
        id: id || slug,
        title: title || slug || id,
        slug: slug || id,
      };
    })
    .filter((entry): entry is BackendMarketEventSummary => entry !== null);
}

function normalizeMarketShape(
  value: unknown,
  fallbackSortOrder = 0,
): BackendMarketShape | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value, "id") ?? "";
  const slug = readString(value, "slug") ?? "";
  const question = readString(value, "question") ?? readString(value, "title") ?? "";
  const conditionId = readString(value, "condition_id", "conditionId") ?? "";

  if (!id || !slug || !question) {
    return null;
  }

  const events = normalizeEventSummaries(readValue(value, "events"));
  const singleEvent = readValue(value, "event");

  if (events.length === 0 && isRecord(singleEvent)) {
    events.push(
      ...normalizeEventSummaries([singleEvent]),
    );
  }

  return {
    id,
    question,
    slug,
    condition_id: conditionId,
    group_item_title: readString(value, "group_item_title", "groupItemTitle"),
    description: readString(value, "description", "summary") ?? "",
    image: readString(value, "image", "image_url", "imageUrl"),
    icon: readString(value, "icon"),
    end_date: readString(value, "end_date", "endDate"),
    start_date: readString(value, "start_date", "startDate"),
    liquidity: readString(value, "liquidity") ?? "0",
    volume: readString(value, "volume") ?? "0",
    volume_24hr: readString(value, "volume_24hr", "volume24hr"),
    volume_1wk: readString(value, "volume_1wk", "volume1wk"),
    active: readBoolean(value, "active"),
    closed: readBoolean(value, "closed"),
    archived: readBoolean(value, "archived"),
    featured: readBoolean(value, "featured"),
    accepting_orders: readBoolean(value, "accepting_orders", "acceptingOrders"),
    outcomes: normalizeStringArray(readValue(value, "outcomes")),
    outcome_prices: normalizeStringArray(readValue(value, "outcome_prices", "outcomePrices")),
    best_bid: readNumber(value, "best_bid", "bestBid"),
    best_ask: readNumber(value, "best_ask", "bestAsk"),
    last_trade_price: readNumber(value, "last_trade_price", "lastTradePrice"),
    spread: readNumber(value, "spread"),
    sort_order:
      Math.trunc(
        readNumber(
          value,
          "sort_order",
          "sortOrder",
          "display_order",
          "displayOrder",
          "group_item_order",
          "groupItemOrder",
        ) ?? fallbackSortOrder,
      ),
    events,
  };
}

function toPublicMarketCard(
  market: BackendMarketShape,
  eventOverride?: PublicEventTeaserResponse | null,
): PublicMarketCardResponse {
  const currentPrices = deriveCurrentPrices(market);

  return {
    id: market.id,
    slug: market.slug,
    label: resolveMarketLabel(market),
    question: market.question,
    question_id: market.id,
    condition_id: market.condition_id || null,
    market_type: deriveMarketType(market),
    outcomes: market.outcomes,
    end_time: market.end_date ?? market.start_date ?? "",
    sort_order: market.sort_order,
    trading_status: deriveTradingStatus(market),
    current_prices: currentPrices,
    stats: {
      volume_usd: market.volume,
    },
    quote_summary:
      currentPrices === null
        ? null
        : {
            buy_yes_bps: currentPrices.yes_bps,
            buy_no_bps: currentPrices.no_bps,
            as_of: market.end_date ?? market.start_date ?? new Date().toISOString(),
            source: "backend_normalized_market",
          },
    event: buildSyntheticEventTeaser(market, eventOverride),
  };
}

function toMarketResponse(market: BackendMarketShape): MarketResponse {
  const currentPrices = deriveCurrentPrices(market);

  return {
    id: market.id,
    slug: market.slug,
    label: resolveMarketLabel(market),
    question: market.question,
    question_id: market.id,
    condition_id: market.condition_id || null,
    market_type: deriveMarketType(market),
    outcomes: market.outcomes,
    end_time: market.end_date ?? market.start_date ?? "",
    sort_order: market.sort_order,
    publication_status: "published",
    trading_status: deriveTradingStatus(market),
    current_prices: currentPrices,
    stats: {
      volume_usd: market.volume,
    },
    quote_summary:
      currentPrices === null
        ? null
        : {
            buy_yes_bps: currentPrices.yes_bps,
            buy_no_bps: currentPrices.no_bps,
            as_of: market.end_date ?? market.start_date ?? new Date().toISOString(),
            source: "backend_normalized_market",
          },
  };
}

function normalizeMarketListPayload(payload: unknown): BackendMarketShape[] {
  if (Array.isArray(payload)) {
    return payload
      .map((entry, index) => normalizeMarketShape(entry, index))
      .filter((market): market is BackendMarketShape => market !== null);
  }

  if (isRecord(payload) && Array.isArray(payload.markets)) {
    return payload.markets
      .map((entry, index) => normalizeMarketShape(entry, index))
      .filter((market): market is BackendMarketShape => market !== null);
  }

  return [];
}

function extractSearchMarkets(payload: unknown): BackendMarketShape[] {
  const collected: BackendMarketShape[] = [];
  const seen = new Set<string>();

  const visit = (value: unknown) => {
    const market = normalizeMarketShape(value, collected.length);

    if (market && !seen.has(market.id)) {
      seen.add(market.id);
      collected.push(market);
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        visit(entry);
      }

      return;
    }

    if (!isRecord(value)) {
      return;
    }

    for (const nested of Object.values(value)) {
      visit(nested);
    }
  };

  visit(payload);
  return collected;
}

function normalizeEventCard(value: unknown): PublicEventCardResponse | null {
  const normalizedEvent = normalizeEventRecord(value);

  if (!normalizedEvent) {
    return null;
  }

  const markets = Array.isArray(readValue(normalizedEvent.raw, "markets"))
    ? (readValue(normalizedEvent.raw, "markets") as unknown[])
        .map((market, index) => normalizeMarketShape(market, index))
        .filter((market): market is BackendMarketShape => market !== null)
        .map(market => toPublicMarketCard(market, normalizedEvent.teaser))
    : null;

  return {
    id: normalizedEvent.teaser.id,
    title: normalizedEvent.teaser.title,
    slug: normalizedEvent.teaser.slug,
    category_slug: normalizedEvent.teaser.category_slug,
    subcategory_slug: normalizedEvent.teaser.subcategory_slug,
    tag_slugs: normalizedEvent.teaser.tag_slugs,
    image_url: normalizedEvent.teaser.image_url,
    summary: normalizedEvent.teaser.summary,
    featured: normalizedEvent.teaser.featured,
    breaking: normalizedEvent.teaser.breaking,
    neg_risk: normalizedEvent.teaser.neg_risk,
    starts_at: readString(normalizedEvent.raw, "startDate", "start_date"),
    sort_at: readString(normalizedEvent.raw, "endDate", "end_date", "startDate", "start_date"),
    market_count: markets?.length ?? readNumber(normalizedEvent.raw, "market_count", "marketCount") ?? 0,
    markets,
  };
}

function normalizeEventListPayload(
  payload: unknown,
  fallbackLimit: number,
  fallbackOffset: number,
): EventListResponse {
  const source = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.events)
      ? payload.events
      : [];
  const events = source
    .map(normalizeEventCard)
    .filter((event): event is PublicEventCardResponse => event !== null);

  return {
    events,
    limit: events.length || fallbackLimit,
    offset: fallbackOffset,
  };
}

function dedupePublicMarkets(
  markets: readonly PublicMarketCardResponse[],
): PublicMarketCardResponse[] {
  const seen = new Set<string>();
  const uniqueMarkets: PublicMarketCardResponse[] = [];

  for (const market of markets) {
    if (seen.has(market.id)) {
      continue;
    }

    seen.add(market.id);
    uniqueMarkets.push(market);
  }

  return uniqueMarkets;
}

function toEventResponse(value: unknown): EventResponse {
  const normalizedEvent = normalizeEventRecord(value);

  if (!normalizedEvent) {
    return {
      title: "Event",
      slug: "",
      category_slug: "markets",
      subcategory_slug: null,
      tag_slugs: [],
      image_url: null,
      summary: null,
      rules: "",
      context: null,
      additional_context: null,
      resolution_sources: [],
      resolution_timezone: "UTC",
      starts_at: null,
      sort_at: null,
      featured: false,
      breaking: false,
      searchable: true,
      visible: true,
      hide_resolved_by_default: false,
      publication_status: "published",
    };
  }

  const metadata = isRecord(readValue(normalizedEvent.raw, "eventMetadata"))
    ? (readValue(normalizedEvent.raw, "eventMetadata") as JsonRecord)
    : null;

  return {
    title: normalizedEvent.teaser.title,
    slug: normalizedEvent.teaser.slug,
    category_slug: normalizedEvent.teaser.category_slug,
    subcategory_slug: normalizedEvent.teaser.subcategory_slug,
    tag_slugs: normalizedEvent.teaser.tag_slugs,
    image_url: normalizedEvent.teaser.image_url,
    summary: normalizedEvent.teaser.summary,
    rules: readString(normalizedEvent.raw, "rules") ?? "",
    context:
      readString(normalizedEvent.raw, "context") ??
      (metadata ? readString(metadata, "context_description") : null),
    additional_context: readString(normalizedEvent.raw, "additional_context", "additionalContext"),
    resolution_sources: normalizeTagSlugs(
      readValue(normalizedEvent.raw, "resolution_sources", "resolutionSources"),
    ),
    resolution_timezone:
      readString(normalizedEvent.raw, "resolution_timezone", "resolutionTimezone") ?? "UTC",
    starts_at: readString(normalizedEvent.raw, "startDate", "start_date"),
    sort_at: readString(normalizedEvent.raw, "endDate", "end_date", "startDate", "start_date"),
    featured: normalizedEvent.teaser.featured,
    breaking: normalizedEvent.teaser.breaking,
    searchable: true,
    visible: true,
    hide_resolved_by_default: false,
    publication_status: "published",
  };
}

function normalizeMarketDetailPayload(payload: BackendMarketDetailPayload): BackendMarketShape {
  const normalized = normalizeMarketShape(payload.market?.normalized);
  const raw = normalizeMarketShape(payload.market?.raw, normalized?.sort_order ?? 0);
  const market = normalized
    ? {
        ...normalized,
        group_item_title: normalized.group_item_title ?? raw?.group_item_title ?? null,
        sort_order: normalized.sort_order ?? raw?.sort_order ?? 0,
      }
    : raw;

  if (!market) {
    throw new Error("Backend market detail response did not contain a normalized market.");
  }

  return market;
}

function toMarketDetailResponse(payload: BackendMarketDetailPayload): MarketDetailResponse {
  const market = normalizeMarketDetailPayload(payload);
  const event = buildSyntheticEventResponse(market);
  const primaryEventId = market.events[0]?.id ?? null;

  return {
    event,
    on_chain: buildSyntheticOnChain(primaryEventId),
    market: toMarketResponse(market),
    resolution: null,
    sibling_markets: [],
  };
}

function toEventDetailResponse(payload: unknown): EventDetailResponse {
  const event = toEventResponse(payload);
  const eventId = isRecord(payload)
    ? readString(payload, "id", "event_id", "eventId")
    : null;
  const markets = isRecord(payload) && Array.isArray(payload.markets)
    ? payload.markets
        .map((market, index) => normalizeMarketShape(market, index))
        .filter((market): market is BackendMarketShape => market !== null)
    : [];

  return {
    event,
    on_chain: buildSyntheticOnChain(eventId),
    markets_count: markets.length,
  };
}

function toEventMarketsResponse(payload: unknown): EventMarketsResponse {
  const event = toEventResponse(payload);
  const eventId = isRecord(payload)
    ? readString(payload, "id", "event_id", "eventId")
    : null;
  const markets = isRecord(payload) && Array.isArray(payload.markets)
    ? payload.markets
        .map((market, index) => normalizeMarketShape(market, index))
        .filter((market): market is BackendMarketShape => market !== null)
        .map(toMarketResponse)
    : [];

  return {
    event,
    on_chain: buildSyntheticOnChain(eventId),
    markets,
  };
}

async function resolvePrimaryEventSummary(
  baseUrl: string,
  market: BackendMarketShape,
): Promise<BackendMarketEventSummary | null> {
  if (market.events[0]) {
    return market.events[0];
  }

  if (!market.condition_id) {
    return null;
  }

  const payload = await requestJson<unknown>(baseUrl, "/markets/all", {
    query: {
      condition_id: market.condition_id,
      limit: 1,
    },
  });
  const matchedMarket = normalizeMarketListPayload(payload)[0];

  return matchedMarket?.events[0] ?? null;
}

async function buildMarketDetailResponse(
  baseUrl: string,
  payload: BackendMarketDetailPayload,
): Promise<MarketDetailResponse> {
  const market = normalizeMarketDetailPayload(payload);
  const eventSummary = await resolvePrimaryEventSummary(baseUrl, market);
  let eventPayload: unknown = null;

  if (eventSummary?.id) {
    try {
      eventPayload = await requestJson<unknown>(
        baseUrl,
        `/markets/events/${encodePathSegment(eventSummary.id)}`,
      );
    } catch {
      eventPayload = null;
    }
  }

  const event = eventPayload ? toEventResponse(eventPayload) : buildSyntheticEventResponse(market, eventSummary);
  const sibling_markets =
    eventPayload && isRecord(eventPayload) && Array.isArray(eventPayload.markets)
      ? eventPayload.markets
          .map((market, index) => normalizeMarketShape(market, index))
          .filter((candidate): candidate is BackendMarketShape => candidate !== null)
          .filter(candidate => candidate.id !== market.id)
          .map(toMarketResponse)
      : [];

  return {
    event,
    on_chain: buildSyntheticOnChain(eventSummary?.id ?? null),
    market: toMarketResponse(market),
    resolution: null,
    sibling_markets,
  };
}

function buildListQuery(query?: ListMarketsQuery): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) {
      continue;
    }

    params[key] = value as string | number | boolean;
  }

  if (query?.trading_status === "active") {
    params.active = true;
    params.closed = false;
  }

  if (query?.trading_status === "resolved") {
    params.closed = true;
  }

  if (query?.trading_status === "paused") {
    params.active = false;
    params.closed = false;
  }

  return params;
}

function buildSearchQuery(query?: SearchMarketsQuery): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) {
      continue;
    }

    params[key] = value as string | number | boolean;
  }

  if (query?.trading_status === "active") {
    params.active = true;
    params.closed = false;
  }

  return params;
}

function buildQuoteResponse(market: BackendMarketShape): MarketQuoteResponse {
  const currentPrices = deriveCurrentPrices(market);
  const buyYesBps =
    toBps(market.best_ask) ??
    currentPrices?.yes_bps ??
    toBps(market.last_trade_price) ??
    0;
  const sellYesBps =
    toBps(market.best_bid) ??
    currentPrices?.yes_bps ??
    toBps(market.last_trade_price) ??
    0;
  const lastTradeYesBps =
    toBps(market.last_trade_price) ??
    currentPrices?.yes_bps ??
    sellYesBps;
  const buyNoBps = currentPrices?.no_bps ?? Math.max(0, 10000 - buyYesBps);
  const sellNoBps = Math.max(0, 10000 - sellYesBps);
  const spreadBps = toBps(market.spread) ?? Math.max(0, buyYesBps - sellYesBps);

  return {
    market_id: market.id,
    condition_id: market.condition_id || null,
    source: "backend_normalized_market",
    as_of: market.end_date ?? market.start_date ?? new Date().toISOString(),
    buy_yes_bps: buyYesBps,
    buy_no_bps: buyNoBps,
    sell_yes_bps: sellYesBps,
    sell_no_bps: sellNoBps,
    last_trade_yes_bps: lastTradeYesBps,
    spread_bps: spreadBps,
  };
}

function normalizeMarketPriceHistorySeries(
  value: unknown,
): MarketPriceHistoryResponse["history"] {
  if (isRecord(value)) {
    return normalizeMarketPriceHistorySeries(readValue(value, "history"));
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  const series = value
    .map(entry => {
      if (!isRecord(entry)) {
        return null;
      }

      const timestamp = readNumber(entry, "t", "timestamp");
      const probability = normalizeProbability(readValue(entry, "p", "price") as
        | string
        | number
        | null
        | undefined);

      if (timestamp === null || probability === null) {
        return null;
      }

      return {
        t: timestamp,
        p: probability,
      };
    })
    .filter(
      (
        point,
      ): point is NonNullable<MarketPriceHistoryResponse["history"]>[number] => point !== null,
    );

  return series.length > 0 ? series : undefined;
}

function normalizeMarketPriceHistoryPoints(value: unknown): MarketPriceHistoryResponse["points"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(entry => {
      if (!isRecord(entry)) {
        return null;
      }

      const timestamp = readString(entry, "timestamp");
      const outcomeIndex = readNumber(entry, "outcome_index", "outcomeIndex");
      const outcomeLabel = readString(entry, "outcome_label", "outcomeLabel");
      const price = normalizeProbability(readValue(entry, "price", "p") as
        | string
        | number
        | null
        | undefined);
      const priceBps = toBps(readValue(entry, "price_bps", "priceBps", "price", "p") as
        | string
        | number
        | null
        | undefined);

      if (
        !timestamp ||
        outcomeIndex === null ||
        !Number.isInteger(outcomeIndex) ||
        !outcomeLabel ||
        price === null ||
        priceBps === null
      ) {
        return null;
      }

      return {
        timestamp,
        outcome_index: outcomeIndex,
        outcome_label: outcomeLabel,
        price_bps: priceBps,
        price,
      };
    })
    .filter((point): point is MarketPriceHistoryResponse["points"][number] => point !== null);
}

function normalizeMarketPriceHistoryResponse(
  marketId: string,
  payload: unknown,
  fallbackInterval?: string,
): MarketPriceHistoryResponse {
  if (!isRecord(payload)) {
    return {
      market_id: marketId,
      condition_id: null,
      source: "clob_prices_history",
      interval: fallbackInterval ?? "max",
      history: normalizeMarketPriceHistorySeries(payload),
      points: [],
    };
  }

  return {
    market_id: readString(payload, "market_id", "marketId") ?? marketId,
    condition_id: readString(payload, "condition_id", "conditionId"),
    source: readString(payload, "source") ?? "clob_prices_history",
    interval: readString(payload, "interval") ?? fallbackInterval ?? "max",
    history: normalizeMarketPriceHistorySeries(readValue(payload, "history")),
    points: normalizeMarketPriceHistoryPoints(readValue(payload, "points")),
  };
}

async function fetchBackendMarketDetailById(
  baseUrl: string,
  marketId: string,
): Promise<BackendMarketDetailPayload> {
  return requestJson<BackendMarketDetailPayload>(
    baseUrl,
    `/markets/${encodePathSegment(marketId)}`,
    { query: appendLocaleQuery() },
  );
}

async function fetchBackendMarketDetailBySlug(
  baseUrl: string,
  slug: string,
): Promise<BackendMarketDetailPayload> {
  return requestJson<BackendMarketDetailPayload>(
    baseUrl,
    `/markets/slug/${encodePathSegment(slug)}`,
    { query: appendLocaleQuery() },
  );
}

function buildUnsupportedEndpointError(endpoint: string): ApiError {
  return new ApiError(
    `The current backend integration does not expose ${endpoint}.`,
    404,
  );
}

export function createMarketClient(options: MarketClientOptions = {}): MarketClient {
  const baseUrl = normalizeApiBaseUrl(options.baseUrl);

  return {
    async fetchMarketsHome(query) {
      const response = await this.listHomeEvents({
        limit: query?.limit,
      });

      return {
        featured: dedupePublicMarkets(
          response.events
            .filter(event => event.featured)
            .flatMap(event => event.markets ?? []),
        ),
        breaking: dedupePublicMarkets(
          response.events
            .filter(event => event.breaking)
            .flatMap(event => event.markets ?? []),
        ),
        newest: dedupePublicMarkets(
          response.events.flatMap(event => event.markets ?? []),
        ),
      };
    },

    async listHomeEvents(query) {
      const payload = await requestJson<unknown>(baseUrl, "/markets", {
        query: appendLocaleQuery(buildListQuery(query)),
      });

      return normalizeEventListPayload(
        payload,
        typeof query?.limit === "number" ? query.limit : 0,
        typeof query?.offset === "number" ? query.offset : 0,
      );
    },

    async listMarkets(query) {
      const payload = await requestJson<unknown>(baseUrl, "/markets/all", {
        query: appendLocaleQuery(buildListQuery(query)),
      });
      const markets = normalizeMarketListPayload(payload).map(market => toPublicMarketCard(market));

      return {
        markets,
        limit: typeof query?.limit === "number" ? query.limit : markets.length,
        offset: typeof query?.offset === "number" ? query.offset : 0,
      };
    },

    async searchMarkets(query) {
      const payload = await requestJson<unknown>(baseUrl, "/markets/search", {
        query: appendLocaleQuery(buildSearchQuery(query)),
      });

      if (isRecord(payload) && Array.isArray(payload.events)) {
        const flattenedMarkets = payload.events
          .map(normalizeEventCard)
          .filter((event): event is PublicEventCardResponse => event !== null)
          .flatMap(event => event.markets ?? []);

        return {
          markets: flattenedMarkets,
          limit: typeof query?.limit === "number" ? query.limit : flattenedMarkets.length,
          offset: typeof query?.offset === "number" ? query.offset : 0,
        };
      }

      const extractedMarkets = extractSearchMarkets(payload);

      if (extractedMarkets.length > 0) {
        return {
          markets: extractedMarkets.map(market => toPublicMarketCard(market)),
          limit: typeof query?.limit === "number" ? query.limit : extractedMarkets.length,
          offset: typeof query?.offset === "number" ? query.offset : 0,
        };
      }

      return this.listMarkets({
        ...query,
        active: true,
        closed: false,
      } as ListMarketsQuery);
    },

    async fetchMarket(marketId) {
      return buildMarketDetailResponse(
        baseUrl,
        await fetchBackendMarketDetailById(baseUrl, marketId),
      );
    },

    async fetchMarketBySlug(slug) {
      return buildMarketDetailResponse(
        baseUrl,
        await fetchBackendMarketDetailBySlug(baseUrl, slug),
      );
    },

    async fetchMarketByCondition(conditionId) {
      const response = await this.listMarkets({
        condition_id: conditionId,
      } as ListMarketsQuery);
      const match = response.markets.find(market => market.condition_id === conditionId);

      if (!match) {
        throw new ApiError("market not found", 404);
      }

      return this.fetchMarket(match.id);
    },

    async fetchMarketLiquidity(marketId) {
      throw buildUnsupportedEndpointError(`/markets/${marketId}/liquidity`);
    },

    async fetchMarketResolution(marketId) {
      throw buildUnsupportedEndpointError(`/markets/${marketId}/resolution`);
    },

    async fetchRelatedMarkets(marketId) {
      const detail = await fetchBackendMarketDetailById(baseUrl, marketId);
      const market = normalizeMarketDetailPayload(detail);
      const eventId = (await resolvePrimaryEventSummary(baseUrl, market))?.id;

      if (!eventId) {
        return { market_id: marketId, related: [] };
      }

      try {
        const eventPayload = await requestJson<unknown>(
          baseUrl,
          `/markets/events/${encodePathSegment(eventId)}`,
        );
        const event = normalizeEventCard(eventPayload);
        const related = (event?.markets ?? []).filter(candidate => candidate.id !== marketId);

        return {
          market_id: marketId,
          related,
        };
      } catch {
        return { market_id: marketId, related: [] };
      }
    },

    async fetchMarketOutcomes(marketId) {
      const detail = await fetchBackendMarketDetailById(baseUrl, marketId);
      const market = normalizeMarketDetailPayload(detail);

      return {
        market_id: market.id,
        condition_id: market.condition_id || null,
        market_type: deriveMarketType(market),
        outcomes: market.outcomes.map((label, index) => ({
          index,
          label,
          is_winning: null,
        })),
      };
    },

    async fetchMarketActivity(marketId) {
      throw buildUnsupportedEndpointError(`/markets/${marketId}/activity`);
    },

    async fetchMarketQuote(marketId) {
      const detail = await fetchBackendMarketDetailById(baseUrl, marketId);
      return buildQuoteResponse(normalizeMarketDetailPayload(detail));
    },

    async fetchMarketPriceHistory(marketId, query) {
      const payload = await requestJson<unknown>(
        baseUrl,
        `/markets/${encodePathSegment(marketId)}/price-history`,
        {
          query: {
            interval: query?.interval,
            fidelity: query?.fidelity,
          },
        },
      );

      return normalizeMarketPriceHistoryResponse(marketId, payload, query?.interval);
    },

    async fetchMarketOrderbook(marketId) {
      throw buildUnsupportedEndpointError(`/markets/${marketId}/orderbook`);
    },

    async fetchMarketTrades(marketId) {
      throw buildUnsupportedEndpointError(`/markets/${marketId}/trades`);
    },

    async listEvents(query) {
      const payload = await requestJson<unknown>(baseUrl, "/markets/events", {
        query: appendLocaleQuery(buildListQuery(query as unknown as ListMarketsQuery)),
      });

      return normalizeEventListPayload(
        payload,
        typeof query?.limit === "number" ? query.limit : 0,
        typeof query?.offset === "number" ? query.offset : 0,
      );
    },

    async fetchEvent(eventId) {
      const payload = await requestJson<unknown>(
        baseUrl,
        `/markets/events/${encodePathSegment(eventId)}`,
        { query: appendLocaleQuery() },
      );

      return toEventDetailResponse(payload);
    },

    async fetchEventMarkets(eventId) {
      const payload = await requestJson<unknown>(
        baseUrl,
        `/markets/events/${encodePathSegment(eventId)}`,
        { query: appendLocaleQuery() },
      );

      return toEventMarketsResponse(payload);
    },

    async fetchEventMarketsBySlug(eventSlug) {
      const payload = await requestJson<unknown>(
        baseUrl,
        `/markets/events/slug/${encodePathSegment(eventSlug)}`,
        { query: appendLocaleQuery() },
      );

      return toEventMarketsResponse(payload);
    },

    async listCategories() {
      throw buildUnsupportedEndpointError("/categories");
    },

    async fetchCategory(slug) {
      throw buildUnsupportedEndpointError(`/categories/${slug}`);
    },

    async listTags() {
      const payload = await requestJson<unknown>(baseUrl, "/markets/tags");

      if (!Array.isArray(payload)) {
        return { tags: [] };
      }

      const tags = payload
        .map(entry => {
          if (!isRecord(entry)) {
            return null;
          }

          const slug = readString(entry, "slug") ?? "";
          const label = readString(entry, "label") ?? slug;

          if (!slug) {
            return null;
          }

          return {
            slug,
            label,
            event_count: readNumber(entry, "event_count", "eventCount") ?? 0,
            market_count: readNumber(entry, "market_count", "marketCount") ?? 0,
          };
        })
        .filter(
          (
            entry,
          ): entry is NonNullable<TagsResponse["tags"][number]> => entry !== null,
        );

      return { tags };
    },

    createStackQuote(payload) {
      return requestJson<StackQuoteEnvelopeResponse>(baseUrl, "/stacks/quote", {
        method: "POST",
        json: payload,
      });
    },

    suggestStackIdeas(payload) {
      return requestJson<StackAiSuggestResponse>(baseUrl, "/stacks/ai/suggest", {
        method: "POST",
        json: payload,
      });
    },

    explainStack(payload) {
      return requestJson<StackAiExplainResponse>(baseUrl, "/stacks/ai/explain", {
        method: "POST",
        json: payload,
      });
    },

    fetchStackComposites() {
      return requestJson<StackCompositeCatalogResponse>(baseUrl, "/stacks/composites");
    },

    fetchStackRooms() {
      return requestJson<StackRoomCatalogResponse>(baseUrl, "/stacks/rooms");
    },

    fetchStackRoom(roomSlug) {
      return requestJson<StackRoomDetailResponse>(
        baseUrl,
        `/stacks/rooms/${encodePathSegment(roomSlug)}`,
      );
    },

    fetchStackRoomFeed(roomSlug, token) {
      return requestJson<StackRoomFeedResponse>(
        baseUrl,
        `/stacks/rooms/${encodePathSegment(roomSlug)}/feed`,
        token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : undefined,
      );
    },

    createStackRoomPost(token, roomSlug, payload) {
      return requestJson<StackRoomPostWriteResponse>(
        baseUrl,
        `/stacks/rooms/${encodePathSegment(roomSlug)}/posts`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          json: payload,
        },
      );
    },

    addStackRoomReaction(token, roomSlug, postId, reaction) {
      return requestJson<StackRoomReactionWriteResponse>(
        baseUrl,
        `/stacks/rooms/${encodePathSegment(roomSlug)}/posts/${encodePathSegment(postId)}/reactions/${encodePathSegment(reaction)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
    },

    removeStackRoomReaction(token, roomSlug, postId, reaction) {
      return requestJson<StackRoomReactionWriteResponse>(
        baseUrl,
        `/stacks/rooms/${encodePathSegment(roomSlug)}/posts/${encodePathSegment(postId)}/reactions/${encodePathSegment(reaction)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
    },

    heartbeatStackRoomPresence(token, roomSlug) {
      return requestJson<StackRoomPresenceResponse>(
        baseUrl,
        `/stacks/rooms/${encodePathSegment(roomSlug)}/presence`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
    },

    fetchStackQuote(quoteId) {
      return requestJson<StackQuoteEnvelopeResponse>(
        baseUrl,
        `/stacks/quotes/${encodePathSegment(quoteId)}`,
      );
    },

    fetchStackBet(betCode) {
      return requestJson<StackBetResponse>(
        baseUrl,
        `/stacks/bets/${encodePathSegment(betCode)}`,
      );
    },

    fetchStackLeaderboard() {
      return requestJson<StackLeaderboardResponse>(baseUrl, "/stacks/leaderboard");
    },

    executeStack(token, payload) {
      return requestJson<ExecuteStackResponse>(baseUrl, "/stacks/execute", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        json: payload,
      });
    },
  };
}

export const marketClient = createMarketClient({
  baseUrl: readViteEnv("VITE_API_BASE_URL"),
});
