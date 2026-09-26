/**
 * JALASURAKSHA API Client for Infrastructure Impact Engine
 * Connects frontend to FastAPI /impact endpoints.
 */

const IMPACT_API_URL = 'http://localhost:8000/impact';

/**
 * Retrieves genuine geospatial overlay impact metrics for a simulation run.
 * @param {string} jobId - Simulation job identifier
 * @param {number} [timestep] - Optional timestep index
 * @returns {Promise<Object>} Impact data containing counts and risk zones
 */
export async function fetchSimulationImpact(jobId, timestep = null) {
  const url = timestep ? `${IMPACT_API_URL}/${jobId}?timestep=${timestep}` : `${IMPACT_API_URL}/${jobId}`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to fetch impact assessment (HTTP ${response.status})`);
  }

  return await response.json();
}
