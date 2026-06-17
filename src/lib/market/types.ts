export type Uuid = string;
export type IsoDateTimeString = string;

export type MarketTradingStatus = "active" | "paused" | "resolved";
export type MarketPriceHistoryInterval = "1h" | "6h" | "1d" | "1w" | "max";

export interface MarketClientOptions {
  baseUrl?: string;
}

export interface MarketsHomeQuery {
  limit?: number;
}

export interface ListMarketsQuery {
  locale?: string;
  category_slug?: string;
  subcategory_slug?: string;
  tag_slug?: string;
  condition_id?: string;
  order?: string;
  ascending?: boolean;
  q?: string;
  active?: boolean;
  closed?: boolean;
  archived?: boolean;
  featured?: boolean;
  breaking?: boolean;
  trading_status?: MarketTradingStatus;
  limit?: number;
  offset?: number;
}

export interface SearchMarketsQuery {
  locale?: string;
  q?: string;
  category_slug?: string;
  subcategory_slug?: string;
  tag_slug?: string;
  active?: boolean;
  closed?: boolean;
  archived?: boolean;
  trading_status?: MarketTradingStatus;
  limit?: number;
  offset?: number;
}

export interface MarketPriceHistoryQuery {
  interval?: MarketPriceHistoryInterval;
  fidelity?: number;
}

export interface ListEventsQuery {
  locale?: string;
  category_slug?: string;
  subcategory_slug?: string;
  tag_slug?: string;
  featured?: boolean;
  breaking?: boolean;
  include_markets?: boolean;
  limit?: number;
  offset?: number;
}

export interface PublicEventTeaserResponse {
  id: Uuid;
  title: string;
  slug: string;
  category_slug: string;
  subcategory_slug: string | null;
  tag_slugs: string[];
  image_url: string | null;
  summary: string | null;
  featured: boolean;
  breaking: boolean;
  neg_risk: boolean;
}

export interface PublicMarketCardResponse {
  id: Uuid;
  slug: string;
  label: string;
  question: string;
  question_id: string;
  condition_id: string | null;
  market_type: string;
  outcomes: string[];
  end_time: IsoDateTimeString;
  sort_order: number;
  trading_status: string;
  current_prices?: MarketCurrentPricesResponse | null;
  stats?: MarketStatsResponse | null;
  quote_summary?: MarketQuoteSummaryResponse | null;
  event: PublicEventTeaserResponse;
}

export interface MarketsHomeResponse {
  featured: PublicMarketCardResponse[];
  breaking: PublicMarketCardResponse[];
  newest: PublicMarketCardResponse[];
}

export interface MarketListResponse {
  markets: PublicMarketCardResponse[];
  limit: number;
  offset: number;
}

export interface EventResponse {
  title: string;
  slug: string;
  category_slug: string;
  subcategory_slug: string | null;
  tag_slugs: string[];
  image_url: string | null;
  summary: string | null;
  rules: string;
  context: string | null;
  additional_context: string | null;
  resolution_sources: string[];
  resolution_timezone: string;
  starts_at: IsoDateTimeString | null;
  sort_at: IsoDateTimeString | null;
  featured: boolean;
  breaking: boolean;
  searchable: boolean;
  visible: boolean;
  hide_resolved_by_default: boolean;
  publication_status: string;
}

export interface EventOnChainResponse {
  event_id: string;
  group_id: string;
  series_id: string;
  neg_risk: boolean;
  tx_hash: string | null;
}

export interface MarketResponse {
  id: Uuid;
  slug: string;
  label: string;
  question: string;
  question_id: string;
  condition_id: string | null;
  market_type: string;
  outcomes: string[];
  end_time: IsoDateTimeString;
  sort_order: number;
  publication_status: string;
  trading_status: string;
  current_prices?: MarketCurrentPricesResponse | null;
  stats?: MarketStatsResponse | null;
  quote_summary?: MarketQuoteSummaryResponse | null;
}

export interface MarketCurrentPricesResponse {
  yes_bps: number;
  no_bps: number;
}

export interface MarketStatsResponse {
  volume_usd: string;
}

export interface MarketQuoteSummaryResponse {
  buy_yes_bps: number;
  buy_no_bps: number;
  as_of: IsoDateTimeString;
  source: string;
}

export interface MarketQuoteResponse {
  market_id: Uuid;
  condition_id: string | null;
  source: string;
  as_of: IsoDateTimeString;
  buy_yes_bps: number;
  buy_no_bps: number;
  sell_yes_bps: number;
  sell_no_bps: number;
  last_trade_yes_bps: number;
  spread_bps: number;
}

export interface StackQuoteLegRequest {
  market_id: Uuid;
  outcome: number;
}

export interface CreateStackQuoteRequest {
  recipient?: string;
  stake: string;
  valid_for_seconds?: number;
  legs: StackQuoteLegRequest[];
}

export interface SuggestStackAiRequest {
  prompt: string;
  stake?: string;
  max_legs?: number;
  suggestion_count?: number;
}

export interface ExplainStackAiRequest {
  prompt?: string;
  stake?: string;
  legs: StackQuoteLegRequest[];
}

export interface StackQuoteResponse {
  recipient: string;
  quote_id: string;
  valid_until: number;
  stake: string;
  total_return: string;
  potential_profit: string;
  quote_digest: string;
  legs_hash: string;
  metadata_hash: string;
}

export interface StackQuoteLegResponse {
  market_id: Uuid;
  condition_id: string;
  market_ref: string;
  question: string;
  market_slug: string;
  event_id: string | null;
  event_slug: string | null;
  outcome_index: number;
  outcome_label: string;
  probability_bps: number;
  probability_display: string;
  price_source: string;
  on_chain_exists: boolean | null;
  on_chain_active: boolean | null;
}

export interface StackQuotePricingResponse {
  model_version: string;
  independent_joint_probability_bps: number;
  effective_joint_probability_bps: number;
  correlation_penalty_bps: number;
  house_edge_bps: number;
  payout_multiple_bps: number;
  capital_multiple: string;
  payout_capped: boolean;
  max_supported_capital_multiple: string;
  estimated_total_return: string;
  estimated_potential_profit: string;
  estimated_capital_multiple: string;
}

export interface StackQuoteEnvelopeResponse {
  status: string;
  executable: boolean;
  execution_blockers: string[];
  quote: StackQuoteResponse;
  legs: StackQuoteLegResponse[];
  pricing: StackQuotePricingResponse;
  signature: string | null;
}

export interface ExecuteStackRequest {
  quote_id: string;
}

export interface ExecuteStackResponse {
  quote_id: string;
  wallet_address: string;
  account_kind: string;
  execution_mode: string;
  execution_status: string;
  tx_hash: string;
  bet_code: string | null;
  position_id: string | null;
  quote_digest: string;
  legs_hash: string;
  stake: string;
  total_return: string;
  requested_at: IsoDateTimeString;
}

export interface StackBetResponse {
  bet_code: string;
  position_id: string;
  quote_id: string | null;
  status: string;
  quote_digest: string;
  legs_hash: string;
  leg_count: number;
  stake: string;
  total_return: string;
  potential_profit: string;
  capital_multiple: string;
  opened_at: IsoDateTimeString;
  settled_at: IsoDateTimeString | null;
  settlement_hash: string | null;
  legs: StackBetLegResponse[];
}

export interface StackBetLegResponse {
  position_index: number;
  market_id: string | null;
  condition_id: string | null;
  market_ref: string;
  question: string;
  market_slug: string | null;
  event_id: string | null;
  event_slug: string | null;
  outcome_index: number;
  outcome_label: string;
  probability_bps: number | null;
  probability_display: string | null;
  resolved_outcome: number | null;
  resolved_voided: boolean | null;
}

export interface StackLeaderboardEntryResponse {
  rank: number;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  wallet_address: string;
  settled_position_count: number;
  won_position_count: number;
  lost_position_count: number;
  voided_position_count: number;
  accuracy_bps: number;
  current_streak: string;
  realized_pnl: {
    raw: string;
    display: string;
  };
  biggest_hit: {
    raw: string;
    display: string;
  };
  best_stack_return: {
    raw: string;
    display: string;
  };
  best_capital_multiple: string;
}

export interface StackLeaderboardResponse {
  generated_at: IsoDateTimeString;
  ranking_basis: string;
  entries: StackLeaderboardEntryResponse[];
}

export interface StackAiSuggestionLegResponse {
  market_id: Uuid;
  market_slug: string;
  event_id: string | null;
  event_slug: string | null;
  question: string;
  outcome_index: number;
  outcome_label: string;
  probability_bps: number;
  probability_display: string;
  why: string;
}

export interface StackAiSuggestionResponse {
  title: string;
  summary: string;
  risk_label: string;
  fit_score_bps: number;
  legs: StackAiSuggestionLegResponse[];
  pricing: StackQuotePricingResponse;
  correlation_penalty_bps: number;
  independent_joint_probability_bps: number;
  effective_joint_probability_bps: number;
}

export interface StackAiSuggestResponse {
  model_version: string;
  prompt: string;
  preview_stake: string;
  preview_stake_display: string;
  suggestions: StackAiSuggestionResponse[];
}

export interface StackAiExplainResponse {
  model_version: string;
  source: string;
  headline: string;
  summary: string;
  why_legs_fit: string[];
  correlation_drivers: string[];
  payout_context: string;
  risk_premium_context: string;
  disclaimers: string[];
}

export interface StackCompositeResponse {
  slug: string;
  title: string;
  summary: string;
  prompt: string;
  risk_label: string;
  leg_count_hint: number;
  featured: boolean;
}

export interface StackCompositeCatalogResponse {
  generated_at: IsoDateTimeString;
  composites: StackCompositeResponse[];
}

export interface StackRoomSummaryResponse {
  slug: string;
  title: string;
  summary: string;
  activity_label: string;
  prompt: string;
  accent: string;
  featured_composite_slug: string | null;
  thesis_count: number;
  matching_market_count: number;
  recent_stack_count: number;
  open_stack_count: number;
  settled_stack_count: number;
}

export interface StackRoomCatalogResponse {
  generated_at: IsoDateTimeString;
  rooms: StackRoomSummaryResponse[];
}

export interface StackRoomThesisResponse {
  title: string;
  body: string;
  tone: string;
}

export interface StackRoomMarketResponse {
  market_id: string;
  market_slug: string;
  question: string;
  event_title: string;
  event_slug: string;
  trading_status: string;
  volume: string;
  liquidity: string;
  primary_outcome_label: string | null;
  primary_outcome_probability_bps: number | null;
  secondary_outcome_label: string | null;
  secondary_outcome_probability_bps: number | null;
}

export interface StackRoomRecentStackLegResponse {
  question: string;
  outcome_label: string;
  market_slug: string | null;
  event_slug: string | null;
}

export interface StackRoomRecentStackResponse {
  bet_code: string;
  status: string;
  stake: string;
  total_return: string;
  capital_multiple: string;
  leg_count: number;
  opened_at: IsoDateTimeString;
  headline: string;
  summary: string;
  legs: StackRoomRecentStackLegResponse[];
}

export interface StackRoomDetailResponse {
  generated_at: IsoDateTimeString;
  room: StackRoomSummaryResponse;
  featured_composite: StackCompositeResponse | null;
  theses: StackRoomThesisResponse[];
  featured_markets: StackRoomMarketResponse[];
  recent_stacks: StackRoomRecentStackResponse[];
}

export interface CreateStackRoomPostRequest {
  kind?: string;
  body: string;
  bet_code?: string;
}

export interface StackRoomPresenceUserResponse {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
}

export interface StackRoomAttachedBetResponse {
  bet_code: string;
  status: string;
  stake: string;
  total_return: string;
  capital_multiple: string;
  leg_count: number;
  headline: string;
}

export interface StackRoomReactionCountResponse {
  reaction: string;
  count: number;
}

export interface StackRoomPostResponse {
  id: string;
  room_slug: string;
  kind: string;
  body: string;
  bet_code: string | null;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
  author: StackRoomPresenceUserResponse;
  attached_bet: StackRoomAttachedBetResponse | null;
  reaction_counts: StackRoomReactionCountResponse[];
  viewer_reactions: string[];
}

export interface StackRoomFeedResponse {
  generated_at: IsoDateTimeString;
  room_slug: string;
  active_user_count: number;
  active_users: StackRoomPresenceUserResponse[];
  posts: StackRoomPostResponse[];
}

export interface StackRoomPostWriteResponse {
  room_slug: string;
  post: StackRoomPostResponse;
}

export interface StackRoomReactionWriteResponse {
  room_slug: string;
  post_id: string;
  reaction: string;
  active: boolean;
  counts: StackRoomReactionCountResponse[];
}

export interface StackRoomPresenceResponse {
  room_slug: string;
  active_user_count: number;
  active_users: StackRoomPresenceUserResponse[];
}

export interface PreparedWalletCallResponse {
  kind: string;
  target: string;
  data: string;
  value: string;
  description: string;
}

export interface MarketResolutionStateResponse {
  status: string;
  proposed_winning_outcome: number;
  final_winning_outcome: number | null;
  payout_vector_hash: string;
  proposed_by_user_id: Uuid;
  proposed_at: IsoDateTimeString;
  dispute_deadline: IsoDateTimeString;
  notes: string | null;
  disputed_by_user_id: Uuid | null;
  disputed_at: IsoDateTimeString | null;
  dispute_reason: string | null;
  finalized_by_user_id: Uuid | null;
  finalized_at: IsoDateTimeString | null;
  emergency_resolved_by_user_id: Uuid | null;
  emergency_resolved_at: IsoDateTimeString | null;
}

export interface MarketDetailResponse {
  event: EventResponse;
  on_chain: EventOnChainResponse;
  market: MarketResponse;
  resolution: MarketResolutionStateResponse | null;
  sibling_markets: MarketResponse[];
}

export interface MarketOutcomeResponse {
  index: number;
  label: string;
  is_winning: boolean | null;
}

export interface MarketOutcomesResponse {
  market_id: Uuid;
  condition_id: string | null;
  market_type: string;
  outcomes: MarketOutcomeResponse[];
}

export interface MarketActivityItemResponse {
  activity_type: string;
  occurred_at: IsoDateTimeString;
  actor_user_id: Uuid | null;
  details: string | null;
}

export interface MarketActivityResponse {
  market_id: Uuid;
  source: string;
  items: MarketActivityItemResponse[];
}

export interface MarketTradeFillResponse {
  id: Uuid;
  match_type: string;
  outcome_index?: number | null;
  fill_token_amount: string;
  collateral_amount: string;
  yes_price_bps: number;
  no_price_bps: number;
  yes_price: number;
  no_price: number;
  tx_hash: string;
  executed_at: IsoDateTimeString;
}

export interface MarketTradesResponse {
  market_id: Uuid;
  condition_id: string | null;
  source: string;
  trades: MarketTradeFillResponse[];
}

export interface MarketPriceHistoryPointResponse {
  timestamp: IsoDateTimeString;
  outcome_index: number;
  outcome_label: string;
  price_bps: number;
  price: number;
}

export interface MarketPriceHistorySeriesPointResponse {
  t: number;
  p: number;
}

export interface MarketPriceHistoryResponse {
  market_id: Uuid;
  condition_id: string | null;
  source: string;
  interval: string;
  history?: MarketPriceHistorySeriesPointResponse[];
  points: MarketPriceHistoryPointResponse[];
}

export interface OrderbookLevelResponse {
  outcome_index: number;
  outcome_label: string;
  price_bps: number;
  price: number;
  quantity: number;
  shares: string;
  notional_usd: string;
}

export interface MarketOrderbookResponse {
  market_id: Uuid;
  condition_id: string | null;
  source: string;
  as_of: IsoDateTimeString;
  spread_bps: number;
  last_trade_yes_bps: number;
  bids: OrderbookLevelResponse[];
  asks: OrderbookLevelResponse[];
}

export interface MarketLiquidityOutcomeResponse {
  outcome_index: number;
  outcome_label: string;
  available: string;
}

export interface PoolLiquidityResponse {
  idle_yes_total: string;
  idle_no_total: string;
  posted_yes_total: string;
  posted_no_total: string;
  claimable_collateral_total: string;
}

export interface MarketLiquidityResponse {
  market_id: Uuid;
  condition_id: string | null;
  source: string;
  exchange_outcomes: MarketLiquidityOutcomeResponse[];
  pool: PoolLiquidityResponse;
}

export interface MarketResolutionReadResponse {
  market_id: Uuid;
  resolution: MarketResolutionStateResponse | null;
}

export interface RelatedMarketsResponse {
  market_id: Uuid;
  related: PublicMarketCardResponse[];
}

export interface PublicEventCardResponse {
  id: Uuid;
  title: string;
  slug: string;
  category_slug: string;
  subcategory_slug: string | null;
  tag_slugs: string[];
  image_url: string | null;
  summary: string | null;
  featured: boolean;
  breaking: boolean;
  neg_risk: boolean;
  starts_at: IsoDateTimeString | null;
  sort_at: IsoDateTimeString | null;
  market_count: number;
  markets?: PublicMarketCardResponse[] | null;
}

export interface EventListResponse {
  events: PublicEventCardResponse[];
  limit: number;
  offset: number;
}

export interface EventDetailResponse {
  event: EventResponse;
  on_chain: EventOnChainResponse;
  markets_count: number;
}

export interface EventMarketsResponse {
  event: EventResponse;
  on_chain: EventOnChainResponse;
  markets: MarketResponse[];
}

export interface CategorySummaryResponse {
  slug: string;
  label: string;
  event_count: number;
  market_count: number;
  featured_event_count: number;
  breaking_event_count: number;
}

export interface CategoriesResponse {
  categories: CategorySummaryResponse[];
}

export interface CategoryDetailResponse {
  category: CategorySummaryResponse;
  markets: PublicMarketCardResponse[];
}

export interface TagSummaryResponse {
  slug: string;
  label: string;
  event_count: number;
  market_count: number;
}

export interface TagsResponse {
  tags: TagSummaryResponse[];
}
