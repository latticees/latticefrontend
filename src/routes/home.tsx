import { Title } from "@solidjs/meta";
import { onMount } from "solid-js";

import HomeLanding from "~/components/HomeLanding.tsx";
import { marketClient } from "~/lib/market/index.ts";

const HOME_FEED_STORAGE_KEY = "pm-home-feed/v7";
const HOME_FEED_PAGE_LIMIT = 24;
let inflightHomePrewarm: Promise<void> | null = null;

function readCachedHomeFeedExists(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return typeof window.sessionStorage.getItem(HOME_FEED_STORAGE_KEY) === "string";
  } catch {
    return false;
  }
}

async function prewarmHomeFeed() {
  if (typeof window === "undefined" || readCachedHomeFeedExists()) {
    return;
  }

  if (inflightHomePrewarm) {
    return inflightHomePrewarm;
  }

  inflightHomePrewarm = marketClient
    .listHomeEvents({
      limit: HOME_FEED_PAGE_LIMIT,
    })
    .then(response => {
      try {
        window.sessionStorage.setItem(
          HOME_FEED_STORAGE_KEY,
          JSON.stringify({
            events: response.events,
            nextOffset: response.events.length,
            hasMore: response.events.length === HOME_FEED_PAGE_LIMIT,
          }),
        );
      } catch {
        // Ignore storage failures and keep the landing usable.
      }
    })
    .finally(() => {
      inflightHomePrewarm = null;
    });

  return inflightHomePrewarm;
}

export default function HomeMarketingRoute() {
  onMount(() => {
    if (typeof window === "undefined") {
      return;
    }

    const schedule =
      "requestIdleCallback" in window
        ? window.requestIdleCallback.bind(window)
        : (callback: () => void) => window.setTimeout(callback, 120);

    schedule(() => {
      void prewarmHomeFeed();
    });
  });

  return (
    <div class="pm-page pm-marketing-page">
      <Title>Lattice | Correlation-aware prediction markets</Title>
      <main class="pm-marketing-page__main">
        <HomeLanding />
      </main>
    </div>
  );
}
