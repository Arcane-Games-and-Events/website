import { playerLoad } from '$lib/server/studio/player.js';

/** /studios/[id] — an episode, interview or film. Matches play in the Library. */
export const load = (event) => playerLoad(event, 'studios');
