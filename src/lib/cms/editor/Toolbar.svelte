<!--
  Toolbar — formatting buttons that issue Lexical commands.
  The editor reference is provided by the parent Editor.svelte.
-->
<script>
	import { createEventDispatcher } from 'svelte';
	import { FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND } from 'lexical';
	import { $setBlocksType as setBlocksType } from '@lexical/selection';
	import {
		HeadingNode,
		QuoteNode,
		$createHeadingNode as createHeadingNode,
		$createQuoteNode as createQuoteNode
	} from '@lexical/rich-text';
	import { $createParagraphNode as createParagraphNode, $getSelection as getSelection } from 'lexical';
	import {
		INSERT_ORDERED_LIST_COMMAND,
		INSERT_UNORDERED_LIST_COMMAND
	} from '@lexical/list';
	import { TOGGLE_LINK_COMMAND } from '@lexical/link';

	export let editor;
	export let imageUploading = false;
	const dispatch = createEventDispatcher();

	function format(type) {
		if (!editor) return;
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, type);
	}

	function setBlock(kind) {
		if (!editor) return;
		editor.update(() => {
			const selection = getSelection();
			if (!selection) return;
			if (kind === 'paragraph') {
				setBlocksType(selection, () => createParagraphNode());
			} else if (kind === 'quote') {
				setBlocksType(selection, () => createQuoteNode());
			} else {
				// 'h1'..'h6'
				setBlocksType(selection, () => createHeadingNode(kind));
			}
		});
	}

	function insertList(kind) {
		if (!editor) return;
		editor.dispatchCommand(
			kind === 'ol' ? INSERT_ORDERED_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND,
			undefined
		);
	}

	function toggleLink() {
		if (!editor) return;
		const url = window.prompt('Enter URL (or `card:CardName` for card links)');
		if (url === null) return; // cancelled
		editor.dispatchCommand(TOGGLE_LINK_COMMAND, url || null);
	}

	function alignBlock(direction) {
		if (!editor) return;
		editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, direction);
	}
</script>

<div
	class="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-gray-700 bg-gray-800 px-2 py-1.5"
>
	<!-- Block type -->
	<select
		class="rounded bg-gray-900 px-2 py-1 text-xs text-gray-200 border border-gray-700"
		on:change={(e) => {
			setBlock(e.currentTarget.value);
			e.currentTarget.value = '';
		}}
	>
		<option value="">Block…</option>
		<option value="paragraph">Paragraph</option>
		<option value="h2">Heading 2</option>
		<option value="h3">Heading 3</option>
		<option value="h4">Heading 4</option>
		<option value="quote">Quote</option>
	</select>

	<span class="mx-1 h-5 w-px bg-gray-700"></span>

	<!-- Inline formatting -->
	<button type="button" class="tb" on:click={() => format('bold')} title="Bold (Cmd+B)">
		<strong>B</strong>
	</button>
	<button type="button" class="tb italic" on:click={() => format('italic')} title="Italic (Cmd+I)">
		I
	</button>
	<button type="button" class="tb" on:click={() => format('underline')} title="Underline">
		<u>U</u>
	</button>
	<button type="button" class="tb line-through" on:click={() => format('strikethrough')} title="Strikethrough">
		S
	</button>
	<button type="button" class="tb font-mono" on:click={() => format('code')} title="Inline code">
		&lt;/&gt;
	</button>

	<span class="mx-1 h-5 w-px bg-gray-700"></span>

	<!-- Lists -->
	<button type="button" class="tb" on:click={() => insertList('ul')} title="Bullet list">
		•
	</button>
	<button type="button" class="tb" on:click={() => insertList('ol')} title="Numbered list">
		1.
	</button>

	<span class="mx-1 h-5 w-px bg-gray-700"></span>

	<!-- Link -->
	<button type="button" class="tb" on:click={toggleLink} title="Insert link">
		🔗
	</button>

	<span class="mx-1 h-5 w-px bg-gray-700"></span>

	<!-- Alignment -->
	<button type="button" class="tb" on:click={() => alignBlock('left')} title="Align left">
		⬅
	</button>
	<button type="button" class="tb" on:click={() => alignBlock('center')} title="Center">
		⬌
	</button>
	<button type="button" class="tb" on:click={() => alignBlock('right')} title="Align right">
		➡
	</button>

	<span class="mx-1 h-5 w-px bg-gray-700"></span>

	<!-- Widgets -->
	<button
		type="button"
		class="tb px-2.5 text-blue-300 hover:text-blue-200"
		on:click={() => dispatch('insertDecklist')}
		title="Insert decklist"
	>
		+ Decklist
	</button>
	<button
		type="button"
		class="tb px-2.5 text-purple-300 hover:text-purple-200"
		on:click={() => dispatch('insertStatsTable')}
		title="Insert stats table"
	>
		+ Stats
	</button>
	<button
		type="button"
		class="tb px-2.5 text-amber-300 hover:text-amber-200"
		on:click={() => dispatch('insertCardLink')}
		title="Insert card link"
	>
		+ Card
	</button>
	<button
		type="button"
		class="tb px-2.5 text-pink-300 hover:text-pink-200 disabled:opacity-50"
		on:click={() => dispatch('insertImage')}
		disabled={imageUploading}
		title="Insert image"
	>
		{imageUploading ? 'Uploading…' : '+ Image'}
	</button>
</div>

<style>
	.tb {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2rem;
		height: 1.75rem;
		padding: 0 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.85rem;
		color: rgb(229, 231, 235);
		background: transparent;
		transition: background-color 0.1s;
	}
	.tb:hover {
		background: rgba(255, 255, 255, 0.08);
	}
</style>
