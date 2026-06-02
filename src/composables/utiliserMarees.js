/**
 * Chargement des données de marée depuis les fichiers JSON statiques du dépôt.
 * Fallback automatique sur le modèle harmonique M2+S2 si le JSON est absent.
 * Les données JSON sont poussées par le mainteneur via scripts/recuperer_marees.py.
 */

import { genererMareesHarmonique } from './utiliserMareesHarmonique.js'

// Cache mémoire pour éviter de recharger plusieurs fois la même année
const cache = {}

/**
 * Charge les extrêmes de marée pour une année donnée.
 * Priorité : JSON statique (précis) → modèle harmonique M2+S2 (indicatif, ±10–30 min).
 * @param {number} annee
 * @returns {Promise<{ extremes: Array, source: 'json'|'harmonique' }>}
 */
export async function chargerMarees(annee) {
  if (cache[annee]) return cache[annee]

  // 1. Tentative depuis le JSON statique (données précises)
  try {
    const url = `${import.meta.env.BASE_URL}data/marees-${annee}.json`
    const response = await fetch(url)
    if (response.ok) {
      const data = await response.json()
      cache[annee] = { extremes: data.extremes, source: 'json' }
      return cache[annee]
    }
  } catch { /* réseau indisponible → fallback harmonique */ }

  // 2. Fallback : modèle harmonique M2+S2 calibré sur Cherbourg (gratuit, hors-ligne)
  const extremes = genererMareesHarmonique(annee)
  cache[annee] = { extremes, source: 'harmonique' }
  return cache[annee]
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
