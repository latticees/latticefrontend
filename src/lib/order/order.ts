import { normalizeApiBaseUrl, requestJson } from "../api.ts";
import type {
  EarnActionResponse,
  EarnDepositRequest,
  EarnRedeemRequest,
  CancelOrderRequest,
  CancelOrderResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  MyEarnResponse,
  MyOrdersResponse,
  MyPortfolioResponse,
  OrderClientOptions,
} from "./types.ts";

function readViteEnv(key: "VITE_API_BASE_URL"): string | undefined {
  return import.meta.env?.[key];
}

export interface OrderClient {
  fetchMyOrders(token: string): Promise<MyOrdersResponse>;
  fetchMyPortfolio(token: string): Promise<MyPortfolioResponse>;
  fetchMyEarn(token: string): Promise<MyEarnResponse>;
  depositToEarn(token: string, payload: EarnDepositRequest): Promise<EarnActionResponse>;
  requestEarnRedeem(token: string, payload: EarnRedeemRequest): Promise<EarnActionResponse>;
  cancelEarnRedeem(token: string): Promise<EarnActionResponse>;
  claimEarnRedeem(token: string): Promise<EarnActionResponse>;
  createOrder(token: string, payload: CreateOrderRequest): Promise<CreateOrderResponse>;
  cancelOrder(token: string, payload: CancelOrderRequest): Promise<CancelOrderResponse>;
}

export function createOrderClient(options: OrderClientOptions = {}): OrderClient {
  const baseUrl = normalizeApiBaseUrl(options.baseUrl);

  return {
    fetchMyOrders(token) {
      return requestJson<MyOrdersResponse>(baseUrl, "/me/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },

    fetchMyPortfolio(token) {
      return requestJson<MyPortfolioResponse>(baseUrl, "/me/portfolio", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },

    fetchMyEarn(token) {
      return requestJson<MyEarnResponse>(baseUrl, "/me/earn", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },

    depositToEarn(token, payload) {
      return requestJson<EarnActionResponse>(baseUrl, "/me/earn/deposit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        json: payload,
      });
    },

    requestEarnRedeem(token, payload) {
      return requestJson<EarnActionResponse>(baseUrl, "/me/earn/redeem/request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        json: payload,
      });
    },

    cancelEarnRedeem(token) {
      return requestJson<EarnActionResponse>(baseUrl, "/me/earn/redeem/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },

    claimEarnRedeem(token) {
      return requestJson<EarnActionResponse>(baseUrl, "/me/earn/redeem/claim", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },

    createOrder(token, payload) {
      return requestJson<CreateOrderResponse>(baseUrl, "/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        json: payload,
      });
    },

    cancelOrder(token, payload) {
      return requestJson<CancelOrderResponse>(baseUrl, "/orders/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        json: payload,
      });
    },
  };
}

export const orderClient = createOrderClient({
  baseUrl: readViteEnv("VITE_API_BASE_URL"),
});

export { ApiError } from "../api.ts";
