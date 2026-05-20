import Mux from '@mux/mux-node';
import { env } from '$env/dynamic/private';
import { getCachedOrFetch, CACHE_TTL } from './redis/index.js';

const mux = new Mux({
	tokenId: env.MUX_TOKEN_ID,
	tokenSecret: env.MUX_TOKEN_SECRET,
	jwtSigningKey: env.MUX_SIGNING_KEY_ID,
	jwtPrivateKey: env.MUX_SIGNING_KEY_PRIVATE_KEY
});

/**
 * Cached signed Mux thumbnail token. Tokens themselves expire in 24h; we
 * cache for 12h to leave a 12h safety margin before re-signing.
 */
export async function getMuxThumbnailToken(playbackId) {
	if (!playbackId) return null;
	return getCachedOrFetch(
		`mux:thumbnail:${playbackId}`,
		() => mux.jwt.signPlaybackId(playbackId, { type: 'thumbnail', expiration: '24h' }),
		CACHE_TTL.HOUR * 12
	);
}

export default mux;
