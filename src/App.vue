<template>
  <div id="app">
    <StockDashboard />
  </div>
</template>

<script>
import StockDashboard from "./components/StockDashboard.vue";

export default {
  name: "App",
  components: {
    StockDashboard,
  },
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
  color: #ffffff;
  min-height: 100vh;
  overflow-x: hidden;
}
</style>
