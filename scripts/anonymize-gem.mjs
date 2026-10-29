/**
 * Turn real GEM exports into test fixtures that are safe to commit.
 *
 *   node scripts/anonymize-gem.mjs <input-dir> <output-dir>
 *
 * Reads the standings, pairings and heroes CSVs in <input-dir> (any file
 * whose name contains "standings", "pairings" or "heroes") and writes the
 * same files to <output-dir> with every player name and GEM ID replaced:
 *
 * - IDs map to random IDs of the same length, the same way in every file;
 * - names map to fictional names, so two different players who shared a
 *   name still share one, and each name keeps its capitalisation style
 *   ("kosei chetanna" stays lowercase, "MOISES LOPEZ" stays uppercase);
 * - byes ("None", no ID), results, ranks, wins and heroes are untouched.
 *
 * The mapping is random and never written down, so the output can't be
 * traced back. Keep the real exports out of the repo.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomInt } from 'node:crypto';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
	console.error('Usage: node scripts/anonymize-gem.mjs <input-dir> <output-dir>');
	process.exit(1);
}

const FIRST = 'Avery Blake Casey Dakota Emerson Finley Gray Harper Indigo Jordan Kendall Logan Morgan Noel Oakley Parker Quinn Reese Sage Taylor Umber Vale Winter Xen Yael Zion Arden Briar Cove Darby Ellis Fallon Greer Hollis Isle Jules Kit Lark Marlow Nova Onyx Perry Rowan Shay Tatum Uri Vesper Wren Yarrow Zephyr Ash Bellamy Cypress Dale Eden Flint Gale Haven Ira Jem Kai Lane'.split(
	' '
);
const LAST = 'Ashford Brightwater Cobalt Dunmore Everly Fairbanks Glenholm Hartwell Ironwood Juniper Kestrel Larkspur Merriweather Northcott Oakhurst Pemberton Quillfeather Ravensworth Stormvale Thistlewood Underhill Vantage Whitlock Yardley Zellwood Alderton Blackwood Copperfield Driftwood Eastbrook Foxglove Greymoor Holloway Inkwell Jessamine Kingsley Lockridge Mossgrove Nettlefield Orchard Pinecrest Redfern Silverton Tidewell Upton Verity Westmere Amberly Briarcliff Clearwater Duskmoor Elmstead Fernhill Goldcrest Harrow Ivybridge Jasperly Kettering Lindenfeld Mapleton'.split(
	' '
);

const ids = new Map();
const names = new Map();
const usedIds = new Set();
const usedNames = new Set();

function fakeId(id) {
	if (!id) return id;
	if (ids.has(id)) return ids.get(id);
	let next;
	do {
		next = String(randomInt(10 ** (id.length - 1), 10 ** id.length));
	} while (usedIds.has(next));
	usedIds.add(next);
	ids.set(id, next);
	return next;
}

const styleOf = (token) =>
	token.length > 1 && token === token.toUpperCase() && token !== token.toLowerCase()
		? 'upper'
		: token === token.toLowerCase()
			? 'lower'
			: 'title';
const applyStyle = (word, style) =>
	style === 'upper' ? word.toUpperCase() : style === 'lower' ? word.toLowerCase() : word;

function fakeName(name) {
	if (!name || /^(none|bye|-)$/i.test(name.trim())) return name;
	if (names.has(name)) return names.get(name);
	const tokens = name.trim().split(/\s+/);
	let next;
	do {
		const first = FIRST[randomInt(FIRST.length)];
		const last = LAST[randomInt(LAST.length)];
		next = `${applyStyle(first, styleOf(tokens[0]))} ${applyStyle(last, styleOf(tokens[tokens.length - 1]))}`;
	} while (usedNames.has(next.toLowerCase()));
	usedNames.add(next.toLowerCase());
	names.set(name, next);
	return next;
}

/** Split one CSV line, keeping quoted fields intact. */
function splitLine(line) {
	const out = [];
	let cur = '';
	let quoted = false;
	for (const ch of line) {
		if (ch === '"') quoted = !quoted;
		if (ch === ',' && !quoted) {
			out.push(cur);
			cur = '';
		} else cur += ch;
	}
	out.push(cur);
	return out;
}

function rewrite(text, nameCols, idCols) {
	const lines = text.replace(/\r/g, '').split('\n');
	const header = splitLine(lines[0]);
	const nameIdx = nameCols.map((c) => header.indexOf(c)).filter((i) => i >= 0);
	const idIdx = idCols.map((c) => header.indexOf(c)).filter((i) => i >= 0);
	return lines
		.map((line, n) => {
			if (n === 0 || !line.trim()) return line;
			const cells = splitLine(line);
			for (const i of nameIdx) cells[i] = fakeName(cells[i]);
			for (const i of idIdx) cells[i] = fakeId(cells[i]);
			return cells.join(',');
		})
		.join('\n');
}

const files = readdirSync(input).filter((f) => f.toLowerCase().endsWith('.csv'));
const pick = (word) => files.find((f) => f.toLowerCase().includes(word));
const plan = [
	[pick('pairings'), 'pairings.csv', ['Player 1 Name', 'Player 2 Name'], ['Player 1 ID', 'Player 2 ID']],
	[pick('standings'), 'standings.csv', ['Name'], ['Player ID']],
	[pick('heroes'), 'heroes.csv', ['Player Name'], ['Player ID']]
].filter(([source]) => source);

mkdirSync(output, { recursive: true });
for (const [source, target, nameCols, idCols] of plan) {
	const text = readFileSync(join(input, source), 'utf8');
	writeFileSync(join(output, target), rewrite(text, nameCols, idCols));
	console.log(`${source} -> ${join(output, target)}`);
}
console.log(`${names.size} names and ${ids.size} IDs replaced.`);
