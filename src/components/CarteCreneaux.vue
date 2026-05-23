<template>
  <div class="carte">
    <div class="date">{{ creneau.date }}</div>
    <div class="colonnes">
      <div class="col">
        <span class="label">Début</span>
        <span class="heure">{{ creneau.debutHeure }}</span>
        <span class="temp">{{ creneau.debutTemp.toFixed(1) }}°C</span>
        <span class="rosee">💧 {{ creneau.debutRosee.toFixed(1) }}°C</span>
      </div>
      <div class="separateur">→</div>
      <div class="col">
        <span class="label">Fin</span>
        <span class="heure">{{ creneau.finHeure }}</span>
        <span class="temp">{{ creneau.finTemp.toFixed(1) }}°C</span>
        <span class="rosee">💧 {{ creneau.finRosee.toFixed(1) }}°C</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Affiche les informations d'un créneau favorable à l'application d'époxy.
 * @prop {Object} creneau - { date, debutHeure, debutTemp, debutRosee, finHeure, finTemp, finRosee }
 */
defineProps({
  creneau: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.carte {
  background: var(--bg-surface-2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  box-shadow: var(--ombre);
}
.date {
  font-weight: 600;
  font-size: 1rem;
  color: var(--accent);
  margin-bottom: 0.75rem;
  text-transform: capitalize;
}
.colonnes {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.heure {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text);
}
.temp {
  font-size: 0.95rem;
  color: var(--temp);
}
.rosee {
  font-size: 0.85rem;
  color: var(--rosee);
}
.separateur {
  font-size: 1.5rem;
  color: var(--border);
  flex-shrink: 0;
}
</style>
