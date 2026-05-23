import { createRouter, createWebHashHistory } from 'vue-router'
import MeteoEpoxy       from '../vues/MeteoEpoxy.vue'
import AssistantCourant from '../vues/AssistantCourant.vue'
import CalendrierMensuel from '../vues/CalendrierMensuel.vue'
import VueJour          from '../vues/VueJour.vue'

// Hash history : compatible GitHub Pages sans configuration serveur
const routes = [
  { path: '/',                       name: 'meteo-epoxy',        component: MeteoEpoxy        },
  { path: '/courant',                name: 'courant-annuel',     component: AssistantCourant  },
  { path: '/courant/mois/:mois',     name: 'courant-mensuel',    component: CalendrierMensuel },
  { path: '/courant/jour/:jour',     name: 'courant-jour',       component: VueJour           }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
