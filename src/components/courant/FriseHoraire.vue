<template>
  <div class="frise-conteneur">
    <!-- Visualisation SVG : 1440 unités = 1440 minutes de 0h à 24h -->
    <svg viewBox="0 0 1440 70" class="frise-svg" aria-hidden="true">
      <!-- Zones de phase colorées -->
      <rect
        v-for="z in zones"
        :key="z.debut"
        :x="z.debut" y="0"
        :width="z.duree" height="50"
        :fill="z.couleur"
      />
      <!-- Graduations horaires (toutes les 3h) -->
      <g v-for="h in [0,3,6,9,12,15,18,21]" :key="h">
        <line :x1="h*60" y1="0" :x2="h*60" y2="55" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
        <text :x="h*60+4" y="64" fill="var(--text-muted)" font-size="11">{{ h }}h</text>
      </g>
      <!-- Marqueurs PM/BM -->
      <g v-for="e in extremes" :key="e.dt">
        <line
          :x1="e.minutesLocales" y1="0"
          :x2="e.minutesLocales" y2="50"
          stroke="white" stroke-width="1.5" stroke-dasharray="4,2"
        />
        <text
          :x="e.minutesLocales" y="46"
          fill="white" font-size="10" text-anchor="middle"
          style="paint-order: stroke; stroke: rgba(0,0,0,0.5); stroke-width: 2"
        >{{ e.type === 'High' ? 'PM' : 'BM' }}
        </text>
      </g>
      <!-- Curseur de départ -->
      <line
        :x1="minutesDepart" y1="0"
        :x2="minutesDepart" y2="50"
        stroke="white" stroke-width="3"
      />
      <polygon
        :points="`${minutesDepart-6},0 ${minutesDepart+6},0 ${minutesDepart},10`"
        fill="white"
      />
    </svg>

    <!-- Input range invisible par-dessus le SVG pour l'interaction -->
    <input
      type="range"
      class="curseur-interactif"
      min="0" max="1439" step="5"
      :value="minutesDepart"
      @input="e => $emit('update:minutesDepart', Number(e.target.value))"
      :aria-label="`Heure de départ : ${heureDepart}`"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { calculerZonesFrise } from '../../composables/utiliserCourant.js'

const props = defineProps({
  dateStr:       { type: String,  required: true },
  minutesDepart: { type: Number,  required: true },
  heureDepart:   { type: String,  required: true },
  extremes:      { type: Array,   default: () => [] }
})

defineEmits(['update:minutesDepart'])

const zones = computed(() => calculerZonesFrise(props.dateStr))
</script>

<style scoped>
.frise-conteneur {
  position: relative;
  width: 100%;
  user-select: none;
}
.frise-svg {
  width: 100%;
  height: 72px;
  display: block;
  border-radius: 8px;
  background: var(--bg-surface-2);
  overflow: visible;
}
/* Range input positionné par-dessus le SVG, transparent */
.curseur-interactif {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 52px;
  opacity: 0;
  cursor: ew-resize;
  margin: 0;
  padding: 0;
}
</style>
