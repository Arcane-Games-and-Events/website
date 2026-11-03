import { playerLoad } from '$lib/server/studio/player.js';

/** /library/matches/[id] — one match from the Studio. */
export const load = (event) => playerLoad(event, 'matches');
