# ⛵ Outils Bateau

Suite d'outils web pour la navigation de plaisance — 100 % côté navigateur, sans serveur.

**→ [Accéder à l'application](https://babolab.github.io/outils-bateau/)**

---

## Outils disponibles

### 🌡️ Météo Époxy
Détecte les créneaux horaires favorables à l'application d'époxy sur un bateau :
- Température ≥ seuil choisi (0°C, 5°C ou 10°C)
- Point de rosée ≤ T° − 3°C (air suffisamment sec)
- Les créneaux qui passent minuit affichent un badge **J+1** sur l'heure de fin

Modèles météo disponibles :

| Modèle   | Source       | Portée | Résolution |
|----------|--------------|--------|------------|
| ECMWF    | CEE Météo    | 16 j   | ~9 km      |
| GFS      | NOAA         | 16 j   | ~13 km     |
| Arpège   | Météo-France | 4 j    | ~10 km     |
| Arome    | Météo-France | 2 j    | ~1,3 km    |

La localisation est configurable (Cherbourg par défaut, sauvegardée entre les visites).

---

### ⚓ Assistant Courant — Cherbourg ↔ Aurigny
Aide à choisir le créneau de départ pour traverser le **Raz Blanchard** (Alderney Race), l'un des courants les plus violents d'Europe.

**Principe :** le maximum de courant dans le Raz coïncide approximativement avec les extrêmes de marée à Cherbourg. L'outil calcule pour chaque jour de l'année la qualité du créneau aller (jusant, autour de la BM) et retour (flot, autour de la PM).

**Vues :**
- Calendrier annuel coloré (Excellent / Favorable / Acceptable / Défavorable)
- Calendrier mensuel avec scores numériques
- Vue détail par jour : frise horaire interactive, ETA estimé, vitesse du courant au Raz

**Paramètres ajustables sur la page :**
- Heure de départ cible (défaut : 08h30, fenêtre optimale 7h30–9h30)
- Tolérance autour de l'heure cible
- Vitesse fond du voilier (utilisée pour l'ETA et le courant estimé à mi-traversée)
- Direction : aller, retour, ou les deux

> ⚠️ Outil indicatif uniquement. Ne remplace pas une préparation météo marine complète ni le jugement du navigateur.

#### Maintenance des données de marée

Les données de marée sont des fichiers JSON statiques dans `public/data/`, générés par le script de maintenance et poussés vers le dépôt. **Aucun appel API depuis le navigateur.**

Regénérer les données pour une année :

```bash
# Avec une clé API WorldTides (données officielles, recommandé pour la production)
python scripts/recuperer_marees.py --annee 2027 --cle VOTRE_CLE

# Sans clé API (modèle harmonique simplifié M2+S2, pour le développement)
python scripts/recuperer_marees.py --annee 2027 --mode synthese
```

Le script écrit `public/data/marees-{annee}.json` et met à jour `public/data/manifest.json`, puis pousser les fichiers suffit à les rendre disponibles dans l'app.

---

## Stack technique

- **Vue 3** + **Vite** — application 100 % statique
- **Vue Router** — navigation entre outils (hash history, compatible GitHub Pages)
- **Open-Meteo API** — données météo gratuites, CORS natif, sans clé API (Météo Époxy)
- **Fichiers JSON statiques** — données de marée servies sans backend (Assistant Courant)
- **GitHub Actions** — build et déploiement automatiques sur push
- **CSS variables** — thème sombre par défaut, clair si `prefers-color-scheme: light`

---

## Développement local

```bash
npm install
npm run dev
```

L'application est accessible sur `http://localhost:5173/outils-bateau/`.

---

## Ajouter un nouvel outil

1. Créer `src/vues/NouvelOutil.vue`
2. Ajouter la route dans `src/router/index.js`
3. Ajouter le lien dans la nav de `src/App.vue`

---

## Déploiement

Chaque push sur `main` déclenche automatiquement le build et le déploiement via `.github/workflows/deployer.yml`.
