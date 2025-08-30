import axios from "axios";

const api = axios.create({
  baseURL: "https://sheetdb.io/api/v1/pzq4zwvekqhqp",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Fetch rows from a $TICKER tab (e.g. ?sheet=$AAPL) with retry/backoff. */
export async function getSheetByTicker(ticker, tries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const { data } = await api.get("/", {
        params: { sheet: `$${ticker}`, _ts: Date.now() },
      });
      return Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];
    } catch (err) {
      lastErr = err;
      await sleep(250 * attempt * attempt);
    }
  }
  console.warn(
    `getSheetByTicker(${ticker}) failed:`,
    lastErr?.message || lastErr
  );
  return [];
}

/** Fetch rows from a **named** tab (no $), e.g. "Market". */
export async function getSheetByName(name, tries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const { data } = await api.get("/", {
        params: { sheet: name, _ts: Date.now() },
      });
      return Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];
    } catch (err) {
      lastErr = err;
      await sleep(250 * attempt * attempt);
    }
  }
  console.warn(`getSheetByName(${name}) failed:`, lastErr?.message || lastErr);
  return [];
}
