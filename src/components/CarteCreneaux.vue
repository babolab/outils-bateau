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
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.date {
  font-weight: 600;
  font-size: 1rem;
  color: #1a6eb5;
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
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.heure {
  font-size: 1.2rem;
  font-weight: 700;
  color: #222;
}
.temp {
  font-size: 0.95rem;
  color: #d04a00;
}
.rosee {
  font-size: 0.85rem;
  color: #3a8cbf;
}
.separateur {
  font-size: 1.5rem;
  color: #bbb;
  flex-shrink: 0;
}
</style>
