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

interface ResolvedFeedRequest {
  kind: Exclude<MarketFeedKind, "search">;
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
  const current = readStoredJson<unknown>(HOME_FEED_STORAGE_KEY);

  if (isHomeFeedState(current)) {
    return current;
  }

  return null;
}

function matchesCachedEvent(
  event: PublicEventCardResponse,
  request: ResolvedFeedRequest,
): boolean {
  switch (request.kind) {
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

        setEventData(response);
        setHomeData(null);
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
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load this market feed.");
      setStatus("error");
    }
  };

  createEffect(() => {
    const currentRequest = request();
    const seededFromCache = seedFromCachedHomeFeed(currentRequest);

    if (!seededFromCache) {
      setEventData(null);
      setHomeData(null);
    }

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
            onRetry={() => {
              void loadFeed();
            }}
          />
        </Show>
      </main>
    </div>
  );
}
