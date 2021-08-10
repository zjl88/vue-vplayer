import Vue from 'vue'
import App from './App.vue'

import Tag from '../lib/my-plugin-test.umd'

console.log(Tag)
Vue.use(Tag)

// eslint-disable-next-line no-new
new Vue({
  el: '#app',
  render: h => h(App)
})
