/**
 * JALASURAKSHA API Client for Dynamic Evacuation Routing Engine
 * Connects frontend to FastAPI /evacuate endpoints.
 */

const EVAC_API_URL = 'http://localhost:8000/evacuate';

/**
 * Retrieves genuine Dijkstra shortest (Alpha) vs time-aware safest (Charlie) evacuation routes.
 * @param {string} jobId - Simulation job identifier
 * @param {number} startLat - Origin latitude
 * @param {number} startLon - Origin longitude
 * @param {number} [destLat] - Destination shelter latitude
 * @param {number} [destLon] - Destination shelter longitude
 * @param {number} [currentTime=15.0] - Simulation timeline minute
 * @returns {Promise<Object>} Evacuation routing response with GeoJSON features and safety margins
 */
export async function fetchEvacuationRoutes(
  jobId,
  startLat,
  startLon,
  destLat = null,
  destLon = null,
  currentTime = 15.0
) {
  let url = `${EVAC_API_URL}/${jobId}?start_lat=${startLat}&start_lon=${startLon}&current_time=${currentTime}`;
  if (destLat !== null && destLat !== undefined && destLon !== null && destLon !== undefined) {
    url += `&dest_lat=${destLat}&dest_lon=${destLon}`;
  }

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to fetch evacuation routes (HTTP ${response.status})`);
  }

  return await response.json();
}
