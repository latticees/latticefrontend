import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { createOrderClient } from "./order/index.ts";

const apiBaseUrl = "http://127.0.0.1:8080";
const sampleMarketId = "550e8400-e29b-41d4-a716-446655440000";
const sampleOrderId = "990e8400-e29b-41d4-a716-446655440000";

interface FetchCall {
  input: RequestInfo | URL;
  init?: RequestInit;
}

const originalFetch = globalThis.fetch;
let calls: FetchCall[] = [];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function sampleEventResponse() {
  return {
    title: "Will BTC hit $100k?",
    slug: "will-btc-hit-100k",
    category_slug: "crypto",
    subcategory_slug: "bitcoin",
    tag_slugs: ["btc", "price"],
    image_url: "https://example.com/btc.png",
    summary: "Bitcoin price target market",
    rules: "Resolves YES if BTC trades at or above $100k.",
    context: "Cash market reference",
    additional_context: null,
    resolution_sources: ["Coinbase"],
    resolution_timezone: "UTC",
    starts_at: "2026-04-01T00:00:00Z",
    sort_at: "2026-04-01T00:00:00Z",
    featured: true,
    breaking: false,
    searchable: true,
    visible: true,
    hide_resolved_by_default: false,
    publication_status: "published",
  };
}

function sampleOnChainResponse() {
  return {
    event_id: "0xevent",
    group_id: "0xgroup",
    series_id: "0xseries",
    neg_risk: false,
    tx_hash: "0xtxhash",
  };
}

function sampleMarketResponse() {
  return {
    id: sampleMarketId,
    slug: "btc-100k",
    label: "BTC 100k",
    question: "Will BTC hit $100k by year end?",
    question_id: "0xquestion",
    condition_id: "0xcondition",
    market_type: "binary",
    outcomes: ["Yes", "No"],
    end_time: "2026-12-31T23:59:59Z",
    sort_order: 1,
    publication_status: "published",
    trading_status: "active",
  };
}

function sampleOrderResponse() {
  return {
    id: sampleOrderId,
    status: "open",
    order_hash: "0xorderhash",
    order_digest: "0xorderdigest",
    side: "buy",
    outcome_index: 0,
    outcome_label: "Yes",
    price_bps: 320,
    price: 0.032,
    token_amount: "100",
    filled_token_amount: "0",
    remaining_token_amount: "100",
    quoted_usdc_amount: "3.2",
    expiry_epoch_seconds: 1770000000,
    expires_at: "2026-02-02T00:00:00Z",
    salt: "123456789",
    created_at: "2026-04-03T12:00:00Z",
    updated_at: "2026-04-03T12:00:00Z",
    cancelled_at: null,
  };
}

function sampleOrderItemResponse() {
  return {
    event: sampleEventResponse(),
    on_chain: sampleOnChainResponse(),
    market: sampleMarketResponse(),
    order: sampleOrderResponse(),
  };
}

function samplePortfolioResponse() {
  return {
    wallet_address: "0x0000000000000000000000000000000000000123",
    account_kind: "smart_account",
    summary: {
      total_staked: {
        raw: "500000000",
        display: "500.00",
      },
      live_marked_value: {
        raw: "1093425000",
        display: "1093.42",
      },
      realized_pnl: {
        raw: "125000000",
        display: "125.00",
      },
      unrealized_pnl: {
        raw: "593425000",
        display: "593.42",
      },
      open_position_count: 1,
      settled_position_count: 1,
    },
    positions: [
      {
        bet_code: "STACK-ABC123",
        position_id: "1",
        quote_id: "2",
        status: "open",
        source_label: "On-chain",
        title: "Will BTC hit $100k by year end? - Yes",
        opened_at: "2026-04-08T15:30:00Z",
        settled_at: null,
        settlement_hash: null,
        leg_count: 1,
        stake: {
          raw: "500000000",
          display: "500.00",
        },
        total_return: {
          raw: "1093425000",
          display: "1093.42",
        },
        current_value: {
          raw: "1093425000",
          display: "1093.42",
        },
        pnl: {
          raw: "593425000",
          display: "593.42",
        },
        potential_profit: {
          raw: "593425000",
          display: "593.42",
        },
        capital_multiple: "2.1868x",
        current_value_source: "mark_to_model",
        effective_joint_probability_bps: 5250,
        correlation_penalty_bps: 0,
        legs: [
          {
            position_index: 0,
            market_id: sampleMarketId,
            condition_id: "0xcondition",
            market_ref: "ref-1",
            question: "Will BTC hit $100k by year end?",
            market_slug: "btc-100k",
            event_id: "0xevent",
            event_slug: "will-btc-hit-100k",
            outcome_index: 0,
            outcome_label: "Yes",
            probability_bps: 5250,
            probability_display: "52.50%",
            resolved_outcome: null,
            resolved_voided: null,
          },
        ],
      },
    ],
  };
}

function sampleEarnResponse() {
  return {
    wallet_address: "0x0000000000000000000000000000000000000123",
    account_kind: "smart_account",
    vault: {
      vault_address: "0x0000000000000000000000000000000000000999",
      collateral_token_address: "0x0000000000000000000000000000000000000888",
      withdrawal_delay_seconds: 604800,
      total_supply: {
        raw: "1000000000000",
        display: "1000000.00",
      },
      total_liquidity_assets: {
        raw: "500000000000",
        display: "500000.00",
      },
      available_liquidity: {
        raw: "497688560000",
        display: "497688.56",
      },
      reserved_liquidity: {
        raw: "2311440000",
        display: "2311.44",
      },
      escrowed_stake: {
        raw: "434000000",
        display: "434.00",
      },
      utilization_bps: 46,
      share_price_display: "0.500000",
    },
    account: {
      share_balance: {
        raw: "1000000000",
        display: "1000.00",
      },
      asset_value: {
        raw: "500000000",
        display: "500.00",
      },
      pending_redeem: {
        shares: {
          raw: "0",
          display: "0.00",
        },
        assets: {
          raw: "0",
          display: "0.00",
        },
        unlock_time: null,
        claimable_now: false,
      },
    },
  };
}

beforeEach(() => {
  calls = [];
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("fetchMyOrders sends authenticated GET /me/orders", async () => {
  const client = createOrderClient({ baseUrl: apiBaseUrl });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });

    return jsonResponse({
      wallet_address: "0x0000000000000000000000000000000000000123",
      account_kind: "smart_account",
      orders: [sampleOrderItemResponse()],
    });
  }) as typeof fetch;

  const response = await client.fetchMyOrders("session-token");

  assert.equal(response.orders[0]?.order.id, sampleOrderId);
  assert.equal(String(calls[0].input), "http://127.0.0.1:8080/me/orders");
  assert.equal(calls[0].init?.method, undefined);

  const headers = new Headers(calls[0].init?.headers);
  assert.equal(headers.get("Authorization"), "Bearer session-token");
  assert.equal(headers.get("Accept"), "application/json");
});

test("fetchMyPortfolio sends authenticated GET /me/portfolio", async () => {
  const client = createOrderClient({ baseUrl: apiBaseUrl });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });

    return jsonResponse(samplePortfolioResponse());
  }) as typeof fetch;

  const response = await client.fetchMyPortfolio("session-token");

  assert.equal(response.summary.live_marked_value.display, "1093.42");
  assert.equal(response.positions[0]?.legs[0]?.outcome_label, "Yes");
  assert.equal(String(calls[0].input), "http://127.0.0.1:8080/me/portfolio");
  assert.equal(calls[0].init?.method, undefined);

  const headers = new Headers(calls[0].init?.headers);
  assert.equal(headers.get("Authorization"), "Bearer session-token");
  assert.equal(headers.get("Accept"), "application/json");
});

test("fetchMyEarn sends authenticated GET /me/earn", async () => {
  const client = createOrderClient({ baseUrl: apiBaseUrl });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });

    return jsonResponse(sampleEarnResponse());
  }) as typeof fetch;

  const response = await client.fetchMyEarn("session-token");

  assert.equal(response.vault.total_liquidity_assets.display, "500000.00");
  assert.equal(response.account.pending_redeem.claimable_now, false);
  assert.equal(String(calls[0].input), "http://127.0.0.1:8080/me/earn");
  assert.equal(calls[0].init?.method, undefined);

  const headers = new Headers(calls[0].init?.headers);
  assert.equal(headers.get("Authorization"), "Bearer session-token");
  assert.equal(headers.get("Accept"), "application/json");
});

test("createOrder posts an authenticated payload to /orders", async () => {
  const client = createOrderClient({ baseUrl: apiBaseUrl });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });

    return jsonResponse({
      wallet_address: "0x0000000000000000000000000000000000000123",
      account_kind: "smart_account",
      order: sampleOrderItemResponse(),
    });
  }) as typeof fetch;

  const response = await client.createOrder("session-token", {
    order: {
      market_id: sampleMarketId,
      outcome_index: 0,
      side: "buy",
      price_bps: 320,
      token_amount: "100",
      expiry_epoch_seconds: 1770000000,
      salt: "123456789",
      signature: "0xsignedorder",
    },
  });

  assert.equal(response.order.order.price_bps, 320);
  assert.equal(String(calls[0].input), "http://127.0.0.1:8080/orders");
  assert.equal(calls[0].init?.method, "POST");

  const headers = new Headers(calls[0].init?.headers);
  assert.equal(headers.get("Authorization"), "Bearer session-token");
  assert.equal(headers.get("Content-Type"), "application/json");
  assert.equal(
    calls[0].init?.body,
    JSON.stringify({
      order: {
        market_id: sampleMarketId,
        outcome_index: 0,
        side: "buy",
        price_bps: 320,
        token_amount: "100",
        expiry_epoch_seconds: 1770000000,
        salt: "123456789",
        signature: "0xsignedorder",
      },
    }),
  );
});

test("cancelOrder posts an authenticated payload to /orders/cancel", async () => {
  const client = createOrderClient({ baseUrl: apiBaseUrl });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });

    return jsonResponse({
      wallet_address: "0x0000000000000000000000000000000000000123",
      account_kind: "smart_account",
      cancellation_scope: "offchain_registry",
      cancellation_status: "cancelled",
      prepared_transactions: null,
      order: sampleOrderItemResponse(),
    });
  }) as typeof fetch;

  const response = await client.cancelOrder("session-token", {
    order: {
      order_id: sampleOrderId,
    },
  });

  assert.equal(response.cancellation_status, "cancelled");
  assert.equal(String(calls[0].input), "http://127.0.0.1:8080/orders/cancel");
  assert.equal(calls[0].init?.method, "POST");

  const headers = new Headers(calls[0].init?.headers);
  assert.equal(headers.get("Authorization"), "Bearer session-token");
  assert.equal(headers.get("Content-Type"), "application/json");
  assert.equal(
    calls[0].init?.body,
    JSON.stringify({
      order: {
        order_id: sampleOrderId,
      },
    }),
  );
});
