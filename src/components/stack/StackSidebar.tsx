import { Dialog } from "@kobalte/core";
import copy from "copy-to-clipboard";
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";

import { formatProbabilityFromBps } from "~/components/market-detail/format.ts";
import { formatUsdcBaseUnits } from "~/lib/faucet/amount.ts";
import { useI18n } from "~/lib/i18n/context.tsx";
import type {
  StackAiExplainResponse,
  ExecuteStackResponse,
  StackCompositeResponse,
  StackAiSuggestionResponse,
  StackBetResponse,
  StackQuoteEnvelopeResponse,
} from "~/lib/market/types.ts";

import { STACK_MAX_LEGS, STACK_MIN_LEGS, type StackSidebarLeg } from "./model.ts";

interface StackSidebarProps {
  isOpen: boolean;
  mode: "builder" | "code" | "ai";
  legs: StackSidebarLeg[];
  amount: string;
  quote: StackQuoteEnvelopeResponse | null;
  errorMessage: string | null;
  statusMessage: string | null;
  isQuoting: boolean;
  isExecuting: boolean;
  hasWallet: boolean;
  hasSmartAccount: boolean;
  maxAmount: string | null;
  executionResult: ExecuteStackResponse | null;
  betCodeInput: string;
  betCodeError: string | null;
  isLookingUpBetCode: boolean;
  lookedUpBet: StackBetResponse | null;
  aiPrompt: string;
  aiError: string | null;
  isSuggesting: boolean;
  aiSuggestions: StackAiSuggestionResponse[];
  aiComposites: StackCompositeResponse[];
  isLoadingAiComposites: boolean;
  aiExplainError: string | null;
  isExplaining: boolean;
  aiExplanation: StackAiExplainResponse | null;
  aiExplanationLabel: string | null;
  onOpen: () => void;
  onModeChange: (mode: "builder" | "code" | "ai") => void;
  onClose: () => void;
  onClearLegs: () => void;
  onRemoveLeg: (marketId: string) => void;
  onAmountChange: (value: string) => void;
  onBetCodeInputChange: (value: string) => void;
  onAiPromptChange: (value: string) => void;
  onUseMaxAmount: () => void;
  onRequestAiSuggestions: () => void;
  onApplyAiSuggestion: (suggestion: StackAiSuggestionResponse) => void;
  onApplyAiComposite: (composite: StackCompositeResponse) => void;
  onRequestAiExplanationForCurrentStack: () => void;
  onRequestAiExplanationForSuggestion: (suggestion: StackAiSuggestionResponse) => void;
  onRequestQuote: () => void;
  onExecute: () => void;
  onLookupBetCode: () => void;
  onApplyLookedUpBet: () => void;
  onDismissExecutionResult: () => void;
}

const quickAmounts = ["5", "10", "25", "50"];
const aiPromptPresets = [
  "Build me a 3-leg sports stack with medium risk",
  "Give me a safer 2-leg macro + politics stack",
  "Find me a longshot World Cup stack",
];
const SHARE_FEEDBACK_TIMEOUT_MS = 1800;

function formatUsdDisplay(value: string): string {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    return `$${value}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: parsed >= 100 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(parsed);
}

function formatUsdBaseUnits(value: string): string {
  return formatUsdDisplay(formatUsdcBaseUnits(value));
}

function formatUsdDecimal(value: string): string {
  return formatUsdDisplay(value);
}

function formatPercentFromBps(value: number): string {
  const percent = value / 100;

  if (percent > 0 && percent < 1) {
    return "<1%";
  }

  return `${percent.toFixed(percent >= 10 ? 0 : 1)}%`;
}

function formatQuoteFreshnessLabel(
  validUntil: number | null,
  nowMs: number,
  isPreview: boolean,
): string {
  if (!validUntil) {
    return isPreview ? "Estimate not requested yet" : "Quote not requested yet";
  }

  const secondsRemaining = Math.max(0, Math.ceil((validUntil * 1000 - nowMs) / 1000));

  if (secondsRemaining <= 0) {
    return isPreview ? "Estimate expired" : "Quote expired";
  }

  return `${isPreview ? "Estimate" : "Quote"} valid for ${secondsRemaining}s`;
}

function formatReturnOnCapital(payoutMultipleBps: number): string {
  const multiplier = payoutMultipleBps / 10000;
  const percent = Math.max(0, (multiplier - 1) * 100);

  return `${Math.round(percent)}%`;
}

function formatStatusLabel(value: string): string {
  if (value.trim().length === 0) {
    return "Unknown";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatBetCodeDisplay(value: string): string {
  return value.trim().toLowerCase();
}

function formatTrackingHashDisplay(value: string): string {
  const normalized = value.trim();

  if (normalized.length <= 20) {
    return normalized;
  }

  return `${normalized.slice(0, 10)}...${normalized.slice(-8)}`;
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine.length > 0 ? `${currentLine} ${word}` : word;

    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      lines.push(candidate);
      currentLine = "";
    }

    if (lines.length === maxLines) {
      return lines;
    }
  }

  if (currentLine.length > 0 && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (lines.length === maxLines && words.length > 0) {
    const lastIndex = lines.length - 1;
    const finalLine = lines[lastIndex] ?? "";

    if (context.measureText(finalLine).width > maxWidth) {
      let trimmedLine = finalLine;

      while (trimmedLine.length > 0 && context.measureText(`${trimmedLine}…`).width > maxWidth) {
        trimmedLine = trimmedLine.slice(0, -1).trimEnd();
      }

      lines[lastIndex] = trimmedLine.length > 0 ? `${trimmedLine}…` : "…";
    }
  }

  return lines;
}

interface ShareCardLegPreview {
  outcomeLabel: string;
  probabilityLabel?: string;
  question: string;
}

interface ShareCardRenderInput {
  betCode: string;
  legCount: number;
  stake: string;
  totalReturn: string;
  capitalMultiple: string;
  legs: ShareCardLegPreview[];
}

async function renderShareCardPng(input: ShareCardRenderInput): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("Share card rendering requires a browser environment.");
  }

  const width = 1200;
  const height = 1500;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas rendering is unavailable.");
  }

  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#eff6ff");
  background.addColorStop(1, "#dbeafe");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const flare = context.createRadialGradient(width - 180, 120, 40, width - 180, 120, 380);
  flare.addColorStop(0, "rgba(59, 130, 246, 0.28)");
  flare.addColorStop(1, "rgba(59, 130, 246, 0)");
  context.fillStyle = flare;
  context.fillRect(0, 0, width, height);

  const shellX = 72;
  const shellY = 72;
  const shellWidth = width - shellX * 2;
  const shellHeight = height - shellY * 2;

  context.fillStyle = "rgba(255, 255, 255, 0.94)";
  drawRoundedRect(context, shellX, shellY, shellWidth, shellHeight, 40);
  context.fill();

  context.fillStyle = "#1d4ed8";
  context.font = '800 24px "Inter", "Arial", sans-serif';
  context.fillText("SABIMARKET", shellX + 44, shellY + 54);

  context.fillStyle = "#0f172a";
  context.font = '900 72px "Inter", "Arial", sans-serif';
  context.fillText(input.capitalMultiple, shellX + 44, shellY + 138);

  context.fillStyle = "#334155";
  context.font = '700 28px "Inter", "Arial", sans-serif';
  context.fillText(`${input.legCount}-leg structured stack`, shellX + 44, shellY + 184);

  const chipY = shellY + 220;
  const chipWidth = 280;
  const chipHeight = 108;
  const chipGap = 20;
  const chips = [
    { label: "Stake", value: input.stake },
    { label: "Return", value: input.totalReturn },
    { label: "Bet code", value: input.betCode.toUpperCase() },
  ];

  chips.forEach((chip, index) => {
    const x = shellX + 44 + index * (chipWidth + chipGap);
    context.fillStyle = "#eff6ff";
    drawRoundedRect(context, x, chipY, chipWidth, chipHeight, 24);
    context.fill();

    context.fillStyle = "#1d4ed8";
    context.font = '800 18px "Inter", "Arial", sans-serif';
    context.fillText(chip.label.toUpperCase(), x + 24, chipY + 34);

    context.fillStyle = "#0f172a";
    context.font = '800 34px "Inter", "Arial", sans-serif';
    context.fillText(chip.value, x + 24, chipY + 76);
  });

  context.fillStyle = "#0f172a";
  context.font = '800 24px "Inter", "Arial", sans-serif';
  context.fillText("Legs", shellX + 44, shellY + 386);

  const legWidth = shellWidth - 88;
  const legHeight = 210;
  const legGap = 22;
  const startY = shellY + 414;

  input.legs.slice(0, 3).forEach((leg, index) => {
    const y = startY + index * (legHeight + legGap);
    context.fillStyle = index === 0 ? "#0f172a" : "rgba(255, 255, 255, 0.84)";
    drawRoundedRect(context, shellX + 44, y, legWidth, legHeight, 28);
    context.fill();

    context.fillStyle = index === 0 ? "rgba(255, 255, 255, 0.75)" : "#1d4ed8";
    context.font = '800 18px "Inter", "Arial", sans-serif';
    const metaLabel = leg.probabilityLabel
      ? `${leg.outcomeLabel.toUpperCase()} • ${leg.probabilityLabel}`
      : leg.outcomeLabel.toUpperCase();
    context.fillText(metaLabel, shellX + 74, y + 42);

    context.fillStyle = index === 0 ? "#ffffff" : "#0f172a";
    context.font = '800 34px "Inter", "Arial", sans-serif';
    const lines = wrapCanvasText(context, leg.question, legWidth - 60, 4);

    lines.forEach((line, lineIndex) => {
      context.fillText(line, shellX + 74, y + 96 + lineIndex * 38);
    });
  });

  context.fillStyle = "#475569";
  context.font = '700 24px "Inter", "Arial", sans-serif';
  context.fillText("Open this exact slip with the bet code or shared link.", shellX + 44, height - 120);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error("Unable to encode the share card."));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

export default function StackSidebar(props: StackSidebarProps) {
  const { t } = useI18n();
  const [nowMs, setNowMs] = createSignal(Date.now());
  const [shareFeedback, setShareFeedback] = createSignal<string | null>(null);
  const [isRenderingShareCard, setRenderingShareCard] = createSignal(false);
  const [isCloseConfirmOpen, setCloseConfirmOpen] = createSignal(false);
  let shareFeedbackResetTimer: number | undefined;
  const legCount = createMemo(() => props.legs.length);
  const hasSelections = createMemo(() => legCount() > 0);
  const isCodeMode = createMemo(() => props.mode === "code");
  const isAiMode = createMemo(() => props.mode === "ai");
  const helperCopy = createMemo(() => {
    if (isCodeMode()) {
      return "Paste a shared bet code to open a ready-made slip, then play it without rebuilding the legs.";
    }

    if (isAiMode()) {
      return "Describe the stack you want and let the backend rank a few combinations against the live market slate.";
    }

    if (legCount() === 0) {
      return "Click any Yes or No chip to start a stack from the market grid.";
    }

    if (legCount() < STACK_MIN_LEGS) {
      return `Add ${STACK_MIN_LEGS - legCount()} more leg to request a quote.`;
    }

    if (!props.hasWallet) {
      return "Review the legs, set a stake, and estimate your payout. Sign in only when you're ready to place the stack.";
    }

    return "Review the legs, set a stake, and request a fresh stack quote.";
  });
  const isPreviewQuote = createMemo(() => props.quote?.status === "preview");
  const quoteFreshnessLabel = createMemo(() =>
    formatQuoteFreshnessLabel(props.quote?.quote.valid_until ?? null, nowMs(), isPreviewQuote()),
  );
  const canRequestQuote = createMemo(
    () => legCount() >= STACK_MIN_LEGS && props.amount.trim().length > 0 && !props.isQuoting,
  );
  const stakeDisplay = createMemo(() => {
    if (props.amount.trim().length === 0) {
      return "$0.00";
    }

    return formatUsdDisplay(props.amount);
  });
  const quoteButtonLabel = createMemo(() => {
    if (props.isQuoting) {
      return props.hasWallet ? "Pricing live quote..." : "Estimating payout...";
    }

    if (props.hasWallet) {
      return props.quote ? t("stack.refreshQuote") : t("stack.getLiveQuote");
    }

    return props.quote ? "Refresh estimate" : "Estimate payout";
  });
  const previewNotice = createMemo(() => {
    if (isPreviewQuote() && props.quote?.pricing.payout_capped) {
      return `Estimated payout is capped at ${props.quote.pricing.max_supported_capital_multiple} of stake.`;
    }

    if (isPreviewQuote()) {
      return "Estimated payout only. Sign in when you're ready to place this stack.";
    }

    if (!props.hasWallet) {
      return "No login needed to estimate payout.";
    }

    return null;
  });
  const correlationSummary = createMemo(() => {
    const quote = props.quote;

    if (!quote) {
      return null;
    }

    const independent = quote.pricing.independent_joint_probability_bps;
    const effective = quote.pricing.effective_joint_probability_bps;

    if (independent <= 0 || effective <= independent) {
      return null;
    }

    return {
      premiumPercent: Math.round(((effective - independent) / independent) * 100),
      jointProbabilityLabel:
        formatProbabilityFromBps(quote.pricing.effective_joint_probability_bps) ?? "--",
    };
  });
  const executionBlockers = createMemo(() => props.quote?.execution_blockers ?? []);
  const canExecute = createMemo(
    () =>
      Boolean(props.quote) &&
      !isPreviewQuote() &&
      props.quote!.executable &&
      executionBlockers().length === 0 &&
      props.hasSmartAccount &&
      !props.isExecuting,
  );
  const executeButtonLabel = createMemo(() => {
    if (props.isExecuting) {
      return "Placing stack...";
    }

    return "Execute stack";
  });
  const displayedTotalReturn = createMemo(() => {
    const quote = props.quote;

    if (!quote) {
      return null;
    }

    if (isPreviewQuote()) {
      return formatUsdDecimal(quote.pricing.estimated_total_return);
    }

    return formatUsdBaseUnits(quote.quote.total_return);
  });
  const displayedPotentialProfit = createMemo(() => {
    const quote = props.quote;

    if (!quote) {
      return null;
    }

    if (isPreviewQuote()) {
      return formatUsdDecimal(quote.pricing.estimated_potential_profit);
    }

    return formatUsdBaseUnits(quote.quote.potential_profit);
  });
  const displayedCapitalMultiple = createMemo(() => {
    const quote = props.quote;

    if (!quote) {
      return null;
    }

    if (isPreviewQuote()) {
      return quote.pricing.estimated_capital_multiple;
    }

    return quote.pricing.capital_multiple;
  });

  createEffect(() => {
    props.executionResult;
    setShareFeedback(null);
  });

  createEffect(() => {
    if (!props.isOpen) {
      setCloseConfirmOpen(false);
    }
  });

  onCleanup(() => {
    if (shareFeedbackResetTimer !== undefined && typeof window !== "undefined") {
      window.clearTimeout(shareFeedbackResetTimer);
    }
  });

  const shareUrl = createMemo(() => {
    const code = props.executionResult?.bet_code?.trim();

    if (!code || typeof window === "undefined") {
      return "";
    }

    return new URL(`/bets/${encodeURIComponent(code)}`, window.location.origin).toString();
  });

  const shareText = createMemo(() => {
    const result = props.executionResult;
    const code = result?.bet_code;

    if (!result || !code) {
      return "";
    }

    return [
      `${props.legs.length}-leg Sabimarket stack booked`,
      `${displayedCapitalMultiple() ?? "--"} potential`,
      `${stakeDisplay()} stake`,
      `${displayedTotalReturn() ?? "Return pending"} return`,
      `Code ${code.toUpperCase()}`,
    ].join(" • ");
  });
  const shareTargets = createMemo(() => {
    const url = shareUrl();
    const text = shareText();

    if (url.length === 0 || text.length === 0) {
      return [];
    }

    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);

    return [
      {
        label: "Post on X",
        href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      },
      {
        label: "WhatsApp",
        href: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}&app_absent=0`,
      },
      {
        label: "Telegram",
        href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      },
    ] as const;
  });
  const shareCardInput = createMemo<ShareCardRenderInput | null>(() => {
    const result = props.executionResult;
    const code = result?.bet_code?.trim();

    if (!result || !code) {
      return null;
    }

    return {
      betCode: code,
      legCount: props.legs.length,
      stake: stakeDisplay(),
      totalReturn: displayedTotalReturn() ?? "Return pending",
      capitalMultiple: displayedCapitalMultiple() ?? "--",
      legs: props.legs.map(leg => ({
        outcomeLabel: leg.outcomeLabel,
        probabilityLabel: leg.probabilityLabel,
        question: leg.question,
      })),
    };
  });
  const receiptHasBetCode = createMemo(() => {
    const code = props.executionResult?.bet_code?.trim();
    return Boolean(code);
  });
  const receiptTrackingHash = createMemo(() => props.executionResult?.tx_hash?.trim() ?? "");
  const receiptPrimaryValue = createMemo(() =>
    receiptHasBetCode()
      ? props.executionResult?.bet_code?.trim() ?? ""
      : receiptTrackingHash(),
  );
  const receiptPrimaryLabel = createMemo(() =>
    receiptHasBetCode() ? "Copy code" : "Copy tracking hash",
  );
  const receiptPrimaryFeedback = createMemo(() =>
    receiptHasBetCode() ? "Bet code copied." : "Tracking hash copied.",
  );

  const resetShareFeedback = () => {
    if (typeof window === "undefined") {
      return;
    }

    if (shareFeedbackResetTimer !== undefined) {
      window.clearTimeout(shareFeedbackResetTimer);
    }

    shareFeedbackResetTimer = window.setTimeout(() => {
      setShareFeedback(null);
      shareFeedbackResetTimer = undefined;
    }, SHARE_FEEDBACK_TIMEOUT_MS);
  };

  const copyToClipboard = async (value: string, successMessage: string) => {
    if (value.trim().length === 0) {
      setShareFeedback("Nothing to copy yet.");
      resetShareFeedback();
      return;
    }

    try {
      if (typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function") {
        await navigator.clipboard.writeText(value);
      } else if (!copy(value)) {
        setShareFeedback("Copy is not available in this browser.");
        resetShareFeedback();
        return;
      }

      setShareFeedback(successMessage);
    } catch {
      if (copy(value)) {
        setShareFeedback(successMessage);
      } else {
        setShareFeedback("Unable to copy right now.");
      }
    }

    resetShareFeedback();
  };

  const buildShareCardBlob = async () => {
    const input = shareCardInput();

    if (!input) {
      setShareFeedback("Bet code is still pending.");
      resetShareFeedback();
      return null;
    }

    setRenderingShareCard(true);

    try {
      return await renderShareCardPng(input);
    } catch {
      setShareFeedback("Unable to render the share card right now.");
      resetShareFeedback();
      return null;
    } finally {
      setRenderingShareCard(false);
    }
  };

  const downloadShareCard = async () => {
    const blob = await buildShareCardBlob();
    const code = shareCardInput()?.betCode?.toUpperCase();

    if (!blob || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `sabimarket-stack-${(code ?? "share-card").toLowerCase()}.png`;
    link.click();
    window.URL.revokeObjectURL(objectUrl);
    setShareFeedback("Share card downloaded.");
    resetShareFeedback();
  };

  const shareReceipt = async () => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      await copyToClipboard(shareUrl() || shareText(), "Share link copied.");
      return;
    }

    try {
      const blob = receiptHasBetCode() ? await buildShareCardBlob() : null;
      const code = shareCardInput()?.betCode?.toUpperCase() ?? "stack";
      const file =
        blob && typeof File !== "undefined"
          ? new File([blob], `sabimarket-stack-${code.toLowerCase()}.png`, { type: "image/png" })
          : null;
      const sharePayload =
        file &&
        (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }))
          ? {
              title: "Sabimarket bet code",
              text: shareText(),
              url: shareUrl() || undefined,
              files: [file],
            }
          : {
              title: "Sabimarket bet code",
              text: shareText(),
              url: shareUrl() || undefined,
            };

      await navigator.share(sharePayload);
      setShareFeedback("Share sheet opened.");
      resetShareFeedback();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      setShareFeedback("Unable to open the share sheet right now.");
      resetShareFeedback();
    }
  };

  createEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    onCleanup(() => window.clearInterval(timer));
  });

  const collapsedSummary = createMemo(() => {
    if (props.quote) {
      const multiple = isPreviewQuote()
        ? props.quote.pricing.estimated_capital_multiple
        : props.quote.pricing.capital_multiple;
      return `${multiple} potential`;
    }

    if (legCount() === 1) {
      return "1 leg selected";
    }

    return `${legCount()} legs selected`;
  });
  const shouldConfirmDiscard = createMemo(() => {
    if (props.legs.length > 0) {
      return true;
    }

    if (props.amount.trim().length > 0 || props.betCodeInput.trim().length > 0) {
      return true;
    }

    if (props.aiPrompt.trim().length > 0 || props.aiSuggestions.length > 0) {
      return true;
    }

    return Boolean(
      props.quote ||
        props.errorMessage ||
        props.statusMessage ||
        props.executionResult ||
        props.betCodeError ||
        props.lookedUpBet ||
        props.aiError,
    );
  });

  const requestSidebarClose = () => {
    if (shouldConfirmDiscard()) {
      setCloseConfirmOpen(true);
      return;
    }

    props.onClose();
  };

  const confirmSidebarClose = () => {
    setCloseConfirmOpen(false);
    props.onClose();
  };

  return (
    <Show
      when={props.isOpen || hasSelections()}
      fallback={<></>}
    >
      <div
        classList={{
          "pm-stack-sidebar": true,
          "pm-stack-sidebar--open": props.isOpen,
          "pm-stack-sidebar--has-selections": hasSelections(),
        }}
      >
        <Show when={!props.isOpen && hasSelections()}>
          <button
            type="button"
            class="pm-stack-sidebar__collapsed"
            onClick={props.onOpen}
            aria-label="Open stack builder"
          >
            <span class="pm-stack-sidebar__collapsed-count">{legCount()}</span>
            <span class="pm-stack-sidebar__collapsed-copy">
              <strong>Stack builder</strong>
              <span>{collapsedSummary()}</span>
            </span>
            <span class="pm-stack-sidebar__collapsed-action">Open</span>
          </button>
        </Show>

        <Show when={props.isOpen}>
          <button
            type="button"
            class="pm-stack-sidebar__backdrop"
            aria-label="Close stack builder"
            onClick={requestSidebarClose}
          />

          <div class="pm-stack-sidebar__sheet">
            <div class="pm-stack-sidebar__sheet-handle" aria-hidden="true" />
            <div class="pm-stack-sidebar__panel">
              <div class="pm-stack-sidebar__header">
                <div class="pm-stack-sidebar__header-copy">
                  <p class="pm-stack-sidebar__eyebrow">Stack builder</p>
                  <h2 class="pm-stack-sidebar__title">{t("stack.title")}</h2>
                  <p class="pm-stack-sidebar__copy">{helperCopy()}</p>
                  <div class="pm-stack-sidebar__mode-tabs" role="tablist" aria-label="Stack modes">
                    <button
                      type="button"
                      classList={{
                        "pm-stack-sidebar__mode-tab": true,
                        "pm-stack-sidebar__mode-tab--active": props.mode === "builder",
                      }}
                      onClick={() => props.onModeChange("builder")}
                    >
                      {t("stack.builder")}
                    </button>
                    <button
                      type="button"
                      classList={{
                        "pm-stack-sidebar__mode-tab": true,
                        "pm-stack-sidebar__mode-tab--active": props.mode === "ai",
                      }}
                      onClick={() => props.onModeChange("ai")}
                    >
                      {t("stack.ai")}
                    </button>
                    <button
                      type="button"
                      classList={{
                        "pm-stack-sidebar__mode-tab": true,
                        "pm-stack-sidebar__mode-tab--active": props.mode === "code",
                      }}
                      onClick={() => props.onModeChange("code")}
                    >
                      {t("stack.code")}
                    </button>
                  </div>
                </div>
                <Show when={legCount() > 0}>
                  <span class="pm-stack-sidebar__count">
                    {legCount()} / {STACK_MAX_LEGS} legs
                  </span>
                </Show>

                <button
                  type="button"
                  class="pm-stack-sidebar__close"
                  onClick={requestSidebarClose}
                  aria-label="Collapse stack sidebar"
                >
                  ×
                </button>
              </div>

              <Show when={isAiMode()}>
                <div class="pm-stack-sidebar__ai-card">
                  <div class="pm-stack-sidebar__stake-copy">
                    <p class="pm-stack-sidebar__amount-label">Build with AI</p>
                    <p class="pm-stack-sidebar__stake-hint">
                      Ask for a theme, risk profile, or category mix. The suggestions use your
                      current stake for the preview if you already entered one.
                    </p>
                  </div>

                  <Show when={props.aiComposites.length > 0}>
                    <div class="pm-stack-sidebar__ai-composites">
                      <div class="pm-stack-sidebar__stake-copy">
                        <p class="pm-stack-sidebar__amount-label">Curated composites</p>
                        <p class="pm-stack-sidebar__stake-hint">
                          Start from a themed thesis instead of a blank prompt.
                        </p>
                      </div>

                      <div class="pm-stack-sidebar__ai-composite-grid">
                        <For each={props.aiComposites}>
                          {composite => (
                            <button
                              type="button"
                              class="pm-stack-sidebar__ai-composite"
                              onClick={() => props.onApplyAiComposite(composite)}
                            >
                              <div class="pm-stack-sidebar__ai-composite-head">
                                <strong>{composite.title}</strong>
                                <span>{composite.risk_label}</span>
                              </div>
                              <p>{composite.summary}</p>
                              <small>{composite.leg_count_hint} legs</small>
                            </button>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>

                  <div class="pm-stack-sidebar__ai-form">
                    <textarea
                      value={props.aiPrompt}
                      onInput={event => props.onAiPromptChange(event.currentTarget.value)}
                      placeholder="Example: Build me a 3-leg sports + macro stack with medium risk"
                      aria-label="AI stack prompt"
                    />
                    <button
                      type="button"
                      class="pm-button pm-button--primary"
                      disabled={props.isSuggesting}
                      onClick={props.onRequestAiSuggestions}
                    >
                      {props.isSuggesting ? "Finding stacks..." : "Suggest stacks"}
                    </button>
                  </div>

                  <Show when={props.isLoadingAiComposites && props.aiComposites.length === 0}>
                    <p class="pm-stack-sidebar__stake-hint">Loading curated composites...</p>
                  </Show>

                  <div class="pm-stack-sidebar__quick-picks pm-stack-sidebar__quick-picks--ai">
                    <For each={aiPromptPresets}>
                      {preset => (
                        <button type="button" onClick={() => props.onAiPromptChange(preset)}>
                          {preset}
                        </button>
                      )}
                    </For>
                  </div>

                  <Show when={props.aiError}>
                    <p class="pm-stack-sidebar__feedback pm-stack-sidebar__feedback--error">
                      {props.aiError}
                    </p>
                  </Show>

                  <Show when={props.aiSuggestions.length > 0}>
                    <div class="pm-stack-sidebar__ai-suggestions">
                      <For each={props.aiSuggestions}>
                        {suggestion => (
                          <div class="pm-stack-sidebar__ai-suggestion">
                            <div class="pm-stack-sidebar__ai-suggestion-head">
                              <div>
                                <p class="pm-stack-sidebar__amount-label">{suggestion.title}</p>
                                <p class="pm-stack-sidebar__stake-hint">{suggestion.summary}</p>
                              </div>
                              <span class="pm-stack-sidebar__ai-risk">{suggestion.risk_label}</span>
                            </div>

                            <div class="pm-stack-sidebar__ai-suggestion-metrics">
                              <span>Fit {formatPercentFromBps(suggestion.fit_score_bps)}</span>
                              <span>{suggestion.pricing.estimated_capital_multiple}</span>
                              <span>
                                Corr. {formatPercentFromBps(suggestion.correlation_penalty_bps)}
                              </span>
                            </div>

                            <div class="pm-stack-sidebar__ai-suggestion-legs">
                              <For each={suggestion.legs}>
                                {leg => (
                                  <div class="pm-stack-sidebar__ai-suggestion-leg">
                                    <p>{leg.question}</p>
                                    <span>
                                      {leg.outcome_label} • {leg.probability_display}
                                    </span>
                                    <small>{leg.why}</small>
                                  </div>
                                )}
                              </For>
                            </div>

                            <button
                              type="button"
                              class="pm-button pm-button--ghost"
                              disabled={props.isExplaining}
                              onClick={() => props.onRequestAiExplanationForSuggestion(suggestion)}
                            >
                              {props.isExplaining ? "Explaining..." : "Explain fit"}
                            </button>

                            <button
                              type="button"
                              class="pm-button pm-button--ghost"
                              onClick={() => props.onApplyAiSuggestion(suggestion)}
                            >
                              Use this stack
                            </button>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>

                  <Show when={props.aiExplainError}>
                    <p class="pm-stack-sidebar__feedback pm-stack-sidebar__feedback--error">
                      {props.aiExplainError}
                    </p>
                  </Show>

                  <Show when={props.aiExplanation}>
                    <div class="pm-stack-sidebar__ai-explanation">
                      <div class="pm-stack-sidebar__ai-explanation-head">
                        <div>
                          <p class="pm-stack-sidebar__amount-label">
                            AI explainer
                            <Show when={props.aiExplanationLabel}>
                              <> • {props.aiExplanationLabel}</>
                            </Show>
                          </p>
                          <p class="pm-stack-sidebar__stake-hint">{props.aiExplanation!.headline}</p>
                        </div>
                        <span class="pm-stack-sidebar__ai-risk">{props.aiExplanation!.source}</span>
                      </div>

                      <p class="pm-stack-sidebar__stake-hint">{props.aiExplanation!.summary}</p>

                      <div class="pm-stack-sidebar__ai-explanation-section">
                        <strong>Why the legs fit</strong>
                        <ul>
                          <For each={props.aiExplanation!.why_legs_fit}>
                            {item => <li>{item}</li>}
                          </For>
                        </ul>
                      </div>

                      <div class="pm-stack-sidebar__ai-explanation-section">
                        <strong>Correlation drivers</strong>
                        <ul>
                          <For each={props.aiExplanation!.correlation_drivers}>
                            {item => <li>{item}</li>}
                          </For>
                        </ul>
                      </div>

                      <div class="pm-stack-sidebar__ai-explanation-section">
                        <strong>Payout shift</strong>
                        <p>{props.aiExplanation!.payout_context}</p>
                      </div>

                      <div class="pm-stack-sidebar__ai-explanation-section">
                        <strong>Risk premium</strong>
                        <p>{props.aiExplanation!.risk_premium_context}</p>
                      </div>
                    </div>
                  </Show>
                </div>
              </Show>

              <Show when={props.quote && !isCodeMode() && !isAiMode()}>
                <div class="pm-stack-sidebar__quote-bar">
                  <span>{quoteFreshnessLabel()}</span>
                  <button
                    type="button"
                    class="pm-button pm-button--ghost"
                    disabled={props.isQuoting}
                    onClick={props.onRequestQuote}
                  >
                    Refresh
                  </button>
                </div>
              </Show>

              <Show when={correlationSummary() && !isCodeMode() && !isAiMode()}>
                <div class="pm-stack-sidebar__alert">
                  <p class="pm-stack-sidebar__alert-title">Correlation premium applied</p>
                  <p class="pm-stack-sidebar__alert-copy">
                    +{correlationSummary()!.premiumPercent}% | Joint prob.{" "}
                    {correlationSummary()!.jointProbabilityLabel}
                  </p>
                </div>
              </Show>

              <Show when={props.quote && !isCodeMode() && !isAiMode()}>
                <div class="pm-stack-sidebar__meta-card">
                  <span>Risk premium</span>
                  <strong>{formatPercentFromBps(props.quote!.pricing.house_edge_bps)}</strong>
                  <button
                    type="button"
                    class="pm-button pm-button--ghost"
                    disabled={props.isExplaining}
                    onClick={props.onRequestAiExplanationForCurrentStack}
                  >
                    {props.isExplaining ? "Explaining..." : "Explain"}
                  </button>
                </div>
              </Show>

              <Show when={props.aiExplainError && !isAiMode()}>
                <p class="pm-stack-sidebar__feedback pm-stack-sidebar__feedback--error">
                  {props.aiExplainError}
                </p>
              </Show>

              <Show when={props.aiExplanation && !isAiMode()}>
                <div class="pm-stack-sidebar__ai-explanation pm-stack-sidebar__ai-explanation--inline">
                  <div class="pm-stack-sidebar__ai-explanation-head">
                    <div>
                      <p class="pm-stack-sidebar__amount-label">AI explainer</p>
                      <p class="pm-stack-sidebar__stake-hint">{props.aiExplanation!.headline}</p>
                    </div>
                    <span class="pm-stack-sidebar__ai-risk">{props.aiExplanation!.source}</span>
                  </div>

                  <p class="pm-stack-sidebar__stake-hint">{props.aiExplanation!.summary}</p>

                  <div class="pm-stack-sidebar__ai-explanation-section">
                    <strong>Why the legs fit</strong>
                    <ul>
                      <For each={props.aiExplanation!.why_legs_fit}>{item => <li>{item}</li>}</For>
                    </ul>
                  </div>

                  <div class="pm-stack-sidebar__ai-explanation-section">
                    <strong>Correlation drivers</strong>
                    <ul>
                      <For each={props.aiExplanation!.correlation_drivers}>{item => <li>{item}</li>}</For>
                    </ul>
                  </div>

                  <div class="pm-stack-sidebar__ai-explanation-section">
                    <strong>Payout shift</strong>
                    <p>{props.aiExplanation!.payout_context}</p>
                  </div>

                  <div class="pm-stack-sidebar__ai-explanation-section">
                    <strong>Risk premium</strong>
                    <p>{props.aiExplanation!.risk_premium_context}</p>
                  </div>
                </div>
              </Show>

              <Show when={props.mode === "code"}>
                <div class="pm-stack-sidebar__code-card">
                  <div class="pm-stack-sidebar__stake-copy">
                    <p class="pm-stack-sidebar__amount-label">Play bet code</p>
                    <p class="pm-stack-sidebar__stake-hint">
                      Paste a shared code to load a ready-made slip without picking the legs manually.
                    </p>
                  </div>
                  <div class="pm-stack-sidebar__code-form">
                    <input
                      type="text"
                      value={props.betCodeInput}
                      onInput={event => props.onBetCodeInputChange(event.currentTarget.value)}
                      placeholder="Enter 6-character code"
                      aria-label="Bet code"
                    />
                    <button
                      type="button"
                      class="pm-button pm-button--ghost"
                      disabled={props.isLookingUpBetCode}
                      onClick={props.onLookupBetCode}
                    >
                      {props.isLookingUpBetCode ? "Loading..." : "Load"}
                    </button>
                  </div>

                  <Show when={props.betCodeError}>
                    <p class="pm-stack-sidebar__feedback pm-stack-sidebar__feedback--error">
                      {props.betCodeError}
                    </p>
                  </Show>

                  <Show when={props.lookedUpBet}>
                    <div class="pm-stack-sidebar__loaded-bet">
                      <div class="pm-stack-sidebar__loaded-bet-head">
                        <div>
                          <p class="pm-stack-sidebar__amount-label">
                            Code {formatBetCodeDisplay(props.lookedUpBet!.bet_code)}
                          </p>
                          <p class="pm-stack-sidebar__stake-hint">
                            {formatStatusLabel(props.lookedUpBet!.status)} •{" "}
                            {props.lookedUpBet!.leg_count} legs
                          </p>
                        </div>
                        <button
                          type="button"
                          class="pm-button pm-button--ghost"
                          onClick={props.onApplyLookedUpBet}
                        >
                          Play this bet
                        </button>
                      </div>

                      <div class="pm-stack-sidebar__loaded-bet-summary">
                        <span>{formatUsdBaseUnits(props.lookedUpBet!.stake)} stake</span>
                        <span>{formatUsdBaseUnits(props.lookedUpBet!.total_return)} return</span>
                        <span>{props.lookedUpBet!.capital_multiple}</span>
                      </div>

                      <div class="pm-stack-sidebar__loaded-bet-legs">
                        <For each={props.lookedUpBet!.legs}>
                          {leg => (
                            <div class="pm-stack-sidebar__loaded-bet-leg">
                              <p>{leg.question}</p>
                              <span>
                                {leg.outcome_label}
                                <Show when={leg.probability_display}>
                                  <> • {leg.probability_display}</>
                                </Show>
                              </span>
                            </div>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>
                </div>
              </Show>

              <Show
                when={!isAiMode()}
                fallback={
                  <Show when={props.aiSuggestions.length === 0}>
                    <div class="pm-stack-sidebar__empty pm-stack-sidebar__empty--ai">
                      <p>No AI stack loaded yet.</p>
                      <p>Write a prompt above and the backend will rank a few live combinations.</p>
                    </div>
                  </Show>
                }
              >
                <Show
                when={props.legs.length > 0}
                fallback={
                  <Show when={props.mode !== "code" || !props.lookedUpBet}>
                    <div class="pm-stack-sidebar__empty">
                      <p>{props.mode === "code" ? "No shared bet loaded yet." : "No legs selected yet."}</p>
                      <p>
                        {props.mode === "code"
                          ? "Paste a code above to open a shared slip."
                          : "Outcome clicks from the market grid will start filling this slip."}
                      </p>
                    </div>
                  </Show>
                }
              >
                <div class="pm-stack-sidebar__legs">
                  <For each={props.legs}>
                    {leg => (
                      <div class="pm-stack-sidebar__leg">
                        <button
                          type="button"
                          class="pm-stack-sidebar__leg-dismiss"
                          onClick={() => props.onRemoveLeg(leg.marketId)}
                          aria-label={`Remove ${leg.label}`}
                        >
                          ×
                        </button>
                        <p class="pm-stack-sidebar__leg-question">{leg.question}</p>
                        <div class="pm-stack-sidebar__leg-meta">
                          <span
                            classList={{
                              "pm-stack-sidebar__leg-outcome": true,
                              "pm-stack-sidebar__leg-outcome--yes": leg.outcomeIndex === 0,
                              "pm-stack-sidebar__leg-outcome--no": leg.outcomeIndex !== 0,
                            }}
                          >
                            {leg.outcomeLabel}
                          </span>
                          <span>{leg.probabilityLabel}</span>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
                </Show>
              </Show>

              <Show when={!isCodeMode()}>
                <div class="pm-stack-sidebar__stake-card">
                  <div class="pm-stack-sidebar__stake-head">
                    <div class="pm-stack-sidebar__stake-copy">
                      <p class="pm-stack-sidebar__amount-label">{t("stack.stake")}</p>
                      <p class="pm-stack-sidebar__stake-hint">
                        {isAiMode()
                          ? "Optional for AI preview pricing. Enter your amount in USDC."
                          : "Enter your amount in USDC."}
                      </p>
                    </div>
                    <button
                      type="button"
                      class="pm-stack-sidebar__amount-max"
                      disabled={!props.maxAmount}
                      onClick={props.onUseMaxAmount}
                    >
                      Max
                    </button>
                  </div>

                  <label class="pm-stack-sidebar__amount">
                    <div class="pm-stack-sidebar__amount-box">
                      <span class="pm-stack-sidebar__amount-currency">$</span>
                      <input
                        type="text"
                        inputmode="decimal"
                        value={props.amount}
                        onInput={event => props.onAmountChange(event.currentTarget.value)}
                        aria-label="Stack amount"
                        placeholder="0.00"
                      />
                      <span class="pm-stack-sidebar__amount-unit">USDC</span>
                    </div>
                  </label>

                  <div class="pm-stack-sidebar__quick-picks">
                    <For each={quickAmounts}>
                      {value => (
                        <button type="button" onClick={() => props.onAmountChange(value)}>
                          ${value}
                        </button>
                      )}
                    </For>
                    <Show when={props.legs.length > 0}>
                      <button type="button" onClick={props.onClearLegs}>
                        {t("stack.clear")}
                      </button>
                    </Show>
                  </div>
                </div>

                <Show when={props.errorMessage}>
                  <p class="pm-stack-sidebar__feedback pm-stack-sidebar__feedback--error">
                    {props.errorMessage}
                  </p>
                </Show>

                <Show when={props.statusMessage}>
                  <p class="pm-stack-sidebar__feedback">{props.statusMessage}</p>
                </Show>

                <Show when={executionBlockers().length > 0}>
                  <div class="pm-stack-sidebar__blockers">
                    <p class="pm-stack-sidebar__blockers-title">Needs attention</p>
                    <ul class="pm-stack-sidebar__blockers-list">
                      <For each={executionBlockers()}>
                        {blocker => <li>{blocker}</li>}
                      </For>
                    </ul>
                  </div>
                </Show>

                <Show when={!isAiMode()}>
                  <div class="pm-stack-sidebar__action-card">
                    <div class="pm-stack-sidebar__action-summary">
                      <div class="pm-stack-sidebar__action-row">
                        <span>{t("stack.stake")}</span>
                        <strong>{stakeDisplay()}</strong>
                      </div>

                      <Show when={props.quote}>
                        <div class="pm-stack-sidebar__action-row">
                          <span>{isPreviewQuote() ? "Est. total return" : "Total return"}</span>
                          <strong>{displayedTotalReturn()}</strong>
                        </div>

                        <div class="pm-stack-sidebar__action-row pm-stack-sidebar__action-row--emphasis">
                          <span>{isPreviewQuote() ? "Est. to win" : "To win"}</span>
                          <strong>{displayedPotentialProfit()}</strong>
                        </div>

                        <div class="pm-stack-sidebar__action-row">
                          <span>{isPreviewQuote() ? "Est. multiplier" : "Multiplier"}</span>
                          <strong>{displayedCapitalMultiple()}</strong>
                        </div>

                        <Show when={props.quote!.pricing.payout_capped}>
                          <div class="pm-stack-sidebar__action-row">
                            <span>Live cap</span>
                            <strong>{props.quote!.pricing.max_supported_capital_multiple}</strong>
                          </div>
                        </Show>

                        <Show when={!isPreviewQuote()}>
                          <p class="pm-stack-sidebar__profit-copy">
                            Return on capital:{" "}
                            {formatReturnOnCapital(props.quote!.pricing.payout_multiple_bps)}
                          </p>
                        </Show>
                      </Show>

                      <Show when={!props.quote}>
                        <p class="pm-stack-sidebar__action-placeholder">
                          Build at least {STACK_MIN_LEGS} legs and request a quote to see your payout.
                        </p>
                      </Show>
                    </div>

                    <button
                      type="button"
                      class="pm-button pm-button--primary pm-stack-sidebar__quote-button"
                      disabled={!canRequestQuote()}
                      onClick={props.onRequestQuote}
                    >
                      {quoteButtonLabel()}
                    </button>

                    <Show when={previewNotice()}>
                      <p class="pm-stack-sidebar__profit-copy">{previewNotice()}</p>
                    </Show>

                    <Show when={props.quote && !isPreviewQuote()}>
                      <button
                        type="button"
                        class="pm-button pm-button--primary pm-stack-sidebar__execute"
                        disabled={!canExecute()}
                        onClick={props.onExecute}
                      >
                        {executeButtonLabel()}
                      </button>
                    </Show>

                    <Show when={props.quote && !isPreviewQuote() && !props.hasSmartAccount}>
                      <p class="pm-stack-sidebar__profit-copy">
                        Stack placement currently requires a smart-account wallet.
                      </p>
                    </Show>
                  </div>
                </Show>
              </Show>
            </div>
          </div>
        </Show>

        <Show when={props.isOpen && isCloseConfirmOpen()}>
          <div class="pm-stack-sidebar__confirm-backdrop" />
          <div
            class="pm-stack-sidebar__confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="stack-close-confirm-title"
            aria-describedby="stack-close-confirm-copy"
          >
            <div class="pm-stack-sidebar__confirm-copy">
              <p class="pm-stack-sidebar__eyebrow">Discard stack</p>
              <h3 id="stack-close-confirm-title">Close this builder?</h3>
              <p id="stack-close-confirm-copy">
                This will remove the current legs, stake, quote, and any AI or bet-code work in
                progress.
              </p>
            </div>

            <div class="pm-stack-sidebar__confirm-actions">
              <button
                type="button"
                class="pm-button pm-button--ghost"
                onClick={() => setCloseConfirmOpen(false)}
              >
                No
              </button>
              <button
                type="button"
                class="pm-button pm-button--primary"
                onClick={confirmSidebarClose}
              >
                Yes, close
              </button>
            </div>
          </div>
        </Show>

        <Show when={props.executionResult}>
          {executionResult => (
            <Dialog.Root
              open
              onOpenChange={isOpen => {
                if (!isOpen) {
                  props.onDismissExecutionResult();
                }
              }}
            >
              <Dialog.Portal>
                <Dialog.Overlay class="pm-stack-sidebar__receipt-backdrop" />
                <Dialog.Content class="pm-stack-sidebar__receipt">
                  <div class="pm-stack-sidebar__receipt-head">
                    <div class="pm-stack-sidebar__receipt-head-copy">
                      <span
                        classList={{
                          "pm-stack-sidebar__receipt-status": true,
                          "pm-stack-sidebar__receipt-status--submitted":
                            executionResult().execution_status !== "confirmed",
                        }}
                      >
                        {executionResult().execution_status === "confirmed"
                          ? "Confirmed"
                          : "Pending confirmation"}
                      </span>
                      <p class="pm-stack-sidebar__eyebrow">Stack booked</p>
                    </div>
                    <button
                      type="button"
                      class="pm-stack-sidebar__receipt-close"
                      onClick={props.onDismissExecutionResult}
                      aria-label="Close share popup"
                    >
                      ×
                    </button>
                  </div>

                  <Dialog.Title class="pm-stack-sidebar__receipt-title">
                    {executionResult().execution_status === "confirmed"
                      ? "Your stack is live"
                      : "Your stack is on the way"}
                  </Dialog.Title>

                  <Dialog.Description class="pm-stack-sidebar__receipt-copy">
                    {receiptHasBetCode()
                      ? "Copy the bet code, send the share link, or post it directly to your channels."
                      : "Confirmation is still pending. Keep the tracking hash handy until the bet code is ready."}
                  </Dialog.Description>

                  <div class="pm-stack-sidebar__receipt-value-card">
                    <p class="pm-stack-sidebar__receipt-value-label">
                      {receiptHasBetCode() ? "Bet code" : "Tracking hash"}
                    </p>
                    <div class="pm-stack-sidebar__receipt-value-row">
                      <div class="pm-stack-sidebar__receipt-code">
                        {receiptHasBetCode()
                          ? formatBetCodeDisplay(executionResult().bet_code!)
                          : formatTrackingHashDisplay(receiptTrackingHash())}
                      </div>
                      <button
                        type="button"
                        class="pm-button pm-button--primary pm-stack-sidebar__receipt-copy-button"
                        onClick={() =>
                          copyToClipboard(receiptPrimaryValue(), receiptPrimaryFeedback())
                        }
                      >
                        {receiptPrimaryLabel()}
                      </button>
                    </div>
                  </div>

                  <div class="pm-stack-sidebar__receipt-summary">
                    <span>{props.legs.length} legs</span>
                    <span>{stakeDisplay()} stake</span>
                    <span>{displayedCapitalMultiple() ?? "--"} potential</span>
                  </div>

                  <Show when={receiptHasBetCode()}>
                    <div class="pm-stack-sidebar__receipt-share">
                      <div class="pm-stack-sidebar__receipt-share-copy">
                        <p class="pm-stack-sidebar__receipt-share-title">Share this slip</p>
                        <p class="pm-stack-sidebar__receipt-share-text">
                          Download the card as a PNG, open it on another device, or publish it
                          directly.
                        </p>
                      </div>

                      <div class="pm-stack-sidebar__receipt-share-card">
                        <div class="pm-stack-sidebar__receipt-share-banner">
                          <span class="pm-stack-sidebar__receipt-share-kicker">
                            Structured stack
                          </span>
                          <strong>{displayedCapitalMultiple() ?? "--"}</strong>
                        </div>
                        <p class="pm-stack-sidebar__receipt-share-summary">{shareText()}</p>
                        <div class="pm-stack-sidebar__receipt-share-legs">
                          <For each={props.legs.slice(0, 3)}>
                            {leg => (
                              <div class="pm-stack-sidebar__receipt-share-leg">
                                <span class="pm-stack-sidebar__receipt-share-outcome">
                                  {leg.outcomeLabel}
                                </span>
                                <span>{leg.question}</span>
                              </div>
                            )}
                          </For>
                        </div>
                      </div>

                      <div class="pm-stack-sidebar__receipt-actions">
                        <button
                          type="button"
                          class="pm-button pm-button--ghost"
                          disabled={isRenderingShareCard()}
                          onClick={() => void downloadShareCard()}
                        >
                          {isRenderingShareCard() ? "Preparing card..." : "Download PNG"}
                        </button>
                        <button
                          type="button"
                          class="pm-button pm-button--ghost"
                          onClick={() =>
                            copyToClipboard(shareUrl() || shareText(), "Share link copied.")
                          }
                        >
                          Copy link
                        </button>
                        <button
                          type="button"
                          class="pm-button pm-button--ghost"
                          onClick={() => void shareReceipt()}
                        >
                          System share
                        </button>
                        <For each={shareTargets()}>
                          {target => (
                            <a
                              class="pm-button pm-button--ghost pm-stack-sidebar__receipt-share-link"
                              href={target.href}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {target.label}
                            </a>
                          )}
                        </For>
                      </div>

                      <p class="pm-stack-sidebar__receipt-share-note">
                        X can prefill the caption and link, but the PNG still needs to be attached
                        manually after you download it.
                      </p>
                    </div>
                  </Show>

                  <Show
                    when={executionResult().execution_status === "submitted" && !receiptHasBetCode()}
                  >
                    <p class="pm-stack-sidebar__receipt-note">
                      The bet code appears after confirmation. If this takes longer than expected,
                      retry after the chain catches up.
                    </p>
                  </Show>

                  <Show when={shareFeedback()}>
                    <p class="pm-stack-sidebar__feedback pm-stack-sidebar__receipt-feedback">
                      {shareFeedback()}
                    </p>
                  </Show>

                  <div class="pm-stack-sidebar__receipt-footer">
                    <div class="pm-stack-sidebar__receipt-meta">
                      <Show when={executionResult().position_id}>
                        <p>Position #{executionResult().position_id}</p>
                      </Show>
                      <p class="pm-stack-sidebar__hash">{executionResult().tx_hash}</p>
                    </div>

                    <button
                      type="button"
                      class="pm-button pm-button--ghost"
                      onClick={props.onDismissExecutionResult}
                    >
                      Done
                    </button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}
        </Show>
      </div>
    </Show>
  );
}
