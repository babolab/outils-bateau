<template>
  <div class="page">
    <!-- Navigation entre jours -->
    <div class="nav-jours">
      <button @click="jourPrecedent">← {{ datePrecedente }}</button>
      <h2>{{ dateLisible }}</h2>
      <button @click="jourSuivant">{{ dateSuivante }} →</button>
    </div>

    <div v-if="!jourData" class="etat-info">
      Aucune donnée disponible pour ce jour.
      <RouterLink to="/courant">← Retour au calendrier</RouterLink>
    </div>

    <template v-else>
      <!-- Badges aller / retour -->
      <div class="badges">
        <div
          v-for="sens in sensAffichés"
          :key="sens"
          class="badge"
          :style="{ background: `var(${scoreVersStatut(sens === 'aller' ? jourData.scoreAller : jourData.scoreRetour).variable})` }"
        >
          <span class="badge-direction">{{ sens === 'aller' ? 'Aller →' : '← Retour' }}</span>
          <span class="badge-score">{{ sens === 'aller' ? jourData.scoreAller : jourData.scoreRetour }}/100</span>
          <span class="badge-statut">{{ scoreVersStatut(sens === 'aller' ? jourData.scoreAller : jourData.scoreRetour).label }}</span>
        </div>
      </div>

      <!-- Créneaux de passage : un par marée du jour -->
      <div class="section">
        <h3>Créneaux de passage</h3>
        <div class="blocs-creneaux">
          <div v-for="sens in sensAffichés" :key="sens" class="bloc-creneaux">
            <span class="bloc-titre">{{ sens === 'aller' ? 'Aller →' : '← Retour' }}</span>
            <ul class="liste-creneaux">
              <li v-for="(c, i) in creneauxDe(sens)" :key="i" class="creneau" :class="{ 'creneau--hors-plage': !c.realisable }">
                <span class="creneau-puce" :style="{ background: `var(${scoreVersStatut(c.score).variable})` }"></span>
                <span class="creneau-ideal">{{ c.departConseille }}</span>
                <span class="creneau-icone">{{ c.nuit ? '🌙' : '☀️' }}</span>
                <span v-if="!c.realisable" class="creneau-tag">hors plage</span>
                <span class="creneau-meta">idéal {{ c.heureIdeal }} · PM {{ c.pmHeure }} · coeff {{ c.coeff }} · score {{ c.score }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Panneau de calcul détaillé -->
      <div class="section panneau-calcul">
        <h3>Calcul de traversée</h3>
        <div class="champs-calcul">
          <label>
            Heure de départ
            <input type="time" :value="heureDepart" @change="e => mettreAJourDepartHeure(e.target.value)" />
          </label>
          <label>
            Direction
            <div class="boutons-dir">
              <button :class="{ actif: directionLocale === 'aller' }"  @click="directionLocale = 'aller'">Aller →</button>
              <button :class="{ actif: directionLocale === 'retour' }" @click="directionLocale = 'retour'">← Retour</button>
            </div>
          </label>
          <label>
            Vitesse fond {{ etat.vitesseFond.toFixed(1) }} nœuds
            <input type="range" min="3" max="10" step="0.5" v-model.number="etat.vitesseFond" />
          </label>
        </div>

        <div v-if="detail" class="resultats-calcul">
          <div class="resultat-ligne">
            <span>Heure idéale de départ</span>
            <strong>{{ detail.heureIdeal }} <span class="pm-ciblee">(PM {{ detail.pmCiblee }})</span></strong>
          </div>
          <div class="resultat-ligne">
            <span>ETA estimé à destination</span>
            <strong>{{ detail.etaHeure }}</strong>
          </div>
          <div class="resultat-ligne">
            <span>Courant au départ</span>
            <strong>{{ detail.vitesseDepart }} nœuds</strong>
          </div>
          <div class="resultat-ligne">
            <span>Courant estimé au Raz</span>
            <strong>{{ detail.vitesseRaz }} nœuds (max ~{{ detail.vMax }} nœuds)</strong>
          </div>
          <div class="commentaire">{{ detail.commentaire }}</div>
        </div>
      </div>

      <!-- Tableau des extrêmes du jour -->
      <div class="section">
        <h3>Marées du jour</h3>
        <table class="tableau-marees">
          <thead>
            <tr>
              <th>Heure locale</th>
              <th>Type</th>
              <th>Hauteur</th>
              <th>Coefficient</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in jourData.extremes" :key="e.dt">
              <td>{{ e.heureLocale }}</td>
              <td>{{ e.type === 'High' ? 'PM' : 'BM' }}</td>
              <td>{{ e.height.toFixed(2) }} m</td>
              <td>{{ e.coeff }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <RouterLink to="/courant" class="lien-retour">← Calendrier annuel</RouterLink>

    <footer class="avertissement">
      ⚠️ <strong>Outil indicatif.</strong> Données non officielles. Consultez les services officiels avant toute navigation.
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  etat, donneesAnnee, scoreVersStatut,
  calculerDetailJour, hhmm2min, min2hhmm, milieuFenetre
} from '../composables/utiliserCourant.js'

const route  = useRoute()
const router = useRouter()

const dateStr = computed(() => route.params.jour)
const jourData = computed(() => donneesAnnee.value.get(dateStr.value) ?? null)

/** Direction locale à cette vue (découplée de la direction globale) */
const directionLocale = ref('aller')

/** Milieu de la plage de départ souhaitée pour la direction active (minutes) */
function milieuPlageActive() {
  return directionLocale.value === 'aller'
    ? milieuFenetre(hhmm2min(etat.heureDepartAllerDebut),  hhmm2min(etat.heureDepartAllerFin))
    : milieuFenetre(hhmm2min(etat.heureDepartRetourDebut), hhmm2min(etat.heureDepartRetourFin))
}

/** Heure de départ testée dans le panneau de calcul (par défaut : milieu de plage) */
const minutesDepart = ref(milieuPlageActive())
const heureDepart = computed(() => min2hhmm(minutesDepart.value))

// Quand on change de direction, on recale le curseur sur le milieu de la plage
watch(directionLocale, () => { minutesDepart.value = milieuPlageActive() })

// Quand une plage change dans le panneau paramètres, on répercute si pertinent
watch(() => [etat.heureDepartAllerDebut, etat.heureDepartAllerFin], () => {
  if (directionLocale.value === 'aller') minutesDepart.value = milieuPlageActive()
})
watch(() => [etat.heureDepartRetourDebut, etat.heureDepartRetourFin], () => {
  if (directionLocale.value === 'retour') minutesDepart.value = milieuPlageActive()
})

function mettreAJourDepartHeure(hhmm) {
  minutesDepart.value = hhmm2min(hhmm)
}

const detail = computed(() => {
  if (!jourData.value) return null
  return calculerDetailJour(dateStr.value, minutesDepart.value, directionLocale.value, etat.vitesseFond)
})

/** Directions à afficher en badges selon le paramètre global */
const sensAffichés = computed(() => {
  if (etat.direction === 'both') return ['aller', 'retour']
  return [etat.direction]
})

/** Liste des créneaux (un par marée du jour) pour une direction donnée */
function creneauxDe(sens) {
  if (!jourData.value) return []
  return sens === 'aller' ? jourData.value.creneauxAller : jourData.value.creneauxRetour
}

/** Navigation entre jours */
function decalerJour(delta) {
  const d = new Date(dateStr.value)
  d.setDate(d.getDate() + delta)
  const s = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  router.push(`/courant/jour/${s}`)
}
function jourPrecedent() { decalerJour(-1) }
function jourSuivant()   { decalerJour(+1) }

const dateLisible = computed(() =>
  new Date(dateStr.value + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
)
function dateDelta(delta) {
  const d = new Date(dateStr.value + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
const datePrecedente = computed(() => dateDelta(-1))
const dateSuivante   = computed(() => dateDelta(+1))
</script>

<style scoped>
.page {
  max-width: 780px;
  margin: 0 auto;
  padding: 1.25rem 1rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.nav-jours {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.nav-jours h2 { margin: 0; font-size: 1.2rem; text-transform: capitalize; }
.nav-jours button {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  font-size: 0.85rem;
}
.etat-info { color: var(--text-muted); }

/* Badges aller/retour */
.badges { display: flex; gap: 1rem; flex-wrap: wrap; }
.badge {
  border-radius: 10px;
  padding: 0.75rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 140px;
}
.badge-direction { font-size: 0.78rem; color: rgba(255,255,255,0.8); text-transform: uppercase; }
.badge-score { font-size: 1.6rem; font-weight: 700; color: white; line-height: 1; }
.badge-statut { font-size: 0.85rem; color: rgba(255,255,255,0.9); }

/* Sections */
.section { display: flex; flex-direction: column; gap: 0.75rem; }
.section h3 {
  margin: 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}
/* Créneaux de passage */
.blocs-creneaux { display: flex; flex-wrap: wrap; gap: 1rem; }
.bloc-creneaux {
  flex: 1 1 260px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
}
.bloc-titre {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}
.liste-creneaux { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.creneau { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; }
.creneau--hors-plage { opacity: 0.55; }
.creneau-puce { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.creneau-ideal { font-weight: 700; font-variant-numeric: tabular-nums; }
.creneau-icone { font-size: 0.85rem; }
.creneau-tag {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0 0.3rem;
}
.creneau-meta { color: var(--text-muted); font-size: 0.78rem; margin-left: auto; }
.pm-ciblee { font-weight: 400; color: var(--text-muted); font-size: 0.82rem; }

/* Panneau calcul */
.champs-calcul { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; }
.champs-calcul label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.champs-calcul input[type="time"],
.champs-calcul input[type="range"] {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 0.35rem 0.5rem;
}
.champs-calcul input[type="range"] { width: 120px; padding: 0; }
.boutons-dir { display: flex; gap: 0.3rem; }
.boutons-dir button {
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-surface-2);
  color: var(--text);
  cursor: pointer;
  font-size: 0.85rem;
}
.boutons-dir button.actif { background: var(--accent); border-color: var(--accent); color: white; }

.resultats-calcul {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.resultat-ligne {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}
.resultat-ligne span { color: var(--text-muted); }
.commentaire {
  font-size: 0.85rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  padding-top: 0.5rem;
  font-style: italic;
}

/* Tableau */
.tableau-marees { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.tableau-marees th {
  background: var(--bg-surface);
  color: var(--text-muted);
  font-weight: 600;
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
}
.tableau-marees td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}
.tableau-marees tr:last-child td { border-bottom: none; }

.lien-retour { color: var(--accent); text-decoration: none; font-size: 0.9rem; }
.avertissement {
  font-size: 0.78rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  padding-top: 0.75rem;
}
</style>
