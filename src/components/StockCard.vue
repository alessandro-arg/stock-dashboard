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
        <!-- Here the company name -->
      </div>
    </div>
    <p style="font-size: 14px; margin-bottom: 4px">
      {{ company.revenuePeriod }}
    </p>
    <div class="price-container">
      <div class="stock-price">{{ company.price.toFixed(2) }}</div>
      <div
        class="price-change"
        :class="company.change >= 0 ? 'positive' : 'negative'"
      >
        <div class="change-container">
          <div class="change-arrow">
            <span
              >{{ company.changeAmount >= 0 ? "+" : "-"
              }}{{ Math.abs(company.changeAmount).toFixed(2) }}</span
            >
            <span>{{ company.changeAmount >= 0 ? "↗" : "↘" }}</span>
          </div>
          <span>{{ Math.abs(company.change).toFixed(2) }} %</span>
        </div>
      </div>
    </div>
    <span style="font-size: 12px">In Bill USD</span>
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
  cursor: default;
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
  margin-bottom: 8px;
}

.company-icon {
  width: 20px;
  height: 20px;
  border-radius: 8px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 20px;
    height: 20px;
  }
}

.company-info h3 {
  font-size: 24px;
  font-weight: 500;
}

.stock-price {
  font-size: 32px;
  font-weight: 500;
  color: #ffffff;
}

.price-change {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.change-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.change-arrow {
  display: flex;
  gap: 4px;
}

.price-container {
  display: flex;
  gap: 20px;
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
