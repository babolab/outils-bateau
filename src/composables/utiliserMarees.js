/**
 * Chargement des données de marée depuis les fichiers JSON statiques du dépôt.
 * Aucun appel API à chaque visite : les données sont poussées par le mainteneur
 * via scripts/recuperer_marees.py, puis servies comme assets statiques.
 */

// Cache mémoire pour éviter de recharger plusieurs fois la même année
const cache = {}

/**
 * Charge les extrêmes de marée pour une année donnée.
 * @param {number} annee
 * @returns {Promise<Array>} Tableau de { dt, type, height }
 */
export async function chargerMarees(annee) {
  if (cache[annee]) return cache[annee]
  // import.meta.env.BASE_URL gère le préfixe /outils-bateau/ en production
  const url = `${import.meta.env.BASE_URL}data/marees-${annee}.json`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Données de marée ${annee} non disponibles. ` +
      `Exécutez scripts/recuperer_marees.py --annee ${annee} et poussez le résultat.`
    )
  }
  const data = await response.json()
  cache[annee] = data.extremes
  return data.extremes
}

/**
 * Retourne la liste des années pour lesquelles des données sont disponibles.
 * @returns {Promise<number[]>}
 */
export async function chargerAnneesDisponibles() {
  try {
    const url = `${import.meta.env.BASE_URL}data/manifest.json`
    const r = await fetch(url)
    if (!r.ok) return []
    return (await r.json()).annees ?? []
  } catch {
    return []
  }
}
