<template>
  <div class="stock-card" :class="company.class">
    <div class="stock-header">
      <div class="company-icon">
        <img
          v-if="company.logo"
          :src="company.logo"
          :alt="company.name"
          @error="$event.target.style.display = 'none'"
        />
      </div>
      <div class="company-info">
        <h3>{{ company.name }}</h3>
        <p>{{ company.symbol }}</p>
      </div>
    </div>
    <div class="stock-price">${{ company.price.toFixed(2) }}</div>
    <div
      class="price-change"
      :class="company.change >= 0 ? 'positive' : 'negative'"
    >
      <span>{{ company.change >= 0 ? "↗" : "↘" }}</span>
      <span>{{ Math.abs(company.change).toFixed(2) }}%</span>
      <span>${{ Math.abs(company.changeAmount).toFixed(2) }}</span>
    </div>
    <div class="extras">
      <div class="extra">
        <small>Revenue ({{ company.revenuePeriod }})</small>
        <strong>{{ company.revenueLatestDisplay }}</strong>
      </div>
      <div class="extra">
        <small>Market Cap</small>
        <strong>{{ company.marketCapDisplay }}</strong>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "StockCard",
  props: {
    company: {
      type: Object,
      required: true,
    },
  },
};
</script>

<style scoped>
.stock-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.stock-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent-color);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.stock-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.2);
}

.stock-card:hover::before {
  transform: scaleX(1);
}

.stock-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.company-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 40px;
    height: 40px;
  }
}

.company-info h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.company-info p {
  color: #8892b0;
  font-size: 14px;
}

.stock-price {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #ffffff;
}

.price-change {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.positive {
  color: #00ff88;
}
.negative {
  color: #ff4757;
}

/* Color variants for companies */
.apple {
  --accent-color: #007aff;
}
.meta {
  --accent-color: #1877f2;
}
.microsoft {
  --accent-color: #00bcf2;
}
.google {
  --accent-color: #4285f4;
}
.amazon {
  --accent-color: #ff9900;
}
.tesla {
  --accent-color: #cc0000;
}
.nvidia {
  --accent-color: #76b900;
}

@media (max-width: 768px) {
  .stock-card {
    padding: 20px;
  }

  .stock-price {
    font-size: 28px;
  }
}

@media (max-width: 320px) {
  .stock-card {
    padding: 16px;
  }

  .stock-price {
    font-size: 24px;
  }
}
</style>
