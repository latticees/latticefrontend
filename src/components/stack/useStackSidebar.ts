import { useLocation } from "@solidjs/router";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";

import {
  AUTH_SESSION_CHANGE_EVENT,
  readStoredAuthSession,
} from "~/lib/auth/session.ts";
import { faucetClient, formatUsdcBaseUnits, parseUsdcAmountInput } from "~/lib/faucet/index.ts";
import {
  ApiError,
  marketClient,
  type StackAiExplainResponse,
  type ExecuteStackResponse,
  type StackCompositeResponse,
  type StackAiSuggestionResponse,
  type StackBetResponse,
  type StackQuoteEnvelopeResponse,
} from "~/lib/market/index.ts";

import {
  STACK_MAX_LEGS,
  STACK_MIN_LEGS,
  buildStackSidebarLegFromAiSuggestionLeg,
  buildStackSidebarLegFromBetLeg,
  buildSelectedOutcomeMap,
  toggleStackSidebarLeg,
  type StackSelectableMarket,
  type StackSidebarLeg,
} from "./model.ts";
import {
  STACK_BET_CODE_QUERY_PARAM,
  STACK_BUILDER_QUERY_PARAM,
  STACK_OPEN_BUILDER_EVENT,
  STACK_OPEN_BET_CODE_EVENT,
  normalizeStackBuilderMode,
  normalizeStackBetCode,
  type StackBuilderMode,
} from "./bet-code.ts";
import {
  clearStoredStackSidebarState,
  readStoredStackSidebarState,
  writeStoredStackSidebarState,
} from "./storage.ts";
import {
  markOnboardingFirstStackBooked,
  markOnboardingStackLoaded,
} from "../onboarding/state.ts";

function getStackQuoteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unable to price this stack right now.";
}

export function useStackSidebar() {
  const location = useLocation();
  const readSession = () => readStoredAuthSession();
  const readWalletAddress = () => readStoredAuthSession()?.user.wallet?.wallet_address?.trim() ?? "";
  const readAccountKind = () => readStoredAuthSession()?.user.wallet?.account_kind?.trim() ?? "";
  const [isOpen, setOpen] = createSignal(false);
  const [mode, setMode] = createSignal<"builder" | "code" | "ai">("builder");
  const [legs, setLegs] = createSignal<StackSidebarLeg[]>([]);
  const [amount, setAmount] = createSignal("");
  const [quote, setQuote] = createSignal<StackQuoteEnvelopeResponse | null>(null);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [isQuoting, setQuoting] = createSignal(false);
  const [isExecuting, setExecuting] = createSignal(false);
  const [executionResult, setExecutionResult] = createSignal<ExecuteStackResponse | null>(null);
  const [statusMessage, setStatusMessage] = createSignal<string | null>(null);
  const [maxAmount, setMaxAmount] = createSignal<string | null>(null);
  const [hasWallet, setHasWallet] = createSignal(Boolean(readWalletAddress()));
  const [hasSmartAccount, setHasSmartAccount] = createSignal(readAccountKind() === "smart_account");
  const [betCodeInput, setBetCodeInput] = createSignal("");
  const [betCodeError, setBetCodeError] = createSignal<string | null>(null);
  const [isLookingUpBetCode, setLookingUpBetCode] = createSignal(false);
  const [lookedUpBet, setLookedUpBet] = createSignal<StackBetResponse | null>(null);
  const [aiPrompt, setAiPrompt] = createSignal("");
  const [aiError, setAiError] = createSignal<string | null>(null);
  const [isSuggesting, setSuggesting] = createSignal(false);
  const [aiSuggestions, setAiSuggestions] = createSignal<StackAiSuggestionResponse[]>([]);
  const [aiComposites, setAiComposites] = createSignal<StackCompositeResponse[]>([]);
  const [isLoadingAiComposites, setLoadingAiComposites] = createSignal(false);
  const [aiExplainError, setAiExplainError] = createSignal<string | null>(null);
  const [isExplaining, setExplaining] = createSignal(false);
  const [aiExplanation, setAiExplanation] = createSignal<StackAiExplainResponse | null>(null);
  const [aiExplanationLabel, setAiExplanationLabel] = createSignal<string | null>(null);
  const [hasHydratedStorage, setHasHydratedStorage] = createSignal(false);
  const [lastHandledQueryBetCode, setLastHandledQueryBetCode] = createSignal("");
  const [lastHandledQueryBuilderMode, setLastHandledQueryBuilderMode] =
    createSignal<StackBuilderMode | null>(null);
  const selectedOutcomeByMarketId = createMemo(() => buildSelectedOutcomeMap(legs()));
  let balanceRequestId = 0;
  let sidebarRequestVersion = 0;

  const clearQuote = () => {
    setQuote(null);
    setErrorMessage(null);
    setExecutionResult(null);
    setStatusMessage(null);
    setAiExplanation(null);
    setAiExplanationLabel(null);
    setAiExplainError(null);
  };

  const currentSidebarRequestVersion = () => sidebarRequestVersion;
  const invalidateSidebarRequests = () => {
    sidebarRequestVersion += 1;
  };

  const resetSidebarState = () => {
    setMode("builder");
    setLegs([]);
    setAmount("");
    clearQuote();
    setBetCodeInput("");
    setBetCodeError(null);
    setLookingUpBetCode(false);
    setLookedUpBet(null);
    setAiPrompt("");
    setAiError(null);
    setSuggesting(false);
    setAiSuggestions([]);
    setExplaining(false);
    setQuoting(false);
    setExecuting(false);
  };

  const refreshMaxAmount = async () => {
    const walletAddress = readWalletAddress();
    const accountKind = readAccountKind();
    setHasWallet(Boolean(walletAddress));
    setHasSmartAccount(accountKind === "smart_account");

    if (!walletAddress) {
      setMaxAmount(null);
      return;
    }

    const requestId = ++balanceRequestId;

    try {
      const response = await faucetClient.fetchUsdcBalance(walletAddress);

      if (requestId !== balanceRequestId) {
        return;
      }

      setMaxAmount(formatUsdcBaseUnits(response.balance));
    } catch {
      if (requestId === balanceRequestId) {
        setMaxAmount(null);
      }
    }
  };

  const openMode = (nextMode: "builder" | "code" | "ai") => {
    if (nextMode === "code") {
      openCodeLoader();
      return;
    }

    markOnboardingStackLoaded();
    setMode(nextMode);
    setOpen(true);

    if (maxAmount() === null) {
      void refreshMaxAmount();
    }
  };
  const openSidebar = () => openMode("builder");
  const openAiBuilder = () => openMode("ai");
  const openCodeLoader = (initialCode = "") => {
    markOnboardingStackLoaded();
    setMode("code");
    setOpen(true);
    setQuote(null);
    setErrorMessage(null);
    setStatusMessage(null);
    setExecutionResult(null);
    setBetCodeError(null);

    const normalizedCode = normalizeStackBetCode(initialCode);

    if (normalizedCode.length > 0) {
      setBetCodeInput(normalizedCode);
      void lookupBetCodeByCode(normalizedCode);
    }
  };
  const closeSidebar = () => {
    invalidateSidebarRequests();
    setOpen(false);
    resetSidebarState();
    clearStoredStackSidebarState();
  };

  const toggleOutcome = (market: StackSelectableMarket, outcomeIndex: number) => {
    setMode("builder");
    const result = toggleStackSidebarLeg(legs(), market, outcomeIndex, STACK_MAX_LEGS);

    if (result.limitReached) {
      setErrorMessage(`Stacks currently support up to ${STACK_MAX_LEGS} legs.`);
      setOpen(true);
      return;
    }

    if (!result.changed) {
      return;
    }

    setLegs(result.legs);
    clearQuote();
    openSidebar();
  };

  const removeLeg = (marketId: string) => {
    setLegs(current => current.filter(leg => leg.marketId !== marketId));
    clearQuote();
  };

  const clearLegs = () => {
    setLegs([]);
    clearQuote();
    setOpen(false);
  };

  const requestAiSuggestions = async () => {
    const prompt = aiPrompt().trim();
    if (prompt.length === 0) {
      setAiError("Describe the kind of stack you want first.");
      setMode("ai");
      setOpen(true);
      return;
    }

    await requestAiSuggestionsForPrompt(prompt);
  };

  const applyAiSuggestion = (suggestion: StackAiSuggestionResponse) => {
    markOnboardingStackLoaded();
    setLegs(suggestion.legs.map(buildStackSidebarLegFromAiSuggestionLeg));
    setMode("builder");
    clearQuote();
    setAiError(null);
    setOpen(true);
  };

  const applyAiComposite = async (composite: StackCompositeResponse) => {
    setAiPrompt(composite.prompt);
    setAiError(null);
    setMode("ai");
    setOpen(true);
    await requestAiSuggestionsForPrompt(composite.prompt);
  };

  const requestQuote = async () => {
    if (isQuoting()) {
      return;
    }

    const walletAddress = readWalletAddress() || undefined;

    let parsedStake: ReturnType<typeof parseUsdcAmountInput>;

    try {
      parsedStake = parseUsdcAmountInput(amount());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Enter a valid stake.");
      setOpen(true);
      return;
    }

    if (legs().length < STACK_MIN_LEGS) {
      setErrorMessage("Pick at least two legs before requesting a quote.");
      setOpen(true);
      return;
    }

    setQuoting(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setExecutionResult(null);
    const requestVersion = currentSidebarRequestVersion();

    try {
      const response = await marketClient.createStackQuote({
        recipient: walletAddress,
        stake: parsedStake.baseUnits,
        valid_for_seconds: 90,
        legs: legs().map(leg => ({
          market_id: leg.marketId,
          outcome: leg.outcomeIndex,
        })),
      });

      if (requestVersion !== currentSidebarRequestVersion()) {
        return;
      }

      setQuote(response);
      setOpen(true);
    } catch (error) {
      if (requestVersion !== currentSidebarRequestVersion()) {
        return;
      }

      setQuote(null);
      setErrorMessage(getStackQuoteErrorMessage(error));
      setOpen(true);
    } finally {
      if (requestVersion !== currentSidebarRequestVersion()) {
        return;
      }

      setQuoting(false);
    }
  };

  const requestBetCodeLookup = async () => {
    const normalizedCode = betCodeInput()
      ? normalizeStackBetCode(betCodeInput())
      : "";

    if (normalizedCode.length === 0) {
      setBetCodeError("Enter a bet code to load a saved stack.");
      return;
    }

    await lookupBetCodeByCode(normalizedCode);
  };

  const applyLookedUpBet = () => {
    const nextBet = lookedUpBet();

    if (!nextBet) {
      return;
    }

    markOnboardingStackLoaded();
    setLegs(nextBet.legs.slice(0, STACK_MAX_LEGS).map(buildStackSidebarLegFromBetLeg));
    setAmount(formatUsdcBaseUnits(nextBet.stake));
    setMode("builder");
    clearQuote();
    setBetCodeError(null);
    setLookedUpBet(null);
    setOpen(true);
  };

  const executeStack = async () => {
    if (isExecuting()) {
      return;
    }

    const session = readSession();
    const activeQuote = quote();

    if (!session?.token) {
      setStatusMessage(null);
      setErrorMessage("Sign in to place this stack.");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sabi:open-auth-modal"));
      }

      return;
    }

    if (!activeQuote || activeQuote.status === "preview") {
      setStatusMessage(null);
      setErrorMessage("Request a live quote before placing this stack.");
      return;
    }

    if (!activeQuote.executable) {
      setStatusMessage(null);
      setErrorMessage("This stack quote is not executable yet. Refresh the live quote first.");
      return;
    }

    if (session.user.wallet?.account_kind !== "smart_account") {
      setStatusMessage(null);
      setErrorMessage("Stack placement currently requires a smart-account wallet.");
      return;
    }

    setExecuting(true);
    setErrorMessage(null);
    setExecutionResult(null);
    setStatusMessage("Placing stack...");
    const requestVersion = currentSidebarRequestVersion();

    try {
      const response = await marketClient.executeStack(session.token, {
        quote_id: activeQuote.quote.quote_id,
      });
      if (requestVersion !== currentSidebarRequestVersion()) {
        return;
      }
      setExecutionResult(response);
      if (response.execution_status === "confirmed") {
        markOnboardingFirstStackBooked();
      }
      setBetCodeInput("");
      setLookedUpBet(null);
      setStatusMessage(
        response.execution_status === "confirmed"
          ? "Stack placed."
          : "Stack submitted. Wait for confirmation before placing another stack.",
      );
      setOpen(true);
    } catch (error) {
      if (requestVersion !== currentSidebarRequestVersion()) {
        return;
      }

      setStatusMessage(null);
      setErrorMessage(getStackQuoteErrorMessage(error));
    } finally {
      if (requestVersion !== currentSidebarRequestVersion()) {
        return;
      }

      setExecuting(false);
    }
  };

  const requestAiExplanationForCurrentStack = async () => {
    if (legs().length < STACK_MIN_LEGS) {
      setAiExplainError("Add at least two legs before requesting an explanation.");
      setMode("builder");
      setOpen(true);
      return;
    }

    await requestAiExplanationForLegs(
      legs().map(leg => ({ market_id: leg.marketId, outcome: leg.outcomeIndex })),
      "Current stack",
      aiPrompt().trim() || undefined,
    );
  };

  const requestAiExplanationForSuggestion = async (
    suggestion: StackAiSuggestionResponse,
  ) => {
    await requestAiExplanationForLegs(
      suggestion.legs.map(leg => ({ market_id: leg.market_id, outcome: leg.outcome_index })),
      suggestion.title,
      aiPrompt().trim() || suggestion.summary,
    );
  };

  const loadAiComposites = async () => {
    if (isLoadingAiComposites() || aiComposites().length > 0) {
      return;
    }

    setLoadingAiComposites(true);

    try {
      const response = await marketClient.fetchStackComposites();
      setAiComposites(response.composites);
    } catch {
      setAiComposites([]);
    } finally {
      setLoadingAiComposites(false);
    }
  };

  createEffect(() => {
    if (typeof window === "undefined" || hasHydratedStorage()) {
      return;
    }

    const storedState = readStoredStackSidebarState();

    if (storedState) {
      const restoredLegs = storedState.legs.slice(0, STACK_MAX_LEGS);
      setLegs(restoredLegs);
      setAmount(storedState.amount);
      setMode("builder");
      setOpen(storedState.isOpen && restoredLegs.length > 0);
    }

    setHasHydratedStorage(true);
  });

  createEffect(() => {
    const params = new URLSearchParams(location.search);
    const normalizedCode = normalizeStackBetCode(params.get(STACK_BET_CODE_QUERY_PARAM) ?? "");

    if (normalizedCode.length === 0) {
      setLastHandledQueryBetCode("");
      return;
    }

    if (normalizedCode === lastHandledQueryBetCode()) {
      return;
    }

    setLastHandledQueryBetCode(normalizedCode);
    setBetCodeInput(normalizedCode);
    setLookedUpBet(null);
    openCodeLoader(normalizedCode);
  });

  createEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedMode = normalizeStackBuilderMode(params.get(STACK_BUILDER_QUERY_PARAM));

    if (!requestedMode) {
      setLastHandledQueryBuilderMode(null);
      return;
    }

    if (requestedMode === lastHandledQueryBuilderMode()) {
      return;
    }

    setLastHandledQueryBuilderMode(requestedMode);
    openMode(requestedMode);

    if (typeof window !== "undefined") {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete(STACK_BUILDER_QUERY_PARAM);
      window.history.replaceState(
        window.history.state,
        "",
        `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
      );
    }
  });

  createEffect(() => {
    if (!hasHydratedStorage()) {
      return;
    }

    const currentLegs = legs();
    const currentAmount = amount();
    const currentIsOpen = isOpen();

    if (currentLegs.length === 0 && currentAmount.trim().length === 0) {
      clearStoredStackSidebarState();
      return;
    }

    writeStoredStackSidebarState({
      legs: currentLegs,
      amount: currentAmount,
      isOpen: currentIsOpen,
    });
  });

  createEffect(() => {
    if (!isOpen() || mode() !== "ai") {
      return;
    }

    void loadAiComposites();
  });

  createEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleSessionChange = () => {
      void refreshMaxAmount();
      const nextSession = readSession();
      const activeQuote = quote();

      if (
        activeQuote &&
        activeQuote.status !== "preview" &&
        nextSession?.user.wallet?.wallet_address &&
        nextSession.user.wallet.wallet_address.trim().toLowerCase() !==
          activeQuote.quote.recipient.trim().toLowerCase()
      ) {
        clearQuote();
      }
    };

    void refreshMaxAmount();
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, handleSessionChange);

    onCleanup(() => {
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, handleSessionChange);
    });
  });

  createEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleOpenBuilder = (event: Event) => {
      const detail = (event as CustomEvent<StackBuilderMode | { mode?: StackBuilderMode }>).detail;
      const requestedMode =
        normalizeStackBuilderMode(
          typeof detail === "string" ? detail : detail?.mode ?? "builder",
        ) ?? "builder";

      openMode(requestedMode);
    };

    const handleOpenBetCode = (event: Event) => {
      const detail = (event as CustomEvent<string | { code?: string }>).detail;
      const rawCode =
        typeof detail === "string" ? detail : typeof detail?.code === "string" ? detail.code : "";
      const normalizedCode = normalizeStackBetCode(rawCode);

      setBetCodeInput(normalizedCode);
      setLookedUpBet(null);
      setLastHandledQueryBetCode(normalizedCode);
      openCodeLoader(normalizedCode);
    };

    window.addEventListener(STACK_OPEN_BUILDER_EVENT, handleOpenBuilder);
    window.addEventListener(STACK_OPEN_BET_CODE_EVENT, handleOpenBetCode);

    onCleanup(() => {
      window.removeEventListener(STACK_OPEN_BUILDER_EVENT, handleOpenBuilder);
      window.removeEventListener(STACK_OPEN_BET_CODE_EVENT, handleOpenBetCode);
    });
  });

  return {
    isOpen,
    mode,
    openSidebar,
    openAiBuilder,
    openMode,
    openCodeLoader,
    closeSidebar,
    legs,
    amount,
    quote,
    errorMessage,
    isQuoting,
    isExecuting,
    hasWallet,
    hasSmartAccount,
    maxAmount,
    statusMessage,
    executionResult,
    betCodeInput,
    betCodeError,
    isLookingUpBetCode,
    lookedUpBet,
    aiPrompt,
    aiError,
    isSuggesting,
    aiSuggestions,
    aiComposites,
    isLoadingAiComposites,
    aiExplainError,
    isExplaining,
    aiExplanation,
    aiExplanationLabel,
    selectedOutcomeByMarketId,
    setAmount: (value: string) => {
      setAmount(value);
      clearQuote();
      setAiSuggestions([]);
      setAiError(null);
    },
    dismissExecutionResult: () => setExecutionResult(null),
    setBetCodeInput: (value: string) => {
      setBetCodeInput(value);
      setBetCodeError(null);
      setLookedUpBet(null);
    },
    setAiPrompt: (value: string) => {
      setAiPrompt(value);
      setAiError(null);
    },
    useMaxAmount: () => {
      const nextAmount = maxAmount();

      if (!nextAmount) {
        return;
      }

      setAmount(nextAmount);
      clearQuote();
      setAiSuggestions([]);
      setAiError(null);
    },
    toggleOutcome,
    removeLeg,
    clearLegs,
    requestAiSuggestions,
    applyAiSuggestion,
    applyAiComposite,
    requestAiExplanationForCurrentStack,
    requestAiExplanationForSuggestion,
    requestQuote,
    executeStack,
    lookupBetCode: requestBetCodeLookup,
    applyLookedUpBet,
  };

  async function requestAiSuggestionsForPrompt(prompt: string) {
    if (isSuggesting()) {
      return;
    }

    let parsedStake: ReturnType<typeof parseUsdcAmountInput> | null = null;
    if (amount().trim().length > 0) {
      try {
        parsedStake = parseUsdcAmountInput(amount());
      } catch (error) {
        setAiError(
          error instanceof Error ? error.message : "Enter a valid stake or leave it blank.",
        );
        setMode("ai");
        setOpen(true);
        return;
      }
    }

    setSuggesting(true);
    setAiError(null);
    setAiExplainError(null);
    setAiExplanation(null);
    setAiExplanationLabel(null);
    setErrorMessage(null);
    setStatusMessage(null);
    setExecutionResult(null);
    setMode("ai");
    setOpen(true);

    const requestVersion = currentSidebarRequestVersion();

    try {
      const response = await marketClient.suggestStackIdeas({
        prompt,
        stake: parsedStake?.baseUnits,
        max_legs: STACK_MAX_LEGS,
        suggestion_count: 3,
      });

      if (requestVersion !== currentSidebarRequestVersion()) {
        return;
      }

      setAiSuggestions(response.suggestions);
    } catch (error) {
      if (requestVersion !== currentSidebarRequestVersion()) {
        return;
      }

      setAiSuggestions([]);
      setAiError(getStackQuoteErrorMessage(error));
    } finally {
      if (requestVersion !== currentSidebarRequestVersion()) {
        return;
      }

      setSuggesting(false);
    }
  }

  async function requestAiExplanationForLegs(
    requestedLegs: Array<{ market_id: string; outcome: number }>,
    label: string,
    prompt: string | undefined,
  ) {
    if (isExplaining()) {
      return;
    }

    let parsedStake: ReturnType<typeof parseUsdcAmountInput> | null = null;
    if (amount().trim().length > 0) {
      try {
        parsedStake = parseUsdcAmountInput(amount());
      } catch (error) {
        setAiExplainError(error instanceof Error ? error.message : "Enter a valid stake first.");
        return;
      }
    }

    setExplaining(true);
    setAiExplainError(null);
    setAiExplanation(null);
    setAiExplanationLabel(label);
    setOpen(true);

    const requestVersion = currentSidebarRequestVersion();

    try {
      const response = await marketClient.explainStack({
        prompt,
        stake: parsedStake?.baseUnits,
        legs: requestedLegs,
      });

      if (requestVersion !== currentSidebarRequestVersion()) {
        return;
      }

      setAiExplanation(response);
    } catch (error) {
      if (requestVersion !== currentSidebarRequestVersion()) {
        return;
      }

      setAiExplainError(getStackQuoteErrorMessage(error));
    } finally {
      if (requestVersion !== currentSidebarRequestVersion()) {
        return;
      }

      setExplaining(false);
    }
  }

  async function lookupBetCodeByCode(normalizedCode: string) {
    if (normalizedCode.length === 0 || isLookingUpBetCode()) {
      return;
    }

    setLookingUpBetCode(true);
    setBetCodeError(null);
    setMode("code");
    setOpen(true);
    const requestVersion = currentSidebarRequestVersion();

    try {
      const response = await marketClient.fetchStackBet(normalizedCode);
      if (requestVersion !== currentSidebarRequestVersion()) {
        return;
      }
      setBetCodeInput(response.bet_code);
      setLookedUpBet(response);
      setExecutionResult(null);
      setOpen(true);
    } catch (error) {
      if (requestVersion !== currentSidebarRequestVersion()) {
        return;
      }

      setLookedUpBet(null);
      setBetCodeError(getStackQuoteErrorMessage(error));
    } finally {
      if (requestVersion !== currentSidebarRequestVersion()) {
        return;
      }

      setLookingUpBetCode(false);
    }
  }
}
