<template>
  <div class="chart-container">
    <h3 class="chart-title">{{ title }}</h3>
    <div class="canvas-container">
      <canvas ref="canvas"></canvas>
    </div>
  </div>
</template>

<script>
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

export default {
  name: "ChartComponent",
  props: {
    title: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    data: {
      type: Object,
      required: true,
    },
  },
  mounted() {
    this.renderChart();
  },
  updated() {
    if (this.chart) {
      this.chart.destroy();
    }
    this.renderChart();
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.destroy();
    }
  },
  methods: {
    renderChart() {
      const ctx = this.$refs.canvas.getContext("2d");

      if (this.type === "line") {
        this.chart = new Chart(ctx, {
          type: "line",
          data: this.data,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: "bottom",
                labels: {
                  color: "#8892b0",
                  usePointStyle: true,
                  padding: 20,
                  font: {
                    size: 12,
                  },
                },
              },
            },
            scales: {
              x: {
                grid: { color: "rgba(255, 255, 255, 0.1)" },
                ticks: {
                  color: "#8892b0",
                  font: { size: 11 },
                },
              },
              y: {
                grid: { color: "rgba(255, 255, 255, 0.1)" },
                ticks: {
                  color: "#8892b0",
                  font: { size: 11 },
                },
              },
            },
            interaction: {
              intersect: false,
              mode: "index",
            },
          },
        });
      } else if (this.type === "doughnut") {
        this.chart = new Chart(ctx, {
          type: "doughnut",
          data: this.data,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "60%",
            plugins: {
              legend: {
                display: true,
                position: "bottom",
                labels: {
                  color: "#8892b0",
                  usePointStyle: true,
                  padding: 20,
                  font: {
                    size: 12,
                  },
                },
              },
            },
          },
        });
      }
    },
  },
};
</script>

<style scoped>
.chart-container {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.chart-container:hover {
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.chart-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  text-align: center;
  color: #ffffff;
}

.canvas-container {
  position: relative;
  height: 300px;
}

@media (max-width: 768px) {
  .canvas-container {
    height: 250px;
  }
}

@media (max-width: 320px) {
  .canvas-container {
    height: 200px;
  }
}
</style>
