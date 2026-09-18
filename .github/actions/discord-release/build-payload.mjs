#!/usr/bin/env node
/**
 * Construit la charge utile Discord d'une note de version, à partir du changelog DÉJÀ publié
 * dans le manifeste de l'app (`changelog[]`, cf. scripts/gen-release-manifest.mjs côté app).
 *
 * Rien n'est rédigé ici : on republie le journal utilisateur tel quel. Source unique, donc
 * aucun texte à tenir à jour en double — et ce qui part sur Discord est exactement ce que
 * l'utilisateur lira dans l'app.
 *
 * Usage : build-payload.mjs <fichier-json> <app> <version> <sortie>
 *   <fichier-json> : manifeste (objet avec `changelog`) ou tableau de changelog directement.
 */
import { readFileSync, writeFileSync } from "node:fs";

const APPS = {
  anime: { name: "Nartya Anime", color: 0xff4a2d, url: "https://nartya.app/" },
  movies: { name: "Nartya Movies", color: 0xd3ad6e, url: "https://nartya.app/" },
  android: { name: "Nartya Android", color: 0x3ddc84, url: "https://nartya.app/" },
  hub: { name: "Nartya Hub", color: 0x4ec9a5, url: "https://nartya.app/" },
};

// Un en-tête par type, dans l'ordre où on veut les lire : ce qui est nouveau d'abord.
const SECTIONS = [
  ["new", "✨ Nouveautés"],
  ["improved", "⚡ Améliorations"],
  ["fixed", "🐛 Corrections"],
];

// Discord refuse un embed dont la description dépasse 4096 caractères. On coupe bien avant,
// et on annonce la coupe plutôt que de tronquer en silence au milieu d'une phrase.
const DESCRIPTION_MAX = 3800;

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

let description = "";
for (const [type, heading] of SECTIONS) {
  const lines = items.filter((i) => i?.type === type && typeof i.text === "string" && i.text);
  if (lines.length === 0) continue;
  const block =
    `**${heading}**\n` +
    lines
      // `premiumOnly` n'est pas un secret : l'app la masque aux non-abonnés, mais annoncer
      // publiquement ce que débloque Premium est une information, pas une fuite.
      .map((i) => `• ${i.text}${i.premiumOnly ? " *(Premium)*" : ""}`)
      .join("\n") +
    "\n\n";
  if (description.length + block.length > DESCRIPTION_MAX) {
    description += `*…et d'autres changements, à découvrir dans l'app.*`;
    break;
  }
  description += block;
}

const payload = {
  username: "Nartya",
  embeds: [
    {
      title: `${app.name} ${version}`,
      url: app.url,
      description: description.trim(),
      color: app.color,
      footer: { text: entry.date ? `Publié le ${entry.date}` : "Nouvelle version disponible" },
      timestamp: new Date().toISOString(),
    },
  ],
};

writeFileSync(out, JSON.stringify(payload));
console.log(`✅ note de version prête : ${app.name} ${version} (${items.length} ligne(s))`);
