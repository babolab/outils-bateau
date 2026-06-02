/**
 * Scraping des horaires de marée de Cherbourg depuis encotentin.fr.
 * Source : prédictions SHOM reproduites avec autorisation n° 2024-594.
 *
 * Le site ne fournit pas d'API ni de headers CORS, donc le fetch passe
 * par le proxy CORS public allorigins.win. Couverture : mois courant (~30 jours).
 * En cas d'échec (réseau, proxy indisponible), retourne null silencieusement.
 */

const PROXY_URL = 'https://api.allorigins.win/raw?url='
const URL_ENCOTENTIN = 'https://www.encotentin.fr/marees/cherbourg/'

/**
 * Charge les extrêmes de marée du mois courant depuis encotentin.fr.
 * @returns {Promise<Array<{dt: number, type: string, height: number}>|null>}
 */
export async function scrapeMareesMoisCourant() {
  try {
    const url = PROXY_URL + encodeURIComponent(URL_ENCOTENTIN)
    const rep = await fetch(url, { signal: AbortSignal.timeout(12000) })
    if (!rep.ok) return null
    const html = await rep.text()
    const extremes = parseHtmlMarees(html)
    return extremes.length >= 4 ? extremes : null
  } catch {
    return null
  }
}

/**
 * Parse le HTML d'encotentin.fr et extrait les extrêmes de marée.
 *
 * Structure du tableau :
 *   <tr data-time="MS_TIMESTAMP_MINUIT_LOCAL"> ← minuit Paris exprimé en UTC ms
 *     <td> BM : fiit--low-tide + heure + H. x.xx </td>
 *     <td> PM : fiit--high-tide + heure + Coef. xx + H. x.xx </td>
 *     <td> BM … </td>
 *     <td> PM … </td>
 *     <td> BM … (peut être vide) </td>
 *   </tr>
 *
 * Conversion timestamp : data-time/1000 + h*3600 + m*60
 * Correct parce que data-time est déjà le minuit local (Paris) exprimé en UTC.
 *
 * @param {string} html
 * @returns {Array<{dt: number, type: string, height: number}>}
 */
function parseHtmlMarees(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const extremes = []
  const seen = new Set()

  const rows = doc.querySelectorAll('tr.tides__day[data-time]')

  for (const row of rows) {
    const dayTsMs = parseInt(row.dataset.time)
    if (isNaN(dayTsMs)) continue

    const cells = row.querySelectorAll('td.tides__table__cell')

    for (const cell of cells) {
      const timeEl = cell.querySelector('.tides__table__cell__time')
      if (!timeEl) continue
      const timeStr = timeEl.textContent.trim()
      if (!timeStr || !timeStr.includes(':')) continue

      const [h, m] = timeStr.split(':').map(Number)
      if (isNaN(h) || isNaN(m)) continue

      const isHigh = !!cell.querySelector('.fiit--high-tide')
      const type = isHigh ? 'High' : 'Low'

      const metas = [...cell.querySelectorAll('.tides__metas__item')]
      const heightMeta = metas.find(s => s.textContent.includes('H.'))
      const height = heightMeta
        ? parseFloat(heightMeta.textContent.replace('H.', '').trim())
        : 0

      // data-time est minuit Paris (local) exprimé en UTC ms
      // Ajouter h/m en secondes donne le bon timestamp UTC
      const dt = Math.round(dayTsMs / 1000 + h * 3600 + m * 60)

      if (!seen.has(dt)) {
        seen.add(dt)
        extremes.push({ dt, type, height })
      }
    }
  }

  return extremes.sort((a, b) => a.dt - b.dt)
}
