import { For, Show } from "solid-js";
import LocaleLink from "~/components/LocaleLink.tsx";

export interface SummaryTileItem {
  id?: string;
  href?: string;
  kicker?: string;
  title: string;
  meta: string;
}

interface SummaryTileGridProps {
  items: readonly SummaryTileItem[];
}

function SummaryTile(props: SummaryTileItem) {
  return (
    <>
      <Show when={props.kicker}>
        <p class="pm-browser__summary-kicker">{props.kicker}</p>
      </Show>
      <h2 class="pm-browser__summary-title">{props.title}</h2>
      <p class="pm-browser__summary-meta">{props.meta}</p>
    </>
  );
}

export default function SummaryTileGrid(props: SummaryTileGridProps) {
  return (
    <div class="pm-browser__summary-grid">
      <For each={props.items}>
        {item => (
          <Show
            when={item.href}
            fallback={
              <article id={item.id} class="pm-browser__summary-card">
                <SummaryTile {...item} />
              </article>
            }
          >
            <LocaleLink id={item.id} href={item.href!} class="pm-browser__summary-card">
              <SummaryTile {...item} />
            </LocaleLink>
          </Show>
        )}
      </For>
    </div>
  );
}
