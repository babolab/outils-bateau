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

// ─── Fenêtres de courant favorables (source: livres des courants SHOM) ────────

// Offsets en minutes par rapport à la PM de Cherbourg
const ALLER_FENETRE_DEBUT  =  80   // PM + 1h20
const ALLER_FENETRE_FIN    = 200   // PM + 3h20
const RETOUR_FENETRE_DEBUT = -220  // PM − 3h40
const RETOUR_FENETRE_FIN   = -160  // PM − 2h40

// Pénalité douce appliquée au score d'un créneau dont l'heure idéale tombe de nuit.
const FACTEUR_NUIT = 0.85

/**
 * Heure idéale de départ aller (en minutes après la PM) selon la vitesse.
 * Plus le bateau est lent, plus il faut coller au début de la fenêtre.
 * @param {number} vitesse - nœuds
 * @returns {number}
 */
function idealAllerMin(vitesse) {
  if (vitesse < 4) return ALLER_FENETRE_DEBUT  // coller au plus tôt
  if (vitesse < 6) return 120
  return 140
}

/**
 * Heure idéale de départ retour (en minutes avant la PM, valeur négative) selon la vitesse.
 * @param {number} vitesse - nœuds
 * @returns {number}
 */
function idealRetourMin(vitesse) {
  if (vitesse < 4) return RETOUR_FENETRE_DEBUT  // coller au plus tôt
  if (vitesse < 6) return -190
  return RETOUR_FENETRE_FIN
}

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
 * Vérifie si departMin est dans la fenêtre [debutMin, finMin] en gérant le passage à minuit.
 * @param {number} departMin
 * @param {number} debutMin
 * @param {number} finMin
 * @returns {boolean}
 */
function estDansFenetre(departMin, debutMin, finMin) {
  if (debutMin <= finMin) return departMin >= debutMin && departMin <= finMin
  return departMin >= debutMin || departMin <= finMin
}

/**
 * Score (0–100) avec pénalité ×0,3 si le départ est hors fenêtre SHOM.
 * @param {number} departMin
 * @param {number} idealMin
 * @param {number} coeff
 * @param {number} debutFenetre - minutes
 * @param {number} finFenetre - minutes
 * @returns {number}
 */
export function calculerScoreAvecFenetre(departMin, idealMin, coeff, debutFenetre, finFenetre) {
  const score = calculerScore(departMin, idealMin, coeff)
  return estDansFenetre(departMin, debutFenetre, finFenetre) ? score : Math.round(score * 0.3)
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
 * Construit le créneau de passage d'une marée (PM) pour une direction donnée.
 * Chaque marée du jour génère son propre créneau idéal : le score reflète la
 * qualité du courant à l'heure idéale (pondérée par le coefficient), avec une
 * pénalité douce si ce créneau idéal tombe de nuit.
 * @param {Object} pm - extrême PM enrichi { minutesLocales, heureLocale, coeff }
 * @param {string} direction - 'aller' | 'retour'
 * @param {number} vitesse - nœuds
 * @returns {Object}
 */
function creneauPourMaree(pm, direction, vitesse) {
  const offset      = direction === 'aller' ? idealAllerMin(vitesse) : idealRetourMin(vitesse)
  const debutOffset = direction === 'aller' ? ALLER_FENETRE_DEBUT    : RETOUR_FENETRE_DEBUT
  const finOffset   = direction === 'aller' ? ALLER_FENETRE_FIN      : RETOUR_FENETRE_FIN

  const idealMin     = (pm.minutesLocales + offset      + 1440) % 1440
  const debutFenetre = (pm.minutesLocales + debutOffset + 1440) % 1440
  const finFenetre   = (pm.minutesLocales + finOffset   + 1440) % 1440

  const nuit  = estNuit(idealMin)
  // Score à l'heure idéale = qualité intrinsèque de la marée (coefficient).
  const score = Math.round(calculerScore(idealMin, idealMin, pm.coeff) * (nuit ? FACTEUR_NUIT : 1))

  return {
    pmHeure:    pm.heureLocale,
    pmMinutes:  pm.minutesLocales,
    heureIdeal: min2hhmm(idealMin),
    idealMin,
    debutFenetre,
    finFenetre,
    coeff: pm.coeff,
    score,
    nuit
  }
}

/** Retourne le créneau au meilleur score d'une liste (ou null si vide). */
function meilleurCreneau(creneaux) {
  return creneaux.reduce((best, c) => (!best || c.score > best.score ? c : best), null)
}

/**
 * Calcule, pour chaque jour de l'année, un créneau de passage par marée du jour
 * (généralement deux PM), dans les deux directions. Les champs de synthèse
 * (scoreAller, heureIdealAller…) reflètent la meilleure des marées du jour.
 * @param {Array} marees
 * @param {number} vitesseFond - nœuds
 * @returns {Map<string, JourData>}
 */
function calculerDonneesAnnee(marees, vitesseFond) {
  const parJour = grouperParJour(marees)
  const resultat = new Map()

  for (const [date, extremes] of parJour) {
    const pms = extremes.filter(e => e.type === 'High')
    // Un créneau par marée (PM) du jour, pour chaque direction.
    const creneauxAller  = pms.map(pm => creneauPourMaree(pm, 'aller',  vitesseFond))
    const creneauxRetour = pms.map(pm => creneauPourMaree(pm, 'retour', vitesseFond))

    const meilleurAller  = meilleurCreneau(creneauxAller)
    const meilleurRetour = meilleurCreneau(creneauxRetour)

    resultat.set(date, {
      date,
      extremes,
      creneauxAller,
      creneauxRetour,
      // Synthèse : meilleure des marées du jour (calendrier + badges).
      scoreAller:       meilleurAller?.score ?? 0,
      scoreRetour:      meilleurRetour?.score ?? 0,
      heureIdealAller:  meilleurAller?.heureIdeal ?? null,
      heureIdealRetour: meilleurRetour?.heureIdeal ?? null,
      nuitAller:        meilleurAller?.nuit ?? false,
      nuitRetour:       meilleurRetour?.nuit ?? false
    })
  }
  return resultat
}

// ─── Données calculées pour l'année (computed réactif) ───────────────────────

export const donneesAnnee = computed(() => {
  if (!etat.marees.length) return new Map()
  return calculerDonneesAnnee(etat.marees, etat.vitesseFond)
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

  // Les deux marées du jour offrent chacune un créneau : on cible celle dont
  // l'heure idéale est la plus proche de l'heure saisie, ce qui permet de
  // planifier indifféremment l'une ou l'autre marée (saisir une heure du matin
  // vise la PM du matin, une heure du soir vise la PM du soir).
  const creneaux = direction === 'aller' ? jourData.creneauxAller : jourData.creneauxRetour
  if (!creneaux.length) return null

  const creneau = creneaux.reduce((best, c) => {
    const ecart = ecartCirculaire(departMinutes, c.idealMin)
    return (!best || ecart < best.ecart) ? { ...c, ecart } : best
  }, null)

  const idealMin = creneau.idealMin
  const coeff = creneau.coeff
  const score = calculerScoreAvecFenetre(departMinutes, idealMin, coeff, creneau.debutFenetre, creneau.finFenetre)
  const vMax = vitesseMaxRaz(coeff)

  // Vitesse du courant au moment du départ (modèle sinusoïdal §4.3)
  // T_renverse ≈ PM - 3h = pmMinutes - 180 min
  const T_renverse = ((creneau.pmMinutes - 180) + 1440) % 1440
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
  const { label: statut } = scoreVersStatut(score)
  const offsetMin  = direction === 'aller' ? idealAllerMin(vitesseFond) : idealRetourMin(vitesseFond)
  const signOffset = offsetMin >= 0 ? `+${offsetMin}` : `${offsetMin}`

  const commentaire =
    `Départ ${Math.round(ecartIdeal)}min ${sensEcart} l'idéal (${min2hhmm(idealMin)}, soit PM${signOffset}min). ` +
    `Courant estimé au Raz : ${vitesseRaz} nœuds. Créneau ${statut.toLowerCase()}.`

  return {
    score,
    coeff,
    vMax,
    vitesseDepart,
    vitesseRaz,
    etaHeure,
    heureIdeal: min2hhmm(idealMin),
    pmCiblee: creneau.pmHeure,
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
