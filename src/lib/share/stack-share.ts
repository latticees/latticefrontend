import { formatUsdcBaseUnits } from "~/lib/faucet/index.ts";
import type { StackBetResponse } from "~/lib/market/index.ts";

export interface StackShareSnapshot {
  betCode: string;
  legCount: number;
  stake: string;
  totalReturn: string;
  potentialProfit: string;
  capitalMultiple: string;
  status: string;
  legs: Array<{
    question: string;
    outcomeLabel: string;
    probabilityDisplay?: string | null;
  }>;
}

export function formatBetCodeDisplay(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export function formatStackStatus(status: string): string {
  switch (status.trim().toLowerCase()) {
    case "open":
      return "Live";
    case "won":
      return "Won";
    case "lost":
      return "Lost";
    case "voided":
      return "Voided";
    default:
      return status;
  }
}

export function buildStackShareSnapshot(bet: StackBetResponse): StackShareSnapshot {
  return {
    betCode: bet.bet_code,
    legCount: bet.leg_count,
    stake: formatUsdcBaseUnits(bet.stake),
    totalReturn: formatUsdcBaseUnits(bet.total_return),
    potentialProfit: formatUsdcBaseUnits(bet.potential_profit),
    capitalMultiple: bet.capital_multiple,
    status: formatStackStatus(bet.status),
    legs: bet.legs.map(leg => ({
      question: leg.question,
      outcomeLabel: leg.outcome_label,
      probabilityDisplay: leg.probability_display,
    })),
  };
}

export function buildStackShareSummary(snapshot: StackShareSnapshot): string {
  return [
    `${snapshot.legCount}-leg Lattice stack`,
    `${snapshot.capitalMultiple} potential`,
    `${snapshot.stake} stake`,
    `${snapshot.totalReturn} return`,
    `Code ${snapshot.betCode.toUpperCase()}`,
  ].join(" • ");
}

export function buildStackShareDescription(snapshot: StackShareSnapshot): string {
  const topLegs = snapshot.legs
    .slice(0, 2)
    .map(leg => `${leg.outcomeLabel} - ${leg.question}`)
    .join(" • ");
  const remainingCount = Math.max(0, snapshot.legs.length - 2);

  return [
    topLegs,
    remainingCount > 0 ? `+${remainingCount} more leg${remainingCount === 1 ? "" : "s"}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" • ");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(value: string, maxChars: number, maxLines: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine.length > 0 ? `${currentLine} ${word}` : word;

    if (candidate.length <= maxChars) {
      currentLine = candidate;
      continue;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      lines.push(candidate.slice(0, maxChars));
      currentLine = candidate.slice(maxChars).trim();
    }

    if (lines.length === maxLines) {
      break;
    }
  }

  if (lines.length < maxLines && currentLine.length > 0) {
    lines.push(currentLine);
  }

  if (lines.length === maxLines && words.length > 0) {
    const lastIndex = lines.length - 1;
    const lastLine = lines[lastIndex] ?? "";
    lines[lastIndex] = lastLine.length > maxChars - 1 ? `${lastLine.slice(0, maxChars - 1)}…` : lastLine;
  }

  return lines;
}

function renderTextBlock(
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
): string {
  return lines
    .map(
      (line, index) =>
        `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("");
}

export function buildStackShareImageSvg(snapshot: StackShareSnapshot): string {
  const betCode = escapeXml(snapshot.betCode.toUpperCase());
  const summary = escapeXml(buildStackShareSummary(snapshot));

  const legCards = snapshot.legs.slice(0, 3).map((leg, index) => {
    const x = 76 + index * 350;
    const y = 318;
    const questionLines = wrapText(leg.question, 28, 3);
    const probability = leg.probabilityDisplay ? ` • ${leg.probabilityDisplay}` : "";

    return `
      <rect x="${x}" y="${y}" width="318" height="216" rx="28" fill="${
        index === 0 ? "#0f172a" : "rgba(255,255,255,0.92)"
      }" stroke="${index === 0 ? "rgba(15,23,42,0.18)" : "rgba(191,219,254,0.9)"}" />
      <text x="${x + 28}" y="${y + 34}" font-size="16" font-weight="800" fill="${
        index === 0 ? "rgba(255,255,255,0.76)" : "#1d4ed8"
      }" letter-spacing="1.4">${escapeXml(`${leg.outcomeLabel.toUpperCase()}${probability}`)}</text>
      <text x="${x + 28}" y="${y + 82}" font-size="30" font-weight="800" fill="${
        index === 0 ? "#ffffff" : "#0f172a"
      }">${renderTextBlock(questionLines, x + 28, y + 82, 34)}</text>
    `;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="600" y1="0" x2="600" y2="630" gradientUnits="userSpaceOnUse">
      <stop stop-color="#EFF6FF"/>
      <stop offset="1" stop-color="#DBEAFE"/>
    </linearGradient>
    <radialGradient id="flare" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1014 80) rotate(90) scale(240 310)">
      <stop stop-color="rgba(59,130,246,0.36)"/>
      <stop offset="1" stop-color="rgba(59,130,246,0)"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#flare)"/>
  <rect x="36" y="36" width="1128" height="558" rx="42" fill="rgba(255,255,255,0.94)"/>
  <text x="76" y="96" font-size="22" font-weight="800" fill="#1D4ED8" letter-spacing="2">SABIMARKET</text>
  <text x="76" y="176" font-size="62" font-weight="900" fill="#0F172A">${escapeXml(snapshot.capitalMultiple)}</text>
  <text x="76" y="214" font-size="24" font-weight="700" fill="#334155">${escapeXml(`${snapshot.legCount}-leg structured stack`)}</text>
  <rect x="830" y="72" width="286" height="42" rx="21" fill="#EFF6FF"/>
  <text x="973" y="99" text-anchor="middle" font-size="18" font-weight="800" fill="#1D4ED8">${escapeXml(snapshot.status)}</text>

  <rect x="76" y="242" width="220" height="62" rx="18" fill="#EFF6FF"/>
  <text x="98" y="266" font-size="14" font-weight="800" fill="#1D4ED8" letter-spacing="1.2">STAKE</text>
  <text x="98" y="291" font-size="28" font-weight="800" fill="#0F172A">${escapeXml(snapshot.stake)}</text>

  <rect x="314" y="242" width="220" height="62" rx="18" fill="#EFF6FF"/>
  <text x="336" y="266" font-size="14" font-weight="800" fill="#1D4ED8" letter-spacing="1.2">RETURN</text>
  <text x="336" y="291" font-size="28" font-weight="800" fill="#0F172A">${escapeXml(snapshot.totalReturn)}</text>

  <rect x="552" y="242" width="220" height="62" rx="18" fill="#EFF6FF"/>
  <text x="574" y="266" font-size="14" font-weight="800" fill="#1D4ED8" letter-spacing="1.2">BET CODE</text>
  <text x="574" y="291" font-size="28" font-weight="800" fill="#0F172A">${betCode}</text>

  <text x="76" y="574" font-size="16" font-weight="700" fill="#475569">${summary}</text>
  ${legCards.join("")}
</svg>`;
}
