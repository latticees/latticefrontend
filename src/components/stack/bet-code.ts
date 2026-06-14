export const STACK_BET_CODE_QUERY_PARAM = "betCode";
export const STACK_OPEN_BET_CODE_EVENT = "sabi:open-stack-bet-code";
export const STACK_BUILDER_QUERY_PARAM = "stackBuilder";
export const STACK_OPEN_BUILDER_EVENT = "sabi:open-stack-builder";

export type StackBuilderMode = "builder" | "ai";

export function normalizeStackBetCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function normalizeStackBuilderMode(value: string | null | undefined): StackBuilderMode | null {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (normalized === "builder" || normalized === "ai") {
    return normalized;
  }

  return null;
}
