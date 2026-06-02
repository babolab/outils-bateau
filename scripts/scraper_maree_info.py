"""
Scraper maree.info pour les horaires de marée de Cherbourg (port 33).

Source: maree.info/33 — prédictions issues des tables SHOM.
Méthode: session HTTP + endpoint AJAX /do/load-maree-jours.php, qui permet
d'accéder à n'importe quelle date (passé et futur) dans la plage couverte.
Couverture typique: MareeMinYMD → MareeMaxYMD (ex. 2011-01 à 2026-10).

Si maree.info ne fournit pas de données pour une période, elle est simplement
absente du JSON — pas de fallback harmonique.

Comportement lors d'un re-scrap: les données passées déjà présentes dans
le JSON existant sont conservées, seules les nouvelles données sont ajoutées/mises à jour.

Usage:
  pip install requests beautifulsoup4
  python scripts/scraper_maree_info.py --annee 2026
"""

import argparse
import json
import os
import re
import time
import sys
from datetime import date, datetime, timedelta, timezone

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Erreur : pip install requests beautifulsoup4", file=sys.stderr)
    sys.exit(1)

PORT = 33  # Cherbourg
BASE_URL = "https://maree.info"
AJAX_URL = f"{BASE_URL}/do/load-maree-jours.php"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; outils-bateau-scraper/1.0)"}
PAUSE = 1.2  # secondes entre requêtes (politesse)


def _ouvrir_session():
    """Ouvre une session HTTP sur maree.info pour obtenir un cookie valide."""
    sess = requests.Session()
    sess.headers.update(HEADERS)
    resp = sess.get(f"{BASE_URL}/{PORT}", timeout=15)
    resp.raise_for_status()
    return sess


def _charger_semaine(sess, ymd_str, annee):
    """
    Charge 7 jours depuis l'endpoint AJAX à partir de la date YYYYMMDD.
    Retourne une liste de {dt, type, height} pour les jours de l'année demandée.

    Structure de la réponse AJAX :
    - JS : Marees.Dates = [YYYYMMDD, ...] (7 dates exactes)
    - HTML : table MareeJours avec <tr title="UTC+N"> pour l'offset timezone
             et <td> avec PM en <b>, BM en texte nu
    """
    resp = sess.get(
        AJAX_URL,
        params={"p": PORT, "d": ymd_str, "j": 0},
        headers={"X-Requested-With": "XMLHttpRequest", "Referer": f"{BASE_URL}/{PORT}"},
        timeout=15,
    )
    resp.raise_for_status()
    text = resp.text

    if "session terminée" in text or len(text) < 100:
        raise RuntimeError("Session expirée — relancer le script")

    # Extraire le tableau des dates réelles depuis Marees.Dates = [...]
    m = re.search(r"Marees\.Dates\s*=\s*\[([^\]]+)\]", text)
    if not m:
        return []
    dates_list = [int(d.strip()) for d in m.group(1).split(",")]

    # Parser le HTML injecté dans la réponse (format: e.innerHTML="...";)
    html_match = re.search(r'innerHTML="(.*?)";', text, re.DOTALL)
    if not html_match:
        return []
    inner_html = html_match.group(1).replace('\\"', '"').replace("\\'", "'").replace("\\n", "\n")

    soup = BeautifulSoup(inner_html, "html.parser")
    extremes = []

    for idx, row in enumerate(soup.find_all("tr", class_=re.compile(r"\bMJ\b"))):
        if idx >= len(dates_list):
            break
        raw_date = dates_list[idx]
        annee_r = raw_date // 10000
        mois_r  = (raw_date % 10000) // 100
        jour_r  = raw_date % 100
        if annee_r != annee:
            continue

        # Offset UTC depuis title="UTC+N" ou "UTC+2"
        title_val = row.get("title", "UTC+1")
        utc_match = re.search(r"UTC([+-]\d+)", title_val)
        utc_offset_h = int(utc_match.group(1)) if utc_match else 1

        tds = row.find_all("td")
        if len(tds) < 2:
            continue

        def items(td):
            result = []
            for child in td.children:
                tag = getattr(child, "name", None)
                if tag == "br":
                    continue
                if tag == "b":
                    text_ = child.get_text(strip=True)
                    if text_:
                        result.append((True, text_))
                elif tag is None:
                    text_ = str(child).strip()
                    if text_:
                        result.append((False, text_))
            return result

        heures = items(tds[0])
        hauteurs = items(tds[1])

        for (is_high, heure_str), (_, hauteur_str) in zip(heures, hauteurs):
            hm = re.match(r"(\d+)h(\d+)", heure_str)
            if not hm:
                continue
            try:
                height = float(hauteur_str.rstrip("m").replace(",", "."))
            except ValueError:
                continue

            # Convertir heure locale → UTC en soustrayant l'offset
            h, mn = int(hm.group(1)), int(hm.group(2))
            dt_local = datetime(annee_r, mois_r, jour_r, h, mn)
            dt_utc = dt_local - timedelta(hours=utc_offset_h)
            # Corriger si passage à minuit (dt_utc peut être le jour précédent)
            extremes.append({
                "dt": int(dt_utc.replace(tzinfo=timezone.utc).timestamp()),
                "type": "High" if is_high else "Low",
                "height": round(height, 2),
            })

    return extremes


def _lire_json_existant(chemin):
    """Charge les extrêmes existants depuis le JSON, ou retourne [] si absent."""
    if not os.path.exists(chemin):
        return []
    try:
        with open(chemin, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("extremes", [])
    except Exception:
        return []


def scraper_annee(annee, chemin_json=None, verbose=True):
    """
    Scrape tous les extrêmes de marée disponibles pour l'année via maree.info.
    Si chemin_json est fourni et que le fichier existe, les données passées sont préservées.
    Retourne (extremes, source_str) ou ([], None) si aucune donnée.
    """
    if verbose:
        print(f"  Ouverture de la session maree.info…")
    sess = _ouvrir_session()

    debut = date(annee, 1, 1)
    fin = date(annee, 12, 31)

    # Charger les données existantes (pour ne pas écraser le passé)
    existants = []
    if chemin_json:
        existants = _lire_json_existant(chemin_json)
        if existants and verbose:
            d_exist = datetime.fromtimestamp(existants[-1]["dt"], tz=timezone.utc)
            print(f"  {len(existants)} extrêmes existants (jusqu'au {d_exist.strftime('%Y-%m-%d')}).")

    scraped = []
    cur = debut
    dernier_jour_couvert = None
    semaine = 0

    while cur <= fin:
        ymd = cur.strftime("%Y%m%d")
        if verbose:
            print(f"  Semaine du {cur}…", end="\r", flush=True)

        try:
            rows = _charger_semaine(sess, ymd, annee)
            if rows:
                scraped.extend(rows)
                dernier_jour_couvert = cur + timedelta(days=6)
            else:
                if verbose:
                    print(f"\n  Aucune donnée pour la semaine du {cur} — couverture terminée.")
                break
        except RuntimeError as e:
            if verbose:
                print(f"\n  Erreur : {e}")
            break
        except Exception as e:
            if verbose:
                print(f"\n  Avertissement semaine {cur} : {e}")

        cur += timedelta(days=7)
        semaine += 1
        time.sleep(PAUSE)

    if verbose:
        print()

    if not scraped:
        if verbose:
            print("  Aucune donnée trouvée sur maree.info pour cette année.")
        return [], None

    # Fusionner : extrêmes existants AVANT le premier jour scrapé + nouvelles données
    if existants and scraped:
        premier_dt_scraped = min(e["dt"] for e in scraped)
        # Garder les anciens extrêmes qui précèdent la fenêtre scrapée (avec 1 jour de tampon)
        anciens_hors_fenetre = [
            e for e in existants if e["dt"] < premier_dt_scraped - 86400
        ]
        combined = anciens_hors_fenetre + scraped
    else:
        combined = scraped

    # Dédupliquer et trier
    seen = set()
    result = []
    for e in combined:
        if e["dt"] not in seen:
            seen.add(e["dt"])
            result.append(e)
    result.sort(key=lambda e: e["dt"])

    d1 = datetime.fromtimestamp(result[0]["dt"], tz=timezone.utc)
    d2 = datetime.fromtimestamp(result[-1]["dt"], tz=timezone.utc)
    nb_pm = sum(1 for e in result if e["type"] == "High")
    nb_bm = sum(1 for e in result if e["type"] == "Low")

    source = (
        f"maree.info/33 (port Cherbourg, données SHOM) "
        f"du {d1.strftime('%Y-%m-%d')} au {d2.strftime('%Y-%m-%d')}"
    )

    if verbose:
        print(f"  {len(result)} extrêmes : {nb_pm} PM, {nb_bm} BM")
        print(f"  Plage : {d1.strftime('%Y-%m-%d %H:%M')} UTC → {d2.strftime('%Y-%m-%d %H:%M')} UTC")
        if dernier_jour_couvert and dernier_jour_couvert < fin:
            print(f"  ⚠ Données absentes après le {dernier_jour_couvert} (limite maree.info).")

    return result, source


def mettre_a_jour_manifest(dossier_data):
    annees = sorted([
        int(f[7:-5]) for f in os.listdir(dossier_data)
        if f.startswith("marees-") and f.endswith(".json")
    ])
    with open(os.path.join(dossier_data, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"annees": annees}, f)
    print(f"manifest.json mis à jour : {annees}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Scrape maree.info/33 pour une année et sauvegarde en JSON."
    )
    parser.add_argument("--annee", type=int, required=True)
    args = parser.parse_args()

    print(f"Scraping maree.info/33 — année {args.annee}")

    dossier = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "data")
    os.makedirs(dossier, exist_ok=True)
    chemin = os.path.join(dossier, f"marees-{args.annee}.json")

    extremes, source = scraper_annee(args.annee, chemin_json=chemin)

    if not extremes:
        print("Aucune donnée : fichier non généré.", file=sys.stderr)
        sys.exit(1)

    with open(chemin, "w", encoding="utf-8") as f:
        json.dump({
            "year": args.annee,
            "generated": datetime.now(tz=timezone.utc).isoformat(),
            "source": source,
            "extremes": extremes,
        }, f, separators=(",", ":"))

    taille_ko = os.path.getsize(chemin) // 1024
    print(f"Écrit : {chemin} ({taille_ko} ko)")
    mettre_a_jour_manifest(dossier)
    print("Terminé. Poussez public/data/ vers le dépôt Git.")
