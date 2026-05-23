import { ref } from 'vue'

/**
 * Endpoints Open-Meteo par modèle.
 * Arome nécessite le paramètre supplémentaire `models=arome_france`.
 */
const MODELES = {
  ecmwf:   { url: 'https://api.open-meteo.com/v1/ecmwf',       forecastDays: 16, params: {} },
  gfs:     { url: 'https://api.open-meteo.com/v1/gfs',         forecastDays: 16, params: {} },
  arpege:  { url: 'https://api.open-meteo.com/v1/meteofrance',  forecastDays: 4,  params: {} },
  arome:   { url: 'https://api.open-meteo.com/v1/meteofrance',  forecastDays: 2,  params: { models: 'arome_france' } }
}

/**
 * Regroupe un tableau de points horaires en créneaux consécutifs.
 * Un créneau est interrompu si l'écart entre deux points est > 1h.
 * @param {Array} points - Points horaires filtrés
 * @returns {Array} Tableau de créneaux { date, debutHeure, debutTemp, debutRosee, finHeure, finTemp, finRosee }
 */
function regrouperEnCreneaux(points) {
  if (points.length === 0) return []

  const creneaux = []
  let debut = points[0]
  let precedent = points[0]

  for (let i = 1; i <= points.length; i++) {
    const courant = points[i]
    const ecartMs = courant ? new Date(courant.time) - new Date(precedent.time) : Infinity

    if (ecartMs > 3600000) {
      // Rupture détectée : on enregistre le créneau précédent
      creneaux.push({
        date:        formaterDate(debut.time),
        debutHeure:  formaterHeure(debut.time),
        debutTemp:   debut.temperature_2m,
        debutRosee:  debut.dewpoint_2m,
        finHeure:    formaterHeure(precedent.time),
        finTemp:     precedent.temperature_2m,
        finRosee:    precedent.dewpoint_2m
      })
      if (courant) debut = courant
    }
    if (courant) precedent = courant
  }

  return creneaux
}

/** Formate un timestamp ISO en date lisible (ex: "lun. 23 mai") */
function formaterDate(isoString) {
  return new Date(isoString).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'long'
  })
}

/** Formate un timestamp ISO en heure (ex: "14h00") */
function formaterHeure(isoString) {
  const d = new Date(isoString)
  return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Composable principal : récupère les prévisions et calcule les créneaux favorables.
 * @returns {{ charger, chargement, erreur, creneaux }}
 */
export function utiliserPrevisions() {
  const chargement = ref(false)
  const erreur = ref(null)
  const creneaux = ref([])

  /**
   * Lance le calcul des créneaux pour un modèle, un seuil et des coordonnées donnés.
   * @param {string} modele - Clé du modèle ('ecmwf', 'gfs', 'arpege', 'arome')
   * @param {number} seuil - Température minimale en °C
   * @param {number} latitude
   * @param {number} longitude
   */
  async function charger(modele, seuil, latitude, longitude) {
    chargement.value = true
    erreur.value = null
    creneaux.value = []

    const config = MODELES[modele]
    if (!config) {
      erreur.value = `Modèle inconnu : ${modele}`
      chargement.value = false
      return
    }

    const params = new URLSearchParams({
      latitude,
      longitude,
      hourly: 'temperature_2m,dewpoint_2m',
      forecast_days: config.forecastDays,
      timezone: 'auto',
      ...config.params
    })

    try {
      const response = await fetch(`${config.url}?${params}`)
      if (!response.ok) throw new Error(`Erreur API : ${response.status}`)

      const data = await response.json()
      const { time, temperature_2m, dewpoint_2m } = data.hourly

      // Construction d'un tableau de points horaires avec les trois valeurs
      const points = time.map((t, i) => ({
        time: t,
        temperature_2m: temperature_2m[i],
        dewpoint_2m: dewpoint_2m[i]
      }))

      // Filtre : T° ≥ seuil ET point de rosée ≤ T° - 3°C
      const pointsFiltres = points.filter(p =>
        p.temperature_2m !== null &&
        p.dewpoint_2m !== null &&
        p.temperature_2m >= seuil &&
        p.dewpoint_2m <= p.temperature_2m - 3
      )

      creneaux.value = regrouperEnCreneaux(pointsFiltres)
    } catch (e) {
      erreur.value = e.message
    } finally {
      chargement.value = false
    }
  }

  return { charger, chargement, erreur, creneaux }
}
