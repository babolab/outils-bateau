<template>
  <div class="localisation">
    <h3>Localisation</h3>
    <div class="champs">
      <label>
        Latitude
        <input
          type="number"
          step="0.0001"
          v-model.number="latLocale"
          @change="emettre"
        />
      </label>
      <label>
        Longitude
        <input
          type="number"
          step="0.0001"
          v-model.number="lonLocale"
          @change="emettre"
        />
      </label>
      <button class="btn-reset" @click="reinitialiser" title="Revenir à Cherbourg">
        ↺ Cherbourg
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const LAT_DEFAUT = 49.6386
const LON_DEFAUT = -1.6164

const emit = defineEmits(['update:latitude', 'update:longitude'])

// Lecture depuis localStorage pour persister la position entre visites
const latLocale = ref(parseFloat(localStorage.getItem('lat') ?? LAT_DEFAUT))
const lonLocale = ref(parseFloat(localStorage.getItem('lon') ?? LON_DEFAUT))

/** Enregistre les coordonnées en localStorage et remonte les valeurs au parent */
function emettre() {
  localStorage.setItem('lat', latLocale.value)
  localStorage.setItem('lon', lonLocale.value)
  emit('update:latitude', latLocale.value)
  emit('update:longitude', lonLocale.value)
}

/** Remet les coordonnées de Cherbourg par défaut */
function reinitialiser() {
  latLocale.value = LAT_DEFAUT
  lonLocale.value = LON_DEFAUT
  emettre()
}

// Émission initiale pour que le parent ait les valeurs dès le montage
onMounted(emettre)
</script>

<style scoped>
.localisation h3 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.champs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: #444;
}
input[type="number"] {
  width: 110px;
  padding: 0.4rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 0.9rem;
}
.btn-reset {
  padding: 0.4rem 0.8rem;
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}
.btn-reset:hover {
  background: #e0e0e0;
}
</style>
