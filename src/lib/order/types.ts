import type { IsoDateTimeString } from "../market/types.ts";

export interface OrderClientOptions {
  baseUrl?: string;
}

export interface PositionOutcomeResponse {
  outcome_index: number;
  outcome_label: string;
  token_amount: string;
  estimated_value_usdc?: string | null;
}

export interface AmountResponse {
  raw: string;
  display: string;
}

export interface SignedAmountResponse {
  raw: string;
  display: string;
}

export interface PortfolioSummaryResponse {
  total_staked: AmountResponse;
  live_marked_value: AmountResponse;
  realized_pnl: SignedAmountResponse;
  unrealized_pnl: SignedAmountResponse;
  open_position_count: number;
  settled_position_count: number;
}

export interface PortfolioStoryItemResponse {
  bet_code?: string | null;
  position_id: string;
  status: string;
  title: string;
  opened_at: IsoDateTimeString;
  settled_at?: IsoDateTimeString | null;
  leg_count: number;
  stake: AmountResponse;
  current_value: AmountResponse;
  pnl: SignedAmountResponse;
  capital_multiple: string;
}

export interface PortfolioStoryResponse {
  best_call?: PortfolioStoryItemResponse | null;
  worst_call?: PortfolioStoryItemResponse | null;
  biggest_live_exposure?: PortfolioStoryItemResponse | null;
  biggest_multiplier_hit?: PortfolioStoryItemResponse | null;
  recent_wins: PortfolioStoryItemResponse[];
  recent_losses: PortfolioStoryItemResponse[];
}

export interface PortfolioPositionLegResponse {
  position_index: number;
  market_id?: string | null;
  condition_id?: string | null;
  market_ref: string;
  question: string;
  market_slug?: string | null;
  event_id?: string | null;
  event_slug?: string | null;
  outcome_index: number;
  outcome_label: string;
  probability_bps?: number | null;
  probability_display?: string | null;
  resolved_outcome?: number | null;
  resolved_voided?: boolean | null;
}

export interface PortfolioPositionResponse {
  bet_code?: string | null;
  position_id: string;
  quote_id?: string | null;
  status: string;
  source_label: string;
  title: string;
  opened_at: IsoDateTimeString;
  settled_at?: IsoDateTimeString | null;
  settlement_hash?: string | null;
  leg_count: number;
  stake: AmountResponse;
  total_return: AmountResponse;
  current_value: AmountResponse;
  pnl: SignedAmountResponse;
  potential_profit: AmountResponse;
  capital_multiple: string;
  current_value_source: string;
  effective_joint_probability_bps?: number | null;
  correlation_penalty_bps?: number | null;
  legs: PortfolioPositionLegResponse[];
}

export interface MyPortfolioResponse {
  wallet_address: string;
  account_kind: string;
  summary: PortfolioSummaryResponse;
  story: PortfolioStoryResponse;
  positions: PortfolioPositionResponse[];
}

export interface EarnVaultOverviewResponse {
  vault_address: string;
  collateral_token_address: string;
  withdrawal_delay_seconds: number;
  total_supply: AmountResponse;
  total_liquidity_assets: AmountResponse;
  available_liquidity: AmountResponse;
  reserved_liquidity: AmountResponse;
  escrowed_stake: AmountResponse;
  utilization_bps: number;
  share_price_display: string;
}

export interface EarnPendingRedeemResponse {
  shares: AmountResponse;
  assets: AmountResponse;
  unlock_time?: IsoDateTimeString | null;
  claimable_now: boolean;
}

export interface EarnAccountResponse {
  share_balance: AmountResponse;
  asset_value: AmountResponse;
  pending_redeem: EarnPendingRedeemResponse;
}

export interface EarnHistoryPointResponse {
  observed_at: IsoDateTimeString;
  total_liquidity_assets: AmountResponse;
  share_price_display: string;
}

export interface EarnAnalyticsResponse {
  vault_7d_apy_bps: number;
  has_apy_history: boolean;
  history: EarnHistoryPointResponse[];
}

export interface MyEarnResponse {
  wallet_address: string;
  account_kind: string;
  vault: EarnVaultOverviewResponse;
  account: EarnAccountResponse;
  analytics: EarnAnalyticsResponse;
}

export interface EarnDepositRequest {
  amount: string;
}

export interface EarnRedeemRequest {
  shares?: string;
  amount?: string;
}

export interface EarnActionResponse {
  wallet_address: string;
  account_kind: string;
  action: string;
  execution_mode: string;
  execution_status: string;
  tx_hash: string;
  amount?: AmountResponse | null;
  shares?: AmountResponse | null;
  requested_at: IsoDateTimeString;
}
