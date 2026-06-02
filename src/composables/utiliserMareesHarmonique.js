/**
 * Modèle harmonique M2+S2 pour Cherbourg — port du script Python recuperer_marees.py.
 * Génère les extrêmes de marée sans aucun appel réseau.
 * Précision indicative : ±10–30 min (drift progressif sur plusieurs années).
 * Suffisant pour planifier des traversées ; consulter les tables SHOM pour la navigation officielle.
 */

// Paramètres harmoniques calibrés sur Cherbourg (constituants M2 + S2)
const M2_AMPLITUDE = 2.83        // mètres
const S2_AMPLITUDE = 0.63        // mètres
const MSL_AU_DESSUS_LAT = 3.30   // niveau moyen au-dessus du zéro hydrographique (LAT)
const M2_PERIODE = 44714.16      // secondes (12 h 25 min 14 s)
const S2_PERIODE = 43200.0       // secondes (12 h)

// Phases de référence calibrées pour le 1er janvier 2026 00:00 UTC
const REF_TIMESTAMP = 1735689600
const M2_PHASE = REF_TIMESTAMP + 900    // premier minimum M2 ≈ 00:15 UTC
const S2_PHASE = REF_TIMESTAMP + 2700   // premier minimum S2 ≈ 00:45 UTC

/**
 * Calcule la hauteur de marée (mètres, datum LAT) à l'instant t (timestamp Unix UTC).
 * @param {number} t - timestamp Unix
 * @returns {number}
 */
function hauteurMaree(t) {
  const hM2 = M2_AMPLITUDE * Math.cos(2 * Math.PI * (t - M2_PHASE) / M2_PERIODE)
  const hS2 = S2_AMPLITUDE * Math.cos(2 * Math.PI * (t - S2_PHASE) / S2_PERIODE)
  return MSL_AU_DESSUS_LAT + hM2 + hS2
}

/**
 * Génère les extrêmes de marée pour une année entière par modèle harmonique.
 * Retourne un tableau de { dt, type, height } compatible avec le format JSON statique.
 * @param {number} annee
 * @returns {Array<{dt: number, type: string, height: number}>}
 */
export function genererMareesHarmonique(annee) {
  const debut = Date.UTC(annee, 0, 1) / 1000
  const fin   = Date.UTC(annee + 1, 0, 1) / 1000

  // Évaluation toutes les 10 minutes (≈ 52 000 itérations pour une année)
  const PAS = 600
  const extremes = []
  let hPrec    = hauteurMaree(debut)
  let derivPrec = null

  for (let t = debut + PAS; t <= fin; t += PAS) {
    const h    = hauteurMaree(t)
    const deriv = h - hPrec

    if (derivPrec !== null) {
      const dt = t - PAS / 2
      if (derivPrec > 0 && deriv <= 0) {
        // Maximum local → PM
        extremes.push({ dt: Math.round(dt), type: 'High', height: Math.round((hPrec + h) / 2 * 100) / 100 })
      } else if (derivPrec < 0 && deriv >= 0) {
        // Minimum local → BM
        extremes.push({ dt: Math.round(dt), type: 'Low',  height: Math.round((hPrec + h) / 2 * 100) / 100 })
      }
    }

    hPrec    = h
    derivPrec = deriv
  }

  return extremes
}
