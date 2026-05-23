<template>
  <div class="panneau-params">
    <div class="groupe">
      <label for="heure-depart">Heure de départ cible</label>
      <input id="heure-depart" type="time" v-model="etat.heureDepart" />
    </div>
    <div class="groupe">
      <label>Tolérance ±{{ etat.tolerance }} min</label>
      <input type="range" min="0" max="180" step="15" v-model.number="etat.tolerance" />
    </div>
    <div class="groupe">
      <label>Vitesse fond {{ etat.vitesseFond.toFixed(1) }} nœuds</label>
      <input type="range" min="3" max="10" step="0.5" v-model.number="etat.vitesseFond" />
    </div>
    <div class="groupe">
      <label>Direction</label>
      <div class="boutons-direction">
        <button :class="{ actif: etat.direction === 'aller' }"  @click="etat.direction = 'aller'">
          Aller →
        </button>
        <button :class="{ actif: etat.direction === 'retour' }" @click="etat.direction = 'retour'">
          ← Retour
        </button>
        <button :class="{ actif: etat.direction === 'both' }"   @click="etat.direction = 'both'">
          Les deux
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { etat } from '../../composables/utiliserCourant.js'
</script>

<style scoped>
.panneau-params {
  display: flex;
  flex-wrap: wrap;
  gap: 1.2rem;
  align-items: flex-end;
  padding: 1rem 1.25rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.groupe {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.groupe label {
  font-size: 0.78rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
input[type="time"],
input[type="range"] {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 0.35rem 0.5rem;
  font-size: 0.9rem;
}
input[type="range"] {
  width: 120px;
  padding: 0;
  cursor: pointer;
}
.boutons-direction {
  display: flex;
  gap: 0.3rem;
}
.boutons-direction button {
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-surface-2);
  color: var(--text);
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
}
.boutons-direction button.actif {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}
</style>
