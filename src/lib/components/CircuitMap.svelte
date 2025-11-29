<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	export let circuits = [];
	export let selectedCircuit = null;
	export let onCircuitSelect = () => {};
	export let fabEvents = [];
	export let searchCenter = null; // { lat, lng } for centering map on search

	let mapContainer;
	let map;
	let markers = [];
	let fabMarkers = [];
	let L;
	let mapReady = false;

	// Circuit colors matching the site theme
	const circuitColors = {
		'Los Angeles': '#3b82f6', // blue-500
		'St. Louis': '#22c55e', // green-500
		'New England': '#a855f7' // purple-500
	};

	// Real geographic coordinates for circuit locations
	const circuitCoordinates = {
		'Los Angeles': { lat: 33.9533, lng: -117.3962, zoom: 9 }, // Riverside, CA
		'St. Louis': { lat: 38.6270, lng: -90.1994, zoom: 9 }, // St. Louis, MO
		'New England': { lat: 42.3601, lng: -71.0589, zoom: 8 } // Boston, MA area
	};

	onMount(async () => {
		if (!browser) return;

		// Load Leaflet CSS
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
		link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
		link.crossOrigin = '';
		document.head.appendChild(link);

		// Wait for CSS to load
		await new Promise((resolve) => {
			link.onload = resolve;
			setTimeout(resolve, 500); // Fallback
		});

		// Dynamically import Leaflet (client-side only)
		L = (await import('leaflet')).default;

		// Initialize map centered on continental US
		map = L.map(mapContainer, {
			zoomControl: true,
			scrollWheelZoom: true
		}).setView([39.8283, -98.5795], 4); // Center of US

		// Add dark-themed map tiles (CartoDB Dark Matter)
		L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
			subdomains: 'abcd',
			maxZoom: 19
		}).addTo(map);

		// Add circuit markers
		circuits.forEach((circuit) => {
			const coords = circuitCoordinates[circuit.name];
			if (!coords) return;

			const color = circuitColors[circuit.name] || '#6b7280';

			// Create custom marker icon
			const markerIcon = L.divIcon({
				className: 'custom-circuit-marker',
				html: `
					<div style="
						width: 40px;
						height: 40px;
						background: ${color};
						border: 3px solid white;
						border-radius: 50%;
						box-shadow: 0 4px 12px rgba(0,0,0,0.4);
						display: flex;
						align-items: center;
						justify-content: center;
						cursor: pointer;
						transition: transform 0.2s;
					">
						<div style="
							width: 12px;
							height: 12px;
							background: white;
							border-radius: 50%;
						"></div>
					</div>
				`,
				iconSize: [40, 40],
				iconAnchor: [20, 20]
			});

			const marker = L.marker([coords.lat, coords.lng], {
				icon: markerIcon
			}).addTo(map);

			// Add popup with circuit info
			const popupContent = `
				<div style="
					background: #1f2937;
					color: white;
					padding: 12px;
					border-radius: 8px;
					min-width: 200px;
				">
					<h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${color};">
						${circuit.name} Circuit
					</h3>
					<p style="margin: 0 0 4px 0; font-size: 13px; color: #9ca3af;">
						${circuit.region}
					</p>
					${circuit.venues && circuit.venues.length > 0 ? `
						<p style="margin: 8px 0 0 0; font-size: 12px; color: #d1d5db;">
							<strong>Venue:</strong> ${circuit.venues[0]}
						</p>
					` : ''}
				</div>
			`;

			marker.bindPopup(popupContent, {
				className: 'dark-popup',
				closeButton: true
			});

			// Handle marker click
			marker.on('click', () => {
				onCircuitSelect(circuit.name);
			});

			markers.push({ name: circuit.name, marker, coords });
		});

		// If a circuit is already selected, fly to it
		if (selectedCircuit && circuitCoordinates[selectedCircuit]) {
			const coords = circuitCoordinates[selectedCircuit];
			map.setView([coords.lat, coords.lng], coords.zoom);
		}

		mapReady = true;
	});

	// Function to add FAB event markers
	function addFabEventMarkers() {
		if (!map || !L || !mapReady) return;

		// Clear existing FAB markers
		fabMarkers.forEach(m => map.removeLayer(m));
		fabMarkers = [];

		fabEvents.forEach((event, index) => {
			if (!event.lat || !event.lng) return;

			// Create marker icon for FAB events (orange/amber color)
			const markerIcon = L.divIcon({
				className: 'custom-fab-marker',
				html: `
					<div style="
						width: 32px;
						height: 32px;
						background: #f59e0b;
						border: 2px solid white;
						border-radius: 50%;
						box-shadow: 0 3px 10px rgba(0,0,0,0.3);
						display: flex;
						align-items: center;
						justify-content: center;
						cursor: pointer;
					">
						<svg style="width: 16px; height: 16px; fill: white;" viewBox="0 0 24 24">
							<path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
							<path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
						</svg>
					</div>
				`,
				iconSize: [32, 32],
				iconAnchor: [16, 16]
			});

			const marker = L.marker([event.lat, event.lng], { icon: markerIcon }).addTo(map);

			const popupContent = `
				<div style="
					background: #1f2937;
					color: white;
					padding: 12px;
					border-radius: 8px;
					min-width: 220px;
					max-width: 300px;
				">
					<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
						<span style="
							background: #f59e0b;
							color: white;
							font-size: 10px;
							padding: 2px 6px;
							border-radius: 4px;
							font-weight: 600;
						">FAB TCG</span>
						${event.distance ? `
							<span style="
								font-size: 10px;
								color: #9ca3af;
							">${event.distance} mi away</span>
						` : ''}
					</div>
					<h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: white;">
						${event.title || 'FAB Event'}
					</h3>
					${event.date ? `
						<p style="margin: 0 0 4px 0; font-size: 12px; color: #9ca3af;">
							<strong>Date:</strong> ${event.date}
						</p>
					` : ''}
					${event.store ? `
						<p style="margin: 0 0 4px 0; font-size: 12px; color: #9ca3af;">
							<strong>Store:</strong> ${event.store}
						</p>
					` : ''}
					${event.location ? `
						<p style="margin: 0 0 4px 0; font-size: 12px; color: #9ca3af;">
							<strong>Location:</strong> ${event.location}
						</p>
					` : ''}
					${event.format ? `
						<p style="margin: 0 0 8px 0; font-size: 11px; color: #6b7280;">
							${event.format}
						</p>
					` : ''}
					${event.storeUrl ? `
						<a href="${event.storeUrl}" target="_blank" rel="noopener noreferrer" style="
							display: inline-block;
							margin-top: 8px;
							padding: 6px 12px;
							background: #f59e0b;
							color: white;
							text-decoration: none;
							border-radius: 6px;
							font-size: 12px;
							font-weight: 500;
						">View Store on FAB TCG</a>
					` : ''}
				</div>
			`;

			marker.bindPopup(popupContent, {
				className: 'dark-popup',
				closeButton: true
			});

			fabMarkers.push(marker);
		});

		// If we have FAB events and a search center, zoom to fit them
		if (fabEvents.length > 0 && searchCenter) {
			const bounds = L.latLngBounds([
				[searchCenter.lat, searchCenter.lng],
				...fabEvents.filter(e => e.lat && e.lng).map(e => [e.lat, e.lng])
			]);
			map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
		}
	}

	// React to fabEvents changes
	$: if (browser && mapReady && fabEvents) {
		addFabEventMarkers();
	}

	// React to searchCenter changes
	$: if (browser && map && searchCenter && !fabEvents.length) {
		map.flyTo([searchCenter.lat, searchCenter.lng], 10, { duration: 1 });
	}

	// React to selectedCircuit changes
	$: if (browser && map && selectedCircuit && circuitCoordinates[selectedCircuit]) {
		const coords = circuitCoordinates[selectedCircuit];
		map.flyTo([coords.lat, coords.lng], coords.zoom, {
			duration: 1
		});
		// Open the popup for the selected marker
		const markerData = markers.find(m => m.name === selectedCircuit);
		if (markerData) {
			markerData.marker.openPopup();
		}
	}

	onDestroy(() => {
		if (map) {
			map.remove();
		}
	});
</script>

<div bind:this={mapContainer} class="w-full h-full rounded-lg" style="min-height: 400px;"></div>

<style>
	:global(.dark-popup .leaflet-popup-content-wrapper) {
		background: transparent;
		box-shadow: none;
		padding: 0;
	}

	:global(.dark-popup .leaflet-popup-content) {
		margin: 0;
	}

	:global(.dark-popup .leaflet-popup-tip) {
		background: #1f2937;
	}

	:global(.leaflet-container) {
		background: #030712;
		font-family: inherit;
	}

	:global(.custom-circuit-marker:hover > div) {
		transform: scale(1.1);
	}
</style>
