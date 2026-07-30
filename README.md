# nartya-builds

Repo **public** qui ne contient QUE les workflows de compilation des apps Nartya — jamais de
code source. Il existe pour une seule raison : les repos publics ont des minutes GitHub
Actions **illimitées**, contrairement aux repos privés (`nartya`, futur `nartya-movie`, …)
qui sont soumis à un quota mensuel. Compiler ici plutôt que sur le repo source lève ce quota
sans jamais rendre le code client public.

## Principe

Chaque workflow **checkout le code depuis le repo privé correspondant** via un PAT dédié
(secret de ce repo), compile, puis suit le même schéma en deux temps que l'ancien pipeline :
un job `build` qui produit des artefacts + un `verify` qui scanne VirusTotal, et un second
workflow `publish-*.yml` déclenché à la main qui envoie sur le VPS (`nartya.app/dl/<app>/`).

**Rien n'est jamais publié automatiquement.** Publier sur `nartya.app` reste un geste
manuel et délibéré (`publish-<app>.yml`, bouton "Run workflow").

> **Miroir `nartya-app` (GitHub) : gelé depuis le 2026-07-30.** Ce repo servait de secours
> pour les installs ≤ 1.16.1 dont l'auto-updater interne pointe en dur dessus. Décision
> explicite : on ne le republie plus (migration hub/VPS jugée suffisamment avancée) — il
> reste en ligne tel quel, dernière version répondant encore, mais `publish-anime.yml` ne le
> touche plus et n'a donc plus besoin d'un PAT dédié à `nartya-app`.

## ⚠️ Règles de sécurité — à ne jamais casser

- **Aucun workflow ici ne doit se déclencher sur `pull_request` ou `pull_request_target`.**
  Ce repo est public : un `pull_request` d'un fork externe pourrait exécuter ce workflow et
  exfiltrer les secrets (PAT de checkout, clé SSH du VPS, clé VirusTotal). Seuls
  `workflow_dispatch` et `push` (sur CE repo, jamais sur un fork) sont autorisés.
- Les PAT de checkout sont **fine-grained**, scope `Contents: Read-only`, et restreints à la
  **liste explicite des repos sources que ce repo compile** (`nartya`, `nartya-movie`, …
  ajoutés au token au fur et à mesure). Jamais un token org-wide « All repositories » : une
  fuite ne doit exposer que les repos qu'on build ici, pas tout `NartyaTeam` (y compris des
  repos privés sans rapport, comme `nartya-movie-api`). Jamais un PAT `repo` classique non
  plus (accès à tout, y compris en écriture).
- La clé SSH du VPS et les autres secrets de prod (`VT_API_KEY`, `VITE_SUPABASE_*`) sont
  dupliqués depuis le repo source vers CE repo — jamais partagés en clair ailleurs.

## Apps

| App | Repo source | Statut |
| --- | --- | --- |
| Anime | `NartyaTeam/nartya` (privé) | ✅ `build-anime.yml` + `publish-anime.yml` opérationnels |
| Movie | `NartyaTeam/nartya-movie` (privé) | ⏳ en attente — `nartya-movie` n'a pas encore de config `electron-builder` (build cross-OS) ni de script de manifest. Le workflow sera ajouté une fois ce packaging présent côté source. |
| Hub | `NartyaTeam/nartya-hub` (privé) | Pas encore migré — le hub a son propre pipeline fonctionnel (`nartya-hub/.github/workflows/`), publié sur `NartyaTeam/nartya-hub-app`. À évaluer plus tard si son quota devient un problème. |

## Secrets requis (à définir sur CE repo, jamais collés dans le code)

| Secret | Rôle | Scope recommandé |
| --- | --- | --- |
| `APP_CHECKOUT_TOKEN` | Checkout des repos sources (`nartya`, puis `nartya-movie` une fois son packaging prêt) | Fine-grained PAT, `Contents: Read-only`, **repos sélectionnés explicitement** (pas « All repositories ») — ajouter un repo au token quand un nouveau workflow en a besoin |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Build front (anon key publique par design, protégée par RLS) | — |
| `VT_API_KEY` | Scan VirusTotal des installeurs | Compte VT gratuit |
| `VPS_HOST` / `VPS_USER` / `VPS_PORT` / `VPS_SSH_KEY` | Upload vers `nartya.app/dl/<app>/` | Clé dédiée déploiement (jamais la clé perso) |

Voir `deploy/RELEASES.md` dans `nartya` pour le détail du setup VPS.
