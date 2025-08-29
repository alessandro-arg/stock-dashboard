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
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
