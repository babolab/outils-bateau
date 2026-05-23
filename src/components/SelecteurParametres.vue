<template>
  <div class="parametres">
    <div class="groupe">
      <label>Modèle météo</label>
      <div class="boutons">
        <button
          v-for="m in modeles"
          :key="m.valeur"
          :class="{ actif: modeleSelectionne === m.valeur }"
          @click="modeleSelectionne = m.valeur"
          :title="m.description"
        >
          {{ m.label }}
          <span class="duree">{{ m.duree }}</span>
        </button>
      </div>
    </div>

    <div class="groupe">
      <label>Température minimale</label>
      <div class="boutons">
        <button
          v-for="s in seuils"
          :key="s"
          :class="{ actif: seuilSelectionne === s }"
          @click="seuilSelectionne = s"
        >
          {{ s }}°C
        </button>
      </div>
    </div>

    <button class="btn-analyser" @click="$emit('analyser', modeleSelectionne, seuilSelectionne)">
      Analyser les prévisions
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineEmits(['analyser'])

const modeles = [
  { valeur: 'ecmwf',  label: 'ECMWF',   duree: '16j', description: 'Modèle européen, longue portée' },
  { valeur: 'gfs',    label: 'GFS',      duree: '16j', description: 'Modèle américain NOAA, longue portée' },
  { valeur: 'arpege', label: 'Arpège',   duree: '4j',  description: 'Modèle Météo-France, portée courte' },
  { valeur: 'arome',  label: 'Arome',    duree: '2j',  description: 'Modèle Météo-France haute résolution' }
]

const seuils = [0, 5, 10]

// ECMWF et 10°C sélectionnés par défaut (correspond à l'usage nominal pour l'époxy)
const modeleSelectionne = ref('ecmwf')
const seuilSelectionne = ref(10)
</script>

<style scoped>
.parametres {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: flex-end;
}
.groupe {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.groupe label {
  font-size: 0.85rem;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.boutons {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.boutons button {
  padding: 0.4rem 0.8rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #f8f8f8;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
}
.boutons button .duree {
  font-size: 0.7rem;
  color: #888;
}
.boutons button.actif {
  background: #1a6eb5;
  color: white;
  border-color: #1a6eb5;
}
.boutons button.actif .duree {
  color: #aad4f5;
}
.boutons button:hover:not(.actif) {
  background: #e8e8e8;
}
.btn-analyser {
  padding: 0.55rem 1.4rem;
  background: #1a6eb5;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 600;
}
.btn-analyser:hover {
  background: #155a96;
}
</style>
