# Lock-in 🌱

Application d'étude (PWA) : minuteur Pomodoro, tâches par matière, statistiques et petite plante à faire grandir, le tout dans une ambiance animée et sonore. Tout reste sur l'appareil : pas de compte, pas de serveur.

## Lancer

```bash
npm install
npm run dev        # http://localhost:5173
```

| Commande | Rôle |
|---|---|
| `npm run build` | typecheck + build de production (PWA, hors ligne) dans `dist/` |
| `npm run preview` | sert le build |
| `npm test` | tests unitaires (vitest) |
| `npm run typecheck` | `tsc --noEmit` |

## Fonctionnalités (MVP)

- **Minuteur** : posé au centre de l'écran, directement sur la vidéo, avec une couronne de pétales qui se remplit (façon Focus To-Do) ; focus / pause courte / pause longue, durées et enchaînements réglables, +1/+5 min, passer ou arrêter, fiable en arrière-plan (horodatage absolu + Web Worker), reprise après rechargement.
- **Mode focus** : plein écran immersif, gros chrono, contrôles qui s'effacent, écran maintenu allumé.
- **Tâches** : ajout rapide en langage naturel (`Réviser chap. 3 #Maths demain 18h ~2 !1`), matières colorées avec objectif hebdo, listes intelligentes (aujourd'hui, demain, 7 jours, planifiées, en retard…), sous-tâches, notes Markdown, rappels, estimation en 🍅 et heure de fin prévue.
- **Statistiques** : jour / semaine / mois, temps par matière (barres empilées + vue tableau), Pomodoros, tâches terminées, série, calendrier de régularité.
- **Motivation** : plante qui grandit à chaque Pomodoro, objectif quotidien, série de jours, célébration ; mode strict optionnel (une session abandonnée fait faner la plante).
- **Ambiances** : huit fonds vidéo en boucle (🎋 Jardin zen, 🚆 Train au crépuscule, 🫧 Forêt sous-marine, 🔥 Cheminée, 🌲 Forêt, 🌊 Mer, ☕ Café, 🌃 Soirée) liés à des sons générés en Web Audio, mixeur par couches, volumes par canal, pré-écoute, favoris, import de ta propre musique (stockée localement). Hors ligne ou en mode économie, l'image fixe remplace la vidéo.
- **Réglages** : thème clair / sombre / système, mode économie, notifications, raccourcis clavier, export / import JSON, réinitialisation.

## Raccourcis

`Espace` démarrer / pause · `S` passer · `M` muet · `F` mode focus · `N` nouvelle tâche · `Échap` fermer.

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, Zustand (réglages, persistés dans localStorage), Dexie / IndexedDB (tâches, sessions, musique), Chart.js (chargé seulement avec les stats), vite-plugin-pwa.

## Structure

```
src/
  app/effects.ts      effets globaux : audio, raccourcis, wake lock, rappels, thème
  audio/              moteur Web Audio, couches d'ambiance, carillons, musique
  scenes/             lecteur vidéo des ambiances + registre des thèmes
  lib/                logique pure (minuteur, ajout rapide, stats, dates) + base Dexie
  store/              état Zustand (réglages, minuteur, UI)
  features/           timer, focus, tasks, stats, ambience, settings, onboarding, garden
  components/         UI partagée, barre de navigation, fond vidéo, toasts
```

## Crédits vidéo

Licences gratuites Pexels et Pixabay (fichiers dans `public/ambiences/`) : IslandHopper X (cheminée), Saulo Nulo (forêt), John Biondo (mer), Oleksandr Plakhota (café) sur Pexels ; Turning_Pages (soirée), kanenori (jardin zen) et variousphotography (train), Jackdrafahl (forêt sous-marine) sur Pixabay.

## Crédits sons

Enregistrements de Wikimedia Commons (fichiers dans `public/sounds/`, bouclés et normalisés) : « Campfire sound ambience » par Glaneur de sons (feu, CC BY 3.0), « Oceanwavescrushing » par Luftrum (vagues, CC BY 3.0) ; « Rain against the window » par cori (pluie), « forest ambience » par nille (forêt), « Restaurant ambience » et un enregistrement de train par stephan (café, train), dans le domaine public ; « Suikinkutsu » par Torsodog / Shizhao (bassin d'eau, CC BY-SA 3.0) ; carillon Koshi par Membeth (CC0).
