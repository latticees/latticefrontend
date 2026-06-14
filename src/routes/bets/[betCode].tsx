import { createAsync, useParams } from "@solidjs/router";
import copy from "copy-to-clipboard";
import { Meta, Title } from "@solidjs/meta";
import { For, Show, createMemo, createSignal } from "solid-js";
import { getRequestEvent } from "solid-js/web";

import LocaleLink from "~/components/LocaleLink.tsx";
import Navbar from "~/components/Navbar";
import PublicState from "~/components/public-browser/PublicState.tsx";
import { formatUsdcBaseUnits } from "~/lib/faucet/index.ts";
import { marketClient } from "~/lib/market/index.ts";
import {
  buildStackShareDescription,
  buildStackShareSnapshot,
  buildStackShareSummary,
  formatBetCodeDisplay,
  formatStackStatus,
} from "~/lib/share/stack-share.ts";

function formatPositionDate(value: string): string {
  const parsedValue = Date.parse(value);

  if (Number.isNaN(parsedValue)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(parsedValue));
}

function resolveAbsoluteUrl(pathname: string): string {
  if (typeof window !== "undefined") {
    return new URL(pathname, window.location.origin).toString();
  }

  const event = getRequestEvent();
  return event ? new URL(pathname, event.request.url).toString() : pathname;
}

export default function StackBetShareRoute() {
  const params = useParams<{ betCode: string }>();
  const [feedback, setFeedback] = createSignal<string | null>(null);
  const stackBetResult = createAsync(async () => {
    try {
      const bet = await marketClient.fetchStackBet(params.betCode);
      return { bet, error: null as string | null };
    } catch (caughtError) {
      return {
        bet: null,
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load this shared stack.",
      };
    }
  });
  const stackBet = createMemo(() => stackBetResult()?.bet ?? null);
  const error = createMemo(() => stackBetResult()?.error ?? null);

  const shareUrl = createMemo(() => {
    const code = params.betCode?.trim();
    return code ? resolveAbsoluteUrl(`/bets/${encodeURIComponent(code)}`) : "";
  });

  const copyBetCode = () => {
    const value = stackBet()?.bet_code?.trim() ?? "";

    if (!value) {
      return;
    }

    copy(value);
    setFeedback("Bet code copied.");
  };

  const copyShareLink = () => {
    const value = shareUrl();

    if (!value) {
      return;
    }

    copy(value);
    setFeedback("Share link copied.");
  };

  const loadStackHref = createMemo(() => {
    const code = stackBet()?.bet_code?.trim();
    return code ? `/?betCode=${encodeURIComponent(code)}` : "/";
  });
  const shareSnapshot = createMemo(() => {
    const bet = stackBet();
    return bet ? buildStackShareSnapshot(bet) : null;
  });
  const shareSummary = createMemo(() => {
    const snapshot = shareSnapshot();
    return snapshot ? buildStackShareSummary(snapshot) : "Open this Lattice structured stack.";
  });
  const shareDescription = createMemo(() => {
    const snapshot = shareSnapshot();

    if (!snapshot) {
      return "Open this Lattice structured stack.";
    }

    return buildStackShareDescription(snapshot);
  });
  const shareImageUrl = createMemo(() => {
    const code = stackBet()?.bet_code?.trim() ?? params.betCode?.trim();
    return code ? resolveAbsoluteUrl(`/api/share/bets/${encodeURIComponent(code)}`) : "";
  });
  const shareTargets = createMemo(() => {
    const url = shareUrl();
    const snapshot = shareSnapshot();

    if (!snapshot || url.length === 0) {
      return [];
    }

    const text = buildStackShareSummary(snapshot);
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);

    return [
      {
        label: "Post on X",
        href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      },
      {
        label: "WhatsApp",
        href: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
      },
      {
        label: "Telegram",
        href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      },
    ] as const;
  });

  return (
    <div class="pm-page">
      <Title>
        {stackBet() ? `${formatBetCodeDisplay(stackBet()!.bet_code)} | Lattice` : "Stack | Lattice"}
      </Title>
      <Meta property="og:type" content="website" />
      <Meta property="og:title" content={shareSummary()} />
      <Meta property="og:description" content={shareDescription()} />
      <Meta property="og:url" content={shareUrl()} />
      <Meta property="og:image" content={shareImageUrl()} />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta name="twitter:title" content={shareSummary()} />
      <Meta name="twitter:description" content={shareDescription()} />
      <Meta name="twitter:image" content={shareImageUrl()} />
      <Navbar />

      <main class="pm-detail pm-stack-card-page">
        <Show when={stackBetResult() === undefined}>
          <PublicState title="Loading stack card" copy="Fetching the shared stack receipt." />
        </Show>

        <Show when={stackBetResult() !== undefined && !stackBet() && error()}>
          <PublicState
            title="Unable to load this stack"
            copy={error() ?? "The shared stack could not be found."}
            actionLabel="Try again"
            onAction={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              }
            }}
          />
        </Show>

        <Show when={stackBet()}>
          {bet => (
            <>
              <section class="pm-stack-card-page__hero">
                <div class="pm-stack-card-page__hero-copy">
                  <p class="pm-stack-card-page__eyebrow">Shared stack</p>
                  <h1 class="pm-stack-card-page__title">Copy this structured position</h1>
                  <p class="pm-stack-card-page__subtitle">
                    Open the exact same legs in the builder, reuse the bet code, or send this
                    stack card around directly.
                  </p>
                </div>

                <article class="pm-stack-card-page__summary-card">
                  <div class="pm-stack-card-page__summary-top">
                    <span class="pm-stack-card-page__status">{formatStackStatus(bet().status)}</span>
                    <span class="pm-stack-card-page__code">
                      {formatBetCodeDisplay(bet().bet_code)}
                    </span>
                  </div>

                  <div class="pm-stack-card-page__summary-grid">
                    <div>
                      <p>Stake</p>
                      <strong>{formatUsdcBaseUnits(bet().stake)}</strong>
                    </div>
                    <div>
                      <p>Total return</p>
                      <strong>{formatUsdcBaseUnits(bet().total_return)}</strong>
                    </div>
                    <div>
                      <p>Potential profit</p>
                      <strong>{formatUsdcBaseUnits(bet().potential_profit)}</strong>
                    </div>
                    <div>
                      <p>Multiplier</p>
                      <strong>{bet().capital_multiple}</strong>
                    </div>
                  </div>

                  <div class="pm-stack-card-page__actions">
                    <button
                      type="button"
                      class="pm-button pm-button--primary"
                      onClick={copyBetCode}
                    >
                      Copy bet code
                    </button>
                    <button
                      type="button"
                      class="pm-button pm-button--ghost"
                      onClick={copyShareLink}
                    >
                      Copy share link
                    </button>
                    <LocaleLink class="pm-button pm-button--ghost" href={loadStackHref()}>
                      Load this stack
                    </LocaleLink>
                  </div>

                  <Show when={feedback()}>
                    <p class="pm-stack-card-page__feedback">{feedback()}</p>
                  </Show>
                </article>
              </section>

              <section class="pm-stack-card-page__body">
                <article class="pm-stack-card-page__card">
                  <div class="pm-stack-card-page__section-head">
                    <h2>Legs</h2>
                    <span>
                      {bet().leg_count} {bet().leg_count === 1 ? "leg" : "legs"}
                    </span>
                  </div>

                  <div class="pm-stack-card-page__legs">
                    <For each={bet().legs}>
                      {leg => (
                        <div class="pm-stack-card-page__leg">
                          <div>
                            <p class="pm-stack-card-page__leg-question">{leg.question}</p>
                            <p class="pm-stack-card-page__leg-meta">
                              {leg.outcome_label}
                              <Show when={leg.probability_display}>
                                {probability => <> · {probability()}</>}
                              </Show>
                            </p>
                          </div>
                          <span class="pm-stack-card-page__leg-chip">{leg.outcome_label}</span>
                        </div>
                      )}
                    </For>
                  </div>
                </article>

                <article class="pm-stack-card-page__card">
                  <div class="pm-stack-card-page__section-head">
                    <h2>Share card</h2>
                    <span>Public link</span>
                  </div>

                  <div class="pm-stack-card-page__share-card">
                    <div class="pm-stack-card-page__share-banner">
                      <span class="pm-stack-card-page__share-kicker">Structured stack</span>
                      <strong>{bet().capital_multiple}</strong>
                    </div>
                    <p class="pm-stack-card-page__share-summary">{shareSummary()}</p>
                    <div class="pm-stack-card-page__share-leg-list">
                      <For each={bet().legs.slice(0, 3)}>
                        {leg => (
                          <div class="pm-stack-card-page__share-leg-item">
                            <span class="pm-stack-card-page__share-leg-outcome">{leg.outcome_label}</span>
                            <span>{leg.question}</span>
                          </div>
                        )}
                      </For>
                    </div>
                    <div class="pm-stack-card-page__share-actions">
                      <For each={shareTargets()}>
                        {target => (
                          <a
                            class="pm-button pm-button--ghost"
                            href={target.href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {target.label}
                          </a>
                        )}
                      </For>
                    </div>
                  </div>
                </article>

                <article class="pm-stack-card-page__card">
                  <div class="pm-stack-card-page__section-head">
                    <h2>Receipt</h2>
                    <span>On-chain</span>
                  </div>

                  <dl class="pm-stack-card-page__receipt-grid">
                    <div>
                      <dt>Opened</dt>
                      <dd>{formatPositionDate(bet().opened_at)}</dd>
                    </div>
                    <div>
                      <dt>Settled</dt>
                      <dd>{bet().settled_at ? formatPositionDate(bet().settled_at!) : "Live"}</dd>
                    </div>
                    <div>
                      <dt>Position ID</dt>
                      <dd>{bet().position_id}</dd>
                    </div>
                    <div>
                      <dt>Quote ID</dt>
                      <dd>{bet().quote_id ?? "—"}</dd>
                    </div>
                  </dl>
                </article>
              </section>
            </>
          )}
        </Show>
      </main>
    </div>
  );
}
