import { Title } from "@solidjs/meta";
import { For, Show, createSignal, onMount } from "solid-js";

import LocaleLink from "~/components/LocaleLink";
import Navbar from "~/components/Navbar";
import PublicState from "~/components/public-browser/PublicState.tsx";
import { useI18n } from "~/lib/i18n/context.tsx";
import {
  marketClient,
  type StackRoomCatalogResponse,
  type StackRoomSummaryResponse,
} from "~/lib/market/index.ts";

type RoomsPageStatus = "loading" | "ready" | "error";

function formatRoomMetricLabel(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function RoomCard(props: { room: StackRoomSummaryResponse }) {
  return (
    <article class={`pm-room-card pm-room-card--${props.room.accent}`}>
      <div class="pm-room-card__head">
        <div>
          <p class="pm-room-card__eyebrow">{props.room.activity_label}</p>
          <h2 class="pm-room-card__title">{props.room.title}</h2>
        </div>
        <span class="pm-room-card__accent-pill">{props.room.accent}</span>
      </div>

      <p class="pm-room-card__summary">{props.room.summary}</p>

      <dl class="pm-room-card__metrics">
        <div>
          <dt>Markets</dt>
          <dd>{props.room.matching_market_count}</dd>
        </div>
        <div>
          <dt>Recent stacks</dt>
          <dd>{props.room.recent_stack_count}</dd>
        </div>
        <div>
          <dt>Open</dt>
          <dd>{props.room.open_stack_count}</dd>
        </div>
        <div>
          <dt>Settled</dt>
          <dd>{props.room.settled_stack_count}</dd>
        </div>
      </dl>

      <div class="pm-room-card__footer">
        <div class="pm-room-card__tags">
          <span>{formatRoomMetricLabel(props.room.thesis_count, "thesis", "theses")}</span>
          <Show when={props.room.featured_composite_slug}>
            <span>Composite ready</span>
          </Show>
        </div>

        <LocaleLink class="pm-button pm-button--primary pm-room-card__cta" href={`/rooms/${props.room.slug}`}>
          Open room
        </LocaleLink>
      </div>
    </article>
  );
}

export default function RoomsIndexRoute() {
  const { t } = useI18n();
  const [status, setStatus] = createSignal<RoomsPageStatus>("loading");
  const [catalog, setCatalog] = createSignal<StackRoomCatalogResponse | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const loadRooms = async () => {
    setStatus("loading");
    setError(null);

    try {
      const response = await marketClient.fetchStackRooms();
      setCatalog(response);
      setStatus("ready");
    } catch (caughtError) {
      setCatalog(null);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load rooms.");
      setStatus("error");
    }
  };

  onMount(() => {
    void loadRooms();
  });

  return (
    <div class="pm-page">
      <Title>{`${t("rooms.title")} | Lattice`}</Title>
      <Navbar />

      <main class="pm-detail pm-rooms">
        <section class="pm-rooms__intro">
          <div>
            <p class="pm-rooms__eyebrow">{t("rooms.eyebrow")}</p>
            <h1 class="pm-rooms__title">{t("rooms.title")}</h1>
            <p class="pm-rooms__subtitle">{t("rooms.subtitle")}</p>
          </div>

          <Show when={catalog()}>
            {loaded => (
              <article class="pm-rooms__hero-card">
                <p class="pm-rooms__hero-kicker">{t("rooms.activity")}</p>
                <strong>{loaded().rooms.length} live rooms</strong>
                <span>{new Date(loaded().generated_at).toLocaleString("en-US")}</span>
              </article>
            )}
          </Show>
        </section>

        <Show when={status() === "loading"}>
          <PublicState title={t("rooms.loadingTitle")} copy={t("rooms.loadingCopy")} />
        </Show>

        <Show when={status() === "error"}>
          <PublicState
            title={t("rooms.unableTitle")}
            copy={error() ?? "The room catalog could not be loaded."}
            actionLabel={t("home.tryAgain")}
            onAction={() => void loadRooms()}
          />
        </Show>

        <Show when={status() === "ready" && catalog()}>
          {loaded => (
            <Show
              when={loaded().rooms.length > 0}
              fallback={<PublicState title={t("rooms.emptyTitle")} copy={t("rooms.emptyCopy")} />}
            >
              <section class="pm-rooms__grid">
                <For each={loaded().rooms}>{room => <RoomCard room={room} />}</For>
              </section>
            </Show>
          )}
        </Show>
      </main>
    </div>
  );
}
