# nartya-builds

Repo **public** qui ne contient QUE les workflows de compilation des apps Nartya — jamais de
code source. Il existe pour une seule raison : les repos publics ont des minutes GitHub
Actions **illimitées**, contrairement aux repos privés (`nartya`, futur `nartya-movie`, …)
qui sont soumis à un quota mensuel. Compiler ici plutôt que sur le repo source lève ce quota
sans jamais rendre le code client public.

## Principe

Chaque workflow **checkout le code depuis le repo privé correspondant** via un PAT dédié
(secret de ce repo), compile, puis (pour l'instant) suit le même schéma en deux temps que
l'ancien pipeline : un job `build` qui produit des artefacts + un `verify` qui scanne
VirusTotal, et un second workflow `publish-*.yml` déclenché à la main qui envoie sur le VPS
(et republie sur le miroir public si nécessaire pour les vieilles installs).

**Rien n'est jamais publié automatiquement.** Publier sur `nartya.app` reste un geste
manuel et délibéré (`publish-<app>.yml`, bouton "Run workflow").

## ⚠️ Règles de sécurité — à ne jamais casser

- **Aucun workflow ici ne doit se déclencher sur `pull_request` ou `pull_request_target`.**
  Ce repo est public : un `pull_request` d'un fork externe pourrait exécuter ce workflow et
  exfiltrer les secrets (PAT de checkout, clé SSH du VPS, clé VirusTotal). Seuls
  `workflow_dispatch` et `push` (sur CE repo, jamais sur un fork) sont autorisés.
- Les PAT de checkout sont **fine-grained**, scope `Contents: Read-only`, et **restreints à
  un seul repo** (celui qu'ils checkoutent). Jamais un PAT `repo` classique (accès à tout).
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
| `APP_CHECKOUT_TOKEN` | Checkout de `NartyaTeam/nartya` | Fine-grained PAT, `Contents: Read-only`, restreint à ce seul repo |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Build front (anon key publique par design, protégée par RLS) | — |
| `VT_API_KEY` | Scan VirusTotal des installeurs | Compte VT gratuit |
| `VPS_HOST` / `VPS_USER` / `VPS_PORT` / `VPS_SSH_KEY` | Upload vers `nartya.app/dl/anime/` | Clé dédiée déploiement (jamais la clé perso) |
| `GH_PUBLISH_TOKEN` | Miroir temporaire `NartyaTeam/nartya-app` (anciennes installs ≤ 1.16.1) | PAT `repo` scopé à ce seul repo miroir |

Voir `deploy/RELEASES.md` dans `nartya` pour le détail du setup VPS.
