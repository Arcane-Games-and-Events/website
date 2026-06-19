/**
 * The editorial redesign preview pulls the same data the existing
 * homepage does. Reusing the homepage's load function keeps the data
 * shape identical so we only have to map it once.
 *
 * When the redesign ships as the real homepage, this file can be
 * deleted and the route either removed or kept as a static design
 * canvas with mock data.
 */
export { load } from '../+page.server.js';
