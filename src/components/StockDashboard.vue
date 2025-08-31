<template>
  <div v-if="loading" class="loading">
    <div class="spinner"></div>
  </div>
  <div v-else class="dashboard">
    <header class="header">
      <h1>The Magnificent Seven Companies</h1>
      <p>Real-time stock performance and financial metrics</p>
    </header>

    <section class="stock-cards">
      <StockCard
        v-for="company in companies"
        :key="company.symbol"
        :company="company"
      />
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from "vue";
import StockCard from "./StockCard.vue";
import { getSheetByTicker, getSheetByName } from "@/services/StockService";

const loading = ref(true);
const companies = ref([]);

// --- all 7 tickers + the exact rows (“Zeile”) you gave ---
const TICKERS = ["AAPL", "MSFT", "GOOG", "AMZN", "META", "NVDA", "TSLA"];
const ROWS = {
  AAPL: { revenue: 5, netIncome: 36, grossMargin: 23 },
  MSFT: { revenue: 9, netIncome: 30, grossMargin: 15 },
  GOOG: { revenue: 5, netIncome: 41, grossMargin: 25 },
  AMZN: { revenue: 9, netIncome: 41, grossMargin: 15 },
  META: { revenue: 5, netIncome: 27, grossMargin: 11 },
  NVDA: { revenue: 5, netIncome: 29, grossMargin: 11 },
  TSLA: { revenue: 13, netIncome: 44, grossMargin: 26 },
};
// try aliases in case some tabs are named differently
const ALIASES = { GOOG: ["GOOGL"], GOOGL: ["GOOG"], META: ["FB"] };

const meta = {
  AAPL: { name: "Apple", color: "#007AFF", class: "apple", logo: "apple.png" },
  MSFT: {
    name: "Microsoft",
    color: "#00BCF2",
    class: "microsoft",
    logo: "microsoft.png",
  },
  GOOG: {
    name: "Alphabet",
    color: "#4285F4",
    class: "google",
    logo: "google.png",
  },
  AMZN: {
    name: "Amazon",
    color: "#FF9900",
    class: "amazon",
    logo: "amazon.png",
  },
  META: { name: "Meta", color: "#1877F2", class: "meta", logo: "meta.png" },
  NVDA: {
    name: "Nvidia",
    color: "#76B900",
    class: "nvidia",
    logo: "nvidia.png",
  },
  TSLA: { name: "Tesla", color: "#CC0000", class: "tesla", logo: "tesla.png" },
};

// ---------- utils ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (v, def = 0) => {
  if (v == null || v === "") return def;
  const s = String(v).trim().replace(/\s/g, "").replace(/,/g, ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : def;
};
const pct = (v, d = 0) => num(String(v ?? "").replace("%", ""), d);
const fmtAbbr = (n) => {
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
};
const headerKey = (rows) => Object.keys(rows?.[0] || {})[0] || "";

// take the **right-most numeric** cell from a given sheet row number
function latestFromSheetRow(rows, sheetRowNumber) {
  if (!rows?.length || !sheetRowNumber) return { value: 0, key: "" };
  const idx = Math.max(0, sheetRowNumber - 2); // convert “Zeile” -> array index
  const row = rows[idx];
  if (!row) return { value: 0, key: "" };

  const label = headerKey(rows);
  let last = 0,
    lastKey = "";
  for (const [k, v] of Object.entries(row)) {
    if (k === label) continue;
    const n = num(v);
    if (Number.isFinite(n)) {
      last = n;
      lastKey = k;
    }
  }
  return { value: last, key: lastKey };
}

async function fetchRowsFor(sym) {
  for (const t of [sym, ...(ALIASES[sym] || [])]) {
    const rows = await getSheetByTicker(t);
    if (rows?.length) return rows; // expects tabs literally named $AAPL, $MSFT, ...
  }
  return [];
}

function buildQuotesMap(marketRows) {
  const map = new Map();
  if (!Array.isArray(marketRows) || !marketRows.length) return map;
  const h = marketRows[0] || {};
  const symKey =
    ["Symbol", "Ticker", "Company", "symbol", "ticker"].find((k) => k in h) ||
    "Symbol";
  const priceKey =
    ["Price", "Last", "Close", "price", "last", "close"].find((k) => k in h) ||
    "Price";
  const chgKey =
    ["Change %", "% Change", "change_pct", "chg", "Change"].find(
      (k) => k in h
    ) || "Change %";
  for (const r of marketRows) {
    const raw = r[symKey];
    const sym =
      (raw &&
        String(raw)
          .toUpperCase()
          .replace(/.*\(([^)]+)\).*/, "$1")) ||
      (raw && String(raw).toUpperCase()) ||
      "";
    if (!TICKERS.includes(sym)) continue;
    map.set(sym, { price: num(r[priceKey]), changePct: pct(r[chgKey]) });
  }
  return map;
}

function patchCompany(sym, patch) {
  const i = companies.value.findIndex((c) => c.symbol === sym);
  if (i !== -1) companies.value[i] = { ...companies.value[i], ...patch };
}

async function load() {
  // 1) render **all 7** placeholders first
  companies.value = TICKERS.map((sym) => ({
    symbol: sym,
    name: meta[sym]?.name || sym,
    logo: meta[sym]?.logo,
    class: meta[sym]?.class,
    color: meta[sym]?.color,
    price: 0,
    change: 0,
    changeAmount: 0,
    revenueLatest: 0,
    revenueLatestDisplay: "—",
    revenuePeriod: "Latest",
    marketCap: 0,
    marketCapDisplay: "—",
    _netIncome: 0,
    _grossMarginPct: 0,
  }));
  loading.value = false;
  await nextTick();

  // 2) (optional) prices from "Market" tab if you have it
  const market = await getSheetByName("Market").catch(() => []);
  const quotes = buildQuotesMap(market);
  for (const sym of TICKERS) {
    const q = quotes.get(sym) || { price: 0, changePct: 0 };
    patchCompany(sym, {
      price: q.price,
      change: q.changePct,
      changeAmount: (q.price * q.changePct) / 100,
    });
  }

  // 3) fundamentals per ticker using the exact rows you provided
  for (const sym of TICKERS) {
    const rows = await fetchRowsFor(sym);
    const map = ROWS[sym] || {};
    const rev = latestFromSheetRow(rows, map.revenue);
    const net = latestFromSheetRow(rows, map.netIncome);
    const gm = latestFromSheetRow(rows, map.grossMargin);

    patchCompany(sym, {
      revenueLatest: rev.value,
      revenueLatestDisplay: rev.value ? fmtAbbr(rev.value) : "—",
      revenuePeriod: rev.key || "Latest",
      marketCap: rev.value, // temporary placeholder
      marketCapDisplay: rev.value ? fmtAbbr(rev.value) : "—",
      _netIncome: net.value,
      _grossMarginPct: gm.value,
    });

    await sleep(150); // be gentle with SheetDB
  }
}

onMounted(load);
</script>

<style scoped>
.dashboard {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  animation: fadeIn 0.8s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.header h1 {
  font-size: clamp(24px, 4vw, 36px);
  font-weight: 700;
  background: linear-gradient(135deg, #00d4ff, #7b68ee);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}

.header p {
  color: #8892b0;
  font-size: 16px;
}

.stock-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.charts-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 40px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-left: 4px solid #00d4ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .dashboard {
    padding: 16px;
  }

  .stock-cards {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .charts-section {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 320px) {
  .dashboard {
    padding: 12px;
  }

  .header h1 {
    font-size: 24px;
  }
}
</style>
