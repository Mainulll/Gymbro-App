/**
 * OpenStreetMap / Overpass API — nearby gym search.
 * No API key required. Rate limit: ~1 request/second; use 500ms debounce in UI.
 */

export interface OSMGym {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  distanceKm?: number;
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/** Haversine formula — distance between two GPS points in kilometres */
export function getDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Search for gyms within 5km of the given coordinates.
 * Optionally filter results client-side by name.
 */
export async function searchNearbyGyms(
  lat: number,
  lng: number,
  nameFilter?: string,
): Promise<OSMGym[]> {
  const radius = 5000; // metres

  const query = `
[out:json][timeout:15];
(
  node["leisure"="fitness_centre"](around:${radius},${lat},${lng});
  node["amenity"="gym"](around:${radius},${lat},${lng});
  way["leisure"="fitness_centre"](around:${radius},${lat},${lng});
  way["amenity"="gym"](around:${radius},${lat},${lng});
);
out body center;
  `.trim();

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) return [];
    const json = await res.json();
    const elements: any[] = json.elements ?? [];

    const gyms: OSMGym[] = elements
      .filter((el) => el.tags?.name)
      .map((el) => {
        // For ways, centre coords are in el.center; for nodes they're top-level
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        if (elLat == null || elLng == null) return null;

        const tags = el.tags ?? {};
        const addressParts: string[] = [];
        if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
        if (tags['addr:street']) addressParts.push(tags['addr:street']);
        if (tags['addr:suburb'] || tags['addr:city']) {
          addressParts.push(tags['addr:suburb'] ?? tags['addr:city']);
        }

        return {
          osmId: `${el.type}_${el.id}`,
          name: tags.name,
          lat: elLat,
          lng: elLng,
          address: addressParts.length > 0 ? addressParts.join(', ') : undefined,
          distanceKm: getDistanceKm(lat, lng, elLat, elLng),
        } as OSMGym;
      })
      .filter((g): g is OSMGym => g !== null)
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

    if (nameFilter && nameFilter.trim()) {
      const filter = nameFilter.toLowerCase();
      return gyms.filter((g) => g.name.toLowerCase().includes(filter));
    }

    return gyms;
  } catch {
    return [];
  }
}
