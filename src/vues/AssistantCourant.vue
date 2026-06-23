<template>
  <div class="page">
    <header class="entete">
      <div class="entete-titre">
        <h1>⚓ Cherbourg ↔ Aurigny</h1>
        <p class="sous-titre">Créneaux de traversée du Raz Blanchard</p>
      </div>
      <div class="entete-controls">
        <label class="label-annee">
          Année
          <select v-model.number="etat.annee" @change="chargerAnnee">
            <option v-for="a in anneesDisponibles" :key="a" :value="a">{{ a }}</option>
          </select>
        </label>
      </div>
    </header>

    <!-- Explication du principe des créneaux -->
    <p class="intro">
      Chaque jour compte généralement deux marées (pleines mers). Autour de chaque PM s'ouvre
      une fenêtre de courant favorable dans le Raz Blanchard&nbsp;: environ <strong>1h20 à 3h20 après
      la PM</strong> pour l'aller (jusant), <strong>2h40 à 3h40 avant la PM</strong> pour le retour (flot).
      Un jour n'apparaît en vert que si cette fenêtre tombe dans la <strong>plage de départ</strong>
      que vous fixez ci-dessous&nbsp;; le score combine alors le coefficient de marée et la proximité
      de l'heure idéale. La couleur affichée retient la meilleure des deux marées du jour — ouvrez un
      jour pour voir le détail des deux créneaux (aller et retour).
    </p>

    <!-- Panneau paramètres rapides (plages de départ, vitesse, direction) -->
    <PanneauParametres />

    <!-- État chargement / erreur / source -->
    <div v-if="chargement" class="etat-info">⏳ Chargement des données de marée…</div>
    <div v-else-if="erreur" class="etat-erreur">⚠️ {{ erreur }}</div>
    <div v-else-if="sourceMarees === 'encotentin'" class="etat-harmonique">
      🌊 Mois courant : données SHOM via encotentin.fr. Reste de l'année : modèle harmonique M2+S2 (±10–30 min).
    </div>
    <div v-else-if="sourceMarees === 'harmonique'" class="etat-harmonique">
      ⚙️ Données calculées localement (modèle harmonique M2+S2, précision ±10–30 min).
      Pour des données précises, exécutez <code>scripts/recuperer_marees.py --annee {{ etat.annee }}</code>.
    </div>

    <!-- Calendrier annuel -->
    <div v-else-if="etat.marees.length" class="calendrier-annuel">
      <div v-for="mois in moisAnnee" :key="mois.cle" class="bloc-mois">
        <div class="nom-mois">{{ mois.nom }}</div>
        <div class="grille-jours">
          <!-- En-têtes L–D -->
          <div v-for="j in joursSemaine" :key="j" class="entete-jour">{{ j }}</div>
          <!-- Cellules vides avant le 1er du mois -->
          <div v-for="n in mois.decalage" :key="`vide-${n}`" class="cellule-vide"></div>
          <!-- Jours du mois -->
          <CelluleJour
            v-for="date in mois.dates"
            :key="date"
            :date="date"
            :jourData="donneesAnnee.get(date) ?? null"
            :direction="etat.direction"
          />
        </div>
      </div>
    </div>

    <!-- Légende -->
    <div v-if="etat.marees.length && !erreur" class="legende">
      <span class="legende-item" v-for="item in legendeItems" :key="item.label">
        <span class="legende-couleur" :style="{ background: item.couleur }"></span>
        {{ item.label }}
      </span>
    </div>

    <!-- Avertissement légal (§8.1 des specs) -->
    <footer class="avertissement">
      ⚠️ <strong>Outil indicatif uniquement.</strong> Ne remplace pas une préparation météo marine complète,
      les avis aux navigateurs (CROSS Jobourg), ni le jugement du navigateur.
      Données de marée : modèle harmonique simplifié — non officiel.
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import PanneauParametres from '../components/courant/PanneauParametres.vue'
import CelluleJour from '../components/courant/CelluleJour.vue'
import { etat, donneesAnnee } from '../composables/utiliserCourant.js'
import { chargerMarees, chargerAnneesDisponibles } from '../composables/utiliserMarees.js'

const chargement = ref(false)
const erreur = ref(null)
const anneesDisponibles = ref([])
const sourceMarees = ref(null)  // 'json' | 'harmonique' | null

const joursSemaine = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const legendeItems = [
  { label: 'Excellent (≥75)',   couleur: 'var(--score-excellent)'   },
  { label: 'Favorable (50–74)', couleur: 'var(--score-favorable)'   },
  { label: 'Acceptable (25–49)', couleur: 'var(--score-acceptable)'  },
  { label: 'Défavorable (<25)', couleur: 'var(--score-defavorable)' }
]

/** Charge les marées pour l'année sélectionnée dans etat. */
async function chargerAnnee() {
  chargement.value = true
  erreur.value = null
  sourceMarees.value = null
  try {
    const resultat = await chargerMarees(etat.annee)
    etat.marees = resultat.extremes
    sourceMarees.value = resultat.source
  } catch (e) {
    erreur.value = e.message
    etat.marees = []
  } finally {
    chargement.value = false
  }
}

onMounted(async () => {
  const anneesCourante = new Date().getFullYear()
  anneesDisponibles.value = await chargerAnneesDisponibles()
  // Toujours proposer l'année courante et les deux suivantes (modèle harmonique en fallback)
  for (const a of [anneesCourante, anneesCourante + 1, anneesCourante + 2]) {
    if (!anneesDisponibles.value.includes(a)) anneesDisponibles.value.push(a)
  }
  anneesDisponibles.value.sort()
  if (!anneesDisponibles.value.includes(etat.annee)) etat.annee = anneesCourante
  await chargerAnnee()
})

/**
 * Calcule la liste des 12 mois de l'année avec leur décalage ISO (lundi = 0)
 * et la liste des dates AAAA-MM-JJ de chaque jour.
 */
const NOMS_MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const moisAnnee = computed(() => {
  const annee = etat.annee
  return NOMS_MOIS.map((nom, i) => {
    const moisNum = i + 1
    const premierJour = new Date(annee, i, 1)
    // ISO : lundi=0, dimanche=6
    const decalage = (premierJour.getDay() + 6) % 7
    const nbJours = new Date(annee, moisNum, 0).getDate()
    const cle = `${annee}-${String(moisNum).padStart(2, '0')}`
    const dates = Array.from({ length: nbJours }, (_, j) =>
      `${annee}-${String(moisNum).padStart(2, '0')}-${String(j + 1).padStart(2, '0')}`
    )
    return { cle, nom, decalage, dates }
  })
})
</script>

<style scoped>
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.25rem 1rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.entete {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.entete h1 { font-size: 1.6rem; margin: 0 0 0.2rem; }
.sous-titre { color: var(--text-muted); margin: 0; font-size: 0.9rem; }
.intro {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--text-muted);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.85rem 1.1rem;
}
.intro strong { color: var(--text); font-weight: 600; }
.label-annee {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.78rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.label-annee select {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 0.35rem 0.5rem;
  font-size: 0.9rem;
}
.etat-info { color: var(--text-muted); }
.etat-erreur {
  color: var(--erreur-text);
  background: var(--erreur-bg);
  border: 1px solid var(--erreur-bord);
  border-radius: 8px;
  padding: 1rem;
}
.etat-harmonique {
  font-size: 0.82rem;
  color: var(--text-muted);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 1rem;
}
.etat-harmonique code {
  background: var(--bg-surface-2);
  border-radius: 4px;
  padding: 0.1rem 0.35rem;
  font-size: 0.8rem;
}
/* Grille des 12 mois */
.calendrier-annuel {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}
@media (max-width: 768px) {
  .calendrier-annuel { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .calendrier-annuel { grid-template-columns: 1fr; }
}
.bloc-mois {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.6rem;
}
.nom-mois {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
}
.grille-jours {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.entete-jour {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-align: center;
  padding: 2px 0;
}
.cellule-vide { aspect-ratio: 1; }

/* Légende */
.legende {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}
.legende-item { display: flex; align-items: center; gap: 0.4rem; }
.legende-couleur {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
}

/* Bandeau légal */
.avertissement {
  font-size: 0.8rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  padding-top: 0.75rem;
  line-height: 1.5;
}
</style>
