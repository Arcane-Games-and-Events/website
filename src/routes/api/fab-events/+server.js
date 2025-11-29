import { json } from '@sveltejs/kit';

const GEM_API_URL = 'https://gem.fabtcg.com/api/v1/locator/events/';

export async function POST({ request }) {
	try {
		const { zipcode, distance, timeframe } = await request.json();

		if (!zipcode || !/^\d{5}$/.test(zipcode)) {
			return json({ error: 'Valid 5-digit zipcode required' }, { status: 400 });
		}

		// Get coordinates for the zipcode
		const searchCoords = await getGeolocationFromZip(zipcode);
		if (!searchCoords) {
			return json({ error: 'Could not find location for zipcode' }, { status: 400 });
		}

		// Calculate date range based on timeframe
		const now = new Date();
		let endDate = new Date();

		switch (timeframe) {
			case 'week':
				endDate.setDate(now.getDate() + 7);
				break;
			case '2weeks':
				endDate.setDate(now.getDate() + 14);
				break;
			case 'month':
				endDate.setMonth(now.getMonth() + 1);
				break;
			case '3months':
				endDate.setMonth(now.getMonth() + 3);
				break;
			default:
				endDate.setDate(now.getDate() + 30);
		}

		const maxDistanceMiles = parseInt(distance) || 50;
		const events = await fetchFabEvents(searchCoords, maxDistanceMiles, now, endDate);

		return json({
			events,
			searchCenter: searchCoords
		});
	} catch (error) {
		console.error('FAB API error:', error);
		return json({ error: 'Failed to fetch events. Please try again.' }, { status: 500 });
	}
}

async function fetchFabEvents(searchCoords, maxDistanceMiles, startDate, endDate) {
	try {
		// Fetch all events from GEM API (paginated)
		// Need to fetch many pages since events are sorted globally by date, not by location
		let allEvents = [];
		let nextUrl = `${GEM_API_URL}?mode=event`;
		let pageCount = 0;
		const maxPages = 60; // Fetch up to 60 pages to ensure we get enough US events

		while (nextUrl && pageCount < maxPages) {
			console.log(`Fetching page ${pageCount + 1}...`);
			const response = await fetch(nextUrl, {
				headers: {
					'User-Agent': 'AGESoftware/1.0',
					'Accept': 'application/json'
				}
			});

			if (!response.ok) {
				console.error('GEM API error:', response.status, response.statusText);
				break;
			}

			const data = await response.json();
			allEvents = [...allEvents, ...data.results];
			nextUrl = data.next;
			pageCount++;

			// Early exit if we have enough US events
			const usEvents = allEvents.filter(e => e.country === 'US');
			if (usEvents.length > 350) {
				console.log(`Found ${usEvents.length} US events, stopping pagination`);
				break;
			}
		}

		console.log(`Fetched ${allEvents.length} total events from ${pageCount} pages`);

		// Filter to US events only
		const usEvents = allEvents.filter(e => e.country === 'US');
		console.log(`Found ${usEvents.length} US events`);

		// Calculate distance and filter
		const eventsWithDistance = usEvents
			.map(event => {
				if (!event.lat || !event.lon) return null;

				const distanceMiles = haversineDistance(
					searchCoords.lat,
					searchCoords.lng,
					event.lat,
					event.lon
				);

				return {
					...event,
					distanceMiles: Math.round(distanceMiles * 10) / 10
				};
			})
			.filter(event => event && event.distanceMiles <= maxDistanceMiles);

		console.log(`Found ${eventsWithDistance.length} events within ${maxDistanceMiles} miles`);

		// Filter by date range
		const eventsInRange = eventsWithDistance.filter(event => {
			if (!event.start_time) return true;
			const eventDate = new Date(event.start_time);
			return eventDate >= startDate && eventDate <= endDate;
		});

		console.log(`Found ${eventsInRange.length} events in date range`);

		// Sort by distance
		eventsInRange.sort((a, b) => a.distanceMiles - b.distanceMiles);

		// Format for frontend
		return eventsInRange.slice(0, 30).map((event, index) => ({
			id: `fab-${event.id || index}`,
			title: event.nickname || event.tournament_type || 'FAB Event',
			store: event.organiser_name || '',
			storeSlug: event.organiser_store_slug || null,
			storeUrl: event.organiser_store_slug
				? `https://fabtcg.com/locator/${event.organiser_store_slug}/`
				: null,
			date: formatEventDate(event.start_time),
			startTime: event.start_time || null, // Raw ISO date for sorting
			location: event.address || '',
			format: event.format_name || '',
			tournamentType: event.tournament_type || '',
			lat: event.lat,
			lng: event.lon,
			distance: event.distanceMiles,
			eventLink: event.event_link || null,
			source: 'fabtcg'
		}));
	} catch (error) {
		console.error('Error fetching FAB events:', error);
		throw error;
	}
}

// Haversine formula to calculate distance between two points
function haversineDistance(lat1, lon1, lat2, lon2) {
	const R = 3959; // Earth's radius in miles
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function toRad(deg) {
	return deg * (Math.PI / 180);
}

// Format event date for display
function formatEventDate(dateStr) {
	if (!dateStr) return 'TBA';
	try {
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(date);
	} catch {
		return dateStr;
	}
}

// Get approximate geolocation from zipcode
async function getGeolocationFromZip(zipcode) {
	try {
		const response = await fetch(
			`https://nominatim.openstreetmap.org/search?postalcode=${zipcode}&country=US&format=json&limit=1`,
			{
				headers: { 'User-Agent': 'AGESoftware/1.0' }
			}
		);
		const data = await response.json();
		if (data && data[0]) {
			return {
				lat: parseFloat(data[0].lat),
				lng: parseFloat(data[0].lon)
			};
		}
	} catch (e) {
		console.error('Geolocation lookup failed:', e);
	}
	return null;
}
