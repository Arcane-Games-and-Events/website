/**
 * Article body typography — the classes on the reading column of
 * /library/[slug]. Shared with the Desk editor's widget previews so a
 * preview renders exactly as the published page does. Card links drop the
 * underline so they read differently from ordinary links.
 */
export const ARTICLE_PROSE = `
	prose max-w-[760px] prose-headings:scroll-mt-24 prose-headings:font-newsreader
	prose-headings:tracking-[-0.02em] prose-h2:mt-[56px] prose-h2:mb-[18px]
	prose-h2:text-[38px] prose-h2:font-semibold prose-h2:text-warm prose-h3:mt-10
	prose-h3:mb-3 prose-h3:text-[24px] prose-h3:font-semibold prose-p:my-0 prose-p:mb-[24px]
	prose-p:font-newsreader prose-p:text-[21px] prose-p:leading-[1.7] prose-p:text-ink
	prose-a:text-accent prose-a:underline prose-a:decoration-[1px]
	prose-a:underline-offset-[3px] [&_a.card-link]:no-underline prose-blockquote:my-9 prose-blockquote:border-l-[3px]
	prose-blockquote:border-warm prose-blockquote:pl-7 prose-blockquote:not-italic
	prose-strong:font-semibold prose-strong:text-ink prose-em:italic prose-code:rounded-none
	prose-code:bg-panel prose-code:px-[5px] prose-code:py-[2px] prose-code:font-mono
	prose-code:text-[14px] prose-code:text-warm prose-code:before:content-none
	prose-code:after:content-none prose-pre:rounded-none prose-pre:border
	prose-pre:border-line2 prose-pre:bg-paper prose-li:font-newsreader prose-li:text-[21px]
	prose-li:leading-[1.7] prose-li:text-ink prose-img:rounded-none prose-img:border
	prose-img:border-line2 prose-hr:border-line2 [&_blockquote_p]:font-newsreader
	[&_blockquote_p]:text-[26px] [&_blockquote_p]:leading-[1.32]
	[&_blockquote_p]:font-medium [&_blockquote_p]:tracking-[-0.01em]
	[&_blockquote_p]:text-ink [&_blockquote_p]:italic
	[&_p:first-of-type]:first-letter:float-left [&_p:first-of-type]:first-letter:mt-[10px]
	[&_p:first-of-type]:first-letter:mr-3 [&_p:first-of-type]:first-letter:font-newsreader
	[&_p:first-of-type]:first-letter:text-[76px]
	[&_p:first-of-type]:first-letter:leading-[0.7]
	[&_p:first-of-type]:first-letter:font-semibold
	[&_p:first-of-type]:first-letter:text-warm [&>:first-child]:mt-0
`
	.replace(/\s+/g, ' ')
	.trim();
