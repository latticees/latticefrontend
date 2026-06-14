import type { StackSidebarLeg } from "./model.ts";

const STACK_SIDEBAR_STORAGE_KEY = "sabi_stack_builder/v1";

interface StoredStackSidebarState {
  amount: string;
  isOpen: boolean;
  legs: StackSidebarLeg[];
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isStoredLeg(value: unknown): value is StackSidebarLeg {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const leg = value as Partial<StackSidebarLeg>;

  return (
    typeof leg.marketId === "string" &&
    typeof leg.marketSlug === "string" &&
    typeof leg.eventSlug === "string" &&
    typeof leg.label === "string" &&
    typeof leg.question === "string" &&
    typeof leg.outcomeIndex === "number" &&
    typeof leg.outcomeLabel === "string" &&
    (typeof leg.probabilityBps === "number" || leg.probabilityBps === null) &&
    typeof leg.probabilityLabel === "string" &&
    typeof leg.centsLabel === "string"
  );
}

export function readStoredStackSidebarState(): StoredStackSidebarState | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STACK_SIDEBAR_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredStackSidebarState>;

    if (
      typeof parsed.amount !== "string" ||
      typeof parsed.isOpen !== "boolean" ||
      !Array.isArray(parsed.legs) ||
      !parsed.legs.every(isStoredLeg)
    ) {
      return null;
    }

    return {
      amount: parsed.amount,
      isOpen: parsed.isOpen,
      legs: parsed.legs,
    };
  } catch {
    return null;
  }
}

export function writeStoredStackSidebarState(state: StoredStackSidebarState) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(STACK_SIDEBAR_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write failures and keep runtime state only.
  }
}

export function clearStoredStackSidebarState() {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(STACK_SIDEBAR_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures on unsupported browsers.
  }
}
