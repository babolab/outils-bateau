# ⚓ Outils Bateau

Suite d'outils web pour la navigation de plaisance — 100 % côté navigateur, sans serveur.

**→ [Accéder à l'application](https://babolab.github.io/outils-bateau/)**

---

## Outils disponibles

### 🌡️ Météo Époxy
Détecte les créneaux horaires favorables à l'application d'époxy sur un bateau :
- Température ≥ seuil choisi (0°C, 5°C ou 10°C)
- Point de rosée ≤ T° − 3°C (air suffisamment sec)

Modèles météo disponibles :

| Modèle   | Source       | Portée | Résolution |
|----------|--------------|--------|------------|
| ECMWF    | CEE Météo    | 16 j   | ~9 km      |
| GFS      | NOAA         | 16 j   | ~13 km     |
| Arpège   | Météo-France | 4 j    | ~10 km     |
| Arome    | Météo-France | 2 j    | ~1,3 km    |

La localisation est configurable (Cherbourg par défaut, sauvegardée entre les visites).

---

## Stack technique

- **Vue 3** + **Vite** — application 100 % statique
- **Vue Router** — navigation entre outils (hash history, compatible GitHub Pages)
- **Open-Meteo API** — données météo gratuites, CORS natif, sans clé API
- **GitHub Actions** — build et déploiement automatiques sur push

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
