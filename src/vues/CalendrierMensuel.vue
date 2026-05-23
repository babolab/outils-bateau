<template>
  <div class="page">
    <div class="nav-haut">
      <button @click="moisPrecedent">← {{ nomMoisPrecedent }}</button>
      <h2>{{ nomMoisCourant }} {{ annee }}</h2>
      <button @click="moisSuivant">{{ nomMoisSuivant }} →</button>
    </div>

    <PanneauParametres />

    <div v-if="!etat.marees.length" class="etat-info">
      Chargez d'abord les données depuis l'onglet calendrier annuel.
    </div>

    <div v-else class="grille-mensuelle">
      <div v-for="j in joursSemaine" :key="j" class="entete-jour">{{ j }}</div>
      <div v-for="n in decalage" :key="`v-${n}`" class="cellule-vide"></div>
      <div
        v-for="date in datesduMois"
        :key="date"
        class="cellule-detail"
        :class="{ 'sans-donnees': !donneesAnnee.get(date) }"
        @click="naviguerJour(date)"
      >
        <span class="num">{{ parseInt(date.split('-')[2]) }}</span>
        <template v-if="donneesAnnee.get(date)">
          <span class="score-aller"  v-if="etat.direction !== 'retour'">
            <span class="puce" :style="{ background: couleurScore(donneesAnnee.get(date).scoreAller)   }"></span>
            {{ donneesAnnee.get(date).scoreAller }}
          </span>
          <span class="score-retour" v-if="etat.direction !== 'aller'">
            <span class="puce" :style="{ background: couleurScore(donneesAnnee.get(date).scoreRetour)  }"></span>
            {{ donneesAnnee.get(date).scoreRetour }}
          </span>
        </template>
      </div>
    </div>

    <RouterLink to="/courant" class="lien-retour">← Calendrier annuel</RouterLink>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PanneauParametres from '../components/courant/PanneauParametres.vue'
import { etat, donneesAnnee, scoreVersStatut } from '../composables/utiliserCourant.js'

const router = useRouter()
const route  = useRoute()

// Paramètre de route : "2026-06"
const [annee, mois] = route.params.mois.split('-').map(Number)

const joursSemaine = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const NOMS_MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const nomMoisCourant  = NOMS_MOIS[mois - 1]
const nomMoisPrecedent = NOMS_MOIS[((mois - 2 + 12) % 12)]
const nomMoisSuivant   = NOMS_MOIS[(mois % 12)]

const decalage = computed(() => {
  return (new Date(annee, mois - 1, 1).getDay() + 6) % 7
})

const datesduMois = computed(() => {
  const nbJours = new Date(annee, mois, 0).getDate()
  return Array.from({ length: nbJours }, (_, i) =>
    `${annee}-${String(mois).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
  )
})

function couleurScore(score) {
  if (!score && score !== 0) return 'var(--bg-surface-2)'
  return `var(${scoreVersStatut(score).variable})`
}

function naviguerJour(date) { router.push(`/courant/jour/${date}`) }

function moisPrecedent() {
  const d = new Date(annee, mois - 2, 1)
  router.push(`/courant/mois/${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
}
function moisSuivant() {
  const d = new Date(annee, mois, 1)
  router.push(`/courant/mois/${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
}
</script>

<style scoped>
.page {
  max-width: 700px;
  margin: 0 auto;
  padding: 1.25rem 1rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.nav-haut {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.nav-haut h2 { margin: 0; font-size: 1.3rem; }
.nav-haut button {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 0.4rem 0.8rem;
  cursor: pointer;
}
.etat-info { color: var(--text-muted); }

.grille-mensuelle {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.entete-jour {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-align: center;
  padding: 4px 0;
}
.cellule-vide { min-height: 60px; }
.cellule-detail {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 6px;
  cursor: pointer;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cellule-detail:hover { border-color: var(--accent); }
.cellule-detail.sans-donnees { opacity: 0.4; cursor: default; }
.num {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}
.score-aller, .score-retour {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  color: var(--text);
}
.puce {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.lien-retour {
  color: var(--accent);
  text-decoration: none;
  font-size: 0.9rem;
}
</style>
