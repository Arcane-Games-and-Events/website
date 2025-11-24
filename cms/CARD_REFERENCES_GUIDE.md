# Card Reference Guide for Writers

This guide explains how to add interactive card references to your articles. Readers will be able to hover over (desktop) or tap (mobile) card names to see the card image.

## How It Works

- **Desktop**: Hover over a card name to see the card image appear near your cursor
- **Mobile**: Tap a card name to open a modal with:
  - The card image
  - A "View Full Card" button that searches cards.fabtcg.com (or "Buy this card" if you added a purchase link)

## Basic Usage

### Method 1: Simple Card Reference (Recommended for CMS)

1. Write the card name in your article: `Snatch`
2. Select the text
3. Click the link button in the editor
4. In the URL field, enter: `card:Snatch`
5. Save the link

**Note:** If you get an "invalid URL" error with card names that have spaces, use Method 2 below.

### Method 2: URL-Encoded Card Names (for cards with spaces)

For cards with spaces in their names like "Command and Conquer":

1. Write the card name: `Command and Conquer`
2. Select the text
3. Click the link button
4. In the URL field, enter: `card:Command%20and%20Conquer`
   - Replace each space with `%20`
5. Save the link

**Quick Reference for encoding spaces:**
- Space → `%20`
- Example: `card:Command%20and%20Conquer`
- Example: `card:Art%20of%20War`

## Specifying Pitch Values

Many cards come in different pitch versions (red, yellow, blue). To specify which version:

### Short notation (recommended):
- Red pitch: `card:Snatch[r]`
- Yellow pitch: `card:Snatch[y]`
- Blue pitch: `card:Snatch[b]`

### Long notation (also works):
- Red pitch: `card:Snatch[red]`
- Yellow pitch: `card:Snatch[yellow]`
- Blue pitch: `card:Snatch[blue]`

### With spaces in name:
- `card:Command%20and%20Conquer[r]`
- `card:Art%20of%20War[b]`

## Adding Purchase Links

To link a card to a specific purchase URL (like TCGPlayer, your store, etc.):

Format: `card:CARDNAME|PURCHASE_URL`

Examples:
- `card:Snatch[r]|https://tcgplayer.com/product/123456`
- `card:Command%20and%20Conquer|https://yourstore.com/buy/command-and-conquer`

The `|` character separates the card name from the purchase URL.

**Mobile behavior:**
- **With purchase link**: The modal shows a "Buy this card" button that opens your purchase URL
- **Without purchase link**: The modal shows a "View Full Card" button that searches the card on cards.fabtcg.com

## Examples

### Example 1: Basic card with no pitch specified
```
You should play Snatch in your deck.
```
Link `Snatch` with URL: `card:Snatch`

Result: Shows the first Snatch variant found (usually red pitch)

### Example 2: Specific pitch value
```
Include three copies of Snatch (red) for resource generation.
```
Link `Snatch (red)` with URL: `card:Snatch[r]`

### Example 3: Card with spaces
```
Command and Conquer is a powerful finisher.
```
Link `Command and Conquer` with URL: `card:Command%20and%20Conquer[r]`

### Example 4: Card with purchase link
```
Pick up Command and Conquer at your local game store.
```
Link `Command and Conquer` with URL: `card:Command%20and%20Conquer|https://tcgplayer.com/...`

## Common Cards and Their Encodings

Quick reference for popular cards with spaces:

- **Command and Conquer**: `card:Command%20and%20Conquer`
- **Art of War**: `card:Art%20of%20War`
- **Zen State**: `card:Zen%20State`
- **Tiger Stripe Shuko**: `card:Tiger%20Stripe%20Shuko`
- **Mask of Momentum**: `card:Mask%20of%20Momentum`
- **Blade Runner**: `card:Blade%20Runner`

## Troubleshooting

### "Invalid URL" error
- Make sure there are no spaces in the URL field
- Replace spaces with `%20`
- Check that you're using `card:` at the start (lowercase)

### Card image not showing
- Check that the card name is spelled correctly
- Try specifying the pitch value explicitly
- For newer cards, the image might not be in the database yet

### Wrong card version showing
- Specify the pitch value: `[r]`, `[y]`, or `[b]`
- Example: `card:Snatch[b]` for blue pitch Snatch

## Tips

1. **Most cards work without encoding**: Single-word cards like "Snatch", "Pummel", "Razorgrass" don't need `%20`
2. **Test your links**: Preview your article to make sure card images load correctly
3. **Pitch matters**: If a card comes in multiple pitches, specify which one for accuracy
4. **Keep it simple**: Readers see the nice card name text, not the encoded URL

## Need Help?

If you're having trouble with card references, contact your editor or check the console for error messages (F12 in browser).
