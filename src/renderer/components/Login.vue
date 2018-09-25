<template>
  <webview id="foo" partition="persist::uvu" v-bind:src="url" style="display:inline-flex; width:100%; height:100%"></webview>
</template>

<script>
  // const request = require('request-promise');
  export default {
    name: 'login',
    props: ['url'],
  };
</script>

<style scoped>
</style>
