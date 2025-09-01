<template>
  <div v-if="loading" class="loading">
    <div class="spinner"></div>
  </div>
  <div v-else class="dashboard">
    <header class="header">
      <h1>The Magnificent Seven Companies</h1>
      <p>Real-time stock performance and financial metrics</p>
    </header>

    <section class="stock-cards-container">
      <button
        v-show="showLeftArrow"
        @click="scrollLeft"
        class="scroll-arrow scroll-arrow-left"
        aria-label="Scroll left"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 18L9 12L15 6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <button
        v-show="showRightArrow"
        @click="scrollRight"
        class="scroll-arrow scroll-arrow-right"
        aria-label="Scroll right"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 18L15 12L9 6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <div class="stock-cards" ref="stockCards" @scroll="handleScroll">
        <StockCard
          v-for="company in companies"
          :key="company.symbol"
          :company="company"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from "vue";
import StockCard from "./StockCard.vue";
import { getSheetByTicker } from "@/services/StockService";

const loading = ref(true);
const companies = ref([]);

const stockCards = ref(null);
const showLeftArrow = ref(false);
const showRightArrow = ref(false);

const TICKERS = ["AAPL", "MSFT", "GOOG", "AMZN", "META", "NVDA", "TSLA"];
const ROWS = {
  AAPL: { revenue: 9, netIncome: 36, grossMargin: 23 },
  MSFT: { revenue: 9, netIncome: 30, grossMargin: 15 },
  GOOG: { revenue: 5, netIncome: 41, grossMargin: 25 },
  AMZN: { revenue: 5, netIncome: 41, grossMargin: 15 },
  META: { revenue: 5, netIncome: 27, grossMargin: 11 },
  NVDA: { revenue: 5, netIncome: 29, grossMargin: 11 },
  TSLA: { revenue: 15, netIncome: 44, grossMargin: 26 },
};
// growth row (QoQ %) — for now only AAPL per your note
const ROWS_GROWTH = { AAPL: 11 };

const ALIASES = { GOOG: ["GOOGL"], GOOGL: ["GOOG"], META: ["FB"] };

const meta = {
  AAPL: { name: "Apple", class: "apple", logo: "apple.png" },
  MSFT: { name: "Microsoft", class: "microsoft", logo: "microsoft.png" },
  GOOG: { name: "Google", class: "google", logo: "google.png" },
  AMZN: { name: "Amazon", class: "amazon", logo: "amazon.png" },
  META: { name: "Meta", class: "meta", logo: "meta.png" },
  NVDA: { name: "Nvidia", class: "nvidia", logo: "nvidia.png" },
  TSLA: { name: "Tesla", class: "tesla", logo: "tesla.png" },
};

const handleScroll = () => {
  if (!stockCards.value) return;

  const container = stockCards.value;
  const scrollLeft = container.scrollLeft;
  const scrollWidth = container.scrollWidth;
  const clientWidth = container.clientWidth;

  // Show left arrow if not at the beginning
  showLeftArrow.value = scrollLeft > 0;

  // Show right arrow if not at the end (with small tolerance for rounding)
  showRightArrow.value = scrollLeft < scrollWidth - clientWidth - 1;
};

const scrollLeft = () => {
  if (!stockCards.value) return;

  const container = stockCards.value;
  const cardWidth = container.children[0]?.offsetWidth || 300;
  const gap = 20; // Match the gap from CSS
  const scrollAmount = cardWidth + gap;

  container.scrollBy({
    left: -scrollAmount,
    behavior: "smooth",
  });
};

const scrollRight = () => {
  if (!stockCards.value) return;

  const container = stockCards.value;
  const cardWidth = container.children[0]?.offsetWidth || 300;
  const gap = 20; // Match the gap from CSS
  const scrollAmount = cardWidth + gap;

  container.scrollBy({
    left: scrollAmount,
    behavior: "smooth",
  });
};

const checkArrows = () => {
  nextTick(() => {
    handleScroll();
  });
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (v, def = 0) => {
  if (v == null || v === "") return def;
  const s = String(v).trim().replace(/\s/g, "").replace(/,/g, ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : def;
};
const headerKey = (rows) => Object.keys(rows?.[0] || {})[0] || "";

// keep billions if already; convert large raw USD to billions
function toBillions(x) {
  const ax = Math.abs(x);
  return ax >= 1e8 ? x / 1e9 : x;
}

// last TWO numeric cells from a 1-based sheet row
function lastTwoFromSheetRow(rows, sheetRowNumber) {
  if (!rows?.length || !sheetRowNumber)
    return { latest: { value: 0, key: "" }, prev: { value: 0, key: "" } };
  const idx = Math.max(0, sheetRowNumber - 2); // SheetDB data[0] = sheet row 2
  const row = rows[idx];
  if (!row)
    return { latest: { value: 0, key: "" }, prev: { value: 0, key: "" } };

  const label = headerKey(rows);
  const ordered = [];
  for (const [k, v] of Object.entries(row)) {
    if (k === label) continue;
    const n = num(v, NaN);
    if (!Number.isNaN(n)) ordered.push({ key: k, value: n });
  }
  const L = ordered.length;
  const latest = L ? ordered[L - 1] : { key: "", value: 0 };
  const prev = L > 1 ? ordered[L - 2] : { key: "", value: 0 };
  return { latest, prev };
}

// last ONE numeric cell from a 1-based sheet row
function lastFromSheetRow(rows, sheetRowNumber) {
  if (!rows?.length || !sheetRowNumber) return { value: 0, key: "" };
  const idx = Math.max(0, sheetRowNumber - 2);
  const row = rows[idx];
  if (!row) return { value: 0, key: "" };

  const label = headerKey(rows);
  let last = 0,
    lastKey = "";
  for (const [k, v] of Object.entries(row)) {
    if (k === label) continue;
    const n = num(v, NaN);
    if (!Number.isNaN(n)) {
      last = n;
      lastKey = k;
    }
  }
  return { value: last, key: lastKey };
}

// "31 jul 25" / "2025-07-31" / "Q1 2025" → "Q# YYYY"
function toQuarterLabel(key) {
  const s = String(key || "").trim();
  if (!s) return "Latest";
  let m =
    s.match(/(\d{4})\D*Q\D*([1-4])/i) || s.match(/Q\D*([1-4])\D*(\d{4})/i);
  if (m) {
    const year = m[1]?.length === 4 ? m[1] : m[2];
    const q = m[2] && m[1]?.length === 4 ? m[2] : m[1];
    return `Q${q} ${year}`;
  }
  const MONTHS = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    sept: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  m =
    s.match(/(\d{1,2})[.\-/\s]*([A-Za-z]{3,})[.\-/\s]*(\d{2,4})/) ||
    s.match(/([A-Za-z]{3,})[.\-/\s]*(\d{1,2})[.\-/\s]*(\d{2,4})/);
  if (m) {
    const mon = MONTHS[m[2]?.toLowerCase()] ?? MONTHS[m[1]?.toLowerCase()];
    const yy = m[3] ?? m[2];
    if (mon != null) {
      let year = parseInt(yy, 10);
      if (year < 100) year += 2000;
      const q = Math.floor(mon / 3) + 1;
      return `Q${q} ${year}`;
    }
  }
  return s;
}

async function fetchRowsFor(sym) {
  for (const t of [sym, ...(ALIASES[sym] || [])]) {
    const rows = await getSheetByTicker(t);
    if (rows?.length) return rows;
  }
  return [];
}

function patchCompany(sym, patch) {
  const i = companies.value.findIndex((c) => c.symbol === sym);
  if (i !== -1) companies.value[i] = { ...companies.value[i], ...patch };
}

async function load() {
  // placeholders
  companies.value = TICKERS.map((sym) => ({
    symbol: sym,
    name: meta[sym]?.name || sym,
    logo: meta[sym]?.logo,
    class: meta[sym]?.class,
    revenuePeriod: "Revenue —",
    price: 0, // latest revenue (B USD)
    changeAmount: 0, // absolute QoQ change (B USD, signed)
    change: 0, // QoQ % (signed)
  }));
  loading.value = false;
  await nextTick();
  setTimeout(checkArrows, 50);

  // compute for each ticker
  for (const sym of TICKERS) {
    const rows = await fetchRowsFor(sym);
    const revRow = ROWS[sym]?.revenue;
    if (!rows.length || !revRow) {
      await sleep(80);
      continue;
    }

    // row 9: total revenue (latest & previous)
    const { latest, prev } = lastTwoFromSheetRow(rows, revRow);
    const latestB = toBillions(num(latest.value));
    const prevB = toBillions(num(prev.value));

    // percent from row 9 (always compute from the two revenue cells)
    const pctFromRow9 = prevB !== 0 ? ((latestB - prevB) / prevB) * 100 : 0;

    // row 10: growth % (use only where defined; for now AAPL)
    let changeAmountB = latestB - prevB; // fallback
    const growthRow = ROWS_GROWTH[sym];
    if (growthRow) {
      const growth = lastFromSheetRow(rows, growthRow); // e.g., "2,83%" -> 2.83
      const growthPct = num(growth.value, NaN);
      if (Number.isFinite(growthPct) && prevB !== 0) {
        changeAmountB = prevB * (growthPct / 100);
      }
    }

    patchCompany(sym, {
      revenuePeriod: `Revenue ${toQuarterLabel(latest.key)}`,
      price: latestB,
      changeAmount: changeAmountB, // shown next to arrow
      change: pctFromRow9, // % shown on the right
    });

    await sleep(100);
  }
  checkArrows();
}

onMounted(() => {
  load();
  window.addEventListener("resize", checkArrows);
});
</script>

<style scoped>
.dashboard {
  padding: 20px 0;
  max-width: 1600px;
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

.stock-cards-container {
  height: 200px;
  margin-bottom: 40px;
  position: relative;
  align-items: center;
  margin-left: 20px;
  margin-right: 20px;
}

.scroll-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.scroll-arrow:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
}

.scroll-arrow:active {
  transform: translateY(-50%) scale(0.95);
}

.scroll-arrow-left {
  left: -10px; /* 48px button + 6px spacing */
}

.scroll-arrow-right {
  right: -10px; /* 48px button + 6px spacing */
}

.stock-cards {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  scroll-behavior: smooth;
  padding: 10px 12px;

  /* Hide scrollbar for Chrome, Safari and Opera */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.stock-cards::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}

.stock-cards > * {
  flex: 0 0 auto;
  min-width: 280px; /* Minimum card width */
  max-width: 320px; /* Maximum card width */
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
    gap: 16px;
  }

  .stock-cards > * {
    min-width: 240px;
    max-width: 280px;
  }

  .scroll-arrow {
    width: 40px;
    height: 40px;
  }

  .scroll-arrow-left {
    left: -20px;
  }

  .scroll-arrow-right {
    right: -20px;
  }

  .charts-section {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .dashboard {
    padding: 12px;
  }

  .header h1 {
    font-size: 24px;
  }

  .stock-cards {
    gap: 12px;
  }

  .stock-cards > * {
    min-width: 200px;
    max-width: 240px;
  }

  .scroll-arrow {
    width: 36px;
    height: 36px;
  }

  .scroll-arrow-left {
    left: -18px;
  }

  .scroll-arrow-right {
    right: -18px;
  }
}

/* Very small screens */
@media (max-width: 320px) {
  .stock-cards > * {
    min-width: 180px;
    max-width: 200px;
  }

  .scroll-arrow {
    width: 32px;
    height: 32px;
  }

  .scroll-arrow svg {
    width: 18px;
    height: 18px;
  }

  .scroll-arrow-left {
    left: -16px;
  }

  .scroll-arrow-right {
    right: -16px;
  }
}
</style>
