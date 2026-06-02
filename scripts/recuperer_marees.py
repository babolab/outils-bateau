"""
Script de maintenance — génère le fichier de données de marée pour une année.

Usage:
  python scripts/recuperer_marees.py --annee 2026 --cle VOTRE_CLE_WORLDTIDES
  python scripts/recuperer_marees.py --annee 2026 --mode synthese  (sans clé API)

Le fichier résultant (public/data/marees-{annee}.json) doit ensuite être poussé
vers le dépôt Git pour être servi par GitHub Pages.
"""

import argparse
import json
import math
import os
import sys
from datetime import datetime, timezone

# Coordonnées du port Chantereyne, Cherbourg
CHERBOURG = {'lat': 49.6478, 'lon': -1.6226}
BASE_URL = 'https://www.worldtides.info/api/v3'

# Paramètres harmoniques approchés pour Cherbourg (constituants M2 + S2)
# Source : tables de marée SHOM, valeurs approchées pour usage indicatif.
M2_AMPLITUDE = 2.83    # mètres
S2_AMPLITUDE = 0.63    # mètres
MSL_AU_DESSUS_LAT = 3.30   # niveau moyen au-dessus du zéro hydrographique (LAT)
M2_PERIODE = 44714.16  # secondes (12 h 25 min 14 s)
S2_PERIODE = 43200.0   # secondes (12 h)

# Phases de référence calibrées pour Cherbourg au 1er janvier 2026 00:00 UTC
REF_TIMESTAMP = 1735689600  # 2026-01-01 00:00:00 UTC
M2_PHASE = REF_TIMESTAMP + 900   # premier minimum M2 ≈ 00:15 UTC le 1er jan 2026
S2_PHASE = REF_TIMESTAMP + 2700  # premier minimum S2 ≈ 00:45 UTC le 1er jan 2026


def hauteur_maree(t):
    """
    Calcule la hauteur de marée en mètres (datum LAT) à l'instant t (timestamp Unix UTC).
    Modèle bi-harmonique simplifié M2 + S2 calibré sur Cherbourg.
    """
    h_m2 = M2_AMPLITUDE * math.cos(2 * math.pi * (t - M2_PHASE) / M2_PERIODE)
    h_s2 = S2_AMPLITUDE * math.cos(2 * math.pi * (t - S2_PHASE) / S2_PERIODE)
    return MSL_AU_DESSUS_LAT + h_m2 + h_s2


def generer_marees_synthese(annee):
    """
    Génère les extrêmes de marée par modèle harmonique.
    Précision indicative (±10-30 min) — suffisante pour le développement UI.
    À remplacer par les données WorldTides pour la production.
    """
    debut = int(datetime(annee, 1, 1, tzinfo=timezone.utc).timestamp())
    fin = int(datetime(annee + 1, 1, 1, tzinfo=timezone.utc).timestamp())

    PAS = 600  # évaluation toutes les 10 minutes
    extremes = []
    h_prec = hauteur_maree(debut)
    deriv_prec = None

    t = debut + PAS
    while t <= fin:
        h = hauteur_maree(t)
        deriv = h - h_prec
        if deriv_prec is not None:
            if deriv_prec > 0 and deriv <= 0:
                # Maximum local → PM
                extremes.append({
                    'dt': t - PAS // 2,
                    'type': 'High',
                    'height': round((h_prec + h) / 2, 2)
                })
            elif deriv_prec < 0 and deriv >= 0:
                # Minimum local → BM
                extremes.append({
                    'dt': t - PAS // 2,
                    'type': 'Low',
                    'height': round((h_prec + h) / 2, 2)
                })
        h_prec = h
        deriv_prec = deriv
        t += PAS

    return extremes


def recuperer_marees_api(annee, cle):
    """Appelle l'API WorldTides v3 pour récupérer les extrêmes de l'année."""
    import urllib.request
    debut = int(datetime(annee, 1, 1, tzinfo=timezone.utc).timestamp())
    jours = 366 if (annee % 4 == 0 and (annee % 100 != 0 or annee % 400 == 0)) else 365
    url = (
        f"{BASE_URL}?extremes"
        f"&lat={CHERBOURG['lat']}&lon={CHERBOURG['lon']}"
        f"&start={debut}&days={jours}"
        f"&datum=LAT&key={cle}"
    )
    print(f"Appel API : {url[:90]}...")
    with urllib.request.urlopen(url, timeout=30) as r:
        data = json.loads(r.read())
    if data.get('status') != 200:
        raise ValueError(f"Erreur WorldTides : {data.get('error', 'réponse invalide')}")
    return [
        {'dt': e['dt'], 'type': e['type'], 'height': round(e['height'], 2)}
        for e in data['extremes']
    ]


def mettre_a_jour_manifest(dossier_data):
    """Regénère public/data/manifest.json avec la liste des années disponibles."""
    annees = sorted([
        int(f[7:-5])
        for f in os.listdir(dossier_data)
        if f.startswith('marees-') and f.endswith('.json')
    ])
    chemin = os.path.join(dossier_data, 'manifest.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump({'annees': annees}, f)
    print(f"manifest.json mis à jour : années {annees}")


def main():
    parser = argparse.ArgumentParser(
        description='Génère les données de marée de Cherbourg pour une année.'
    )
    parser.add_argument('--annee', type=int, required=True)
    parser.add_argument('--cle', type=str, default='', help='Clé API WorldTides')
    parser.add_argument(
        '--mode', choices=['api', 'synthese', 'scraping'], default='scraping',
        help=(
            'scraping : données maree.info/SHOM via session HTTP (recommandé, gratuit) | '
            'api : données WorldTides (clé requise) | '
            'synthese : modèle harmonique simplifié (hors-ligne, indicatif)'
        )
    )
    args = parser.parse_args()

    if args.mode == 'api' and not args.cle:
        print("Erreur : --cle est requis en mode api.", file=sys.stderr)
        sys.exit(1)

    print(f"Génération marées {args.annee} — mode : {args.mode}")

    if args.mode == 'scraping':
        # Importer ici pour ne pas bloquer les autres modes si requests est absent
        from scraper_maree_info import scraper_annee
        dossier_data = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'data'
        )
        chemin_json = os.path.join(dossier_data, f'marees-{args.annee}.json')
        extremes, source = scraper_annee(args.annee, chemin_json=chemin_json)
        if not extremes:
            print("Aucune donnée récupérée.", file=sys.stderr)
            sys.exit(1)
    elif args.mode == 'synthese':
        extremes = generer_marees_synthese(args.annee)
        source = 'Modèle harmonique simplifié M2+S2 — données indicatives, non officielles'
    else:
        extremes = recuperer_marees_api(args.annee, args.cle)
        source = 'WorldTides API v3 — datum LAT — Cherbourg-Chantereyne (49.6478°N, 1.6226°W)'

    # Résumé avant écriture
    nb_pm = sum(1 for e in extremes if e['type'] == 'High')
    nb_bm = sum(1 for e in extremes if e['type'] == 'Low')
    print(f"  {len(extremes)} extrêmes : {nb_pm} PM, {nb_bm} BM")
    if extremes:
        d1 = datetime.fromtimestamp(extremes[0]['dt'], tz=timezone.utc).strftime('%Y-%m-%d %H:%M')
        d2 = datetime.fromtimestamp(extremes[-1]['dt'], tz=timezone.utc).strftime('%Y-%m-%d %H:%M')
        print(f"  Plage : {d1} UTC → {d2} UTC")

    # Écriture
    dossier_data = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'data'
    )
    os.makedirs(dossier_data, exist_ok=True)
    chemin = os.path.join(dossier_data, f'marees-{args.annee}.json')

    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump({
            'year': args.annee,
            'generated': datetime.now(tz=timezone.utc).isoformat(),
            'source': source,
            'extremes': extremes
        }, f, separators=(',', ':'))

    taille_ko = os.path.getsize(chemin) // 1024
    print(f"  Écrit : {chemin} ({taille_ko} ko)")
    mettre_a_jour_manifest(dossier_data)
    print("Terminé. Poussez public/data/ vers le dépôt Git.")


if __name__ == '__main__':
    main()
