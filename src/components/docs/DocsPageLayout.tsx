import { For, Show, createSignal, onCleanup, onMount } from "solid-js";

import LocaleLink from "~/components/LocaleLink.tsx";
import type { DocsBlock, DocsPage } from "~/lib/docs/content.ts";
import { DOCS_GROUPS, DOCS_PAGES, getDocsIndex } from "~/lib/docs/content.ts";
import { useI18n } from "~/lib/i18n/context.tsx";

function renderBlock(block: DocsBlock) {
  switch (block.type) {
    case "paragraphs":
      return (
        <div class="pm-docs__prose">
          <For each={block.values}>{value => <p>{value}</p>}</For>
        </div>
      );
    case "callout":
      return <div class="pm-docs__callout">{block.value}</div>;
    case "bullets":
      return (
        <ul class="pm-docs__bullet-list">
          <For each={block.values}>{value => <li>{value}</li>}</For>
        </ul>
      );
    case "ordered":
      return (
        <ol class="pm-docs__ordered-list">
          <For each={block.values}>{value => <li>{value}</li>}</For>
        </ol>
      );
    case "cards":
      return (
        <div
          class="pm-docs__card-grid"
          classList={{
            "pm-docs__card-grid--two": (block.columns ?? 3) === 2,
            "pm-docs__card-grid--three": (block.columns ?? 3) === 3,
          }}
        >
          <For each={block.values}>
            {card => (
              <article class="pm-docs__content-card">
                <Show when={card.badge}>
                  {badge => <span class="pm-docs__product-badge">{badge()}</span>}
                </Show>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            )}
          </For>
        </div>
      );
    case "table":
      return (
        <div class="pm-docs__table-wrap">
          <table class="pm-docs__table">
            <thead>
              <tr>
                <For each={block.value.columns}>{column => <th>{column}</th>}</For>
              </tr>
            </thead>
            <tbody>
              <For each={block.value.rows}>
                {row => (
                  <tr>
                    <For each={row}>{cell => <td innerHTML={cell} />}</For>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      );
    case "code":
      return (
        <pre class="pm-docs__code-block">
          <code>{block.value}</code>
        </pre>
      );
  }
}

export default function DocsPageLayout(props: { page: DocsPage }) {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = createSignal(props.page.sections[0]?.id ?? "overview");
  const pageIndex = () => getDocsIndex(props.page.slug);
  const previousPage = () => (pageIndex() > 0 ? DOCS_PAGES[pageIndex() - 1] : null);
  const nextPage = () =>
    pageIndex() >= 0 && pageIndex() < DOCS_PAGES.length - 1 ? DOCS_PAGES[pageIndex() + 1] : null;

  onMount(() => {
    const sections = props.page.sections
      .map(section => document.getElementById(section.id))
      .filter((section): section is HTMLElement => section instanceof HTMLElement);

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visible?.target instanceof HTMLElement) {
          setActiveSection(visible.target.id);
        }
      },
      {
        rootMargin: "-18% 0px -62% 0px",
        threshold: [0.2, 0.45, 0.72],
      },
    );

    sections.forEach(section => observer.observe(section));
    onCleanup(() => observer.disconnect());
  });

  return (
    <main class="pm-docs">
      <aside class="pm-docs__sidebar">
        <div class="pm-docs__sidebar-card">
          <p class="pm-docs__sidebar-brand">Sabimarket Docs</p>
          <For each={DOCS_GROUPS}>
            {group => (
              <section class="pm-docs__sidebar-group">
                <p class="pm-docs__sidebar-title">{group.title}</p>
                <div class="pm-docs__sidebar-links">
                  <For each={group.pages}>
                    {item => (
                      <LocaleLink
                        class="pm-docs__sidebar-link"
                        classList={{ "pm-docs__sidebar-link--active": props.page.slug === item.slug }}
                        href={`/docs/${item.slug}`}
                      >
                        {item.label}
                      </LocaleLink>
                    )}
                  </For>
                </div>
              </section>
            )}
          </For>
        </div>
      </aside>

      <article class="pm-docs__content">
        <header class="pm-docs__hero">
          <div class="pm-docs__hero-copy">
            <p class="pm-docs__eyebrow">{props.page.eyebrow}</p>
            <h1 class="pm-docs__title">{props.page.title}</h1>
            <p class="pm-docs__summary">{props.page.summary}</p>
          </div>
        </header>

        <For each={props.page.sections}>
          {section => (
            <section class="pm-docs__section" id={section.id}>
              <h2 class="pm-docs__section-heading">{section.title}</h2>
              <For each={section.blocks}>{block => renderBlock(block)}</For>
            </section>
          )}
        </For>

        <nav class="pm-docs__pager" aria-label="Docs page navigation">
          <Show when={previousPage()}>
            {page => (
              <LocaleLink class="pm-docs__pager-link" href={`/docs/${page().slug}`}>
                <span class="pm-docs__pager-label">Previous</span>
                <strong>{page().label}</strong>
              </LocaleLink>
            )}
          </Show>
          <Show when={nextPage()}>
            {page => (
              <LocaleLink class="pm-docs__pager-link pm-docs__pager-link--next" href={`/docs/${page().slug}`}>
                <span class="pm-docs__pager-label">Next</span>
                <strong>{page().label}</strong>
              </LocaleLink>
            )}
          </Show>
        </nav>
      </article>

      <aside class="pm-docs__outline">
        <div class="pm-docs__outline-card">
          <p class="pm-docs__outline-title">On this page</p>
          <div class="pm-docs__outline-links">
            <For each={props.page.sections}>
              {section => (
                <a
                  class="pm-docs__outline-link"
                  classList={{ "pm-docs__outline-link--active": activeSection() === section.id }}
                  href={`#${section.id}`}
                >
                  {section.title}
                </a>
              )}
            </For>
          </div>

          <div class="pm-docs__outline-footer">
            <LocaleLink class="pm-docs__outline-footer-link" href="/leaderboard">
              {t("nav.leaderboard")}
            </LocaleLink>
            <LocaleLink class="pm-docs__outline-footer-link" href="/earn">
              {t("nav.earn")}
            </LocaleLink>
          </div>
        </div>
      </aside>
    </main>
  );
}
