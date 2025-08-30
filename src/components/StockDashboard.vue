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

    <!-- <section class="charts-section">
      <ChartComponent
        title="Revenue Growth Over Time"
        type="line"
        :data="revenueGrowthData"
      />

      <ChartComponent
        title="Market Share Distribution"
        type="doughnut"
        :data="marketShareData"
      />
    </section> -->

    <!-- <section class="metrics-grid">
      <MetricsCard title="Net Income (TTM)" :metrics="netIncomeMetrics" />
      <MetricsCard title="Gross Margin %" :metrics="grossMarginMetrics" />
    </section> -->
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from "vue";
import StockCard from "./StockCard.vue";
import { getSheetByTicker, getSheetByName } from "@/services/StockService";

const loading = ref(true);
const companies = ref([]);

const TICKERS = ["AAPL", "MSFT", "GOOG", "AMZN", "META", "NVDA", "TSLA"];
const ALIASES = { GOOG: ["GOOGL"], GOOGL: ["GOOG"], META: ["FB"] };

const meta = {
  AAPL: {
    name: "Apple",
    color: "#007AFF",
    class: "apple",
    logo: "apple.png",
  },
  MSFT: {
    name: "Microsoft",
    color: "#00BCF2",
    class: "microsoft",
    logo: "microsoft.png",
  },
  GOOG: {
    name: "Google",
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
  META: {
    name: "Meta",
    color: "#1877F2",
    class: "meta",
    logo: "meta.png",
  },
  NVDA: {
    name: "Nvidia",
    color: "#76B900",
    class: "nvidia",
    logo: "nvidia.png",
  },
  TSLA: {
    name: "Tesla",
    color: "#CC0000",
    class: "tesla",
    logo: "tesla.png",
  },
};

// ---------- utils ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (v, def = 0) => {
  if (v == null || v === "") return def;
  const s = String(v).trim().replace(/\s/g, "").replace(/,/g, "."); // handle EU/US decimals
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : def;
};
const pct = (v, def = 0) => num(String(v ?? "").replace("%", ""), def);
const fmtAbbr = (n) => {
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
};

// Return the likely **label column** (first column header) for the $TICKER tab.
function detectLabelKey(rows) {
  if (!rows?.length) return null;
  const keys = Object.keys(rows[0]);
  // first key that is NOT a quarter (i.e., not looking like "2024Q3" or a date)
  return keys[0];
}

// Find a row by label substring (case-insensitive) and return the **rightmost numeric** value in that row.
function lastNumericFromRow(rows, labelKey, needle) {
  if (!rows?.length || !labelKey) return 0;
  const row = rows.find((r) =>
    String(r?.[labelKey] || "")
      .toLowerCase()
      .includes(needle)
  );
  if (!row) return 0;

  let last = 0;
  for (const [k, v] of Object.entries(row)) {
    if (k === labelKey) continue;
    const n = num(v);
    if (Number.isFinite(n) && n !== 0) last = n; // keep the rightmost numeric (latest quarter)
  }
  return last;
}

async function fetchFundamentals(sym) {
  // try main ticker + aliases
  const tries = [sym, ...(ALIASES[sym] || [])];
  for (const t of tries) {
    const rows = await getSheetByTicker(t);
    if (!rows?.length) {
      await sleep(120);
      continue;
    }

    const labelKey = detectLabelKey(rows) || "Metric";

    // Revenue (prefer "Total Revenue", fallback to any "revenue")
    let revenue = lastNumericFromRow(rows, labelKey, "total revenue");
    if (!revenue) revenue = lastNumericFromRow(rows, labelKey, "revenue");

    // Net income (fallbacks for "net profit"/"income (net)")
    let netIncome = lastNumericFromRow(rows, labelKey, "net income");
    if (!netIncome)
      netIncome = lastNumericFromRow(rows, labelKey, "net profit");
    if (!netIncome)
      netIncome = lastNumericFromRow(rows, labelKey, "income (net)");

    // Gross margin
    let grossMargin = lastNumericFromRow(rows, labelKey, "gross margin");

    return { revenue, netIncome, grossMargin };
  }
  return { revenue: 0, netIncome: 0, grossMargin: 0 };
}

// Build a quotes map from the Market tab: { AAPL: {price, changePct}, ... }
function buildQuotesMap(marketRows) {
  const map = new Map();
  if (!Array.isArray(marketRows)) return map;

  // Guess common header names
  const header = marketRows[0] || {};
  const symKey =
    ["Symbol", "Ticker", "symbol", "ticker", "Company"].find(
      (k) => k in header
    ) || "Symbol";
  const priceKey =
    ["Price", "price", "Last", "last", "Close", "close"].find(
      (k) => k in header
    ) || "Price";
  const chgKey =
    ["Change %", "% Change", "change_pct", "chg", "Change"].find(
      (k) => k in header
    ) || "Change %";

  for (const r of marketRows) {
    const rawSym = r[symKey];
    const sym =
      (rawSym &&
        String(rawSym)
          .toUpperCase()
          .replace(/.*\(([^)]+)\).*/, "$1")) || // "Apple (AAPL)" -> "AAPL"
      (rawSym && String(rawSym).toUpperCase()) ||
      "";
    if (!TICKERS.includes(sym)) continue;

    const price = num(r[priceKey] ?? 0);
    const changePct = pct(r[chgKey] ?? 0);
    map.set(sym, { price, changePct });
  }
  return map;
}

async function load() {
  // 1) show 7 cards immediately
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
    revenuePeriod: "Latest Q",
    marketCap: 0,
    marketCapDisplay: "—",
    _netIncome: 0,
    _grossMarginPct: 0,
  }));
  loading.value = false;
  await nextTick();

  // 2) prices & % change from Market tab (single quick call)
  const market = await getSheetByName("Market").catch(() => []);
  const quotes = buildQuotesMap(market);

  for (let i = 0; i < companies.value.length; i++) {
    const c = companies.value[i];
    const q = quotes.get(c.symbol) || { price: 0, changePct: 0 };
    const changeAmount = (q.price * q.changePct) / 100;
    companies.value[i] = {
      ...c,
      price: q.price,
      change: q.changePct,
      changeAmount,
    };
  }

  // 3) fundamentals (rev/net/gross) from each $TICKER tab, sequential with tiny delay
  for (let i = 0; i < TICKERS.length; i++) {
    const sym = TICKERS[i];
    const f = await fetchFundamentals(sym);
    const prev = companies.value[i];

    companies.value[i] = {
      ...prev,
      revenueLatest: f.revenue,
      revenueLatestDisplay: f.revenue ? fmtAbbr(f.revenue) : "—",
      marketCap: f.revenue, // placeholder until you add a real Market Cap source
      marketCapDisplay: f.revenue ? fmtAbbr(f.revenue) : "—",
      _netIncome: f.netIncome,
      _grossMarginPct: f.grossMargin,
    };

    await sleep(150); // be gentle with the API
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
