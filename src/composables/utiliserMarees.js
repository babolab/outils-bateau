/**
 * Chargement des données de marée depuis les fichiers JSON statiques du dépôt.
 * Fallback automatique sur le modèle harmonique M2+S2 si le JSON est absent.
 * Les données JSON sont poussées par le mainteneur via scripts/recuperer_marees.py.
 */

import { genererMareesHarmonique } from './utiliserMareesHarmonique.js'
import { scrapeMareesMoisCourant } from './utiliserMareesEncotentin.js'

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

  // 2. Tentative de scraping encotentin.fr (mois courant uniquement, CORS proxy)
  const anneeActuelle = new Date().getFullYear()
  if (annee === anneeActuelle) {
    const scraped = await scrapeMareesMoisCourant()
    if (scraped && scraped.length) {
      // Complète avec le modèle harmonique pour les mois hors de la fenêtre scrapée
      const harmonique = genererMareesHarmonique(annee)
      const extremes = fusionnerScrapingHarmonique(scraped, harmonique)
      cache[annee] = { extremes, source: 'encotentin' }
      return cache[annee]
    }
  }

  // 3. Fallback final : modèle harmonique M2+S2 calibré sur Cherbourg (hors-ligne)
  const extremes = genererMareesHarmonique(annee)
  cache[annee] = { extremes, source: 'harmonique' }
  return cache[annee]
}

/**
 * Fusionne les données scrapées (précises, mois courant) avec le modèle harmonique (année entière).
 * Les extrêmes scrapés remplacent les extrêmes harmoniques dans leur fenêtre temporelle.
 * @param {Array} scraped
 * @param {Array} harmonique
 * @returns {Array}
 */
function fusionnerScrapingHarmonique(scraped, harmonique) {
  if (!scraped.length) return harmonique
  const TAMPON = 2 * 86400  // 2 jours de tampon aux bords
  const minDt = scraped[0].dt - TAMPON
  const maxDt = scraped[scraped.length - 1].dt + TAMPON
  const harmoniqueFiltré = harmonique.filter(e => e.dt < minDt || e.dt > maxDt)
  return [...harmoniqueFiltré, ...scraped].sort((a, b) => a.dt - b.dt)
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
