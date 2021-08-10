<template>
  <div id="app">
    <div style="margin-top: 200px; width: 300px;">
      <!--    <vue-vplayer type="audio" url="https://www.w3school.com.cn//i/horse.ogg"></vue-vplayer>-->
      <vue-vplayer type="video" url="https://www.w3school.com.cn//i/movie.ogg"></vue-vplayer>
    </div>
  </div>
</template>

<script>
import VueVplayer from '../packages/player/src/player'
export default {
  name: 'app',
  components: {
    VueVplayer
  },
  data () {
    return {
      msg: 'Welcome to Your Vue.js App'
    }
  }
}
</script>

<style lang="scss">
.vue-player-box{
  margin-top: 200px;
  width: 300px;
}
</style>
