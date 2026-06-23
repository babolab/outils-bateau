<template>
  <div class="panneau-params">
    <div class="groupe">
      <label>Plage départ aller</label>
      <div class="plage">
        <input type="time" v-model="etat.heureDepartAllerDebut" aria-label="Début plage départ aller" />
        <span class="plage-sep">→</span>
        <input type="time" v-model="etat.heureDepartAllerFin" aria-label="Fin plage départ aller" />
      </div>
      <span class="aide">Cherbourg → Aurigny</span>
    </div>
    <div class="groupe">
      <label>Plage départ retour</label>
      <div class="plage">
        <input type="time" v-model="etat.heureDepartRetourDebut" aria-label="Début plage départ retour" />
        <span class="plage-sep">→</span>
        <input type="time" v-model="etat.heureDepartRetourFin" aria-label="Fin plage départ retour" />
      </div>
      <span class="aide">Aurigny → Cherbourg</span>
    </div>
    <div class="groupe">
      <label>Vitesse fond {{ etat.vitesseFond.toFixed(1) }} nœuds</label>
      <input type="range" min="3" max="10" step="0.5" v-model.number="etat.vitesseFond" />
      <span class="aide">Affecte l'heure idéale et le score. &lt; 4 nœuds : créneau réduit au début de la fenêtre.</span>
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
.plage {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.plage-sep { color: var(--text-muted); }
.aide {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-style: italic;
  max-width: 160px;
  line-height: 1.3;
  text-transform: none;
  letter-spacing: 0;
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
