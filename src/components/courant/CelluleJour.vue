<template>
  <div
    class="cellule"
    :class="{ 'cellule--vide': !jourData }"
    :title="tooltip"
    role="button"
    tabindex="0"
    @click="naviguer"
    @keydown.enter="naviguer"
  >
    <span class="numero">{{ numeroJour }}</span>

    <!-- Fond diagonal si les deux directions sont affichées -->
    <template v-if="jourData && direction === 'both'">
      <div class="fond-aller"  :style="{ background: couleurAller  }"></div>
      <div class="fond-retour" :style="{ background: couleurRetour }"></div>
    </template>

    <!-- Fond uni pour une direction unique -->
    <div v-else-if="jourData" class="fond-uni" :style="{ background: couleurUnique }"></div>

    <!-- Icônes lune si le créneau idéal est nocturne -->
    <span v-if="jourData && nuitVisible" class="icone-nuit" aria-label="créneau nocturne">🌙</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { etat, scoreVersStatut } from '../../composables/utiliserCourant.js'

const props = defineProps({
  date:      { type: String, required: true },  // 'AAAA-MM-JJ'
  jourData:  { type: Object, default: null },   // données calculées pour ce jour
  direction: { type: String, default: 'both' } // 'aller' | 'retour' | 'both'
})

const router = useRouter()

const numeroJour = computed(() => parseInt(props.date.split('-')[2]))

/** Résout la couleur CSS d'un score via la variable CSS correspondante. */
function couleurScore(score) {
  if (!score && score !== 0) return 'var(--bg-surface-2)'
  const { variable } = scoreVersStatut(score)
  return `var(${variable})`
}

const couleurAller  = computed(() => couleurScore(props.jourData?.scoreAller))
const couleurRetour = computed(() => couleurScore(props.jourData?.scoreRetour))
const couleurUnique = computed(() => {
  if (!props.jourData) return 'transparent'
  const score = props.direction === 'retour'
    ? props.jourData.scoreRetour
    : props.jourData.scoreAller
  return couleurScore(score)
})

const nuitVisible = computed(() => {
  if (!props.jourData) return false
  if (props.direction === 'aller' || props.direction === 'both') return props.jourData.nuitAller
  return props.jourData.nuitRetour
})

const tooltip = computed(() => {
  if (!props.jourData) return ''
  const d = props.jourData
  const parties = []
  if (d.heureIdealAller)  parties.push(`Aller : idéal ${d.heureIdealAller} — score ${d.scoreAller}`)
  if (d.heureIdealRetour) parties.push(`Retour : idéal ${d.heureIdealRetour} — score ${d.scoreRetour}`)
  const coeffMoyen = d.extremes.length ? d.extremes[0].coeff : '?'
  parties.push(`Coeff. ~${coeffMoyen}`)
  return parties.join('\n')
})

function naviguer() {
  if (props.jourData) router.push(`/courant/jour/${props.date}`)
}
</script>

<style scoped>
.cellule {
  position: relative;
  aspect-ratio: 1;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cellule:hover { opacity: 0.85; }
.cellule:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.cellule--vide { cursor: default; }

/* Fond diagonal pour les deux directions */
.fond-aller {
  position: absolute;
  inset: 0;
  clip-path: polygon(0 0, 100% 0, 0 100%);
}
.fond-retour {
  position: absolute;
  inset: 0;
  clip-path: polygon(100% 0, 100% 100%, 0 100%);
}
.fond-uni {
  position: absolute;
  inset: 0;
}

.numero {
  position: relative;
  z-index: 1;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  text-shadow: 0 1px 2px rgba(0,0,0,0.6);
  line-height: 1;
}
.cellule--vide .numero {
  color: var(--text-muted);
  text-shadow: none;
}
.icone-nuit {
  position: absolute;
  bottom: 1px;
  right: 1px;
  font-size: 0.55rem;
  z-index: 2;
}
</style>
