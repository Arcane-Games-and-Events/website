// Hero art: the animated hero clips, made small for the web, their first
// frames as stills, and uploaded to Supabase Storage (bucket `hero-art`).
//
//   node scripts/hero-art.mjs encode "<folder of .webm clips>" <out folder> [--stills "<folder>"]
//       For each clip: still/<slug>.webp (the first frame, full size, 1920
//       wide, lightly sharpened; or, with --stills, a sharper image named
//       like the clip — e.g. "Arakni, Huntsman.png" — up to 2560 wide),
//       motion/<slug>.av1.mp4 (AV1, for browsers that play it) and
//       motion/<slug>.mp4 (H.264, for the rest, mostly older Safari), both
//       full size (1920 wide), 24 fps, no sound. Clips that are byte-for-byte
//       the same are encoded once and shared; files already in <out
//       folder> are kept. Writes the list of heroes with art to
//       src/lib/data/heroArt.js (commit it).
//
//   node scripts/hero-art.mjs upload <out folder> [--env .env.prod]
//       Uploads everything in <out folder> to the `hero-art` bucket of the
//       Supabase project in .env (or the env file given), creating the
//       bucket (public) if it isn't there. Safe to re-run: files are
//       overwritten. Run it once per project (dev, then prod).
//
// The hero's slug is the same one the site uses (src/lib/heroImage.js):
// "Kayo, Armed and Dangerous" → kayo-armed-and-dangerous.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { heroSlug } from '../src/lib/heroImage.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(`${ROOT}/package.json`);
const BUCKET = 'hero-art';
const [mode, a, b] = process.argv.slice(2);
const flag = (name) =>
	process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null;
const stillsDir = flag('--stills');
// A sharper picture for a hero, named like their clip (any common image type).
const stillFor = (clipName) => {
	if (!stillsDir) return null;
	const base = clipName.replace(/\.webm$/i, '').toLowerCase();
	const f = readdirSync(stillsDir).find(
		(x) =>
			/\.(png|jpe?g|webp|avif|tiff?)$/i.test(x) && x.replace(/\.[^.]+$/, '').toLowerCase() === base
	);
	return f ? join(stillsDir, f) : null;
};

const sha = (buf) => createHash('sha1').update(buf).digest('hex');
const ffmpeg = (...args) =>
	execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });

if (mode === 'encode') {
	if (!a || !b) throw new Error('Usage: encode "<clips folder>" <out folder>');
	mkdirSync(join(b, 'still'), { recursive: true });
	mkdirSync(join(b, 'motion'), { recursive: true });
	const clips = readdirSync(a)
		.filter((f) => /\.webm$/i.test(f))
		.sort();
	const byHash = new Map(); // source hash -> the slug its files are named after
	const art = {}; // hero slug -> file slug
	const names = {}; // hero slug -> the hero's name, as the clip is named
	for (const f of clips) {
		const slug = heroSlug(f.replace(/\.webm$/i, ''));
		names[slug] = f.replace(/\.webm$/i, '');
		const src = join(a, f);
		const h = sha(readFileSync(src));
		if (byHash.has(h)) {
			art[slug] = byHash.get(h);
			console.log(`  ${slug}: same clip as ${byHash.get(h)}`);
			continue;
		}
		byHash.set(h, slug);
		art[slug] = slug;
		// Already encoded (a re-run): keep what's there.
		const outs = [`still/${slug}.webp`, `motion/${slug}.av1.mp4`, `motion/${slug}.mp4`];
		if (outs.every((o) => existsSync(join(b, o)))) continue;
		process.stdout.write(`  ${slug} … `);
		const better = stillFor(f);
		if (better) {
			ffmpeg(
				'-i',
				better,
				'-vf',
				"scale='min(2560,iw)':-2",
				'-c:v',
				'libwebp',
				'-quality',
				'90',
				join(b, 'still', `${slug}.webp`)
			);
		} else {
			ffmpeg(
				'-i',
				src,
				'-frames:v',
				'1',
				'-vf',
				'scale=1920:-2,unsharp=5:5:0.7:5:5:0',
				'-c:v',
				'libwebp',
				'-quality',
				'90',
				join(b, 'still', `${slug}.webp`)
			);
		}
		// AV1 at full size: the best quality for the size, for every browser
		// that plays it (8-bit, level 4.0: "av01.0.08M.08").
		ffmpeg(
			'-i',
			src,
			'-an',
			'-vf',
			'scale=1920:-2,fps=24',
			'-c:v',
			'libsvtav1',
			'-crf',
			'36',
			'-preset',
			'5',
			'-g',
			'240',
			'-pix_fmt',
			'yuv420p',
			'-movflags',
			'+faststart',
			join(b, 'motion', `${slug}.av1.mp4`)
		);
		ffmpeg(
			'-i',
			src,
			'-an',
			'-vf',
			'scale=1920:-2,fps=24',
			'-c:v',
			'libx264',
			'-crf',
			'24',
			'-preset',
			'slow',
			'-pix_fmt',
			'yuv420p',
			'-movflags',
			'+faststart',
			join(b, 'motion', `${slug}.mp4`)
		);
		console.log('done');
	}
	// The version changes when any file does, so browsers fetch new copies.
	const files = ['still', 'motion']
		.flatMap((d) => readdirSync(join(b, d)).map((x) => join(b, d, x)))
		.sort();
	const version = sha(Buffer.concat(files.map((p) => readFileSync(p)))).slice(0, 8);
	const sorted = Object.fromEntries(Object.entries(art).sort(([x], [y]) => x.localeCompare(y)));
	writeFileSync(
		join(ROOT, 'src/lib/data/heroArt.js'),
		`// Written by scripts/hero-art.mjs encode. Heroes with art in the \`${BUCKET}\`\n` +
			`// bucket: hero slug -> the file slug (clips that were identical share one).\n` +
			`export const HERO_ART_VERSION = '${version}';\n\n` +
			`export const HERO_ART = ${JSON.stringify(sorted, null, '\t')};\n\n` +
			`// Each hero's name, for pickers.\n` +
			`export const HERO_NAMES = ${JSON.stringify(Object.fromEntries(Object.keys(sorted).map((k) => [k, names[k]])), null, '\t')};\n`
	);
	const size = files.reduce((s, p) => s + statSync(p).size, 0);
	console.log(
		`\n${Object.keys(art).length} heroes, ${byHash.size} clips, ${(size / 1e6).toFixed(1)} MB. Version ${version}.`
	);
} else if (mode === 'upload') {
	if (!a) throw new Error('Usage: upload <out folder> [--env .env.prod]');
	const envFile = process.argv.includes('--env')
		? process.argv[process.argv.indexOf('--env') + 1]
		: '.env';
	const env = Object.fromEntries(
		readFileSync(join(ROOT, envFile), 'utf8')
			.split('\n')
			.filter((l) => /^[A-Z_]+=/.test(l))
			.map((l) => {
				const i = l.indexOf('=');
				return [
					l.slice(0, i),
					l
						.slice(i + 1)
						.trim()
						.replace(/^['"]|['"]$/g, '')
				];
			})
	);
	const { createClient } = await import(require.resolve('@supabase/supabase-js'));
	const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false }
	});
	const { data: buckets } = await supabase.storage.listBuckets();
	if (!buckets?.some((x) => x.name === BUCKET)) {
		const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
		if (error) throw error;
		console.log(`Created the public bucket ${BUCKET}.`);
	}
	const TYPES = { webp: 'image/webp', webm: 'video/webm', mp4: 'video/mp4' };
	let n = 0;
	for (const dir of ['still', 'motion']) {
		for (const f of readdirSync(join(a, dir))) {
			const { error } = await supabase.storage
				.from(BUCKET)
				.upload(`${dir}/${f}`, readFileSync(join(a, dir, f)), {
					upsert: true,
					contentType: TYPES[f.split('.').pop()],
					cacheControl: '31536000'
				});
			if (error) throw new Error(`${dir}/${f}: ${error.message}`);
			n++;
			if (n % 25 === 0) console.log(`  ${n} uploaded`);
		}
	}
	console.log(`Uploaded ${n} files to ${env.SUPABASE_URL} (${BUCKET}).`);
} else {
	console.log(
		'Usage: node scripts/hero-art.mjs encode "<clips folder>" <out folder> | upload <out folder> [--env file]'
	);
}
