import { Title } from "@solidjs/meta";
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { Portal } from "solid-js/web";

import Navbar from "~/components/Navbar";
import PublicState from "~/components/public-browser/PublicState.tsx";
import { useI18n } from "~/lib/i18n/context.tsx";
import {
  AUTH_SESSION_CHANGE_EVENT,
  readStoredAuthSession,
  type StoredAuthSession,
} from "~/lib/auth/session.ts";
import { faucetClient, parseUsdcAmountInput } from "~/lib/faucet/index.ts";
import {
  orderClient,
  type EarnHistoryPointResponse,
  type MyEarnResponse,
} from "~/lib/order/index.ts";

const NAVBAR_BALANCE_REFRESH_EVENT = "sabi:refresh-wallet-and-portfolio-balances";
const MIN_LOCK_DURATION_DAYS = 7;
const MAX_LOCK_DURATION_DAYS = 365;
const LOCK_DURATION_MARKS = [7, 30, 90, 180, 365] as const;

type EarnPageStatus = "loading" | "ready" | "error" | "unauthenticated";
type EarnRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";
type VaultActionMode = "deposit" | "withdraw";
type ActionTone = "success" | "error";

function formatUsdAmount(value: number | string): string {
  const parsedValue = typeof value === "number" ? value : Number(value);

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

function parseDisplayAmount(value: string | number | null | undefined): number {
  const parsedValue = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatWalletAddress(value: string): string {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatPercent(value: number, digits = 2): string {
  if (!Number.isFinite(value)) {
    return "0.00%";
  }

  return `${value.toFixed(digits)}%`;
}

function formatBpsPercent(value: number, digits = 1): string {
  return formatPercent(value / 100, digits);
}

function formatOwnershipPercentage(numeratorRaw: string, denominatorRaw: string): string {
  try {
    const numerator = BigInt(numeratorRaw);
    const denominator = BigInt(denominatorRaw);

    if (denominator <= 0n || numerator <= 0n) {
      return "0.00%";
    }

    const scaled = (numerator * 10_000n) / denominator;
    return formatPercent(Number(scaled) / 100, 2);
  } catch {
    return "0.00%";
  }
}

function formatDelayDays(seconds: number): string {
  const days = Math.round(seconds / 86_400);

  if (days <= 1) {
    return "1 day";
  }

  return `${days} days`;
}

function formatUnlockTime(value?: string | null): string {
  if (!value) {
    return "Not scheduled";
  }

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

function formatProjectionDate(daysFromNow: number): string {
  const timestamp = Date.now() + daysFromNow * 86_400_000;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function formatDurationCopy(days: number): string {
  if (days >= 365) {
    return "1 year";
  }

  if (days === 1) {
    return "1 day";
  }

  return `${days} days`;
}

function formatDurationTick(days: number): string {
  if (days >= 365) {
    return "1y";
  }

  return `${days}d`;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 13 13" aria-hidden="true">
      <path
        d="M1.5 1.5 11.5 11.5"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-width="1.5"
      />
      <path
        d="M11.5 1.5 1.5 11.5"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-width="1.5"
      />
    </svg>
  );
}

function openAuthModal() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("sabi:open-auth-modal"));
}

function requestNavbarBalanceRefresh() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(NAVBAR_BALANCE_REFRESH_EVENT));
}

function calculateYieldMultiplier(days: number): number {
  const clampedDays = Math.min(Math.max(days, MIN_LOCK_DURATION_DAYS), MAX_LOCK_DURATION_DAYS);
  const progress =
    (clampedDays - MIN_LOCK_DURATION_DAYS) / (MAX_LOCK_DURATION_DAYS - MIN_LOCK_DURATION_DAYS);

  return 1 + progress;
}

function filterHistoryByRange(
  points: readonly EarnHistoryPointResponse[],
  range: EarnRange,
): readonly EarnHistoryPointResponse[] {
  if (points.length <= 1 || range === "ALL") {
    return points;
  }

  const now = Date.now();
  const cutoff = (() => {
    switch (range) {
      case "1D":
        return now - 86_400_000;
      case "1W":
        return now - 7 * 86_400_000;
      case "1M":
        return now - 30 * 86_400_000;
      case "3M":
        return now - 90 * 86_400_000;
      case "1Y":
        return now - 365 * 86_400_000;
      case "ALL":
        return Number.NEGATIVE_INFINITY;
    }
  })();

  const filtered = points.filter(point => Date.parse(point.observed_at) >= cutoff);
  return filtered.length > 0 ? filtered : points.slice(-1);
}

function buildChartModel(
  points: readonly EarnHistoryPointResponse[],
  fallbackValue: number,
): { areaPath: string; linePath: string } {
  const width = 1062;
  const height = 248;
  const horizontalInset = 18;
  const verticalInset = 24;
  const rawValues = points.map(point => parseDisplayAmount(point.total_liquidity_assets.display));
  const values = rawValues.length > 0 ? rawValues : [fallbackValue, fallbackValue];
  const normalizedValues =
    values.length === 1 ? [values[0] ?? fallbackValue, values[0] ?? fallbackValue] : values;
  const minimumValue = Math.min(...normalizedValues);
  const maximumValue = Math.max(...normalizedValues);
  const spread = Math.max(maximumValue - minimumValue, maximumValue * 0.08, 1);
  const denominator = Math.max(normalizedValues.length - 1, 1);

  const coordinates = normalizedValues.map((value, index) => {
    const x =
      horizontalInset + (index / denominator) * (width - horizontalInset * 2);
    const normalized = (value - minimumValue) / spread;
    const y =
      height - verticalInset - normalized * (height - verticalInset * 2);
    return { x, y };
  });

  const [firstPoint] = coordinates;
  const lastPoint = coordinates[coordinates.length - 1] ?? firstPoint;
  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(2)} ${(height - 12).toFixed(2)} L ${firstPoint.x.toFixed(2)} ${(height - 12).toFixed(2)} Z`;

  return { areaPath, linePath };
}

function EarnIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 19.25H20"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.75"
      />
      <path
        d="M6 15L10 11L12.75 13.75L18 8.5"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.75"
      />
      <path
        d="M15.75 8.5H18V10.75"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.75"
      />
    </svg>
  );
}

function EarnHeroChart(props: {
  points: readonly EarnHistoryPointResponse[];
  fallbackValue: number;
}) {
  const chart = createMemo(() => buildChartModel(props.points, props.fallbackValue));

  return (
    <svg class="pm-earn__chart-svg" viewBox="0 0 1080 260" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="pm-earn-chart-fill" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(83, 208, 137, 0.26)" />
          <stop offset="100%" stop-color="rgba(83, 208, 137, 0)" />
        </linearGradient>
      </defs>
      <path d={chart().areaPath} fill="url(#pm-earn-chart-fill)" />
      <path
        d={chart().linePath}
        fill="none"
        stroke="#53d089"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="4"
      />
    </svg>
  );
}

function EarnActionModal(props: {
  open: boolean;
  mode: VaultActionMode | null;
  amountInput: string;
  supportingLabel: string;
  isSubmitting: boolean;
  feedbackMessage: string | null;
  feedbackTone: ActionTone;
  onAmountInput: (value: string) => void;
  onUseMax: () => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  createEffect(() => {
    if (!props.open || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !props.isSubmitting) {
        props.onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    onCleanup(() => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    });
  });

  const title = () => (props.mode === "withdraw" ? "Withdraw from vault" : "Deposit into vault");
  const copy = () =>
    props.mode === "withdraw"
      ? "Request a redeem from your current LP position. The vault still enforces its withdrawal delay before claim."
      : "Move wallet cash into the LP vault and receive vault shares in return.";
  const confirmLabel = () => {
    if (props.mode === "withdraw") {
      return props.isSubmitting ? "Requesting..." : "Request withdraw";
    }

    return props.isSubmitting ? "Depositing..." : "Deposit into vault";
  };

  return (
    <Show when={props.open}>
      <Portal>
        <div class="pm-earn-modal__overlay" onClick={() => !props.isSubmitting && props.onClose()}>
          <section
            class="pm-earn-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pm-earn-modal-title"
            onClick={event => event.stopPropagation()}
          >
            <div class="pm-earn-modal__frame">
              <div class="pm-earn-modal__header">
                <div>
                  <p class="pm-earn-modal__eyebrow">
                    {props.mode === "withdraw" ? "Vault redeem" : "Vault deposit"}
                  </p>
                  <h2 class="pm-earn-modal__title" id="pm-earn-modal-title">
                    {title()}
                  </h2>
                  <p class="pm-earn-modal__copy">{copy()}</p>
                </div>

                <button
                  type="button"
                  class="pm-earn-modal__close"
                  onClick={props.onClose}
                  disabled={props.isSubmitting}
                  aria-label="Close vault action modal"
                >
                  <CloseIcon />
                </button>
              </div>

              <div class="pm-earn-modal__field">
                <div class="pm-earn-modal__field-head">
                  <label class="pm-earn-modal__label" for="pm-earn-modal-amount">
                    Amount
                  </label>
                  <span class="pm-earn-modal__hint">{props.supportingLabel}</span>
                </div>

                <div class="pm-earn-modal__input-shell">
                  <input
                    id="pm-earn-modal-amount"
                    class="pm-earn-modal__input"
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    placeholder="0.00"
                    value={props.amountInput}
                    onInput={event => props.onAmountInput(event.currentTarget.value)}
                  />
                  <span class="pm-earn-modal__token">USDC</span>
                </div>

                <button
                  type="button"
                  class="pm-earn-modal__max"
                  onClick={props.onUseMax}
                  disabled={props.isSubmitting}
                >
                  Use max
                </button>
              </div>

              <Show when={props.feedbackMessage}>
                {message => (
                  <p
                    classList={{
                      "pm-earn-modal__feedback": true,
                      "pm-earn-modal__feedback--error": props.feedbackTone === "error",
                      "pm-earn-modal__feedback--success": props.feedbackTone === "success",
                    }}
                  >
                    {message()}
                  </p>
                )}
              </Show>

              <div class="pm-earn-modal__actions">
                <button
                  type="button"
                  class="pm-earn-modal__button pm-earn-modal__button--ghost"
                  onClick={props.onClose}
                  disabled={props.isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="pm-earn-modal__button pm-earn-modal__button--primary"
                  onClick={props.onSubmit}
                  disabled={props.isSubmitting}
                >
                  {confirmLabel()}
                </button>
              </div>
            </div>
          </section>
        </div>
      </Portal>
    </Show>
  );
}

export default function EarnRoute() {
  const { t } = useI18n();
  const [session, setSession] = createSignal<StoredAuthSession | null>(null);
  const [didReadSession, setDidReadSession] = createSignal(false);
  const [earn, setEarn] = createSignal<MyEarnResponse | null>(null);
  const [status, setStatus] = createSignal<EarnPageStatus>("loading");
  const [error, setError] = createSignal<string | null>(null);
  const [selectedRange, setSelectedRange] = createSignal<EarnRange>("1M");
  const [projectionDays, setProjectionDays] = createSignal(180);
  const [activeVaultAction, setActiveVaultAction] = createSignal<VaultActionMode | null>(null);
  const [actionAmountInput, setActionAmountInput] = createSignal("");
  const [walletCashUsd, setWalletCashUsd] = createSignal<number | null>(null);
  const [isLoadingWalletCash, setIsLoadingWalletCash] = createSignal(false);
  const [walletCashFailed, setWalletCashFailed] = createSignal(false);
  const [isSubmittingAction, setIsSubmittingAction] = createSignal(false);
  const [actionFeedback, setActionFeedback] = createSignal<string | null>(null);
  const [actionTone, setActionTone] = createSignal<ActionTone>("success");
  let earnRequestVersion = 0;
  let cashRequestVersion = 0;

  onMount(() => {
    setSession(readStoredAuthSession());
    setDidReadSession(true);

    const handleSessionChange = (event: Event) => {
      const nextSession = (event as CustomEvent<StoredAuthSession | null>).detail;
      setSession(nextSession ?? readStoredAuthSession());
      setDidReadSession(true);
    };

    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, handleSessionChange);

    onCleanup(() => {
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, handleSessionChange);
    });
  });

  const loadEarn = async (token: string, requestId: number) => {
    const response = await orderClient.fetchMyEarn(token);

    if (requestId !== earnRequestVersion) {
      return;
    }

    setEarn(response);
    setStatus("ready");
  };

  createEffect(() => {
    if (!didReadSession()) {
      setStatus("loading");
      return;
    }

    const token = session()?.token?.trim() ?? "";

    if (token.length === 0) {
      setEarn(null);
      setError(null);
      setStatus("unauthenticated");
      return;
    }

    const requestId = ++earnRequestVersion;
    setStatus("loading");
    setError(null);

    void loadEarn(token, requestId).catch(caughtError => {
      if (requestId !== earnRequestVersion) {
        return;
      }

      setEarn(null);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load earn data.");
      setStatus("error");
    });
  });

  createEffect(() => {
    const address = earn()?.wallet_address?.trim() ?? session()?.user?.wallet?.wallet_address?.trim() ?? "";

    if (address.length === 0) {
      setWalletCashUsd(null);
      setIsLoadingWalletCash(false);
      setWalletCashFailed(false);
      return;
    }

    const requestId = ++cashRequestVersion;
    setIsLoadingWalletCash(true);
    setWalletCashFailed(false);

    void faucetClient
      .fetchUsdcBalance(address)
      .then(response => {
        if (requestId !== cashRequestVersion) {
          return;
        }

        const balanceUsd = parseDisplayAmount(Number(response.balance) / 1_000_000);
        setWalletCashUsd(balanceUsd);
        setWalletCashFailed(false);
      })
      .catch(() => {
        if (requestId !== cashRequestVersion) {
          return;
        }

        setWalletCashUsd(null);
        setWalletCashFailed(true);
      })
      .finally(() => {
        if (requestId === cashRequestVersion) {
          setIsLoadingWalletCash(false);
        }
      });
  });

  const ownershipLabel = createMemo(() => {
    const data = earn();

    if (!data) {
      return "0.00%";
    }

    return formatOwnershipPercentage(
      data.account.share_balance.raw,
      data.vault.total_supply.raw,
    );
  });

  const filteredHistory = createMemo(() => {
    const points = earn()?.analytics.history ?? [];
    return filterHistoryByRange(points, selectedRange());
  });

  const currentApyBps = createMemo(() => earn()?.analytics.vault_7d_apy_bps ?? 0);
  const hasPendingRedeem = createMemo(
    () => (earn()?.account.pending_redeem.shares.raw ?? "0") !== "0",
  );
  const vaultPositionUsd = createMemo(() => {
    const displayValue = earn()?.account.asset_value.display;
    return typeof displayValue === "string" ? Number(displayValue) : 0;
  });
  const vaultApyLabel = createMemo(() => formatBpsPercent(currentApyBps(), 1));
  const projectionMultiplier = createMemo(() => calculateYieldMultiplier(projectionDays()));
  const projectionEffectivePercent = createMemo(
    () => Math.max((projectionMultiplier() - 1) * 100, 0),
  );

  const walletCashNumber = createMemo(() => walletCashUsd() ?? 0);

  const retryLoad = () => {
    const activeSession = readStoredAuthSession();
    setSession(activeSession ? { ...activeSession } : null);
  };

  const refreshEarnAndBalances = async () => {
    const token = session()?.token?.trim() ?? "";

    if (token.length === 0) {
      return;
    }

    const requestId = ++earnRequestVersion;
    setStatus("loading");
    await loadEarn(token, requestId);
    requestNavbarBalanceRefresh();
  };

  const closeVaultActionModal = () => {
    if (isSubmittingAction()) {
      return;
    }

    setActiveVaultAction(null);
  };

  const openVaultActionModal = (mode: VaultActionMode) => {
    const nextAmount =
      mode === "deposit"
        ? walletCashNumber() > 0
          ? walletCashNumber().toFixed(2)
          : ""
        : vaultPositionUsd() > 0
          ? vaultPositionUsd().toFixed(2)
          : "";

    setActionFeedback(null);
    setActionAmountInput(nextAmount);
    setActiveVaultAction(mode);
  };

  const useMaxActionAmount = () => {
    if (activeVaultAction() === "withdraw") {
      if (vaultPositionUsd() > 0) {
        setActionAmountInput(vaultPositionUsd().toFixed(2));
      }
      return;
    }

    if (walletCashNumber() > 0) {
      setActionAmountInput(walletCashNumber().toFixed(2));
    }
  };

  const submitVaultDeposit = async (amountInputValue: string) => {
    const token = session()?.token?.trim() ?? "";

    if (token.length === 0) {
      setActionTone("error");
      setActionFeedback("Sign in again before depositing into the vault.");
      return;
    }

    try {
      const parsedAmount = parseUsdcAmountInput(amountInputValue);
      const walletCash = walletCashUsd();

      if (typeof walletCash === "number" && Number(parsedAmount.normalized) > walletCash + 0.000001) {
        setActionTone("error");
        setActionFeedback("Wallet cash is lower than the vault deposit amount.");
        return;
      }

      setIsSubmittingAction(true);
      setActionFeedback(null);
      const response = await orderClient.depositToEarn(token, {
        amount: parsedAmount.baseUnits,
      });

      setActionTone("success");
      setActionFeedback(
        `Deposited ${response.amount?.display ?? amountInputValue} USDC into the vault.`,
      );
      await refreshEarnAndBalances();
      setActiveVaultAction(null);
    } catch (caughtError) {
      setActionTone("error");
      setActionFeedback(
        caughtError instanceof Error ? caughtError.message : "Unable to deposit into the vault.",
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const submitWithdrawRequest = async (amountInputValue: string) => {
    const token = session()?.token?.trim() ?? "";

    if (token.length === 0) {
      setActionTone("error");
      setActionFeedback("Sign in again before requesting a vault withdrawal.");
      return;
    }

    if (hasPendingRedeem()) {
      setActionTone("error");
      setActionFeedback("A pending redeem already exists. Claim it or cancel it first.");
      return;
    }

    try {
      const parsedAmount = parseUsdcAmountInput(amountInputValue);
      const positionValue = vaultPositionUsd();

      if (positionValue <= 0) {
        setActionTone("error");
        setActionFeedback("There is no vault position available to withdraw yet.");
        return;
      }

      if (Number(parsedAmount.normalized) > positionValue + 0.000001) {
        setActionTone("error");
        setActionFeedback("Withdrawal amount is higher than your current vault position.");
        return;
      }

      setIsSubmittingAction(true);
      setActionFeedback(null);
      const response = await orderClient.requestEarnRedeem(token, {
        amount: parsedAmount.baseUnits,
      });

      setActionTone("success");
      setActionFeedback(
        `Requested ${response.amount?.display ?? amountInputValue} USDC for redeem. Claim will unlock after the vault delay.`,
      );
      await refreshEarnAndBalances();
      setActiveVaultAction(null);
    } catch (caughtError) {
      setActionTone("error");
      setActionFeedback(
        caughtError instanceof Error ? caughtError.message : "Unable to request a vault withdrawal.",
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const submitActiveVaultAction = async () => {
    if (activeVaultAction() === "withdraw") {
      await submitWithdrawRequest(actionAmountInput());
      return;
    }

    await submitVaultDeposit(actionAmountInput());
  };

  const submitClaim = async () => {
    const token = session()?.token?.trim() ?? "";

    if (token.length === 0) {
      return;
    }

    try {
      setIsSubmittingAction(true);
      setActionFeedback(null);
      await orderClient.claimEarnRedeem(token);
      setActionTone("success");
      setActionFeedback("Claimed the pending redeem from the vault.");
      await refreshEarnAndBalances();
    } catch (caughtError) {
      setActionTone("error");
      setActionFeedback(
        caughtError instanceof Error ? caughtError.message : "Unable to claim the pending redeem.",
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const submitCancelPending = async () => {
    const token = session()?.token?.trim() ?? "";

    if (token.length === 0) {
      return;
    }

    try {
      setIsSubmittingAction(true);
      setActionFeedback(null);
      await orderClient.cancelEarnRedeem(token);
      setActionTone("success");
      setActionFeedback("Cancelled the pending redeem and restored the vault shares.");
      await refreshEarnAndBalances();
    } catch (caughtError) {
      setActionTone("error");
      setActionFeedback(
        caughtError instanceof Error ? caughtError.message : "Unable to cancel the pending redeem.",
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const walletCashLabel = createMemo(() => {
    if (isLoadingWalletCash()) {
      return t("portfolio.cashLoading");
    }

    if (walletCashFailed()) {
      return t("portfolio.cashUnavailable");
    }

    return formatUsdAmount(walletCashUsd() ?? 0);
  });

  return (
    <div class="pm-page">
      <Title>{`${t("earn.title")} | Sabimarket`}</Title>
      <Navbar />

      <main class="pm-detail pm-earn">
        <section class="pm-earn__intro">
          <div class="pm-earn__intro-copy">
            <div class="pm-earn__intro-icon">
              <EarnIcon />
            </div>

            <div class="pm-earn__intro-text">
              <p class="pm-earn__eyebrow">{t("earn.eyebrow")}</p>
              <h1 class="pm-earn__title">{t("earn.title")}</h1>
              <p class="pm-earn__subtitle">{t("earn.subtitle")}</p>
            </div>
          </div>

          <Show when={earn()}>
            {data => (
              <div class="pm-earn__intro-pills">
                <span class="pm-earn__pill">{data().account_kind.replace(/_/g, " ")}</span>
                <span class="pm-earn__pill pm-earn__pill--mono">
                  {formatWalletAddress(data().wallet_address)}
                </span>
              </div>
            )}
          </Show>
        </section>

        <Show when={status() === "loading"}>
          <PublicState title={t("earn.loadingTitle")} copy={t("earn.loadingCopy")} />
        </Show>

        <Show when={status() === "unauthenticated"}>
          <PublicState
            title={t("earn.signInTitle")}
            copy={t("earn.signInCopy")}
            actionLabel={t("earn.openSignIn")}
            onAction={openAuthModal}
          />
        </Show>

        <Show when={status() === "error"}>
          <PublicState
            title={t("earn.unableTitle")}
            copy={error() ?? "The earn endpoint could not be loaded."}
            actionLabel={t("earn.tryAgain")}
            onAction={retryLoad}
          />
        </Show>

        <Show when={status() === "ready" && earn()}>
          {data => (
            <>
              <section class="pm-earn__steps">
                <article class="pm-earn__step">
                  <span class="pm-earn__step-index">1</span>
                  <div class="pm-earn__step-copy">
                    <p class="pm-earn__step-title">{t("earn.stepOneTitle")}</p>
                    <p class="pm-earn__step-text">{t("earn.stepOneCopy")}</p>
                  </div>
                </article>

                <article class="pm-earn__step">
                  <span class="pm-earn__step-index">2</span>
                  <div class="pm-earn__step-copy">
                    <p class="pm-earn__step-title">{t("earn.stepTwoTitle")}</p>
                    <p class="pm-earn__step-text">{t("earn.stepTwoCopy")}</p>
                  </div>
                </article>

                <article class="pm-earn__step">
                  <span class="pm-earn__step-index">3</span>
                  <div class="pm-earn__step-copy">
                    <p class="pm-earn__step-title">{t("earn.stepThreeTitle")}</p>
                    <p class="pm-earn__step-text">
                      {t("earn.stepThreeCopy")} {formatDelayDays(data().vault.withdrawal_delay_seconds)}.
                    </p>
                  </div>
                </article>
              </section>

              <section class="pm-earn__summary-grid">
                <article class="pm-earn__summary-card">
                  <p class="pm-earn__summary-kicker">{t("earn.totalDeposited")}</p>
                  <h2 class="pm-earn__summary-value">
                    {formatUsdAmount(data().vault.total_liquidity_assets.display)}
                  </h2>
                  <p class="pm-earn__summary-copy">{t("earn.totalDepositedCopy")}</p>
                </article>

                <article class="pm-earn__summary-card">
                  <p class="pm-earn__summary-kicker">{t("earn.vaultApy")}</p>
                  <h2 class="pm-earn__summary-value">
                    {vaultApyLabel()}
                  </h2>
                  <p class="pm-earn__summary-copy">{t("earn.vaultApyCopy")}</p>
                </article>

                <article class="pm-earn__summary-card">
                  <p class="pm-earn__summary-kicker">{t("earn.yourOwnership")}</p>
                  <h2 class="pm-earn__summary-value">{ownershipLabel()}</h2>
                  <p class="pm-earn__summary-copy">{t("earn.yourOwnershipCopy")}</p>
                </article>

                <article class="pm-earn__summary-card">
                  <p class="pm-earn__summary-kicker">{t("earn.yourDeposits")}</p>
                  <h2 class="pm-earn__summary-value">
                    {formatUsdAmount(data().account.asset_value.display)}
                  </h2>
                  <p class="pm-earn__summary-copy">{t("earn.yourDepositsCopy")}</p>
                </article>
              </section>

              <section class="pm-earn__grid">
                <article class="pm-earn__hero-card">
                  <div class="pm-earn__hero-copy">
                    <p class="pm-earn__hero-kicker">Vault position</p>
                    <h2 class="pm-earn__hero-value">
                      {formatUsdAmount(data().account.asset_value.display)}
                    </h2>
                    <div class="pm-earn__hero-meta">
                      <span class="pm-earn__hero-accent">{ownershipLabel()}</span>
                      <span class="pm-earn__hero-meta-label">current vault ownership</span>
                    </div>
                    <p class="pm-earn__hero-caption">
                      Your LP position sits on top of the same vault liquidity curve that prices
                      live stack exposure across the protocol.
                    </p>

                    <div class="pm-earn__range-row">
                      <For each={["1D", "1W", "1M", "3M", "1Y", "ALL"] as const}>
                        {range => (
                          <button
                            type="button"
                            classList={{
                              "pm-earn__range-pill": true,
                              "pm-earn__range-pill--active": selectedRange() === range,
                            }}
                            onClick={() => setSelectedRange(range)}
                          >
                            {range}
                          </button>
                        )}
                      </For>
                    </div>
                  </div>

                  <div class="pm-earn__chart-shell">
                    <EarnHeroChart
                      points={filteredHistory()}
                      fallbackValue={parseDisplayAmount(data().vault.total_liquidity_assets.display)}
                    />
                  </div>

                  <div class="pm-earn__hero-foot">
                    <div class="pm-earn__hero-foot-item">
                      <span class="pm-earn__hero-foot-label">Available</span>
                      <strong class="pm-earn__hero-foot-value">
                        {formatUsdAmount(data().vault.available_liquidity.display)}
                      </strong>
                    </div>
                    <div class="pm-earn__hero-foot-item">
                      <span class="pm-earn__hero-foot-label">Reserved</span>
                      <strong class="pm-earn__hero-foot-value">
                        {formatUsdAmount(data().vault.reserved_liquidity.display)}
                      </strong>
                    </div>
                    <div class="pm-earn__hero-foot-item">
                      <span class="pm-earn__hero-foot-label">Escrowed stake</span>
                      <strong class="pm-earn__hero-foot-value">
                        {formatUsdAmount(data().vault.escrowed_stake.display)}
                      </strong>
                    </div>
                    <div class="pm-earn__hero-foot-item">
                      <span class="pm-earn__hero-foot-label">Utilization</span>
                      <strong class="pm-earn__hero-foot-value">
                        {formatBpsPercent(data().vault.utilization_bps)}
                      </strong>
                    </div>
                  </div>
                </article>

                <aside class="pm-earn__side-card">
                  <div class="pm-earn__projection-shell">
                    <div class="pm-earn__projection-head">
                      <div class="pm-earn__projection-copy">
                        <p class="pm-earn__side-kicker">Yield multiplier</p>
                        <h3 class="pm-earn__projection-title">
                          {projectionMultiplier().toFixed(2)}x
                        </h3>
                        <p class="pm-earn__projection-subtitle">Longer lockups earn more</p>
                      </div>
                      <span class="pm-earn__projection-multiplier">
                        {projectionMultiplier().toFixed(2)}x
                      </span>
                    </div>

                    <div class="pm-earn__projection-slider-shell">
                      <input
                        class="pm-earn__projection-slider"
                        type="range"
                        min={String(MIN_LOCK_DURATION_DAYS)}
                        max={String(MAX_LOCK_DURATION_DAYS)}
                        step="1"
                        value={String(projectionDays())}
                        onInput={event => setProjectionDays(Number(event.currentTarget.value))}
                      />

                      <div class="pm-earn__projection-stops">
                        <For each={LOCK_DURATION_MARKS}>
                          {days => (
                            <button
                              type="button"
                              classList={{
                                "pm-earn__projection-stop": true,
                                "pm-earn__projection-stop--active": projectionDays() === days,
                              }}
                              onClick={() => setProjectionDays(days)}
                            >
                              {formatDurationTick(days)}
                            </button>
                          )}
                        </For>
                      </div>
                    </div>

                    <div class="pm-earn__projection-grid">
                      <div class="pm-earn__projection-metric">
                        <span>Lock</span>
                        <strong>{formatDurationTick(projectionDays())}</strong>
                      </div>
                      <div class="pm-earn__projection-metric">
                        <span>Effective</span>
                        <strong>{formatPercent(projectionEffectivePercent(), 1)}</strong>
                      </div>
                      <div class="pm-earn__projection-metric">
                        <span>Unlocks</span>
                        <strong>{formatProjectionDate(projectionDays())}</strong>
                      </div>
                    </div>
                  </div>

                  <div class="pm-earn__position-shell">
                    <div class="pm-earn__position-head">
                      <div>
                        <p class="pm-earn__side-kicker">Your position</p>
                        <h3 class="pm-earn__position-title">Liquidity position</h3>
                      </div>
                    </div>

                    <dl class="pm-earn__facts">
                      <div class="pm-earn__fact">
                        <dt>Deposited</dt>
                        <dd>{formatUsdAmount(data().account.asset_value.display)}</dd>
                      </div>
                      <div class="pm-earn__fact">
                        <dt>Ownership</dt>
                        <dd>{ownershipLabel()}</dd>
                      </div>
                      <div class="pm-earn__fact">
                        <dt>Avg. lock expiry</dt>
                        <dd>{formatProjectionDate(projectionDays())}</dd>
                      </div>
                    </dl>
                  </div>

                  <div class="pm-earn__action-stack">
                    <button
                      type="button"
                      class="pm-earn__action pm-earn__action--primary"
                      onClick={() => openVaultActionModal("deposit")}
                      disabled={isSubmittingAction() || walletCashFailed()}
                    >
                      + Deposit
                    </button>
                    <button
                      type="button"
                      class="pm-earn__action"
                      onClick={() => openVaultActionModal("withdraw")}
                      disabled={isSubmittingAction() || hasPendingRedeem() || vaultPositionUsd() <= 0}
                    >
                      Withdraw
                    </button>
                    <button
                      type="button"
                      class="pm-earn__action"
                      onClick={() => void submitClaim()}
                      disabled={isSubmittingAction() || !data().account.pending_redeem.claimable_now}
                    >
                      Claim
                    </button>
                  </div>

                  <Show when={hasPendingRedeem() && !data().account.pending_redeem.claimable_now}>
                    <button
                      type="button"
                      class="pm-earn__helper-button"
                      onClick={() => void submitCancelPending()}
                      disabled={isSubmittingAction()}
                    >
                      Cancel pending
                    </button>
                  </Show>

                  <Show when={activeVaultAction() === null && actionFeedback()}>
                    {message => (
                      <p
                        classList={{
                          "pm-earn__action-feedback": true,
                          "pm-earn__action-feedback--error": actionTone() === "error",
                          "pm-earn__action-feedback--success": actionTone() === "success",
                        }}
                      >
                        {message()}
                      </p>
                    )}
                  </Show>
                </aside>
              </section>

              <EarnActionModal
                open={activeVaultAction() !== null}
                mode={activeVaultAction()}
                amountInput={actionAmountInput()}
                supportingLabel={
                  activeVaultAction() === "withdraw"
                    ? `Withdrawable now: ${formatUsdAmount(vaultPositionUsd())}`
                    : `Wallet cash available: ${walletCashLabel()}`
                }
                isSubmitting={isSubmittingAction()}
                feedbackMessage={actionFeedback()}
                feedbackTone={actionTone()}
                onAmountInput={setActionAmountInput}
                onUseMax={useMaxActionAmount}
                onClose={closeVaultActionModal}
                onSubmit={() => void submitActiveVaultAction()}
              />
            </>
          )}
        </Show>
      </main>
    </div>
  );
}
