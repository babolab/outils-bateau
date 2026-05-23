<template>
  <div class="page">
    <header class="entete">
      <h1>🌡️ Météo Époxy</h1>
      <p class="sous-titre">
        Créneaux favorables à l'application d'époxy —
        T° ≥ seuil &amp; point de rosée ≤ T° − 3°C
      </p>
    </header>

    <section class="panneau-parametres">
      <SelecteurLocalisation
        @update:latitude="lat = $event"
        @update:longitude="lon = $event"
      />
      <hr />
      <SelecteurParametres @analyser="lancerAnalyse" />
    </section>

    <!-- État de chargement -->
    <div v-if="chargement" class="etat-info">
      <span class="spinner">⏳</span> Récupération des données en cours…
    </div>

    <!-- Erreur -->
    <div v-else-if="erreur" class="etat-erreur">
      ⚠️ {{ erreur }}
    </div>

    <!-- Résultats -->
    <section v-else-if="creneaux.length > 0" class="resultats">
      <p class="resume">
        ✅ {{ creneaux.length }} créneau{{ creneaux.length > 1 ? 'x' : '' }} trouvé{{ creneaux.length > 1 ? 's' : '' }}
        — modèle <strong>{{ modeleActif.toUpperCase() }}</strong>,
        seuil <strong>{{ seuilActif }}°C</strong>
      </p>
      <div class="grille">
        <CarteCreneaux v-for="(c, i) in creneaux" :key="i" :creneau="c" />
      </div>
    </section>

    <!-- Aucun résultat après analyse -->
    <div v-else-if="analyseEffectuee" class="etat-info">
      Aucun créneau favorable trouvé pour ce modèle et ce seuil.
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SelecteurLocalisation from '../components/SelecteurLocalisation.vue'
import SelecteurParametres from '../components/SelecteurParametres.vue'
import CarteCreneaux from '../components/CarteCreneaux.vue'
import { utiliserPrevisions } from '../composables/utiliserPrevisions.js'

const { charger, chargement, erreur, creneaux } = utiliserPrevisions()

const lat = ref(49.6386)
const lon = ref(-1.6164)
const modeleActif = ref('')
const seuilActif = ref(10)
const analyseEffectuee = ref(false)

/**
 * Déclenche la récupération et le calcul des créneaux.
 * @param {string} modele - Clé du modèle sélectionné
 * @param {number} seuil - Seuil de température en °C
 */
async function lancerAnalyse(modele, seuil) {
  modeleActif.value = modele
  seuilActif.value = seuil
  analyseEffectuee.value = false
  await charger(modele, seuil, lat.value, lon.value)
  analyseEffectuee.value = true
}
</script>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}
.entete h1 {
  font-size: 1.8rem;
  margin: 0 0 0.25rem;
  color: var(--text);
}
.sous-titre {
  color: var(--text-muted);
  margin: 0 0 1.5rem;
  font-size: 0.95rem;
}
.panneau-parametres {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 0;
}
.etat-info {
  color: var(--text-muted);
  padding: 1rem 0;
}
.etat-erreur {
  color: var(--erreur-text);
  background: var(--erreur-bg);
  border: 1px solid var(--erreur-bord);
  border-radius: 8px;
  padding: 1rem;
}
.resume {
  color: var(--succes);
  margin-bottom: 1rem;
}
.grille {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}
</style>
