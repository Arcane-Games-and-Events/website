// The Academy page uses the editorial AgeShell chrome, which links
// to routes that haven't been built yet (e.g. /podcasts in the nav).
// Disable prerender so the build doesn't fail by crawling those
// placeholder links.
export const prerender = false;
