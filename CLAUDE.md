# Cocon — PWA d'étude (React 19 + Vite + Tailwind v4)

- Dev : `npm run dev` (port 5173, config `.claude/launch.json`). Vérifs : `npx vitest run`, `npx tsc --noEmit`, `npx vite build`.
- Logique pure dans `src/lib/` (testée dans `logic.test.ts`) ; UI dans `src/features/<domaine>/`.
- Minuteur : horodatage absolu (`lib/timerMachine.ts`), jamais de décompte par intervalle.
- Données : réglages = Zustand persist (`store/settings.ts`, toute nouvelle clé dans `DEFAULT_SETTINGS`) ; tâches/sessions/musique = Dexie (`lib/db.ts`).
- Couleurs des matières : `PROJECT_COLORS` validée (dataviz) ; ne pas ajouter de teinte sans revalider.
- Nouveau thème d'ambiance : id dans `THEME_IDS` (`store/settings.ts`), vidéo + poster dans `public/ambiences/<id>.mp4/.jpg`, entrée dans `scenes/themes.ts`, couches dans `audio/soundThemes.ts`.
- Textes de l'interface en français, tutoiement. Fichiers ≤ ~400 lignes.
- Debug dans le navigateur : `await import('/src/store/settings.ts')` donne la même instance que l'app.
