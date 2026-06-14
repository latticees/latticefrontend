import { useLocation, useNavigate } from "@solidjs/router";
import {
  For,
  Show,
  createMemo,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";

import { authClient } from "../lib/auth/auth.ts";
import {
  clearStoredAuthSession,
  getUserDisplayLabel,
  readStoredAuthSession,
  writeStoredAuthSession,
} from "../lib/auth/session.ts";
import type { AuthResponse, UserResponse } from "../lib/auth/types.ts";
import { faucetClient, formatUsdcBaseUnits } from "../lib/faucet/index.ts";
import {
  buildMarketFeedHref,
  formatSlugLabel,
  getMarketDisplayLabel,
  isMarketFeedTargetActive,
  MARKET_FEATURED_TAB_TARGETS,
  MARKET_TOPIC_TAB_DEFINITIONS,
  marketClient,
  resolveMarketTopicTabTarget,
  type CategorySummaryResponse,
  type MarketFeedTarget,
  type PublicMarketCardResponse,
  type TagSummaryResponse,
} from "../lib/market/index.ts";
import { orderClient } from "../lib/order/index.ts";
import { clearStoredWalletPreference } from "../lib/wallet.ts";
import AuthModal, { type AuthModalRoute } from "./AuthModal";
import BetCodeModal from "./BetCodeModal";
import DepositModal from "./DepositModal";
import LocaleLink from "./LocaleLink";
import {
  NAVBAR_BALANCE_REFRESH_EVENT,
  OPEN_AUTH_MODAL_EVENT,
  OPEN_ONBOARDING_MODAL_EVENT,
} from "~/lib/ui-events.ts";
import {
  getLanguageFlagAsset,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "~/lib/i18n/config.ts";
import { useI18n } from "~/lib/i18n/context.tsx";
import type { TranslationKey } from "~/lib/i18n/messages.ts";
import {
  STACK_BET_CODE_QUERY_PARAM,
  STACK_BUILDER_QUERY_PARAM,
  STACK_OPEN_BUILDER_EVENT,
  STACK_OPEN_BET_CODE_EVENT,
  type StackBuilderMode,
  normalizeStackBetCode,
} from "./stack/bet-code.ts";
const EVENT_PRIMARY_MARKET_STORAGE_PREFIX = "pm-event-primary-market/v1:";
const DARK_MODE_STORAGE_KEY = "pm-navbar-dark-mode-toggle";
const OPEN_DEPOSIT_MODAL_EVENT = "sabi:open-deposit-modal";
const SEARCH_RESULT_LIMIT = 6;
const SEARCH_DEBOUNCE_MS = 200;
const MIN_SEARCH_LENGTH = 2;

function applyDocumentTheme(enabled: boolean) {
  if (typeof document === "undefined") {
    return;
  }

  const theme = enabled ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function readInitialDarkModePreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const storedValue = window.localStorage.getItem(DARK_MODE_STORAGE_KEY);

    if (storedValue === "1") {
      return true;
    }

    if (storedValue === "0") {
      return false;
    }
  } catch {
    // Ignore storage failures and fall back to the system preference.
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

interface BrowseTabMetadata {
  categories: CategorySummaryResponse[];
  tags: TagSummaryResponse[];
}

let cachedBrowseTabMetadata: BrowseTabMetadata | null = null;
let inflightBrowseTabMetadata: Promise<BrowseTabMetadata> | null = null;

async function loadBrowseTabMetadata(): Promise<BrowseTabMetadata> {
  if (cachedBrowseTabMetadata) {
    return cachedBrowseTabMetadata;
  }

  if (inflightBrowseTabMetadata) {
    return inflightBrowseTabMetadata;
  }

  inflightBrowseTabMetadata = Promise.allSettled([
    marketClient.listCategories(),
    marketClient.listTags(),
  ])
    .then(([categoriesResult, tagsResult]) => {
      const nextMetadata: BrowseTabMetadata = {
        categories:
          categoriesResult.status === "fulfilled" ? categoriesResult.value.categories : [],
        tags: tagsResult.status === "fulfilled" ? tagsResult.value.tags : [],
      };

      cachedBrowseTabMetadata = nextMetadata;
      return nextMetadata;
    })
    .finally(() => {
      inflightBrowseTabMetadata = null;
    });

  return inflightBrowseTabMetadata;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M15.75 15.75L11.6386 11.6386"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
      <path
        d="M7.75 13.25C10.7875 13.25 13.25 10.7875 13.25 7.75C13.25 4.7125 10.7875 2.25 7.75 2.25C4.7125 2.25 2.25 4.7125 2.25 7.75C2.25 10.7875 4.7125 13.25 7.75 13.25Z"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M9 1C4.5889 1 1 4.5889 1 9C1 13.4111 4.5889 17 9 17C13.4111 17 17 13.4111 17 9C17 4.5889 13.4111 1 9 1ZM9.75 12.75C9.75 13.1641 9.4141 13.5 9 13.5C8.5859 13.5 8.25 13.1641 8.25 12.75V9.5H7.75C7.3359 9.5 7 9.1641 7 8.75C7 8.3359 7.3359 8 7.75 8H8.5C9.1895 8 9.75 8.5605 9.75 9.25V12.75ZM9 6.75C8.448 6.75 8 6.301 8 5.75C8 5.199 8.448 4.75 9 4.75C9.552 4.75 10 5.199 10 5.75C10 6.301 9.552 6.75 9 6.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M1.75,12.25l3.646-3.646c.195-.195,.512-.195,.707,0l3.293,3.293c.195,.195,.512,.195,.707,0l6.146-6.146"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
      <polyline
        fill="none"
        points="11.25 5.75 16.25 5.75 16.25 10.75"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <polyline
        fill="none"
        points="1.75 4.25 6 8.5 10.25 4.25"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M15.75,9.75H2.25c-.414,0-.75-.336-.75-.75s.336-.75,.75-.75H15.75c.414,0,.75,.336,.75,.75s-.336,.75-.75,.75Z"
        fill="currentColor"
      />
      <path
        d="M15.75,4.5H2.25c-.414,0-.75-.336-.75-.75s.336-.75,.75-.75H15.75c.414,0,.75,.336,.75,.75s-.336,.75-.75,.75Z"
        fill="currentColor"
      />
      <path
        d="M15.75,15H2.25c-.414,0-.75-.336-.75-.75s.336-.75,.75-.75H15.75c.414,0,.75,.336,.75,.75s-.336,.75-.75,.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M4.25 4.25L13.75 13.75"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
      <path
        d="M13.75 4.25L4.25 13.75"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M5.25 2.25H12.75V4.5C12.75 6.57107 11.0711 8.25 9 8.25C6.92893 8.25 5.25 6.57107 5.25 4.5V2.25Z"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
      <path
        d="M5.25 3.75H3.75C3.19772 3.75 2.75 4.19772 2.75 4.75V5C2.75 6.79493 4.20507 8.25 6 8.25H6.25"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
      <path
        d="M12.75 3.75H14.25C14.8023 3.75 15.25 4.19772 15.25 4.75V5C15.25 6.79493 13.7949 8.25 12 8.25H11.75"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
      <path
        d="M9 8.25V11"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
      <path
        d="M6.5 14.75C6.5 13.3693 7.61929 12.25 9 12.25C10.3807 12.25 11.5 13.3693 11.5 14.75"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
    </svg>
  );
}

function EarnIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M2.25 14.25H15.75"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
      <path
        d="M4 11L6.75 8.25L9 10.5L13.75 5.75"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
      <path
        d="M12 5.75H13.75V7.5"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
    </svg>
  );
}

function RoomsIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M3.25 3.5H10.75C11.7165 3.5 12.5 4.2835 12.5 5.25V9.25C12.5 10.2165 11.7165 11 10.75 11H7.25L4.25 13.5V11H3.25C2.2835 11 1.5 10.2165 1.5 9.25V5.25C1.5 4.2835 2.2835 3.5 3.25 3.5Z"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
      <path
        d="M12.25 5.5H14.25C15.2165 5.5 16 6.2835 16 7.25V11.25C16 12.2165 15.2165 13 14.25 13H13.25V15.25L10.75 13H9.75"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M4 3.25H14C14.6904 3.25 15.25 3.80964 15.25 4.5V6C14.1454 6 13.25 6.89543 13.25 8C13.25 9.10457 14.1454 10 15.25 10V11.5C15.25 12.1904 14.6904 12.75 14 12.75H4C3.30964 12.75 2.75 12.1904 2.75 11.5V10C3.85457 10 4.75 9.10457 4.75 8C4.75 6.89543 3.85457 6 2.75 6V4.5C2.75 3.80964 3.30964 3.25 4 3.25Z"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
      <path
        d="M9 5.25V10.75"
        fill="none"
        stroke="currentColor"
        stroke-dasharray="1.75 1.75"
        stroke-linecap="round"
        stroke-width="1.5"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M12.7975 11.4118C10.0262 11.4118 7.77933 9.16488 7.77933 6.39363C7.77933 5.20952 8.18955 4.12109 8.87577 3.26257C5.59953 3.43584 3 6.14618 3 9.46548C3 12.8967 5.78172 15.6784 9.21289 15.6784C12.5322 15.6784 15.2425 13.0789 15.4158 9.80257C14.5573 10.4888 13.4689 10.899 12.2848 10.899"
        fill="currentColor"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M9 6.5C10.3807 6.5 11.5 7.61929 11.5 9C11.5 10.3807 10.3807 11.5 9 11.5C7.61929 11.5 6.5 10.3807 6.5 9C6.5 7.61929 7.61929 6.5 9 6.5Z"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
      <path
        d="M15.25 9C15.25 8.53773 14.8752 8.16294 14.4129 8.16294H13.8625C13.692 7.52348 13.4387 6.91839 13.1125 6.36176L13.5017 5.97252C13.8285 5.64573 13.8285 5.11598 13.5017 4.78919L12.7108 3.99827C12.384 3.67148 11.8543 3.67148 11.5275 3.99827L11.1382 4.3875C10.5816 4.06131 9.97652 3.80798 9.33706 3.6375V3.08706C9.33706 2.62479 8.96227 2.25 8.5 2.25H7.5C7.03773 2.25 6.66294 2.62479 6.66294 3.08706V3.6375C6.02348 3.80798 5.41839 4.06131 4.86176 4.3875L4.47252 3.99827C4.14573 3.67148 3.61598 3.67148 3.28919 3.99827L2.49827 4.78919C2.17148 5.11598 2.17148 5.64573 2.49827 5.97252L2.8875 6.36176C2.56131 6.91839 2.30798 7.52348 2.1375 8.16294H1.58706C1.12479 8.16294 0.75 8.53773 0.75 9V10C0.75 10.4623 1.12479 10.8371 1.58706 10.8371H2.1375C2.30798 11.4765 2.56131 12.0816 2.8875 12.6382L2.49827 13.0275C2.17148 13.3543 2.17148 13.884 2.49827 14.2108L3.28919 15.0017C3.61598 15.3285 4.14573 15.3285 4.47252 15.0017L4.86176 14.6125C5.41839 14.9387 6.02348 15.192 6.66294 15.3625V15.9129C6.66294 16.3752 7.03773 16.75 7.5 16.75H8.5C8.96227 16.75 9.33706 16.3752 9.33706 15.9129V15.3625C9.97652 15.192 10.5816 14.9387 11.1382 14.6125L11.5275 15.0017C11.8543 15.3285 12.384 15.3285 12.7108 15.0017L13.5017 14.2108C13.8285 13.884 13.8285 13.3543 13.5017 13.0275L13.1125 12.6382C13.4387 12.0816 13.692 11.4765 13.8625 10.8371H14.4129C14.8752 10.8371 15.25 10.4623 15.25 10V9Z"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <ellipse
        cx="9"
        cy="9"
        rx="3"
        ry="7.25"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
      <line
        x1="1.75"
        y1="9"
        x2="16.25"
        y2="9"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
      <circle
        cx="9"
        cy="9"
        r="7.25"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
    </svg>
  );
}

function LanguageFlag(props: { locale: SupportedLocale; label: string }) {
  return (
    <img
      class="pm-account-menu__flag-image"
      src={getLanguageFlagAsset(props.locale)}
      alt={props.label}
      loading="lazy"
      decoding="async"
    />
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <polyline
        fill="none"
        points="4.25 1.75 8.5 6 4.25 10.25"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
    </svg>
  );
}

interface AvatarPreset {
  backgroundColor: string;
  backgroundImage: string;
  color: string;
  borderColor: string;
}

const avatarPresets: readonly AvatarPreset[] = [
  {
    backgroundColor: "#fcd560",
    backgroundImage:
      "radial-gradient(at 66% 77%, rgb(10, 58, 141) 0px, transparent 50%), radial-gradient(at 29% 97%, rgb(80, 187, 222) 0px, transparent 50%), radial-gradient(at 99% 86%, rgb(120, 163, 34) 0px, transparent 50%), radial-gradient(at 29% 88%, rgb(161, 126, 29) 0px, transparent 50%)",
    color: "#0f172a",
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  {
    backgroundColor: "#d9f4ff",
    backgroundImage:
      "radial-gradient(at 18% 18%, rgb(37, 99, 235) 0px, transparent 48%), radial-gradient(at 78% 22%, rgb(34, 197, 94) 0px, transparent 46%), radial-gradient(at 74% 82%, rgb(234, 179, 8) 0px, transparent 40%), radial-gradient(at 34% 72%, rgb(168, 85, 247) 0px, transparent 42%)",
    color: "#082f49",
    borderColor: "rgba(8, 47, 73, 0.08)",
  },
  {
    backgroundColor: "#ffe3ef",
    backgroundImage:
      "radial-gradient(at 22% 28%, rgb(244, 63, 94) 0px, transparent 46%), radial-gradient(at 82% 26%, rgb(251, 146, 60) 0px, transparent 42%), radial-gradient(at 70% 84%, rgb(59, 130, 246) 0px, transparent 40%), radial-gradient(at 28% 84%, rgb(236, 72, 153) 0px, transparent 44%)",
    color: "#4a044e",
    borderColor: "rgba(74, 4, 78, 0.08)",
  },
  {
    backgroundColor: "#e4ffd8",
    backgroundImage:
      "radial-gradient(at 20% 20%, rgb(22, 163, 74) 0px, transparent 46%), radial-gradient(at 74% 18%, rgb(14, 165, 233) 0px, transparent 42%), radial-gradient(at 80% 78%, rgb(249, 115, 22) 0px, transparent 36%), radial-gradient(at 26% 84%, rgb(132, 204, 22) 0px, transparent 40%)",
    color: "#14532d",
    borderColor: "rgba(20, 83, 45, 0.08)",
  },
  {
    backgroundColor: "#efe4ff",
    backgroundImage:
      "radial-gradient(at 24% 24%, rgb(124, 58, 237) 0px, transparent 46%), radial-gradient(at 82% 20%, rgb(59, 130, 246) 0px, transparent 42%), radial-gradient(at 74% 82%, rgb(236, 72, 153) 0px, transparent 38%), radial-gradient(at 30% 78%, rgb(168, 85, 247) 0px, transparent 40%)",
    color: "#3b0764",
    borderColor: "rgba(59, 7, 100, 0.08)",
  },
  {
    backgroundColor: "#d7fbff",
    backgroundImage:
      "radial-gradient(at 18% 22%, rgb(6, 182, 212) 0px, transparent 44%), radial-gradient(at 84% 24%, rgb(37, 99, 235) 0px, transparent 40%), radial-gradient(at 78% 82%, rgb(34, 197, 94) 0px, transparent 38%), radial-gradient(at 26% 80%, rgb(245, 158, 11) 0px, transparent 42%)",
    color: "#083344",
    borderColor: "rgba(8, 51, 68, 0.08)",
  },
];

function hashValue(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getAvatarPreset(user: UserResponse): AvatarPreset {
  const seed =
    user.id ||
    user.email ||
    user.username ||
    user.wallet?.wallet_address ||
    user.created_at;
  return avatarPresets[hashValue(seed) % avatarPresets.length];
}

function getAvatarInitials(user: UserResponse): string {
  const rawLabel =
    user.display_name ||
    user.username ||
    user.email ||
    user.wallet?.wallet_address ||
    "Account";

  const normalizedLabel = rawLabel.trim();

  if (normalizedLabel.length === 0) {
    return "A";
  }

  const walletAddress = user.wallet?.wallet_address?.trim();

  if (
    typeof walletAddress === "string" &&
    walletAddress.length > 0 &&
    normalizedLabel === walletAddress
  ) {
    return "W";
  }

  const emailLocalPart = normalizedLabel.includes("@")
    ? normalizedLabel.slice(0, normalizedLabel.indexOf("@"))
    : normalizedLabel;

  const words = emailLocalPart
    .split(/[\s._-]+/)
    .map(word => word.trim())
    .filter(word => word.length > 0);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  const firstWord = words[0] ?? emailLocalPart;
  return firstWord[0]?.toUpperCase() ?? "A";
}

function getUserSecondaryLabel(user: UserResponse): string | null {
  if (typeof user.email === "string" && user.email.trim().length > 0) {
    return user.email.trim();
  }

  const walletAddress = user.wallet?.wallet_address;

  if (typeof walletAddress === "string" && walletAddress.length > 0) {
    return walletAddress;
  }

  return null;
}

function UserAvatar(props: { user: UserResponse }) {
  const [imageFailed, setImageFailed] = createSignal(false);

  return (
    <Show
      when={props.user.avatar_url && !imageFailed()}
      fallback={
        <div
          class="pm-account-avatar pm-account-avatar--fallback"
          style={getAvatarPreset(props.user)}
          aria-label={getUserDisplayLabel(props.user)}
        >
          <span class="pm-account-avatar__initials">
            {getAvatarInitials(props.user)}
          </span>
        </div>
      }
    >
      <img
        class="pm-account-avatar"
        src={props.user.avatar_url!}
        alt=""
        loading="lazy"
        referrerpolicy="no-referrer"
        onError={() => setImageFailed(true)}
      />
    </Show>
  );
}

function formatUsdBalance(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseUsdBalance(value: string): number | null {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function buildSearchHref(eventSlug: string): string {
  return `/event/${encodeURIComponent(eventSlug)}`;
}

function getTabTranslationKey(label: string): TranslationKey | null {
  switch (label) {
    case "Trending":
      return "tabs.trending";
    case "Breaking":
      return "tabs.breaking";
    case "New":
      return "tabs.new";
    case "Politics":
      return "tabs.politics";
    case "Sports":
      return "tabs.sports";
    case "Crypto":
      return "tabs.crypto";
    case "Esports":
      return "tabs.esports";
    case "Iran":
      return "tabs.iran";
    case "Finance":
      return "tabs.finance";
    case "Geopolitics":
      return "tabs.geopolitics";
    case "Tech":
      return "tabs.tech";
    case "Culture":
      return "tabs.culture";
    case "Economy":
      return "tabs.economy";
    case "Weather":
      return "tabs.weather";
    case "Mentions":
      return "tabs.mentions";
    case "Elections":
      return "tabs.elections";
    default:
      return null;
  }
}

function rememberPreferredMarket(eventSlug: string, marketSlug: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      `${EVENT_PRIMARY_MARKET_STORAGE_PREFIX}${eventSlug}`,
      JSON.stringify(marketSlug),
    );
  } catch {
    // Ignore storage write failures and fall back to plain navigation.
  }
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { locale, localizeHref, stripPathname, switchLocale, t } = useI18n();
  const [isAuthModalOpen, setAuthModalOpen] = createSignal(false);
  const [authModalRoute, setAuthModalRoute] = createSignal<AuthModalRoute>("connectors");
  const [isDepositModalOpen, setDepositModalOpen] = createSignal(false);
  const [isBetCodeModalOpen, setBetCodeModalOpen] = createSignal(false);
  const [betCodeModalValue, setBetCodeModalValue] = createSignal("");
  const [authUser, setAuthUser] = createSignal<UserResponse | null>(null);
  const [authToken, setAuthToken] = createSignal<string | null>(null);
  const [isAccountMenuOpen, setAccountMenuOpen] = createSignal(false);
  const [isLanguageMenuOpen, setLanguageMenuOpen] = createSignal(false);
  const [isDarkModeMenuEnabled, setDarkModeMenuEnabled] = createSignal(false);
  const [cashBalanceUsd, setCashBalanceUsd] = createSignal<number | null>(null);
  const [isLoadingCashBalance, setIsLoadingCashBalance] = createSignal(false);
  const [cashBalanceFailed, setCashBalanceFailed] = createSignal(false);
  const [portfolioBalanceUsd, setPortfolioBalanceUsd] = createSignal<number | null>(null);
  const [isLoadingPortfolioBalance, setIsLoadingPortfolioBalance] = createSignal(false);
  const [portfolioBalanceFailed, setPortfolioBalanceFailed] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [searchResults, setSearchResults] = createSignal<PublicMarketCardResponse[]>([]);
  const [isSearchLoading, setSearchLoading] = createSignal(false);
  const [searchError, setSearchError] = createSignal<string | null>(null);
  const [isSearchFocused, setSearchFocused] = createSignal(false);
  const [activeSearchIndex, setActiveSearchIndex] = createSignal(-1);
  const [browseTabMetadata, setBrowseTabMetadata] = createSignal<BrowseTabMetadata>({
    categories: [],
    tags: [],
  });
  let accountMenuRef: HTMLElement | undefined;
  let searchFieldRef: HTMLDivElement | undefined;
  const isAuthenticated = () => authUser() !== null;
  let cashBalanceRequestId = 0;
  let portfolioBalanceRequestId = 0;
  let searchRequestVersion = 0;
  const normalizedSearchQuery = () => searchQuery().trim();
  const isSearchDropdownOpen = () =>
    isSearchFocused() && normalizedSearchQuery().length >= MIN_SEARCH_LENGTH;
  const featuredTabs = createMemo(() => MARKET_FEATURED_TAB_TARGETS);
  const topicTabs = createMemo(() =>
    MARKET_TOPIC_TAB_DEFINITIONS.map(definition => ({
      label: definition.label,
      target: resolveMarketTopicTabTarget(
        definition,
        browseTabMetadata().categories,
        browseTabMetadata().tags,
      ),
    })),
  );
  const currentPathname = createMemo(() => stripPathname(location.pathname));
  const isTabActive = (target: MarketFeedTarget) =>
    isMarketFeedTargetActive(target, currentPathname(), location.search);
  const translateTabLabel = (label: string) => {
    const key = getTabTranslationKey(label);
    return key ? t(key) : label;
  };

  const openAuthModal = (route: AuthModalRoute = "connectors") => {
    setAccountMenuOpen(false);
    setLanguageMenuOpen(false);
    setAuthModalRoute(route);
    setAuthModalOpen(true);
  };
  const openOnboardingModal = () => {
    openAuthModal("tour");
  };
  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setAuthModalRoute("connectors");
  };
  const openDepositModal = () => {
    setAccountMenuOpen(false);
    setLanguageMenuOpen(false);
    setDepositModalOpen(true);
  };
  const closeDepositModal = () => setDepositModalOpen(false);
  const openEarnPage = () => {
    setAccountMenuOpen(false);
    setLanguageMenuOpen(false);
    navigate(localizeHref("/earn"));
  };
  const openRoomsPage = () => {
    setAccountMenuOpen(false);
    setLanguageMenuOpen(false);
    navigate(localizeHref("/rooms"));
  };
  const openDocsPage = () => {
    setAccountMenuOpen(false);
    setLanguageMenuOpen(false);
    navigate(localizeHref("/docs/overview"));
  };
  const openLeaderboardPage = () => {
    setAccountMenuOpen(false);
    setLanguageMenuOpen(false);
    navigate(localizeHref("/leaderboard"));
  };
  const supportsInlineBetCodeLoader = () =>
    currentPathname() === "/" ||
    currentPathname().startsWith("/categories") ||
    currentPathname().startsWith("/markets") ||
    currentPathname().startsWith("/events") ||
    currentPathname().startsWith("/event");
  const openBetCodeModal = () => {
    const currentCode = normalizeStackBetCode(
      new URLSearchParams(location.search).get(STACK_BET_CODE_QUERY_PARAM) ?? "",
    );
    setAccountMenuOpen(false);
    setLanguageMenuOpen(false);
    setBetCodeModalValue(currentCode);
    setBetCodeModalOpen(true);
  };
  const openStackBuilder = (mode: StackBuilderMode = "builder") => {
    setAccountMenuOpen(false);

    if (typeof window !== "undefined" && supportsInlineBetCodeLoader()) {
      window.dispatchEvent(new CustomEvent(STACK_OPEN_BUILDER_EVENT, { detail: mode }));
      return;
    }

    navigate(localizeHref(`/?${STACK_BUILDER_QUERY_PARAM}=${encodeURIComponent(mode)}`));
  };
  const closeBetCodeModal = () => setBetCodeModalOpen(false);
  const toggleAccountMenu = () => {
    setAccountMenuOpen(current => !current);
  };
  const closeAccountMenu = () => {
    setAccountMenuOpen(false);
    setLanguageMenuOpen(false);
  };
  const handleMenuStubClick = () => {
    closeAccountMenu();
  };
  const toggleDarkModeMenu = () => {
    const nextValue = !isDarkModeMenuEnabled();
    setDarkModeMenuEnabled(nextValue);
    applyDocumentTheme(nextValue);

    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(DARK_MODE_STORAGE_KEY, nextValue ? "1" : "0");
    } catch {
      // Ignore storage failures on unsupported browsers.
    }
  };
  const signOut = () => {
    clearStoredAuthSession();
    clearStoredWalletPreference();
    setAccountMenuOpen(false);
    setDepositModalOpen(false);
    setBetCodeModalOpen(false);
    setAuthToken(null);
    setAuthUser(null);
  };
  const submitBetCode = (code: string) => {
    const normalizedCode = normalizeStackBetCode(code);

    if (normalizedCode.length === 0) {
      return;
    }

    const currentQueryCode = normalizeStackBetCode(
      new URLSearchParams(location.search).get(STACK_BET_CODE_QUERY_PARAM) ?? "",
    );

    setAccountMenuOpen(false);
    setBetCodeModalOpen(false);

    if (
      typeof window !== "undefined" &&
      currentQueryCode === normalizedCode &&
      supportsInlineBetCodeLoader()
    ) {
      window.dispatchEvent(new CustomEvent(STACK_OPEN_BET_CODE_EVENT, { detail: normalizedCode }));
      return;
    }

    navigate(localizeHref(`/?${STACK_BET_CODE_QUERY_PARAM}=${encodeURIComponent(normalizedCode)}`));
  };
  const handleAuthenticated = (response: AuthResponse) => {
    writeStoredAuthSession(response);
    setAccountMenuOpen(false);
    setAuthToken(response.token);
    setAuthUser(response.user);
    closeAuthModal();
  };
  const cashBalanceLabel = () =>
    isLoadingCashBalance()
      ? "Loading..."
      : cashBalanceFailed()
        ? "Unavailable"
        : formatUsdBalance(cashBalanceUsd() ?? 0);
  const portfolioBalanceLabel = () =>
    isLoadingPortfolioBalance()
      ? "Loading..."
      : portfolioBalanceFailed()
        ? "Unavailable"
        : formatUsdBalance(portfolioBalanceUsd() ?? 0);
  const refreshNavbarBalance = async () => {
    const address = authUser()?.wallet?.wallet_address?.trim();

    if (!address) {
      setCashBalanceUsd(null);
      setIsLoadingCashBalance(false);
      setCashBalanceFailed(false);
      return;
    }

    const requestId = ++cashBalanceRequestId;
    setIsLoadingCashBalance(true);
    setCashBalanceFailed(false);

    try {
      const response = await faucetClient.fetchUsdcBalance(address);
      const normalizedBalance = formatUsdcBaseUnits(response.balance);
      const balanceUsd = Number(normalizedBalance);

      if (requestId !== cashBalanceRequestId) {
        return;
      }

      setCashBalanceUsd(Number.isFinite(balanceUsd) ? balanceUsd : 0);
      setCashBalanceFailed(false);
    } catch {
      if (requestId !== cashBalanceRequestId) {
        return;
      }

      setCashBalanceUsd(null);
      setCashBalanceFailed(true);
    } finally {
      if (requestId === cashBalanceRequestId) {
        setIsLoadingCashBalance(false);
      }
    }
  };
  const refreshPortfolioBalance = async (token: string) => {
    const requestId = ++portfolioBalanceRequestId;
    setIsLoadingPortfolioBalance(true);
    setPortfolioBalanceFailed(false);

    try {
      const response = await orderClient.fetchMyPortfolio(token);
      const balanceUsd = parseUsdBalance(response.summary.live_marked_value.display);

      if (requestId !== portfolioBalanceRequestId) {
        return;
      }

      setPortfolioBalanceUsd(balanceUsd ?? 0);
      setPortfolioBalanceFailed(false);
    } catch {
      if (requestId !== portfolioBalanceRequestId) {
        return;
      }

      setPortfolioBalanceUsd(null);
      setPortfolioBalanceFailed(true);
    } finally {
      if (requestId === portfolioBalanceRequestId) {
        setIsLoadingPortfolioBalance(false);
      }
    }
  };

  createEffect(() => {
    if (!isAccountMenuOpen()) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (accountMenuRef?.contains(target)) {
        return;
      }

      closeAccountMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAccountMenu();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    onCleanup(() => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    });
  });

  onMount(() => {
    const handleOpenAuthModal = () => {
      openAuthModal("connectors");
    };
    const handleOpenOnboardingModal = () => {
      openOnboardingModal();
    };
    const handleOpenDepositModal = () => {
      openDepositModal();
    };
    const handleRefreshBalances = () => {
      void refreshNavbarBalance();

      const token = authToken()?.trim() ?? "";
      if (token.length > 0) {
        void refreshPortfolioBalance(token);
      }
    };
    const storedSession = readStoredAuthSession();
    let isDisposed = false;

    window.addEventListener(OPEN_AUTH_MODAL_EVENT, handleOpenAuthModal);
    window.addEventListener(OPEN_ONBOARDING_MODAL_EVENT, handleOpenOnboardingModal);
    window.addEventListener(OPEN_DEPOSIT_MODAL_EVENT, handleOpenDepositModal);
    window.addEventListener(NAVBAR_BALANCE_REFRESH_EVENT, handleRefreshBalances);

    onCleanup(() => {
      isDisposed = true;
      window.removeEventListener(OPEN_AUTH_MODAL_EVENT, handleOpenAuthModal);
      window.removeEventListener(OPEN_ONBOARDING_MODAL_EVENT, handleOpenOnboardingModal);
      window.removeEventListener(OPEN_DEPOSIT_MODAL_EVENT, handleOpenDepositModal);
      window.removeEventListener(NAVBAR_BALANCE_REFRESH_EVENT, handleRefreshBalances);
    });

    void loadBrowseTabMetadata()
      .then(metadata => {
        if (!isDisposed) {
          setBrowseTabMetadata(metadata);
        }
      })
      .catch(() => {
        if (!isDisposed) {
          setBrowseTabMetadata({
            categories: [],
            tags: [],
          });
        }
    });

    try {
      const darkModeEnabled = readInitialDarkModePreference();
      setDarkModeMenuEnabled(darkModeEnabled);
      applyDocumentTheme(darkModeEnabled);
    } catch {
      setDarkModeMenuEnabled(false);
      applyDocumentTheme(false);
    }

    if (!storedSession) {
      return;
    }

    setAuthToken(storedSession.token);
    setAuthUser(storedSession.user);

    void authClient
      .fetchMe(storedSession.token)
      .then(response => {
        writeStoredAuthSession({
          token: storedSession.token,
          user: response.user,
        });
        setAuthUser(response.user);
      })
      .catch(() => {
        clearStoredAuthSession();
        setAuthToken(null);
        setAuthUser(null);
      });
  });

  createEffect(() => {
    const walletAddress = authUser()?.wallet?.wallet_address?.trim() ?? "";

    if (walletAddress.length === 0) {
      setCashBalanceUsd(null);
      setIsLoadingCashBalance(false);
      setCashBalanceFailed(false);
      return;
    }

    void refreshNavbarBalance();
  });

  createEffect(() => {
    const token = authToken()?.trim() ?? "";

    if (token.length === 0) {
      setPortfolioBalanceUsd(null);
      setIsLoadingPortfolioBalance(false);
      setPortfolioBalanceFailed(false);
      return;
    }

    void refreshPortfolioBalance(token);
  });

  createEffect(() => {
    if (!isAccountMenuOpen()) {
      setLanguageMenuOpen(false);
    }
  });

  createEffect(() => {
    const currentQuery = new URLSearchParams(location.search).get("q")?.trim() ?? "";

    if (currentPathname() === "/search") {
      setSearchQuery(currentQuery);
      return;
    }

    setSearchQuery("");
  });

  createEffect(() => {
    const currentQuery = normalizedSearchQuery();

    setActiveSearchIndex(-1);

    if (currentQuery.length < MIN_SEARCH_LENGTH) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    const version = ++searchRequestVersion;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);

    const timeoutId = setTimeout(() => {
      void marketClient
        .searchMarkets({
          q: currentQuery,
          limit: SEARCH_RESULT_LIMIT,
        })
        .then(response => {
          if (version !== searchRequestVersion) {
            return;
          }

          setSearchResults(response.markets);
          setSearchLoading(false);
        })
        .catch(caughtError => {
          if (version !== searchRequestVersion) {
            return;
          }

          setSearchResults([]);
          setSearchLoading(false);
          setSearchError(
            caughtError instanceof Error ? caughtError.message : "Unable to search markets.",
          );
        });
    }, SEARCH_DEBOUNCE_MS);

    onCleanup(() => clearTimeout(timeoutId));
  });

  createEffect(() => {
    if (!isSearchDropdownOpen()) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (searchFieldRef?.contains(target)) {
        return;
      }

      setSearchFocused(false);
      setActiveSearchIndex(-1);
    };

    window.addEventListener("pointerdown", handlePointerDown);

    onCleanup(() => {
      window.removeEventListener("pointerdown", handlePointerDown);
    });
  });

  const navigateToSearchResult = (market: PublicMarketCardResponse) => {
    rememberPreferredMarket(market.event.slug, market.slug);
    setSearchFocused(false);
    setActiveSearchIndex(-1);
    navigate(localizeHref(buildSearchHref(market.event.slug)));
  };

  const handleSearchKeyDown = (event: KeyboardEvent) => {
    if (!isSearchDropdownOpen()) {
      if (event.key === "Escape") {
        setSearchFocused(false);
      }

      return;
    }

    const results = searchResults();

    if (event.key === "Escape") {
      event.preventDefault();
      setSearchFocused(false);
      setActiveSearchIndex(-1);
      return;
    }

    if (results.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSearchIndex(index => Math.min(index + 1, results.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSearchIndex(index => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      const selectedResult = results[activeSearchIndex()];

      if (!selectedResult) {
        return;
      }

      event.preventDefault();
      navigateToSearchResult(selectedResult);
    }
  };

  const handleSearchSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    const trimmedQuery = normalizedSearchQuery();
    setSearchFocused(false);
    setActiveSearchIndex(-1);

    if (trimmedQuery.length === 0) {
      navigate(localizeHref("/search"));
      return;
    }

    navigate(localizeHref(`/search?q=${encodeURIComponent(trimmedQuery)}`));
  };

  const renderLanguagePanel = () => (
    <Show when={isLanguageMenuOpen()}>
      <div class="pm-account-menu__language-panel" role="dialog" aria-label={t("language.title")}>
        <div class="pm-account-menu__language-panel-header">
          <div class="pm-account-menu__language-panel-copy">
            <p class="pm-account-menu__language-panel-title">{t("language.title")}</p>
            <p class="pm-account-menu__language-panel-subtitle">{t("language.subtitle")}</p>
          </div>
          <button
            type="button"
            class="pm-account-menu__language-panel-close"
            aria-label={t("language.title")}
            onClick={() => setLanguageMenuOpen(false)}
          >
            <CloseIcon />
          </button>
        </div>
        <div class="pm-account-menu__language-list">
          <For each={SUPPORTED_LOCALES}>
            {entry => (
              <button
                type="button"
                class="pm-account-menu__language-option"
                classList={{
                  "pm-account-menu__language-option--active": locale() === entry.code,
                }}
                onClick={() => switchLocale(entry.code as SupportedLocale)}
              >
                <span class="pm-account-menu__language-option-main">
                  <span class="pm-account-menu__flag">
                    <LanguageFlag
                      locale={entry.code as SupportedLocale}
                      label={entry.label}
                    />
                  </span>
                  <span class="pm-account-menu__language-option-labels">
                    <span class="pm-account-menu__language-option-label">
                      {entry.nativeLabel}
                    </span>
                    <span class="pm-account-menu__language-option-subtitle">
                      {entry.label}
                    </span>
                  </span>
                </span>
                <Show when={locale() === entry.code}>
                  <span>{t("language.active")}</span>
                </Show>
              </button>
            )}
          </For>
        </div>
      </div>
    </Show>
  );

  return (
    <>
      <header class="pm-navbar">
        <nav
          class={`pm-navbar__nav${isAuthenticated() ? " pm-navbar__nav--authenticated" : ""}`}
          aria-label="Primary"
        >
          <div class="pm-navbar__border" aria-hidden="true" />

          <div class="pm-navbar__top-row">
            <div class="pm-navbar__brand-wrap">
              <LocaleLink class="pm-brand" aria-label="Lattice Logo" href="/">
                <span class="pm-brand__badge">
                  <img src="/c7xdtwf0cz6mneysxo8.svg" alt="" aria-hidden="true" />
                </span>
                <span class="pm-brand__name">Lattice</span>
              </LocaleLink>
            </div>

            <div class="pm-navbar__search-group">
              <form class="pm-search-form" role="search" onSubmit={handleSearchSubmit}>
                <div class="pm-search-field" ref={searchFieldRef}>
                  <span class="pm-search-field__icon">
                    <SearchIcon />
                  </span>
                  <input
                    class="pm-search-field__input"
                    type="search"
                    aria-label={t("nav.searchPlaceholder")}
                    aria-autocomplete="list"
                    aria-activedescendant={
                      activeSearchIndex() >= 0 ? `pm-search-result-${activeSearchIndex()}` : undefined
                    }
                    aria-controls="pm-search-results"
                    aria-expanded={isSearchDropdownOpen()}
                    autoComplete="off"
                    placeholder={t("nav.searchPlaceholder")}
                    value={searchQuery()}
                    onInput={event => setSearchQuery(event.currentTarget.value)}
                    onFocus={() => setSearchFocused(true)}
                    onKeyDown={handleSearchKeyDown}
                  />
                  <kbd class="pm-search-field__kbd">/</kbd>

                  <Show when={isSearchDropdownOpen()}>
                    <div class="pm-search-field__panel" id="pm-search-results" role="listbox">
                      <Show when={isSearchLoading()}>
                        <p class="pm-search-field__status">Searching markets...</p>
                      </Show>

                      <Show when={!isSearchLoading() && searchError()}>
                        <p class="pm-search-field__status pm-search-field__status--error">
                          {searchError()}
                        </p>
                      </Show>

                      <Show
                        when={
                          !isSearchLoading() &&
                          !searchError() &&
                          searchResults().length === 0 &&
                          normalizedSearchQuery().length >= MIN_SEARCH_LENGTH
                        }
                      >
                        <p class="pm-search-field__status">
                          No published markets matched "{normalizedSearchQuery()}".
                        </p>
                      </Show>

                      <Show when={searchResults().length > 0}>
                        <div class="pm-search-field__results">
                          <For each={searchResults()}>
                            {(market, index) => {
                              const displayLabel = getMarketDisplayLabel(market);
                              const question = market.question.trim();
                              const showQuestion =
                                question.length > 0 &&
                                question.toLowerCase() !== displayLabel.toLowerCase();

                              return (
                                <button
                                  type="button"
                                  role="option"
                                  id={`pm-search-result-${index()}`}
                                  class="pm-search-field__result"
                                  classList={{
                                    "pm-search-field__result--active":
                                      index() === activeSearchIndex(),
                                  }}
                                  aria-selected={index() === activeSearchIndex()}
                                  onMouseEnter={() => setActiveSearchIndex(index())}
                                  onClick={() => navigateToSearchResult(market)}
                                >
                                  <span class="pm-search-field__result-topline">
                                    <span class="pm-search-field__result-title">{displayLabel}</span>
                                    <span class="pm-search-field__result-status">
                                      {market.trading_status}
                                    </span>
                                  </span>
                                  <Show when={showQuestion}>
                                    <span class="pm-search-field__result-question">{question}</span>
                                  </Show>
                                  <span class="pm-search-field__result-meta">
                                    {market.event.title} • {formatSlugLabel(market.event.category_slug)}
                                  </span>
                                </button>
                              );
                            }}
                          </For>
                        </div>
                      </Show>

                      <Show when={!isSearchLoading() && normalizedSearchQuery().length >= MIN_SEARCH_LENGTH}>
                        <button
                          type="button"
                          class="pm-search-field__view-all"
                          onClick={() => {
                            setSearchFocused(false);
                            setActiveSearchIndex(-1);
                            navigate(localizeHref(`/search?q=${encodeURIComponent(normalizedSearchQuery())}`));
                          }}
                        >
                          View all results for "{normalizedSearchQuery()}"
                        </button>
                      </Show>
                    </div>
                  </Show>
                </div>
              </form>

              <Show
                when={!isAuthenticated()}
                fallback={<div class="pm-navbar__search-balance-spacer" aria-hidden="true" />}
              >
                <button class="pm-link-action" type="button" onClick={openOnboardingModal}>
                  <InfoIcon />
                  <span>{t("nav.howItWorks")}</span>
                </button>
              </Show>
            </div>

            <div class="pm-navbar__account">
              <Show when={isAuthenticated()}>
                <div class="pm-navbar-balance" aria-label="Portfolio balance">
                  <LocaleLink
                    class="pm-navbar-balance__item pm-navbar-balance__item--link"
                    href="/portfolio"
                    aria-label="Open portfolio"
                  >
                    <span class="pm-navbar-balance__label">{t("nav.portfolio")}</span>
                    <span class="pm-navbar-balance__value">
                      {portfolioBalanceLabel()}
                    </span>
                  </LocaleLink>

                  <div class="pm-navbar-balance__item">
                    <span class="pm-navbar-balance__label">{t("nav.cash")}</span>
                    <span class="pm-navbar-balance__value">
                      {cashBalanceLabel()}
                    </span>
                  </div>
                </div>
              </Show>

              <div class="pm-navbar__auth">
                <Show
                  when={authUser()}
                  fallback={
                    <>
                      <button
                        class="pm-button pm-button--ghost"
                        type="button"
                        onClick={openAuthModal}
                      >
                        {t("nav.signIn")}
                      </button>
                      <button
                        class="pm-button pm-button--primary"
                        type="button"
                        onClick={openAuthModal}
                      >
                        {t("nav.signUp")}
                      </button>

                      <div class="pm-account-menu-anchor" ref={accountMenuRef}>
                        <button
                          class={`pm-menu-trigger${isAccountMenuOpen() ? " pm-menu-trigger--open" : ""}`}
                          type="button"
                          aria-label="Open navigation menu"
                          aria-expanded={isAccountMenuOpen()}
                          aria-haspopup="menu"
                          onClick={toggleAccountMenu}
                        >
                          <MenuIcon />
                        </button>

                        <Show when={isAccountMenuOpen()}>
                          <div
                            class="pm-account-menu pm-account-menu--guest"
                            classList={{ "pm-account-menu--language-open": isLanguageMenuOpen() }}
                            role="menu"
                          >
                          <div class="pm-account-menu__utility-list">
                              <button
                                type="button"
                                class="pm-account-menu__utility-item"
                                onClick={openLeaderboardPage}
                              >
                                <span class="pm-account-menu__utility-copy">
                                  <span class="pm-account-menu__utility-icon pm-account-menu__utility-icon--amber">
                                    <TrophyIcon />
                                  </span>
                                  <span>{t("nav.leaderboard")}</span>
                                </span>
                              </button>

                              <button
                                type="button"
                                class="pm-account-menu__utility-item"
                                onClick={openEarnPage}
                              >
                                <span class="pm-account-menu__utility-copy">
                                  <span class="pm-account-menu__utility-icon pm-account-menu__utility-icon--green">
                                    <EarnIcon />
                                  </span>
                                  <span>{t("nav.earn")}</span>
                                </span>
                              </button>

                              <button
                                type="button"
                                class="pm-account-menu__utility-item"
                                onClick={openRoomsPage}
                              >
                                <span class="pm-account-menu__utility-copy">
                                  <span class="pm-account-menu__utility-icon pm-account-menu__utility-icon--blue">
                                    <RoomsIcon />
                                  </span>
                                  <span>{t("nav.rooms")}</span>
                                </span>
                              </button>

                              <button
                                type="button"
                                class="pm-account-menu__utility-item pm-account-menu__utility-item--toggle"
                                aria-pressed={isDarkModeMenuEnabled()}
                                onClick={toggleDarkModeMenu}
                              >
                                <span class="pm-account-menu__utility-copy">
                                  <span class="pm-account-menu__utility-icon pm-account-menu__utility-icon--blue">
                                    <MoonIcon />
                                  </span>
                                  <span>{t("nav.darkMode")}</span>
                                </span>
                                <span
                                  class={`pm-account-menu__toggle${
                                    isDarkModeMenuEnabled() ? " pm-account-menu__toggle--active" : ""
                                  }`}
                                  aria-hidden="true"
                                >
                                  <span class="pm-account-menu__toggle-knob" />
                                </span>
                              </button>
                            </div>

                            <div class="pm-account-menu__divider" />

                            <div class="pm-account-menu__link-list">
                              <button
                                type="button"
                                class="pm-account-menu__link-item"
                                onClick={openBetCodeModal}
                              >
                                <span class="pm-account-menu__language-copy">
                                  <span class="pm-account-menu__flag pm-account-menu__flag--blue">
                                    <TicketIcon />
                                  </span>
                                  <span>{t("nav.playBetCode")}</span>
                                </span>
                                <span class="pm-account-menu__chevron" aria-hidden="true">
                                  <ChevronRightIcon />
                                </span>
                              </button>
                              <button
                                type="button"
                                class="pm-account-menu__link-item"
                                onClick={() => openStackBuilder("builder")}
                              >
                                {t("nav.builders")}
                              </button>
                              <button
                                type="button"
                                class="pm-account-menu__link-item"
                                onClick={handleMenuStubClick}
                              >
                                Accuracy
                              </button>
                              <button
                                type="button"
                                class="pm-account-menu__link-item"
                                onClick={handleMenuStubClick}
                              >
                                Status
                              </button>
                              <button
                                type="button"
                                class="pm-account-menu__link-item"
                                onClick={openDocsPage}
                              >
                                {t("nav.docs")}
                              </button>
                              <button
                                type="button"
                                class="pm-account-menu__link-item"
                                onClick={handleMenuStubClick}
                              >
                                Help Center
                              </button>
                              <button
                                type="button"
                                class="pm-account-menu__link-item"
                                onClick={handleMenuStubClick}
                              >
                                {t("nav.termsOfUse")}
                              </button>
                              <button
                                type="button"
                                class="pm-account-menu__link-item pm-account-menu__link-item--language"
                                onClick={() => setLanguageMenuOpen(current => !current)}
                              >
                                <span class="pm-account-menu__language-copy">
                                  <span class="pm-account-menu__flag">
                                    <LanguageFlag locale={locale()} label={t("nav.language")} />
                                  </span>
                                  <span>{t("nav.language")}</span>
                                </span>
                                <span class="pm-account-menu__chevron" aria-hidden="true">
                                  <ChevronRightIcon />
                                </span>
                              </button>
                            </div>
                            {renderLanguagePanel()}
                          </div>
                        </Show>
                      </div>
                    </>
                  }
                >
                  {user => (
                    <div class="pm-account-session" ref={accountMenuRef}>
                      <button
                        class="pm-button pm-button--primary pm-deposit-button"
                        type="button"
                        onClick={openDepositModal}
                      >
                        {t("nav.deposit")}
                      </button>

                      <button
                        class={`pm-account-trigger${
                          isAccountMenuOpen() ? " pm-account-trigger--open" : ""
                        }`}
                        type="button"
                        aria-label="Open account menu"
                        aria-expanded={isAccountMenuOpen()}
                        aria-haspopup="menu"
                        onClick={toggleAccountMenu}
                      >
                        <UserAvatar user={user()} />
                        <span class="pm-account-trigger__chevron" aria-hidden="true">
                          <ChevronDownIcon />
                        </span>
                      </button>

                      <Show when={isAccountMenuOpen()}>
                        <div
                          class="pm-account-menu pm-account-menu--auth"
                          classList={{ "pm-account-menu--language-open": isLanguageMenuOpen() }}
                          role="menu"
                        >
                          <div class="pm-account-menu__header">
                            <div class="pm-account-menu__header-main">
                              <UserAvatar user={user()} />
                              <div class="pm-account-menu__identity">
                                <p class="pm-account-menu__name">{getUserDisplayLabel(user())}</p>
                                <Show when={getUserSecondaryLabel(user())}>
                                  {secondaryLabel => (
                                    <p class="pm-account-menu__meta" title={secondaryLabel()}>
                                      {secondaryLabel()}
                                    </p>
                                  )}
                                </Show>
                              </div>
                            </div>

                            <button
                              type="button"
                              class="pm-account-menu__settings"
                              aria-label="Account settings"
                              onClick={handleMenuStubClick}
                            >
                              <SettingsIcon />
                            </button>
                          </div>

                          <div class="pm-account-menu__divider" />

                          <div class="pm-account-menu__utility-list">
                            <button
                              type="button"
                              class="pm-account-menu__utility-item"
                              onClick={openLeaderboardPage}
                            >
                              <span class="pm-account-menu__utility-copy">
                                <span class="pm-account-menu__utility-icon pm-account-menu__utility-icon--amber">
                                  <TrophyIcon />
                                </span>
                                  <span>{t("nav.leaderboard")}</span>
                              </span>
                            </button>

                            <button
                              type="button"
                              class="pm-account-menu__utility-item"
                              onClick={openEarnPage}
                            >
                              <span class="pm-account-menu__utility-copy">
                                <span class="pm-account-menu__utility-icon pm-account-menu__utility-icon--green">
                                  <EarnIcon />
                                </span>
                                <span>{t("nav.earn")}</span>
                              </span>
                            </button>

                            <button
                              type="button"
                              class="pm-account-menu__utility-item"
                              onClick={openRoomsPage}
                            >
                              <span class="pm-account-menu__utility-copy">
                                <span class="pm-account-menu__utility-icon pm-account-menu__utility-icon--blue">
                                  <RoomsIcon />
                                </span>
                                <span>{t("nav.rooms")}</span>
                              </span>
                            </button>

                            <button
                              type="button"
                              class="pm-account-menu__utility-item pm-account-menu__utility-item--toggle"
                              aria-pressed={isDarkModeMenuEnabled()}
                              onClick={toggleDarkModeMenu}
                            >
                              <span class="pm-account-menu__utility-copy">
                                <span class="pm-account-menu__utility-icon pm-account-menu__utility-icon--blue">
                                  <MoonIcon />
                                </span>
                                  <span>{t("nav.darkMode")}</span>
                              </span>
                              <span
                                class={`pm-account-menu__toggle${
                                  isDarkModeMenuEnabled() ? " pm-account-menu__toggle--active" : ""
                                }`}
                                aria-hidden="true"
                              >
                                <span class="pm-account-menu__toggle-knob" />
                              </span>
                            </button>
                          </div>

                          <div class="pm-account-menu__divider" />

                          <div class="pm-account-menu__link-list">
                            <button
                              type="button"
                              class="pm-account-menu__link-item"
                              onClick={openBetCodeModal}
                            >
                              <span class="pm-account-menu__language-copy">
                                <span class="pm-account-menu__flag pm-account-menu__flag--blue">
                                  <TicketIcon />
                                </span>
                                  <span>{t("nav.playBetCode")}</span>
                              </span>
                              <span class="pm-account-menu__chevron" aria-hidden="true">
                                <ChevronRightIcon />
                              </span>
                            </button>
                            <button
                              type="button"
                              class="pm-account-menu__link-item"
                              onClick={() => openStackBuilder("builder")}
                            >
                              {t("nav.builders")}
                            </button>
                            <button
                              type="button"
                              class="pm-account-menu__link-item"
                              onClick={openDocsPage}
                            >
                              {t("nav.docs")}
                            </button>
                            <button
                              type="button"
                              class="pm-account-menu__link-item"
                              onClick={handleMenuStubClick}
                            >
                              {t("nav.support")}
                            </button>
                            <button
                              type="button"
                              class="pm-account-menu__link-item"
                              onClick={handleMenuStubClick}
                            >
                              {t("nav.termsOfUse")}
                            </button>
                            <button
                              type="button"
                              class="pm-account-menu__link-item pm-account-menu__link-item--language"
                              onClick={() => setLanguageMenuOpen(current => !current)}
                            >
                              <span class="pm-account-menu__language-copy">
                                <span class="pm-account-menu__flag">
                                  <LanguageFlag locale={locale()} label={t("nav.language")} />
                                </span>
                                <span>{t("nav.language")}</span>
                              </span>
                              <span class="pm-account-menu__chevron" aria-hidden="true">
                                <ChevronRightIcon />
                              </span>
                            </button>
                            <button
                              type="button"
                              class="pm-account-menu__link-item pm-account-menu__link-item--danger"
                              onClick={signOut}
                            >
                              {t("nav.logOut")}
                            </button>
                          </div>
                          {renderLanguagePanel()}
                        </div>
                      </Show>
                    </div>
                  )}
                </Show>
              </div>
            </div>
          </div>

          <div class="pm-navbar__bottom-row">
            <div class="pm-tabs-shell">
              <div class="pm-tabs-fade pm-tabs-fade--left" aria-hidden="true" />

              <div class="pm-tabs-scroll" role="navigation" aria-label="Market categories">
                <For each={featuredTabs()}>
                  {target => (
                    <LocaleLink
                      class="pm-tab"
                      classList={{
                        "pm-tab--active": isTabActive(target),
                      }}
                      href={buildMarketFeedHref(target)}
                      aria-current={isTabActive(target) ? "page" : undefined}
                    >
                      {target.label === "Trending" && (
                        <span class="pm-tab__icon">
                          <TrendingIcon />
                        </span>
                      )}
                      <span>{translateTabLabel(target.label)}</span>
                    </LocaleLink>
                  )}
                </For>

                <div class="pm-tabs-divider" aria-hidden="true" />

                <For each={topicTabs()}>
                  {tab => (
                    <LocaleLink
                      class="pm-tab"
                      classList={{
                        "pm-tab--active": isTabActive(tab.target),
                      }}
                      href={buildMarketFeedHref(tab.target)}
                      aria-current={isTabActive(tab.target) ? "page" : undefined}
                    >
                      <span>{translateTabLabel(tab.label)}</span>
                    </LocaleLink>
                  )}
                </For>

                <LocaleLink
                  class="pm-tab pm-tab--more"
                  classList={{
                    "pm-tab--active":
                      currentPathname() === "/categories" ||
                      currentPathname().startsWith("/categories/"),
                  }}
                  href="/categories"
                  aria-label="Browse more categories"
                  aria-current={
                    currentPathname() === "/categories" ||
                    currentPathname().startsWith("/categories/")
                      ? "page"
                      : undefined
                  }
                >
                  <span>{t("nav.more")}</span>
                  <span class="pm-tab__chevron">
                    <ChevronDownIcon />
                  </span>
                </LocaleLink>
              </div>

              <div class="pm-tabs-fade pm-tabs-fade--right" aria-hidden="true" />
            </div>
          </div>
        </nav>
      </header>

      <AuthModal
        open={isAuthModalOpen()}
        route={authModalRoute()}
        onClose={closeAuthModal}
        onAuthenticated={handleAuthenticated}
      />
      <DepositModal
        open={isDepositModalOpen()}
        user={authUser()}
        onClose={closeDepositModal}
        onBalanceRefresh={() => void refreshNavbarBalance()}
      />
      <BetCodeModal
        open={isBetCodeModalOpen()}
        initialValue={betCodeModalValue()}
        onClose={closeBetCodeModal}
        onSubmit={submitBetCode}
      />
    </>
  );
}
