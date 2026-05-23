import { createRouter, createWebHashHistory } from 'vue-router'
import MeteoEpoxy from '../vues/MeteoEpoxy.vue'

// Hash history : compatible GitHub Pages sans configuration serveur
const routes = [
  {
    path: '/',
    name: 'meteo-epoxy',
    component: MeteoEpoxy
  }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
