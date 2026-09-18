#!/usr/bin/env node
/**
 * Construit la note de version Discord d'une app, à partir du changelog DÉJÀ publié avec la
 * version (`changelog[]` du manifeste, cf. scripts/gen-release-manifest.mjs côté app).
 *
 * Rien n'est rédigé ici : on republie le journal utilisateur tel quel. Source unique, donc
 * aucun texte à tenir à jour en double — ce qui part sur Discord est exactement ce que
 * l'utilisateur lira dans l'app.
 *
 * ⚠️ Message en CONTENU, pas en embed. Le format maison s'appuie sur `##` et `-#`, et surtout
 * sur les emojis perso du serveur : un embed ne les rend ni dans son titre ni dans son footer.
 * Contrepartie : 2000 caractères maximum, d'où la troncature annoncée plus bas.
 *
 * Usage : build-payload.mjs <fichier-json> <app> <version> <sortie>
 *   <fichier-json> : manifeste (objet avec `changelog`) ou tableau de changelog directement.
 */
import { readFileSync, writeFileSync } from "node:fs";

/**
 * Emojis perso du serveur Nartya. Ils ne valent QUE pour Discord — ne jamais les mettre dans
 * un changelog, qui est aussi lu par la fenêtre « Nouveautés » de l'app et les afficherait
 * en charabia. `update` décrit la façon de mettre à jour, qui diffère par plateforme.
 */
const APPS = {
  anime: {
    name: "Nartya Anime",
    emoji: "<:anime:1532491182104645682>",
    update: "Mise à jour depuis **Nartya Hub** → bouton **Mettre à jour**. Sous Linux : https://nartya.app/hub",
  },
  movies: {
    name: "Nartya Movies",
    emoji: "<:movie:1532491318192771112>",
    update: "Mise à jour depuis **Nartya Hub** → bouton **Mettre à jour**. Sous Linux : https://nartya.app/hub",
  },
  hub: {
    name: "Nartya Hub",
    emoji: "<:hub:1532491120075079921>",
    update: "Le Hub se met à jour tout seul : il vous propose la nouvelle version au démarrage. Sinon : https://nartya.app/",
  },
  android: {
    name: "Nartya Android",
    emoji: "📱",
    update: "Téléchargez la nouvelle version sur https://nartya.app/",
  },
};

/** Un préfixe par type de changement, dans l'ordre de lecture : le neuf d'abord. */
const TYPES = [
  ["new", "✨"],
  ["improved", "🔧"],
  ["fixed", "🐛"],
];

const CONTENT_MAX = 2000; // limite Discord pour le contenu d'un message
const SIGNATURE = "-# 朱 ・ Merci d'utiliser Nartya";

const [file, appId, rawVersion, out] = process.argv.slice(2);
if (!file || !appId || !rawVersion || !out) {
  console.error("usage: build-payload.mjs <fichier-json> <app> <version> <sortie>");
  process.exit(1);
}

const app = APPS[appId];
if (!app) {
  console.error(`app inconnue : ${appId} (attendu : ${Object.keys(APPS).join(", ")})`);
  process.exit(1);
}

const version = String(rawVersion).trim().replace(/^v/, "");
const parsed = JSON.parse(readFileSync(file, "utf8"));
const changelog = Array.isArray(parsed) ? parsed : parsed?.changelog;

if (!Array.isArray(changelog) || changelog.length === 0) {
  console.error(`❌ aucun changelog dans ${file} — rien à publier pour ${appId} ${version}`);
  process.exit(2);
}

// L'entrée de CETTE version, jamais « la plus récente » par défaut : publier les notes d'une
// autre version serait pire que ne rien publier.
const entry = changelog.find((e) => String(e?.version).replace(/^v/, "") === version);
if (!entry) {
  console.error(
    `❌ le changelog ne contient pas d'entrée pour ${version} (trouvé : ${changelog
      .slice(0, 3)
      .map((e) => e?.version)
      .join(", ")}…)`
  );
  process.exit(2);
}

const items = Array.isArray(entry.items) ? entry.items : [];
if (items.length === 0) {
  console.error(`❌ l'entrée ${version} ne contient aucune ligne`);
  process.exit(2);
}

/**
 * Une ligne de changelog. `title` est facultatif : quand il est là on obtient la forme
 * habituelle des patch notes (**Intitulé** — explication), sinon la phrase seule.
 */
function renderItem(item, prefix) {
  const suffix = item.premiumOnly ? " *(Premium)*" : "";
  const label = typeof item.title === "string" && item.title ? `**${item.title}** — ` : "";
  return `* ${prefix} ${label}${item.text}${suffix}`;
}

const lines = [];
for (const [type, prefix] of TYPES) {
  for (const item of items) {
    if (item?.type !== type || typeof item.text !== "string" || !item.text) continue;
    lines.push(renderItem(item, prefix));
  }
}

const header = [
  `## ${app.emoji} ${app.name} | v${version}`,
  entry.date ? `-# Notes de mise à jour • ${entry.date}` : null,
  "",
].filter((l) => l !== null);

const footer = ["", `-# ${app.update}`, SIGNATURE];

// Troncature : on coupe à la ligne entière et on l'annonce, plutôt que de laisser Discord
// rejeter le message (ou de couper au milieu d'une phrase).
const assemble = (kept, truncated) =>
  [...header, ...kept, ...(truncated ? ["-# …et d'autres changements, à découvrir dans l'app."] : []), ...footer].join("\n");

let kept = lines;
while (kept.length > 1 && assemble(kept, kept.length < lines.length).length > CONTENT_MAX) {
  kept = kept.slice(0, -1);
}
const content = assemble(kept, kept.length < lines.length);

writeFileSync(out, JSON.stringify({ username: "Nartya", content }));
console.log(
  `✅ note de version prête : ${app.name} ${version} — ${kept.length}/${lines.length} ligne(s), ${content.length} caractères`
);
