/**
 * The newest thing to read, watch and replay, as the tiles the Library's
 * tops show (an article and a match have slightly different shapes).
 *
 * @param {{ read: any, watch: any, replay: any }} spotlight
 */
export function spotlightTiles(spotlight) {
	const { read, watch, replay } = spotlight ?? {};
	return [
		read && {
			verb: 'Read',
			what: 'Newest article',
			href: read.href,
			title: read.title,
			dek: read.dek,
			image: read.picture ?? { src: read.image, srcset: read.srcset },
			note: read.length,
			premium: read.premium
		},
		watch && {
			verb: 'Watch',
			what: 'Newest video',
			href: watch.href,
			title: watch.title,
			dek: watch.dek,
			image: watch.picture ?? { src: watch.image, srcset: watch.srcset },
			note: watch.length,
			premium: watch.premium
		},
		replay && {
			verb: 'Replay',
			what: 'Newest match',
			href: replay.href,
			title: replay.title,
			dek: '',
			image: replay.cover ?? (replay.still ? { src: replay.still } : null),
			note: [replay.event?.title, replay.round].filter(Boolean).join(' · '),
			premium: !!replay.isPremium
		}
	].filter(Boolean);
}
