import { reactive, computed } from 'vue'

// ─── État global partagé entre toutes les vues ────────────────────────────────

export const etat = reactive({
  heureDepartAller:  '08:30',  // centre de la plage 7h30–9h30 (Cherbourg → Aurigny)
  heureDepartRetour: '15:00',  // heure de départ retour (Aurigny → Cherbourg)
  tolerance:   60,             // minutes (±1h)
  vitesseFond: 5.5,            // nœuds
  direction:   'both',         // 'aller' | 'retour' | 'both'
  annee:       new Date().getFullYear(),
  marees:      []              // tableau d'extrêmes chargé depuis le JSON statique
})

// ─── Calcul du coefficient de marée (§3.4 des specs) ─────────────────────────

/**
 * Calcule le coefficient de marée à la française à partir de la hauteur de PM.
 * Formule calibrée sur Cherbourg (VM vive-eau ≈ 6,4 m, morte-eau ≈ 4,2 m).
 * @param {number} hauteurPM - hauteur de pleine mer en mètres (datum LAT)
 * @returns {number} coefficient entre 20 et 120
 */
export function calculerCoefficient(hauteurPM) {
  const coeff = Math.round(((hauteurPM - 4.2) / (6.4 - 4.2)) * (120 - 45) + 45)
  return Math.max(20, Math.min(120, coeff))
}

// ─── Vitesse maximale estimée dans le Raz Blanchard (§4.3) ───────────────────

/**
 * Estime la vitesse maximale du courant dans le Raz Blanchard en fonction du coefficient.
 * @param {number} coeff
 * @returns {number} vitesse en nœuds
 */
export function vitesseMaxRaz(coeff) {
  if (coeff <= 45)  return 2.5
  if (coeff <= 70)  return 4.5
  if (coeff <= 90)  return 6.5
  if (coeff <= 105) return 8.5
  return 11.0
}

// ─── Utilitaires de temps ─────────────────────────────────────────────────────

const FUSEAU = 'Europe/Paris'

/**
 * Convertit un timestamp Unix en date locale (AAAA-MM-JJ) sur le fuseau Europe/Paris.
 * @param {number} dt - timestamp Unix UTC
 * @returns {string}
 */
export function dateLocale(dt) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(dt * 1000)).split('/').reverse().join('-')
}

/**
 * Convertit un timestamp Unix en heure locale (HH:MM) sur le fuseau Europe/Paris.
 * @param {number} dt
 * @returns {string}
 */
export function heureLocale(dt) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: FUSEAU, hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date(dt * 1000))
}

/**
 * Convertit un timestamp Unix en nombre de minutes depuis minuit (heure locale).
 * @param {number} dt
 * @returns {number}
 */
function dtEnMinutesLocales(dt) {
  const heure = heureLocale(dt)  // "HH:MM"
  const [h, m] = heure.split(':').map(Number)
  return h * 60 + m
}

/**
 * Convertit une chaîne "HH:MM" en nombre de minutes depuis minuit.
 * @param {string} heureString
 * @returns {number}
 */
export function hhmm2min(heureString) {
  const [h, m] = heureString.split(':').map(Number)
  return h * 60 + m
}

/**
 * Convertit des minutes depuis minuit en chaîne "HH:MM".
 * @param {number} minutes
 * @returns {string}
 */
export function min2hhmm(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * Écart circulaire minimal entre deux heures exprimées en minutes (gestion minuit).
 * @param {number} a
 * @param {number} b
 * @returns {number} écart en minutes (toujours positif, ≤ 720)
 */
function ecartCirculaire(a, b) {
  const diff = Math.abs(a - b)
  return Math.min(diff, 1440 - diff)
}

// ─── Calcul des fenêtres et scores (§4.2, §4.4) ──────────────────────────────

/**
 * Calcule le score (0–100) pour un départ à une heure donnée, avec un créneau idéal T_ideal.
 * Le coefficient pondère la qualité du courant : vive-eau = score plus élevé.
 * @param {number} departMinutes - heure de départ en minutes depuis minuit
 * @param {number} idealMinutes - heure idéale de départ en minutes depuis minuit
 * @param {number} coeff
 * @returns {number}
 */
export function calculerScore(departMinutes, idealMinutes, coeff) {
  const ecart = ecartCirculaire(departMinutes, idealMinutes)
  const scoreTerps = Math.max(0, 1 - ecart / 240)   // 0 si écart ≥ 4h
  const scoreCoeff = coeff / 120
  return Math.round(scoreTerps * scoreCoeff * 100)
}

/**
 * Détermine le label et la couleur CSS selon le score (§4.4 des specs).
 * @param {number} score
 * @returns {{ label: string, variable: string }}
 */
export function scoreVersStatut(score) {
  if (score >= 75) return { label: 'Excellent',    variable: '--score-excellent'   }
  if (score >= 50) return { label: 'Favorable',    variable: '--score-favorable'   }
  if (score >= 25) return { label: 'Acceptable',   variable: '--score-acceptable'  }
  return            { label: 'Défavorable',  variable: '--score-defavorable' }
}

/**
 * Vérifie si une heure (en minutes) est en plage nocturne (22h–6h).
 * @param {number} minutes
 * @returns {boolean}
 */
function estNuit(minutes) {
  return minutes >= 22 * 60 || minutes < 6 * 60
}

// ─── Calcul par jour de l'année ───────────────────────────────────────────────

/**
 * Groupe les extrêmes par date locale et enrichit chaque extrême
 * avec son coefficient (calculé depuis la PM associée) et son heure locale.
 * @param {Array} marees - tableau brut de { dt, type, height }
 * @returns {Map<string, Array>} clé = 'AAAA-MM-JJ', valeur = extrêmes enrichis du jour
 */
function grouperParJour(marees) {
  const parJour = new Map()
  // Associe chaque PM à ses BM voisines pour calculer le coefficient
  for (let i = 0; i < marees.length; i++) {
    const e = marees[i]
    const date = dateLocale(e.dt)
    if (!parJour.has(date)) parJour.set(date, [])
    // Coefficient : cherche la PM la plus proche (avant ou après) pour chaque extrême
    let coeff = 45  // valeur par défaut (morte-eau)
    if (e.type === 'High') {
      coeff = calculerCoefficient(e.height)
    } else {
      // Pour une BM, utilise la PM immédiatement avant ou après
      const pmAvant = marees.slice(0, i).reverse().find(x => x.type === 'High')
      const pmApres = marees.slice(i + 1).find(x => x.type === 'High')
      const pm = pmApres ?? pmAvant
      if (pm) coeff = calculerCoefficient(pm.height)
    }
    parJour.get(date).push({
      ...e,
      coeff,
      heureLocale: heureLocale(e.dt),
      minutesLocales: dtEnMinutesLocales(e.dt)
    })
  }
  return parJour
}

/**
 * Calcule les scores aller et retour pour tous les jours d'une année.
 * Appelé automatiquement quand etat.marees ou les heures de départ changent.
 * @param {Array} marees
 * @param {string} heureDepartAller  - "HH:MM" (Cherbourg → Aurigny)
 * @param {string} heureDepartRetour - "HH:MM" (Aurigny → Cherbourg)
 * @returns {Map<string, JourData>}
 */
function calculerDonneesAnnee(marees, heureDepartAller, heureDepartRetour) {
  const departAllerMin  = hhmm2min(heureDepartAller)
  const departRetourMin = hhmm2min(heureDepartRetour)
  const parJour = grouperParJour(marees)
  const resultat = new Map()

  for (const [date, extremes] of parJour) {
    let meilleurAller = 0, meilleurRetour = 0
    let heureIdealAller = null, heureIdealRetour = null
    let nuitAller = false, nuitRetour = false

    for (const e of extremes) {
      if (e.type === 'Low') {
        // Aller : T_ideal = BM - 2h = BM - 120 min
        const idealMin = ((e.minutesLocales - 120) + 1440) % 1440
        const score = calculerScore(departAllerMin, idealMin, e.coeff)
        if (score > meilleurAller) {
          meilleurAller = score
          heureIdealAller = min2hhmm(idealMin)
          nuitAller = estNuit(idealMin)
        }
      } else {
        // Retour : T_ideal = PM - 2h = PM - 120 min
        const idealMin = ((e.minutesLocales - 120) + 1440) % 1440
        const score = calculerScore(departRetourMin, idealMin, e.coeff)
        if (score > meilleurRetour) {
          meilleurRetour = score
          heureIdealRetour = min2hhmm(idealMin)
          nuitRetour = estNuit(idealMin)
        }
      }
    }

    resultat.set(date, {
      date,
      extremes,
      scoreAller: meilleurAller,
      scoreRetour: meilleurRetour,
      heureIdealAller,
      heureIdealRetour,
      nuitAller,
      nuitRetour
    })
  }
  return resultat
}

// ─── Données calculées pour l'année (computed réactif) ───────────────────────

export const donneesAnnee = computed(() => {
  if (!etat.marees.length) return new Map()
  return calculerDonneesAnnee(etat.marees, etat.heureDepartAller, etat.heureDepartRetour)
})

// ─── Calcul détaillé pour la vue d'un jour ───────────────────────────────────

/**
 * Calcule les détails complets pour la vue d'un jour spécifique.
 * @param {string} dateStr - 'AAAA-MM-JJ'
 * @param {number} departMinutes - heure de départ en minutes depuis minuit
 * @param {string} direction - 'aller' | 'retour'
 * @param {number} vitesseFond - nœuds
 * @returns {Object|null}
 */
export function calculerDetailJour(dateStr, departMinutes, direction, vitesseFond) {
  const jourData = donneesAnnee.value.get(dateStr)
  if (!jourData) return null

  // Sélectionne l'extrême de référence selon la direction
  const typeRef = direction === 'aller' ? 'Low' : 'High'
  const extreme = jourData.extremes
    .filter(e => e.type === typeRef)
    .reduce((best, e) => {
      const idealMin = ((e.minutesLocales - 120) + 1440) % 1440
      const s = calculerScore(departMinutes, idealMin, e.coeff)
      return (!best || s > best.score) ? { ...e, score: s, idealMin } : best
    }, null)

  if (!extreme) return null

  const idealMin = extreme.idealMin
  const score = extreme.score
  const coeff = extreme.coeff
  const vMax = vitesseMaxRaz(coeff)

  // Vitesse du courant au moment du départ (modèle sinusoïdal §4.3)
  // T_renverse ≈ extrême - 3h = extrême.minutesLocales - 180 min
  const T_renverse = ((extreme.minutesLocales - 180) + 1440) % 1440
  const demiCycle = 180  // minutes (3h)
  const ecartDepart = ecartCirculaire(departMinutes, T_renverse)
  const vitesseDepart = parseFloat((vMax * Math.sin(Math.PI * Math.min(ecartDepart, demiCycle) / demiCycle)).toFixed(1))

  // Vitesse au Raz : à mi-traversée (ETA - heureDepart) / 2
  const dureeTraverseeMin = Math.round((25 / vitesseFond) * 60)
  const miTraverseeMin = (departMinutes + dureeTraverseeMin / 2) % 1440
  const ecartMi = ecartCirculaire(miTraverseeMin, T_renverse)
  const vitesseRaz = parseFloat((vMax * Math.sin(Math.PI * Math.min(ecartMi, demiCycle) / demiCycle)).toFixed(1))

  const etaMin = (departMinutes + dureeTraverseeMin) % 1440
  const etaHeure = min2hhmm(etaMin)

  // Écart départ/idéal pour le commentaire
  const ecartIdeal = ecartCirculaire(departMinutes, idealMin)
  const sensEcart = ((departMinutes - idealMin + 1440) % 1440) < 720 ? 'après' : 'avant'
  const sensDirection = direction === 'aller' ? 'la BM' : 'la PM'
  const { label: statut } = scoreVersStatut(score)

  const commentaire =
    `Départ ${Math.round(ecartIdeal)}min ${sensEcart} l'idéal (${min2hhmm(idealMin)}, soit −2h ${sensDirection}). ` +
    `Courant estimé au Raz : ${vitesseRaz} nœuds. Créneau ${statut.toLowerCase()}.`

  return {
    score,
    coeff,
    vMax,
    vitesseDepart,
    vitesseRaz,
    etaHeure,
    heureIdeal: min2hhmm(idealMin),
    commentaire,
    nuit: estNuit(idealMin)
  }
}

// ─── Calcul des zones de phase pour la FriseHoraire ──────────────────────────

/**
 * Calcule les zones colorées (phase du courant) pour la frise 0h–24h d'un jour.
 * Retourne un tableau de { debut, duree, couleur } pour le rendu SVG.
 * @param {string} dateStr
 * @returns {Array<{debut: number, duree: number, couleur: string}>}
 */
export function calculerZonesFrise(dateStr) {
  const jourData = donneesAnnee.value.get(dateStr)
  if (!jourData || !jourData.extremes.length) return []

  const zones = []
  const COULEUR_JUSANT   = '#2d6e2a'  // vert : jusant favorable aller
  const COULEUR_FLOT     = '#1a4a7a'  // bleu : flot favorable retour
  const COULEUR_RENVERSE = '#8a5a1a'  // orange : renverse (~0–1 nœud)
  const SEUIL_RENVERSE   = 1.0        // nœuds

  // Récupère les extrêmes du jour précédent et du jour suivant pour borner la frise
  const tousExtremes = etat.marees
  const indexPremier = tousExtremes.findIndex(e => dateLocale(e.dt) === dateStr)
  if (indexPremier === -1) return []

  // On travaille sur une fenêtre [avant-veille ... lendemain] pour avoir le contexte
  const fenetre = tousExtremes.slice(Math.max(0, indexPremier - 3), indexPremier + 8)

  // Évalue la vitesse et la phase à chaque minute (pas 15 min pour la performance)
  const PAS = 15
  const zones15 = []

  for (let min = 0; min < 1440; min += PAS) {
    const vMax = jourData.extremes[0]?.coeff ? vitesseMaxRaz(jourData.extremes[0].coeff) : 5

    // Trouve les deux extrêmes encadrant ce moment
    const minutesDuJour = min
    const ext = fenetre.find(e => e.minutesLocales !== undefined ? e.minutesLocales > minutesDuJour : false)

    // Phase approximative : jusant si le prochain extrême est BM, flot sinon
    let couleur = COULEUR_RENVERSE
    // Simplifié : zone verte si prochaine BM, zone bleue si prochain PM
    const prochain = jourData.extremes.find(e => e.minutesLocales > min)
    const precedent = [...jourData.extremes].reverse().find(e => e.minutesLocales <= min)

    if (prochain) {
      const T_max = prochain.minutesLocales
      const T_renverse = prochain.type === 'Low'
        ? ((T_max - 180) + 1440) % 1440
        : ((T_max - 180) + 1440) % 1440

      const ecart = Math.min(Math.abs(min - T_renverse), 1440 - Math.abs(min - T_renverse))
      const demiCycle = 180
      const v = vMax * Math.sin(Math.PI * Math.min(ecart, demiCycle) / demiCycle)

      if (v < SEUIL_RENVERSE) {
        couleur = COULEUR_RENVERSE
      } else if (prochain.type === 'Low') {
        couleur = COULEUR_JUSANT
      } else {
        couleur = COULEUR_FLOT
      }
    } else if (precedent) {
      couleur = precedent.type === 'Low' ? COULEUR_FLOT : COULEUR_JUSANT
    }

    zones15.push({ debut: min, couleur })
  }

  // Regroupe les minutes consécutives de même couleur en zones
  let zoneActuelle = { debut: zones15[0].debut, duree: PAS, couleur: zones15[0].couleur }
  for (let i = 1; i < zones15.length; i++) {
    if (zones15[i].couleur === zoneActuelle.couleur) {
      zoneActuelle.duree += PAS
    } else {
      zones.push({ ...zoneActuelle })
      zoneActuelle = { debut: zones15[i].debut, duree: PAS, couleur: zones15[i].couleur }
    }
  }
  zones.push({ ...zoneActuelle })

  return zones
}
