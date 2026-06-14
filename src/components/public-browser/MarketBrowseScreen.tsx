import { Title } from "@solidjs/meta";
import { createEffect, createMemo, createSignal, Show } from "solid-js";

import Navbar from "~/components/Navbar";
import {
  groupEventCardsWithMarkets,
  groupMarketsByEvent,
  marketClient,
  type EventListResponse,
  type MarketFeedKind,
  type MarketsHomeResponse,
  type PublicEventCardResponse,
} from "~/lib/market/index.ts";
import PublicMarketSections from "~/components/PublicMarketSections";

type ScreenStatus = "loading" | "ready" | "error";
const FEED_PAGE_LIMIT = 24;
const HOME_FEED_STORAGE_KEY = "pm-home-feed/v7";
let memoryHomeFeedState: HomeFeedState | null = null;

interface HomeFeedState {
  events: PublicEventCardResponse[];
  nextOffset: number;
  hasMore: boolean;
}

interface MarketBrowseScreenProps {
  feed?: string;
  category?: string;
  tag?: string;
  label?: string;
}

type ResolvedFeedKind = "all" | Exclude<MarketFeedKind, "search">;

interface ResolvedFeedRequest {
  kind: ResolvedFeedKind;
  label: string;
  title: string;
  heading: string;
  summary: string;
  categorySlug?: string;
  tagSlug?: string;
}

function readStoredJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(key);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isHomeFeedState(value: unknown): value is HomeFeedState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<HomeFeedState>;

  return (
    Array.isArray(candidate.events) &&
    typeof candidate.nextOffset === "number" &&
    typeof candidate.hasMore === "boolean"
  );
}

function readCachedHomeFeed(): HomeFeedState | null {
  if (memoryHomeFeedState && memoryHomeFeedState.events.length > 0) {
    return memoryHomeFeedState;
  }

  const current = readStoredJson<unknown>(HOME_FEED_STORAGE_KEY);

  if (isHomeFeedState(current)) {
    memoryHomeFeedState = current;
    return current;
  }

  return null;
}

function writeCachedHomeFeed(state: HomeFeedState) {
  memoryHomeFeedState = state;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(HOME_FEED_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Keep the in-memory cache even when sessionStorage is unavailable.
  }
}

function mergeEventPages(
  existingEvents: readonly PublicEventCardResponse[],
  incomingEvents: readonly PublicEventCardResponse[],
): PublicEventCardResponse[] {
  const seen = new Set<string>();
  const mergedEvents: PublicEventCardResponse[] = [];

  for (const event of [...existingEvents, ...incomingEvents]) {
    const key = event.id || event.slug;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    mergedEvents.push(event);
  }

  return mergedEvents;
}

function matchesCachedEvent(
  event: PublicEventCardResponse,
  request: ResolvedFeedRequest,
): boolean {
  switch (request.kind) {
    case "all":
      return true;
    case "featured":
      return event.featured;
    case "breaking":
      return event.breaking;
    case "category":
      return event.category_slug === request.categorySlug;
    case "tag":
      return event.tag_slugs.includes(request.tagSlug ?? "");
    case "new":
      return false;
  }
}

function normalizeOptionalValue(value?: string): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : undefined;
}

function resolveFeedRequest(props: MarketBrowseScreenProps): ResolvedFeedRequest {
  const feed = normalizeOptionalValue(props.feed)?.toLowerCase();
  const label = normalizeOptionalValue(props.label);
  const categorySlug = normalizeOptionalValue(props.category);
  const tagSlug = normalizeOptionalValue(props.tag);

  if (!feed && !categorySlug && !tagSlug) {
    return {
      kind: "all",
      label: label ?? "All markets",
      title: "All Markets",
      heading: "All markets",
      summary: "All published market events.",
    };
  }

  if (feed === "breaking") {
    return {
      kind: "breaking",
      label: label ?? "Breaking",
      title: "Breaking Markets",
      heading: "Breaking markets",
      summary: "Markets filtered through the backend breaking flag.",
    };
  }

  if (feed === "new") {
    return {
      kind: "new",
      label: label ?? "New",
      title: "New Markets",
      heading: "New markets",
      summary: "The newest published markets from the public home feed.",
    };
  }

  if (feed === "category" && categorySlug) {
    return {
      kind: "category",
      label: label ?? categorySlug,
      title: `${label ?? categorySlug} Markets`,
      heading: `${label ?? categorySlug} markets`,
      summary: "Markets filtered by backend category slug.",
      categorySlug,
    };
  }

  if (feed === "tag" && tagSlug) {
    return {
      kind: "tag",
      label: label ?? tagSlug,
      title: `${label ?? tagSlug} Markets`,
      heading: `${label ?? tagSlug} markets`,
      summary: "Markets filtered by backend tag slug.",
      tagSlug,
    };
  }

  return {
    kind: "featured",
    label: label ?? "Trending",
    title: "Trending Markets",
    heading: "Trending markets",
    summary: "Markets filtered through the backend featured flag.",
  };
}

export default function MarketBrowseScreen(props: MarketBrowseScreenProps) {
  const [status, setStatus] = createSignal<ScreenStatus>("loading");
  const [error, setError] = createSignal<string | null>(null);
  const [eventData, setEventData] = createSignal<EventListResponse | null>(null);
  const [homeData, setHomeData] = createSignal<MarketsHomeResponse | null>(null);
  const [nextOffset, setNextOffset] = createSignal(0);
  const [hasMore, setHasMore] = createSignal(false);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [loadMoreError, setLoadMoreError] = createSignal<string | null>(null);
  let requestVersion = 0;

  const request = createMemo(() => resolveFeedRequest(props));
  const cards = createMemo(() =>
    request().kind === "new"
      ? groupMarketsByEvent(homeData()?.newest ?? [])
      : groupEventCardsWithMarkets(eventData()?.events ?? []),
  );
  const hasRenderedData = createMemo(() =>
    request().kind === "new" ? homeData() !== null : eventData() !== null,
  );
  const showEmptyState = createMemo(() =>
    status() === "ready" && cards().length === 0,
  );

  const seedFromCachedHomeFeed = (currentRequest: ResolvedFeedRequest): boolean => {
    if (currentRequest.kind === "new") {
      return false;
    }

    const cachedFeed = readCachedHomeFeed();

    if (!cachedFeed || cachedFeed.events.length === 0) {
      return false;
    }

    const filteredEvents = cachedFeed.events.filter(event =>
      matchesCachedEvent(event, currentRequest),
    );

    if (filteredEvents.length === 0) {
      return false;
    }

    setEventData({
      events: filteredEvents,
      limit: filteredEvents.length,
      offset: 0,
    });
    setHomeData(null);
    setNextOffset(currentRequest.kind === "all" ? cachedFeed.nextOffset : filteredEvents.length);
    setHasMore(currentRequest.kind === "all" ? cachedFeed.hasMore : false);
    setLoadMoreError(null);
    setStatus("ready");
    setError(null);
    return true;
  };

  const loadFeed = async (background = false) => {
    const currentRequest = request();
    const version = ++requestVersion;

    if (!background) {
      setStatus("loading");
    }

    setError(null);

    try {
      if (currentRequest.kind === "new") {
        const response = await marketClient.fetchMarketsHome({
          limit: FEED_PAGE_LIMIT,
        });

        if (version !== requestVersion) {
          return;
        }

        setHomeData(response);
        setEventData(null);
        setNextOffset(0);
        setHasMore(false);
        setLoadMoreError(null);
      } else {
        const response = await marketClient.listHomeEvents({
          limit: FEED_PAGE_LIMIT,
          featured: currentRequest.kind === "featured" ? true : undefined,
          breaking: currentRequest.kind === "breaking" ? true : undefined,
          category_slug: currentRequest.kind === "category" ? currentRequest.categorySlug : undefined,
          tag_slug: currentRequest.kind === "tag" ? currentRequest.tagSlug : undefined,
        });

        if (version !== requestVersion) {
          return;
        }

        const responseNextOffset = response.offset + response.events.length;
        const responseHasMore = response.events.length >= FEED_PAGE_LIMIT;
        const existingEvents = background && currentRequest.kind === "all"
          ? eventData()?.events ?? []
          : [];
        const nextEvents = existingEvents.length > response.events.length
          ? mergeEventPages(response.events, existingEvents)
          : response.events;
        const nextFeedOffset = existingEvents.length > response.events.length
          ? Math.max(nextOffset(), responseNextOffset)
          : responseNextOffset;
        const nextFeedHasMore = existingEvents.length > response.events.length
          ? hasMore() || responseHasMore
          : responseHasMore;

        setEventData({
          events: nextEvents,
          limit: nextEvents.length,
          offset: 0,
        });
        setHomeData(null);
        setNextOffset(nextFeedOffset);
        setHasMore(nextFeedHasMore);
        setLoadMoreError(null);

        if (currentRequest.kind === "all") {
          writeCachedHomeFeed({
            events: nextEvents,
            nextOffset: nextFeedOffset,
            hasMore: nextFeedHasMore,
          });
        }
      }

      setStatus("ready");
    } catch (caughtError) {
      if (version !== requestVersion) {
        return;
      }

      if (background && hasRenderedData()) {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to refresh this market feed.");
        return;
      }

      setEventData(null);
      setHomeData(null);
      setNextOffset(0);
      setHasMore(false);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load this market feed.");
      setStatus("error");
    }
  };

  const loadMore = async () => {
    const currentRequest = request();

    if (currentRequest.kind === "new" || loadingMore() || !hasMore()) {
      return;
    }

    const currentEvents = eventData()?.events ?? [];
    const offset = nextOffset();
    const version = ++requestVersion;
    setLoadingMore(true);
    setLoadMoreError(null);

    try {
      const response = await marketClient.listHomeEvents({
        limit: FEED_PAGE_LIMIT,
        offset,
        featured: currentRequest.kind === "featured" ? true : undefined,
        breaking: currentRequest.kind === "breaking" ? true : undefined,
        category_slug: currentRequest.kind === "category" ? currentRequest.categorySlug : undefined,
        tag_slug: currentRequest.kind === "tag" ? currentRequest.tagSlug : undefined,
      });

      if (version !== requestVersion) {
        return;
      }

      const mergedEvents = mergeEventPages(currentEvents, response.events);
      const responseNextOffset = offset + response.events.length;
      const responseHasMore = response.events.length >= FEED_PAGE_LIMIT;

      setEventData({
        events: mergedEvents,
        limit: mergedEvents.length,
        offset: 0,
      });
      setHomeData(null);
      setNextOffset(responseNextOffset);
      setHasMore(responseHasMore);

      if (currentRequest.kind === "all") {
        writeCachedHomeFeed({
          events: mergedEvents,
          nextOffset: responseNextOffset,
          hasMore: responseHasMore,
        });
      }
    } catch (caughtError) {
      if (version !== requestVersion) {
        return;
      }

      setLoadMoreError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load more markets right now.",
      );
    } finally {
      if (version === requestVersion) {
        setLoadingMore(false);
      }
    }
  };

  createEffect(() => {
    const currentRequest = request();
    const seededFromCache = seedFromCachedHomeFeed(currentRequest);

    if (!seededFromCache) {
      setEventData(null);
      setHomeData(null);
      setNextOffset(0);
      setHasMore(false);
    }

    setLoadingMore(false);
    setLoadMoreError(null);
    void loadFeed(seededFromCache);
  });

  return (
    <div class="pm-page">
      <Title>{request().title}</Title>
      <Navbar />

      <main>
        <Show
          when={!showEmptyState()}
          fallback={
            <section class="pm-home__state">
              <h1 class="pm-home__state-title">No markets found</h1>
              <p class="pm-home__state-copy">
                The {request().label.toLowerCase()} feed did not return any published markets.
              </p>
            </section>
          }
        >
          <PublicMarketSections
            cards={cards()}
            title={request().label}
            loading={status() === "loading"}
            error={status() === "error" ? error() : null}
            canLoadMore={request().kind !== "new" && hasMore()}
            loadingMore={loadingMore()}
            loadMoreError={loadMoreError()}
            onLoadMore={() => {
              void loadMore();
            }}
            onRetry={() => {
              void loadFeed();
            }}
          />
        </Show>
      </main>
    </div>
  );
}
