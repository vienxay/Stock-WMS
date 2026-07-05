import { apiClient } from "./client";

export const listCurrencies = () =>
  apiClient.get("/currencies").then((r) => r.data);

export const listExchangeRates = (params) =>
  apiClient.get("/exchange-rates", { params }).then((r) => r.data);
export const createExchangeRate = (body) =>
  apiClient.post("/exchange-rates", body).then((r) => r.data);
