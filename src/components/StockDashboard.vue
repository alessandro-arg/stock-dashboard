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

    <section class="charts-section">
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
    </section>

    <section class="metrics-grid">
      <MetricsCard title="Net Income (TTM)" :metrics="netIncomeMetrics" />
      <MetricsCard title="Gross Margin %" :metrics="grossMarginMetrics" />
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getManySheets } from "@/services/StockService";

const symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA"];

const loading = ref(true);
const companies = ref([]);

const revenueGrowthData = ref({ labels: [], datasets: [] });
const marketShareData = ref({ labels: [], datasets: [] });
const netIncomeMetrics = ref([]);
const grossMarginMetrics = ref([]);

async function load() {
  loading.value = true;
  try {
    const results = await getManySheets(symbols);
    companies.value = results.map((rows, idx) => {
      const row = Array.isArray(rows) ? rows[0] : rows;
      return {
        symbol: symbols[idx],
        name: row?.name || row?.company || symbols[idx],
        price: Number(row?.price ?? row?.last ?? 0),
        change: Number(row?.change ?? row?.chg ?? 0),
        marketCap: Number(row?.market_cap ?? row?.marketcap ?? 0),
        // Add whatever else your <StockCard> expects
      };
    });

    // Example chart: Revenue growth over time by symbol.
    // Expecting each sheet to have rows with e.g. "year" and "revenue"
    // If your schema differs, adjust field names below.
    const timeLabels = Array.isArray(results[0])
      ? results[0].map((r) => r.year ?? r.period ?? "")
      : [];

    revenueGrowthData.value = {
      labels: timeLabels,
      datasets: results.map((rows, i) => ({
        label: symbols[i],
        data: (rows || []).map((r) => Number(r.revenue ?? r.revenue_ttm ?? 0)),
      })),
    };

    // Example doughnut: market share using market cap (fallback to price)
    marketShareData.value = {
      labels: companies.value.map((c) => c.symbol),
      datasets: [
        {
          data: companies.value.map((c) => c.marketCap || c.price || 0),
        },
      ],
    };

    // Example metrics (fill with your real columns)
    netIncomeMetrics.value = companies.value.map((c) => ({
      label: c.symbol,
      value: "—", // set to row?.net_income_ttm if available
    }));

    grossMarginMetrics.value = companies.value.map((c) => ({
      label: c.symbol,
      value: "—", // set to row?.gross_margin_pct if available
    }));
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
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
