<script>
	/**
	 * Decklist Component for displaying FaB decklists
	 *
	 * Usage in Strapi content:
	 * Add a Code block with language "json" and paste this structure:
	 * {
	 *   "title": "Izzet Cauldron by Alexey Paulot",
	 *   "cards": [
	 *     { "quantity": 1, "name": "Rhinar, Reckless Rampage", "id": "WTR001", "type": "hero" },
	 *     { "quantity": 3, "name": "Savage Feast (Red)", "id": "ARC077", "type": "attack", "url": "https://custom-url.com" }
	 *   ]
	 * }
	 *
	 * The presence of a "cards" array will automatically trigger decklist rendering.
	 *
	 * Card object fields:
	 * - quantity (required): Number of copies
	 * - name (required): Display name of the card
	 * - id (optional): Card ID (e.g., "ARC077") - used for hover and link generation
	 * - type (optional): Card type (hero, weapon, equipment, action, attack, defense, resource, card)
	 * - url (optional): Custom URL to link to (defaults to cards.fabtcg.com search)
	 */

	/** @type {{ title?: string, cards?: Array<{quantity: number, name: string, type?: string}> }} */
	export let decklist = { cards: [] };

	// Group cards by type
	$: groupedCards = (decklist.cards || []).reduce((acc, card) => {
		const type = card.type || 'card';
		if (!acc[type]) {
			acc[type] = [];
		}
		acc[type].push(card);
		return acc;
	}, {});

	// Define type order for display
	const typeOrder = ['hero', 'weapon', 'equipment', 'card', 'action', 'attack', 'defense', 'resource'];
	const typeLabels = {
		hero: 'Hero',
		weapon: 'Weapons',
		equipment: 'Equipment',
		card: 'Cards',
		action: 'Actions',
		attack: 'Attack Actions',
		defense: 'Defense Reactions',
		resource: 'Resources'
	};

	// Sort types according to predefined order
	$: sortedTypes = Object.keys(groupedCards).sort((a, b) => {
		const aIndex = typeOrder.indexOf(a);
		const bIndex = typeOrder.indexOf(b);
		if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
		if (aIndex === -1) return 1;
		if (bIndex === -1) return -1;
		return aIndex - bIndex;
	});

	// Calculate total cards
	$: totalCards = (decklist.cards || []).reduce((sum, card) => sum + card.quantity, 0);
</script>

<div class="decklist-container">
	{#if decklist.title}
		<h3 class="decklist-title">{decklist.title}</h3>
	{/if}

	<div class="decklist-content">
		{#each sortedTypes as type}
			{#if groupedCards[type] && groupedCards[type].length > 0}
				<div class="decklist-section">
					<h4 class="section-title">{typeLabels[type] || type}</h4>
					<ul class="card-list">
						{#each groupedCards[type] as card}
							<li class="card-item">
								<span class="card-quantity">{card.quantity}</span>
								<a
									href={card.url || `https://cards.fabtcg.com/?search=${encodeURIComponent(card.id || card.name)}`}
									target="_blank"
									rel="noopener noreferrer"
									data-card-name={card.id || card.name}
									class="card-link"
								>
									{card.name}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/each}

		{#if totalCards > 0}
			<div class="decklist-footer">
				<span class="total-cards">Total: {totalCards} cards</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.decklist-container {
		background-color: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius);
		padding: 1.5rem;
		margin: 2rem 0;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.decklist-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: hsl(var(--foreground));
		margin-bottom: 1.5rem;
		padding-bottom: 0.75rem;
		border-bottom: 2px solid hsl(var(--border));
	}

	.decklist-content {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.decklist-section {
		min-width: 0;
	}

	.section-title {
		font-size: 1rem;
		font-weight: 600;
		color: hsl(var(--muted-foreground));
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid hsl(var(--border));
	}

	.card-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.card-item {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		padding: 0.25rem 0;
		font-size: 0.95rem;
	}

	.card-quantity {
		font-weight: 600;
		color: hsl(var(--muted-foreground));
		min-width: 1.5rem;
		text-align: right;
	}

	.card-link {
		color: hsl(var(--primary));
		text-decoration: none;
		cursor: pointer;
		transition: color 0.2s;
	}

	.card-link:hover {
		color: hsl(var(--accent));
		text-decoration: underline;
	}

	.decklist-footer {
		grid-column: 1 / -1;
		padding-top: 1rem;
		margin-top: 1rem;
		border-top: 1px solid hsl(var(--border));
	}

	.total-cards {
		font-weight: 600;
		color: hsl(var(--foreground));
		font-size: 0.95rem;
	}

	@media (max-width: 768px) {
		.decklist-content {
			grid-template-columns: 1fr;
		}
	}
</style>
