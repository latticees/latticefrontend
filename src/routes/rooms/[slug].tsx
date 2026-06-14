import { Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  type Accessor,
} from "solid-js";

import LocaleLink from "~/components/LocaleLink";
import Navbar from "~/components/Navbar";
import PublicState from "~/components/public-browser/PublicState.tsx";
import {
  AUTH_SESSION_CHANGE_EVENT,
  readStoredAuthSession,
  type StoredAuthSession,
} from "~/lib/auth/session.ts";
import { useI18n } from "~/lib/i18n/context.tsx";
import {
  ApiError,
  marketClient,
  type CreateStackRoomPostRequest,
  type StackRoomDetailResponse,
  type StackRoomFeedResponse,
  type StackRoomMarketResponse,
  type StackRoomPostResponse,
  type StackRoomPresenceUserResponse,
  type StackRoomRecentStackResponse,
  type StackRoomReactionCountResponse,
} from "~/lib/market/index.ts";

type RoomPageStatus = "loading" | "ready" | "error";
type FeedStatus = "idle" | "loading" | "ready" | "error";
type RoomPostKind = "note" | "thesis" | "alert" | "stack";
type ReactionKey = "insight" | "heat" | "copy";

const ROOM_POLL_INTERVAL_MS = 6_000;
const ROOM_PRESENCE_INTERVAL_MS = 18_000;
const ROOM_POST_MAX_BODY_LEN = 2_000;
const ROOM_KIND_OPTIONS: ReadonlyArray<{ value: RoomPostKind; label: string }> = [
  { value: "note", label: "Room note" },
  { value: "thesis", label: "Thesis" },
  { value: "alert", label: "Alert" },
  { value: "stack", label: "Stack" },
];
const ROOM_REACTIONS: ReadonlyArray<{ key: ReactionKey; label: string; glyph: string }> = [
  { key: "insight", label: "Insight", glyph: "◎" },
  { key: "heat", label: "Heat", glyph: "▲" },
  { key: "copy", label: "Copy", glyph: "↺" },
];

function normalizeRoomDetailResponse(
  response: StackRoomDetailResponse,
): StackRoomDetailResponse {
  return {
    ...response,
    theses: Array.isArray(response.theses) ? response.theses : [],
    featured_markets: Array.isArray(response.featured_markets) ? response.featured_markets : [],
    recent_stacks: Array.isArray(response.recent_stacks) ? response.recent_stacks : [],
  };
}

function normalizeRoomFeedResponse(
  response: StackRoomFeedResponse,
): StackRoomFeedResponse {
  return {
    ...response,
    active_users: Array.isArray(response.active_users) ? response.active_users : [],
    posts: Array.isArray(response.posts) ? response.posts : [],
  };
}

function formatUsdAmount(value: string): string {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsedValue);
}

function formatPercentFromBps(value: number | null): string {
  if (typeof value !== "number") {
    return "N/A";
  }

  return `${(value / 100).toFixed(1)}%`;
}

function formatRelativeDate(value: string): string {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return value;
  }

  const deltaMs = Date.now() - timestamp;
  const deltaMinutes = Math.max(Math.round(deltaMs / 60_000), 1);

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 48) {
    return `${deltaHours}h ago`;
  }

  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays}d ago`;
}

function formatVolumeShort(value: string): string {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return "$0";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(parsedValue);
}

function getAvatarLabel(user: StackRoomPresenceUserResponse): string {
  const displayName = user.display_name.trim();

  if (displayName.length > 0) {
    return displayName;
  }

  const username = user.username?.trim();
  if (username) {
    return username;
  }

  return "Trader";
}

function getAvatarInitials(user: StackRoomPresenceUserResponse): string {
  const tokens = getAvatarLabel(user)
    .split(/[\s._-]+/)
    .map(token => token.trim())
    .filter(Boolean);

  if (tokens.length >= 2) {
    return `${tokens[0]![0]}${tokens[1]![0]}`.toUpperCase();
  }

  return getAvatarLabel(user).slice(0, 2).toUpperCase();
}

function hashValue(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getAvatarStyle(user: StackRoomPresenceUserResponse): string {
  const hue = hashValue(user.user_id) % 360;
  return `background: hsla(${hue}, 78%, 94%, 1); color: hsl(${hue}, 48%, 26%);`;
}

function getKindLabel(kind: string): string {
  switch (kind) {
    case "thesis":
      return "Thesis";
    case "alert":
      return "Alert";
    case "stack":
      return "Stack";
    default:
      return "Note";
  }
}

function openAuthModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sabi:open-auth-modal"));
  }
}

function reactionCountFor(post: StackRoomPostResponse, reaction: ReactionKey): number {
  return (
    post.reaction_counts.find(entry => entry.reaction === reaction)?.count ??
    0
  );
}

function viewerHasReaction(post: StackRoomPostResponse, reaction: ReactionKey): boolean {
  return post.viewer_reactions.includes(reaction);
}

function getRoomErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function UserAvatar(props: { user: StackRoomPresenceUserResponse; compact?: boolean }) {
  return (
    <Show
      when={props.user.avatar_url}
      fallback={
        <div
          classList={{
            "pm-room-live__avatar": true,
            "pm-room-live__avatar--compact": props.compact === true,
            "pm-room-live__avatar--fallback": true,
          }}
          style={getAvatarStyle(props.user)}
          aria-hidden="true"
        >
          <span>{getAvatarInitials(props.user)}</span>
        </div>
      }
    >
      <img
        classList={{
          "pm-room-live__avatar": true,
          "pm-room-live__avatar--compact": props.compact === true,
        }}
        src={props.user.avatar_url!}
        alt=""
        loading="lazy"
        referrerpolicy="no-referrer"
      />
    </Show>
  );
}

function PresencePile(props: { users: StackRoomPresenceUserResponse[] }) {
  return (
    <div class="pm-room-live__presence-pile" aria-hidden="true">
      <For each={props.users.slice(0, 4)}>
        {user => (
          <div class="pm-room-live__presence-pile-item">
            <UserAvatar user={user} compact />
          </div>
        )}
      </For>
    </div>
  );
}

function FeaturedMarketCard(props: { market: StackRoomMarketResponse }) {
  return (
    <article class="pm-room-live__market-card">
      <div class="pm-room-live__market-head">
        <span class={`pm-room-live__market-status pm-room-live__market-status--${props.market.trading_status}`}>
          {props.market.trading_status}
        </span>
        <span>{props.market.event_title}</span>
      </div>
      <p class="pm-room-live__market-question">{props.market.question}</p>
      <div class="pm-room-live__market-prices">
        <Show when={props.market.primary_outcome_label}>
          <div class="pm-room-live__market-price">
            <span>{props.market.primary_outcome_label}</span>
            <strong>{formatPercentFromBps(props.market.primary_outcome_probability_bps)}</strong>
          </div>
        </Show>
        <Show when={props.market.secondary_outcome_label}>
          <div class="pm-room-live__market-price">
            <span>{props.market.secondary_outcome_label}</span>
            <strong>{formatPercentFromBps(props.market.secondary_outcome_probability_bps)}</strong>
          </div>
        </Show>
      </div>
      <div class="pm-room-live__market-meta">
        <span>{formatVolumeShort(props.market.volume)} vol</span>
        <LocaleLink href={`/event/${props.market.event_slug}/${props.market.market_slug}`}>
          Open
        </LocaleLink>
      </div>
    </article>
  );
}

function RecentStackCard(props: { stack: StackRoomRecentStackResponse }) {
  return (
    <article class="pm-room-live__mini-stack-card">
      <div class="pm-room-live__mini-stack-head">
        <div>
          <p class="pm-room-live__mini-stack-status">{props.stack.status}</p>
          <h3>{props.stack.headline}</h3>
        </div>
        <span class="pm-room-live__mini-stack-multiple">{props.stack.capital_multiple}</span>
      </div>
      <p class="pm-room-live__mini-stack-summary">{props.stack.summary}</p>
      <div class="pm-room-live__mini-stack-actions">
        <LocaleLink class="pm-button pm-button--ghost" href={`/bets/${props.stack.bet_code}`}>
          Open card
        </LocaleLink>
        <LocaleLink
          class="pm-button pm-button--secondary"
          href={`/?betCode=${encodeURIComponent(props.stack.bet_code)}`}
        >
          Load stack
        </LocaleLink>
      </div>
    </article>
  );
}

function ReactionButton(props: {
  reaction: ReactionKey;
  label: string;
  glyph: string;
  active: boolean;
  count: number;
  pending: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      classList={{
        "pm-room-live__reaction": true,
        "pm-room-live__reaction--active": props.active,
        "pm-room-live__reaction--pending": props.pending,
      }}
      onClick={props.onToggle}
      disabled={props.pending}
    >
      <span class="pm-room-live__reaction-glyph" aria-hidden="true">
        {props.glyph}
      </span>
      <span>{props.label}</span>
      <Show when={props.count > 0}>
        <strong>{props.count}</strong>
      </Show>
    </button>
  );
}

function RoomPostCard(props: {
  post: StackRoomPostResponse;
  reactionPending: Accessor<Record<string, true>>;
  onToggleReaction: (post: StackRoomPostResponse, reaction: ReactionKey) => void;
}) {
  const reactionPendingKey = (reaction: ReactionKey) => `${props.post.id}:${reaction}`;

  return (
    <article class={`pm-room-live__post pm-room-live__post--${props.post.kind}`}>
      <div class="pm-room-live__post-head">
        <div class="pm-room-live__post-author">
          <UserAvatar user={props.post.author} />
          <div>
            <div class="pm-room-live__post-author-line">
              <strong>{getAvatarLabel(props.post.author)}</strong>
              <Show when={props.post.author.username}>
                <span>@{props.post.author.username}</span>
              </Show>
            </div>
            <div class="pm-room-live__post-meta-line">
              <span class={`pm-room-live__post-kind pm-room-live__post-kind--${props.post.kind}`}>
                {getKindLabel(props.post.kind)}
              </span>
              <span>{formatRelativeDate(props.post.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      <p class="pm-room-live__post-body">{props.post.body}</p>

      <Show when={props.post.attached_bet}>
        {attachedBet => (
          <div class="pm-room-live__post-bet">
            <div class="pm-room-live__post-bet-copy">
              <p class="pm-room-live__post-bet-code">Bet code {attachedBet().bet_code}</p>
              <h3>{attachedBet().headline}</h3>
              <div class="pm-room-live__post-bet-metrics">
                <span>{formatUsdAmount(attachedBet().stake)} stake</span>
                <span>{formatUsdAmount(attachedBet().total_return)} return</span>
                <span>{attachedBet().capital_multiple}</span>
              </div>
            </div>
            <div class="pm-room-live__post-bet-actions">
              <LocaleLink class="pm-button pm-button--ghost" href={`/bets/${attachedBet().bet_code}`}>
                Open card
              </LocaleLink>
              <LocaleLink
                class="pm-button pm-button--secondary"
                href={`/?betCode=${encodeURIComponent(attachedBet().bet_code)}`}
              >
                Load stack
              </LocaleLink>
            </div>
          </div>
        )}
      </Show>

      <div class="pm-room-live__post-reactions">
        <For each={ROOM_REACTIONS}>
          {reaction => (
            <ReactionButton
              reaction={reaction.key}
              label={reaction.label}
              glyph={reaction.glyph}
              active={viewerHasReaction(props.post, reaction.key)}
              count={reactionCountFor(props.post, reaction.key)}
              pending={Boolean(props.reactionPending()[reactionPendingKey(reaction.key)])}
              onToggle={() => props.onToggleReaction(props.post, reaction.key)}
            />
          )}
        </For>
      </div>
    </article>
  );
}

export default function RoomDetailRoute() {
  const params = useParams<{ slug: string }>();
  const { t } = useI18n();
  const [roomStatus, setRoomStatus] = createSignal<RoomPageStatus>("loading");
  const [feedStatus, setFeedStatus] = createSignal<FeedStatus>("idle");
  const [roomDetail, setRoomDetail] = createSignal<StackRoomDetailResponse | null>(null);
  const [feed, setFeed] = createSignal<StackRoomFeedResponse | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [feedError, setFeedError] = createSignal<string | null>(null);
  const [session, setSession] = createSignal<StoredAuthSession | null>(readStoredAuthSession());
  const [draftBody, setDraftBody] = createSignal("");
  const [draftKind, setDraftKind] = createSignal<RoomPostKind>("note");
  const [draftBetCode, setDraftBetCode] = createSignal("");
  const [composerStatus, setComposerStatus] = createSignal<string | null>(null);
  const [composerError, setComposerError] = createSignal<string | null>(null);
  const [isSubmittingPost, setSubmittingPost] = createSignal(false);
  const [reactionPending, setReactionPending] = createSignal<Record<string, true>>({});

  const syncSession = () => {
    setSession(readStoredAuthSession());
  };

  if (typeof window !== "undefined") {
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, syncSession);
    window.addEventListener("focus", syncSession);

    onCleanup(() => {
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, syncSession);
      window.removeEventListener("focus", syncSession);
    });
  }

  const room = createMemo(() => roomDetail()?.room ?? null);
  const roomFeed = createMemo(() => feed()?.posts ?? []);
  const activeUsers = createMemo(() => feed()?.active_users ?? []);
  const roomAccent = createMemo(() => room()?.accent ?? "blue");
  const heroUpdatedAt = createMemo(() => {
    const generatedAt = feed()?.generated_at ?? roomDetail()?.generated_at;
    if (!generatedAt) {
      return "";
    }
    return new Date(generatedAt).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  });

  const loadRoom = async (roomSlug: string) => {
    setRoomStatus("loading");
    setError(null);

    try {
      const response = await marketClient.fetchStackRoom(roomSlug);
      setRoomDetail(normalizeRoomDetailResponse(response));
      setRoomStatus("ready");
    } catch (caughtError) {
      setRoomDetail(null);
      setError(getRoomErrorMessage(caughtError, "Unable to load room."));
      setRoomStatus("error");
    }
  };

  const loadFeed = async (roomSlug: string, silent = false) => {
    if (!silent) {
      setFeedStatus("loading");
    }
    setFeedError(null);

    try {
      const response = await marketClient.fetchStackRoomFeed(roomSlug, session()?.token);
      setFeed(normalizeRoomFeedResponse(response));
      setFeedStatus("ready");
    } catch (caughtError) {
      if (!silent) {
        setFeed(null);
      }
      setFeedStatus("error");
      setFeedError(getRoomErrorMessage(caughtError, "Unable to refresh the room feed."));
    }
  };

  const applyPresenceSnapshot = (
    activeUserCount: number,
    activeUsersSnapshot: StackRoomPresenceUserResponse[],
  ) => {
    setFeed(currentFeed => {
      if (!currentFeed) {
        return currentFeed;
      }

      return {
        ...currentFeed,
        active_user_count: activeUserCount,
        active_users: activeUsersSnapshot,
      };
    });
  };

  const applyCreatedPost = (post: StackRoomPostResponse) => {
    setFeed(currentFeed => {
      if (!currentFeed) {
        return {
          generated_at: new Date().toISOString(),
          room_slug: params.slug,
          active_user_count: 0,
          active_users: [],
          posts: [post],
        };
      }

      return {
        ...currentFeed,
        generated_at: new Date().toISOString(),
        posts: [post, ...(currentFeed.posts ?? []).filter(existingPost => existingPost.id !== post.id)],
      };
    });
  };

  const applyReactionUpdate = (
    postId: string,
    reaction: ReactionKey,
    active: boolean,
    counts: StackRoomReactionCountResponse[],
  ) => {
    setFeed(currentFeed => {
      if (!currentFeed) {
        return currentFeed;
      }

      return {
        ...currentFeed,
        posts: (currentFeed.posts ?? []).map(post => {
          if (post.id !== postId) {
            return post;
          }

          const nextViewerReactions = active
            ? Array.from(new Set([...post.viewer_reactions, reaction]))
            : post.viewer_reactions.filter(entry => entry !== reaction);

          return {
            ...post,
            reaction_counts: counts,
            viewer_reactions: nextViewerReactions,
          };
        }),
      };
    });
  };

  const ensureAuthenticated = (message: string): StoredAuthSession | null => {
    const activeSession = readStoredAuthSession();
    setSession(activeSession);

    if (!activeSession?.token) {
      setComposerStatus(null);
      setComposerError(message);
      openAuthModal();
      return null;
    }

    return activeSession;
  };

  const setReactionPendingState = (postId: string, reaction: ReactionKey, pending: boolean) => {
    const key = `${postId}:${reaction}`;
    setReactionPending(currentPending => {
      const nextPending = { ...currentPending };
      if (pending) {
        nextPending[key] = true;
      } else {
        delete nextPending[key];
      }
      return nextPending;
    });
  };

  const handleComposerSubmit = async () => {
    if (isSubmittingPost()) {
      return;
    }

    const activeSession = ensureAuthenticated("Sign in to post in this room.");
    if (!activeSession?.token) {
      return;
    }

    const body = draftBody().trim();
    if (body.length === 0) {
      setComposerStatus(null);
      setComposerError("Write a room post before publishing.");
      return;
    }

    setSubmittingPost(true);
    setComposerStatus(null);
    setComposerError(null);

    const payload: CreateStackRoomPostRequest = {
      kind: draftKind(),
      body,
      bet_code: draftBetCode().trim() || undefined,
    };

    try {
      const response = await marketClient.createStackRoomPost(activeSession.token, params.slug, payload);
      applyCreatedPost(response.post);
      setDraftBody("");
      setDraftBetCode("");
      setDraftKind("note");
      setComposerStatus("Posted to the room.");
      setComposerError(null);
      void loadFeed(params.slug, true);
    } catch (caughtError) {
      setComposerStatus(null);
      setComposerError(getRoomErrorMessage(caughtError, "Unable to publish this room post."));
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleReactionToggle = async (post: StackRoomPostResponse, reaction: ReactionKey) => {
    const activeSession = ensureAuthenticated("Sign in to react inside this room.");
    if (!activeSession?.token) {
      return;
    }

    const currentlyActive = viewerHasReaction(post, reaction);
    setReactionPendingState(post.id, reaction, true);

    try {
      const response = currentlyActive
        ? await marketClient.removeStackRoomReaction(activeSession.token, params.slug, post.id, reaction)
        : await marketClient.addStackRoomReaction(activeSession.token, params.slug, post.id, reaction);

      applyReactionUpdate(post.id, reaction, response.active, response.counts);
    } catch (caughtError) {
      setComposerStatus(null);
      setComposerError(getRoomErrorMessage(caughtError, "Unable to update room reaction."));
    } finally {
      setReactionPendingState(post.id, reaction, false);
    }
  };

  createEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const roomSlug = params.slug;

    setDraftBody("");
    setDraftBetCode("");
    setDraftKind("note");
    setComposerStatus(null);
    setComposerError(null);

    void loadRoom(roomSlug);
    void loadFeed(roomSlug);
  });

  createEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const roomSlug = params.slug;
    const pollId = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      void loadFeed(roomSlug, true);
    }, ROOM_POLL_INTERVAL_MS);

    onCleanup(() => {
      window.clearInterval(pollId);
    });
  });

  createEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const roomSlug = params.slug;
    const currentSession = session();

    if (!currentSession?.token) {
      return;
    }

    const sendHeartbeat = async () => {
      try {
        const response = await marketClient.heartbeatStackRoomPresence(currentSession.token, roomSlug);
        applyPresenceSnapshot(response.active_user_count, response.active_users);
      } catch {
        // Ignore presence heartbeat failures so the room stays readable.
      }
    };

    void sendHeartbeat();

    const heartbeatId = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      void sendHeartbeat();
    }, ROOM_PRESENCE_INTERVAL_MS);

    onCleanup(() => {
      window.clearInterval(heartbeatId);
    });
  });

  return (
    <div class="pm-page">
      <Title>{`${room()?.title ?? "Room"} | Lattice`}</Title>
      <Navbar />

      <main class="pm-detail pm-room-live">
        <Show when={roomStatus() === "loading"}>
          <PublicState title={t("rooms.loadingTitle")} copy={t("rooms.loadingCopy")} />
        </Show>

        <Show when={roomStatus() === "error"}>
          <PublicState
            title={t("rooms.unableTitle")}
            copy={error() ?? "The room could not be loaded."}
            actionLabel={t("home.tryAgain")}
            onAction={() => void loadRoom(params.slug)}
          />
        </Show>

        <Show when={roomStatus() === "ready" ? roomDetail() : null}>
          {loaded => (
            <>
              <section class={`pm-room-live__hero pm-room-live__hero--${roomAccent()}`}>
                <div class="pm-room-live__hero-copy">
                  <LocaleLink class="pm-room-live__breadcrumb" href="/rooms">
                    {t("rooms.title")}
                  </LocaleLink>
                  <p class="pm-room-live__eyebrow">{loaded().room.activity_label}</p>
                  <h1 class="pm-room-live__title">{loaded().room.title}</h1>
                  <p class="pm-room-live__subtitle">{loaded().room.summary}</p>

                  <div class="pm-room-live__hero-actions">
                    <LocaleLink class="pm-button pm-button--primary" href="/?stackBuilder=ai">
                      Open AI builder
                    </LocaleLink>
                    <Show when={loaded().recent_stacks[0]}>
                      <LocaleLink
                        class="pm-button pm-button--ghost"
                        href={`/?betCode=${encodeURIComponent(loaded().recent_stacks[0]!.bet_code)}`}
                      >
                        Load latest stack
                      </LocaleLink>
                    </Show>
                  </div>
                </div>

                <div class="pm-room-live__hero-panel">
                  <div class="pm-room-live__hero-metrics">
                    <div>
                      <span>Live now</span>
                      <strong>{feed()?.active_user_count ?? 0}</strong>
                    </div>
                    <div>
                      <span>Markets</span>
                      <strong>{loaded().room.matching_market_count}</strong>
                    </div>
                    <div>
                      <span>Recent stacks</span>
                      <strong>{loaded().room.recent_stack_count}</strong>
                    </div>
                    <div>
                      <span>Open exposure</span>
                      <strong>{loaded().room.open_stack_count}</strong>
                    </div>
                  </div>

                  <div class="pm-room-live__hero-presence">
                    <PresencePile users={activeUsers()} />
                    <div>
                      <strong>{feed()?.active_user_count ?? 0} traders active</strong>
                      <span>Feed refreshes every few seconds. Last update {heroUpdatedAt()}.</span>
                    </div>
                  </div>
                </div>
              </section>

              <section class="pm-room-live__layout">
                <aside class="pm-room-live__rail pm-room-live__rail--left">
                  <article class="pm-room-live__panel pm-room-live__panel--signal">
                    <div class="pm-room-live__panel-head">
                      <h2>Room brief</h2>
                      <span>{loaded().theses.length} live angles</span>
                    </div>
                    <p class="pm-room-live__signal-copy">
                      Use this room to post the thesis, share the bet code, and let other traders load the exact stack back into the builder.
                    </p>
                    <div class="pm-room-live__signal-prompt">{loaded().room.prompt}</div>
                  </article>

                  <article class="pm-room-live__panel">
                    <div class="pm-room-live__panel-head">
                      <h2>Pinned theses</h2>
                      <span>{loaded().theses.length}</span>
                    </div>
                    <div class="pm-room-live__thesis-list">
                      <For each={loaded().theses}>
                        {thesis => (
                          <article class={`pm-room-live__thesis pm-room-live__thesis--${thesis.tone}`}>
                            <span class="pm-room-live__thesis-tone">{thesis.tone}</span>
                            <h3>{thesis.title}</h3>
                            <p>{thesis.body}</p>
                          </article>
                        )}
                      </For>
                    </div>
                  </article>

                  <Show when={loaded().featured_composite}>
                    {composite => (
                      <article class="pm-room-live__panel">
                        <div class="pm-room-live__panel-head">
                          <h2>Featured composite</h2>
                          <span>{composite().risk_label}</span>
                        </div>
                        <h3 class="pm-room-live__composite-title">{composite().title}</h3>
                        <p class="pm-room-live__composite-copy">{composite().summary}</p>
                        <div class="pm-room-live__signal-prompt">{composite().prompt}</div>
                      </article>
                    )}
                  </Show>
                </aside>

                <section class="pm-room-live__stream">
                  <article class="pm-room-live__composer">
                    <div class="pm-room-live__composer-head">
                      <div>
                        <p class="pm-room-live__composer-kicker">Live room composer</p>
                        <h2>Post the thesis, attach the stack</h2>
                      </div>
                      <Show
                        when={session()?.user}
                        fallback={<button class="pm-button pm-button--secondary" type="button" onClick={openAuthModal}>Sign in to post</button>}
                      >
                        <div class="pm-room-live__composer-user">
                          <UserAvatar
                            user={{
                              user_id: session()!.user.id,
                              display_name: session()!.user.display_name ?? session()!.user.email ?? "Account",
                              username: session()!.user.username,
                              avatar_url: session()!.user.avatar_url,
                            }}
                            compact
                          />
                          <span>{session()!.user.display_name ?? session()!.user.username ?? "Signed in"}</span>
                        </div>
                      </Show>
                    </div>

                    <div class="pm-room-live__composer-kinds" role="tablist" aria-label="Post type">
                      <For each={ROOM_KIND_OPTIONS}>
                        {option => (
                          <button
                            type="button"
                            classList={{
                              "pm-room-live__kind-chip": true,
                              "pm-room-live__kind-chip--active": draftKind() === option.value,
                            }}
                            onClick={() => setDraftKind(option.value)}
                          >
                            {option.label}
                          </button>
                        )}
                      </For>
                    </div>

                    <textarea
                      class="pm-room-live__composer-textarea"
                      value={draftBody()}
                      onInput={event => {
                        setDraftBody(event.currentTarget.value.slice(0, ROOM_POST_MAX_BODY_LEN));
                        setComposerStatus(null);
                        setComposerError(null);
                      }}
                      rows={5}
                      placeholder="Write the thesis, what changed, or why this stack matters right now."
                    />

                    <div class="pm-room-live__composer-footer">
                      <label class="pm-room-live__composer-bet-field">
                        <span>Optional bet code</span>
                        <input
                          class="pm-room-live__composer-input"
                          value={draftBetCode()}
                          onInput={event => setDraftBetCode(event.currentTarget.value.toUpperCase())}
                          placeholder="Attach a booked stack"
                        />
                      </label>

                      <div class="pm-room-live__composer-actions">
                        <span class="pm-room-live__composer-counter">
                          {draftBody().length} / {ROOM_POST_MAX_BODY_LEN}
                        </span>
                        <button
                          type="button"
                          class="pm-button pm-button--primary"
                          disabled={isSubmittingPost()}
                          onClick={() => void handleComposerSubmit()}
                        >
                          {isSubmittingPost() ? "Posting..." : "Publish to room"}
                        </button>
                      </div>
                    </div>

                    <Show when={composerStatus()}>
                      <p class="pm-room-live__composer-status pm-room-live__composer-status--success">
                        {composerStatus()}
                      </p>
                    </Show>
                    <Show when={composerError()}>
                      <p class="pm-room-live__composer-status pm-room-live__composer-status--error">
                        {composerError()}
                      </p>
                    </Show>
                  </article>

                  <section class="pm-room-live__feed-panel">
                    <div class="pm-room-live__panel-head">
                      <div>
                        <h2>Live room feed</h2>
                        <span class="pm-room-live__panel-subcopy">
                          Thesis posts, attached stacks, and quick reactions in one stream.
                        </span>
                      </div>
                      <button class="pm-button pm-button--ghost" type="button" onClick={() => void loadFeed(params.slug)}>
                        Refresh
                      </button>
                    </div>

                    <Show when={feedError()}>
                      <div class="pm-room-live__feed-banner pm-room-live__feed-banner--error">{feedError()}</div>
                    </Show>
                    <Show when={feedStatus() === "loading" && roomFeed().length === 0}>
                      <div class="pm-room-live__feed-banner">Loading the live room stream…</div>
                    </Show>

                    <Show
                      when={roomFeed().length > 0}
                      fallback={
                        <div class="pm-room-live__feed-empty">
                          <strong>This room is waiting for its first post.</strong>
                          <p>Drop the thesis, attach a bet code, and make this room worth watching.</p>
                        </div>
                      }
                    >
                      <div class="pm-room-live__feed-list">
                        <For each={roomFeed()}>
                          {post => (
                            <RoomPostCard
                              post={post}
                              reactionPending={reactionPending}
                              onToggleReaction={(currentPost, reaction) =>
                                void handleReactionToggle(currentPost, reaction)
                              }
                            />
                          )}
                        </For>
                      </div>
                    </Show>
                  </section>
                </section>

                <aside class="pm-room-live__rail pm-room-live__rail--right">
                  <article class="pm-room-live__panel">
                    <div class="pm-room-live__panel-head">
                      <h2>Active now</h2>
                      <span>{feed()?.active_user_count ?? 0} traders</span>
                    </div>
                    <Show
                      when={activeUsers().length > 0}
                      fallback={<p class="pm-room-live__empty-copy">Sign in and open the room to appear in the live presence list.</p>}
                    >
                      <div class="pm-room-live__presence-list">
                        <For each={activeUsers()}>
                          {user => (
                            <div class="pm-room-live__presence-row">
                              <UserAvatar user={user} compact />
                              <div>
                                <strong>{getAvatarLabel(user)}</strong>
                                <Show when={user.username}>
                                  <span>@{user.username}</span>
                                </Show>
                              </div>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </article>

                  <article class="pm-room-live__panel">
                    <div class="pm-room-live__panel-head">
                      <h2>Market pulse</h2>
                      <span>{loaded().featured_markets.length} live</span>
                    </div>
                    <div class="pm-room-live__market-list">
                      <For each={loaded().featured_markets}>
                        {market => <FeaturedMarketCard market={market} />}
                      </For>
                    </div>
                  </article>

                  <article class="pm-room-live__panel">
                    <div class="pm-room-live__panel-head">
                      <h2>Recent stack receipts</h2>
                      <span>{loaded().recent_stacks.length}</span>
                    </div>
                    <div class="pm-room-live__mini-stack-list">
                      <For each={loaded().recent_stacks}>
                        {stack => <RecentStackCard stack={stack} />}
                      </For>
                    </div>
                  </article>
                </aside>
              </section>
            </>
          )}
        </Show>
      </main>
    </div>
  );
}
