import { Title } from "@solidjs/meta";
import { createMemo, createSignal, onMount, Show } from "solid-js";

import Navbar from "~/components/Navbar";
import { marketClient, type CategorySummaryResponse } from "~/lib/market/index.ts";
import SummaryTileGrid from "./SummaryTileGrid.tsx";

type ScreenStatus = "loading" | "ready" | "error";

function buildCategoryHref(slug: string): string {
  return `/categories/${encodeURIComponent(slug)}`;
}

export default function CategoryDirectoryScreen() {
  const [status, setStatus] = createSignal<ScreenStatus>("loading");
  const [error, setError] = createSignal<string | null>(null);
  const [categories, setCategories] = createSignal<CategorySummaryResponse[]>([]);

  const tiles = createMemo(() =>
    [...categories()]
      .sort((left, right) => {
        if (left.market_count !== right.market_count) {
          return right.market_count - left.market_count;
        }

        return left.label.localeCompare(right.label);
      })
      .map(category => ({
        href: buildCategoryHref(category.slug),
        kicker: `${category.market_count} markets`,
        title: category.label,
        meta: `${category.event_count} events · ${category.featured_event_count} featured · ${category.breaking_event_count} breaking`,
      })),
  );

  const loadCategories = async () => {
    setStatus("loading");
    setError(null);

    try {
      const response = await marketClient.listCategories();
      setCategories(response.categories);
      setStatus("ready");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load categories.");
      setStatus("error");
    }
  };

  onMount(() => {
    void loadCategories();
  });

  return (
    <div class="pm-page">
      <Title>Categories</Title>
      <Navbar />

      <main>
        <Show
          when={status() === "ready"}
          fallback={
            <section class="pm-home__state">
              <h1 class="pm-home__state-title">
                {status() === "loading" ? "Loading categories" : "Unable to load categories"}
              </h1>
              <p class="pm-home__state-copy">
                {status() === "loading"
                  ? "Fetching the category summaries."
                  : error() ?? "Please try again."}
              </p>
              <Show when={status() === "error"}>
                <button
                  type="button"
                  class="pm-button pm-button--primary"
                  onClick={() => {
                    void loadCategories();
                  }}
                >
                  Retry
                </button>
              </Show>
            </section>
          }
        >
          <section class="pm-home__section">
            <div class="pm-home__section-head">
              <div>
                <p class="pm-home__section-kicker">Directory</p>
                <h2 class="pm-home__section-title">All categories</h2>
              </div>
            </div>
            <SummaryTileGrid items={tiles()} />
          </section>
        </Show>
      </main>
    </div>
  );
}
