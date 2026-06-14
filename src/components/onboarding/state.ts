export const ONBOARDING_PROGRESS_EVENT = "sabi:onboarding-progress";
const ONBOARDING_STACK_LOADED_KEY = "sabi:onboarding/stack-loaded";
const ONBOARDING_FIRST_STACK_KEY = "sabi:onboarding/first-stack";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitProgress() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(ONBOARDING_PROGRESS_EVENT));
}

export function markOnboardingStackLoaded() {
  if (canUseStorage()) {
    try {
      window.localStorage.setItem(ONBOARDING_STACK_LOADED_KEY, "1");
    } catch {
      // Ignore storage failures.
    }
  }

  emitProgress();
}

export function markOnboardingFirstStackBooked() {
  if (canUseStorage()) {
    try {
      window.localStorage.setItem(ONBOARDING_FIRST_STACK_KEY, "1");
    } catch {
      // Ignore storage failures.
    }
  }

  emitProgress();
}

export function readOnboardingStackLoaded(): boolean {
  if (!canUseStorage()) {
    return false;
  }

  try {
    return window.localStorage.getItem(ONBOARDING_STACK_LOADED_KEY) === "1";
  } catch {
    return false;
  }
}

export function readOnboardingFirstStackBooked(): boolean {
  if (!canUseStorage()) {
    return false;
  }

  try {
    return window.localStorage.getItem(ONBOARDING_FIRST_STACK_KEY) === "1";
  } catch {
    return false;
  }
}
