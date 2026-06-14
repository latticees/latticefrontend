import { Title } from "@solidjs/meta";
import { createEffect, createMemo, createSignal, Show } from "solid-js";

import Navbar from "~/components/Navbar";
import PublicMarketSections from "~/components/PublicMarketSections";
import {
  groupMarketsByEvent,
  marketClient,
  type MarketListResponse,
} from "~/lib/market/index.ts";

type ScreenStatus = "idle" | "loading" | "ready" | "error";
const SEARCH_PAGE_LIMIT = 24;
const MIN_SEARCH_LENGTH = 2;

interface MarketSearchScreenProps {
  query?: string;
}

function normalizeSearchQuery(value?: string): string {
  return value?.trim() ?? "";
}

export default function MarketSearchScreen(props: MarketSearchScreenProps) {
  const [status, setStatus] = createSignal<ScreenStatus>("idle");
  const [error, setError] = createSignal<string | null>(null);
  const [data, setData] = createSignal<MarketListResponse | null>(null);
  let requestVersion = 0;

  const query = createMemo(() => normalizeSearchQuery(props.query));
  const groupedMarkets = createMemo(() => groupMarketsByEvent(data()?.markets ?? []));
  const hasQuery = createMemo(() => query().length > 0);
  const hasValidQuery = createMemo(() => query().length >= MIN_SEARCH_LENGTH);
  const showSearchResults = createMemo(
    () =>
      (status() === "loading" && hasValidQuery()) ||
      status() === "error" ||
      (status() === "ready" && groupedMarkets().length > 0),
  );

  const loadSearch = async () => {
    const currentQuery = query();

    if (currentQuery.length === 0 || currentQuery.length < MIN_SEARCH_LENGTH) {
      setStatus("idle");
      setError(null);
      setData(null);
      return;
    }

    const version = ++requestVersion;
    setStatus("loading");
    setError(null);

    try {
      const response = await marketClient.searchMarkets({
        q: currentQuery,
        limit: SEARCH_PAGE_LIMIT,
      });

      if (version !== requestVersion) {
        return;
      }

      setData(response);
      setStatus("ready");
    } catch (caughtError) {
      if (version !== requestVersion) {
        return;
      }

      setData(null);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to search markets.");
      setStatus("error");
    }
  };

  createEffect(() => {
    query();
    void loadSearch();
  });

  return (
    <div class="pm-page">
      <Title>{hasQuery() ? `Search: ${query()}` : "Search"}</Title>
      <Navbar />

      <main>
        <Show
          when={showSearchResults()}
          fallback={
            <section class="pm-home__state">
              <h1 class="pm-home__state-title">
                {!hasQuery()
                  ? "Search markets"
                  : !hasValidQuery()
                    ? "Keep typing"
                    : "No markets found"}
              </h1>
              <p class="pm-home__state-copy">
                {!hasQuery()
                  ? "Enter at least 2 characters in the search bar above to find published markets."
                  : !hasValidQuery()
                    ? "Search terms must be at least 2 characters long."
                    : `No published markets matched "${query()}".`}
              </p>
            </section>
          }
        >
          <PublicMarketSections
            cards={groupedMarkets()}
            title={hasQuery() ? `Search: ${query()}` : "Search"}
            loading={status() === "loading" && hasValidQuery()}
            error={status() === "error" ? error() : null}
            onRetry={() => {
              void loadSearch();
            }}
          />
        </Show>
      </main>
    </div>
  );
}
