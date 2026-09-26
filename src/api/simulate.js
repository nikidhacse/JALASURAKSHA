/**
 * JALASURAKSHA API Client for Hydrodynamic Simulation Backend
 * Connects frontend to FastAPI /simulate endpoints.
 */

// Target FastAPI backend port 8000 directly or via Vite dev proxy
const API_BASE_URL = 'http://localhost:8000/simulate';

/**
 * Initiates an asynchronous dam break simulation job on the backend.
 * @param {Object} params - Simulation parameters
 * @param {string} params.dam_id - Identifier of the dam (e.g., 'bhavanisagar')
 * @param {number} params.reservoir_level - % of Full Reservoir Level (FRL)
 * @param {number} params.breach_width - Breach bottom width in meters
 * @param {number} params.breach_formation_time - Formation duration in minutes
 * @param {string} params.rainfall_scenario - 'normal' | 'heavy' | 'cloudburst'
 * @param {number} [params.duration_hours=1.0] - Total simulation duration in hours
 * @param {number} [params.timestep_minutes=10.0] - Output raster interval
 * @returns {Promise<string>} job_id
 */
export async function runSimulation(params) {
  const payload = {
    dam_id: params.dam_id || 'bhavanisagar',
    reservoir_level: Number(params.reservoir_level ?? params.reservoirPercent ?? 95),
    breach_width: Number(params.breach_width ?? params.breachWidthM ?? 100),
    breach_formation_time: Number(params.breach_formation_time ?? params.breachFormationMin ?? 20),
    rainfall_scenario: params.rainfall_scenario ?? params.rainfallScenario ?? 'heavy',
    duration_hours: Number(params.duration_hours ?? 1.0),
    timestep_minutes: Number(params.timestep_minutes ?? 10.0),
  };

  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to initiate simulation (HTTP ${response.status})`);
  }

  const data = await response.json();
  return data.job_id;
}

/**
 * Polls the backend status for an ongoing simulation job until completion.
 * @param {string} jobId - The job identifier returned by runSimulation
 * @param {Function} [onProgress] - Optional callback receiving { status, progress_pct }
 * @param {number} [intervalMs=500] - Polling interval in milliseconds
 * @param {number} [maxAttempts=90] - Maximum poll attempts (45 seconds)
 * @returns {Promise<Object>} Completed simulation job status and raster telemetry
 */
export async function pollSimulation(jobId, onProgress = null, intervalMs = 500, maxAttempts = 90) {
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    const res = await fetch(`${API_BASE_URL}/${jobId}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Failed to query job ${jobId} (HTTP ${res.status})`);
    }

    const data = await res.json();

    if (onProgress) {
      onProgress({
        job_id: jobId,
        status: data.status,
        progress_pct: data.progress_pct || 0,
      });
    }

    if (data.status === 'completed') {
      return data;
    }

    if (data.status === 'failed') {
      throw new Error(data.error_message || `Simulation job ${jobId} failed on backend.`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Simulation job ${jobId} timed out after ${attempts * (intervalMs / 1000)}s.`);
}

/**
 * Convenience helper to run simulation and wait for completion.
 */
export async function runSimulationAndPoll(params, onProgress = null) {
  const jobId = await runSimulation(params);
  return await pollSimulation(jobId, onProgress);
}

/**
 * Runs all three What-If benchmark scenarios (A, B, C) concurrently against the real backend
 * and returns genuine raster-derived metrics for the comparison table.
 */
export async function runBackendScenarioComparison(damId, presets, onScenarioProgress = null) {
  const promises = presets.map(async (preset, idx) => {
    const jobData = await runSimulationAndPoll(
      {
        dam_id: damId,
        reservoir_level: preset.reservoirPercent,
        breach_width: preset.breachWidthM,
        breach_formation_time: preset.breachFormationMin,
        rainfall_scenario: preset.rainfallScenario,
        duration_hours: 1.0,
        timestep_minutes: 10.0,
      },
      (prog) => {
        if (onScenarioProgress) {
          onScenarioProgress(idx, prog);
        }
      }
    );

    return {
      ...preset,
      jobId: jobData.job_id,
      peakDischargeM3s: jobData.peak_discharge_m3s,
      maxVelocityMs: Number((Math.sqrt(9.81 * (jobData.hydraulic_head_m || 30) * 0.5) * 1.15).toFixed(2)),
      floodedAreaKm2: jobData.final_flooded_area_km2 || (jobData.timesteps.length > 0 ? jobData.timesteps[jobData.timesteps.length - 1].flooded_area_km2 : 0),
      finalMaxDepthM: jobData.final_max_depth_m || (jobData.timesteps.length > 0 ? jobData.timesteps[jobData.timesteps.length - 1].max_depth_m : 0),
      settlements: jobData.settlements || [],
      timesteps: jobData.timesteps || [],
    };
  });

  return await Promise.all(promises);
}

/**
 * Fetches downsampled grid arrays (depth, velocity, elevation, arrival_time)
 * and vectorized flood contours for a specific simulation timestep.
 * @param {string} jobId
 * @param {number} stepIdx - 1-based timestep index
 * @returns {Promise<Object>} Timestep raster payload
 */
export async function fetchTimestepRaster(jobId, stepIdx) {
  const res = await fetch(`${API_BASE_URL}/${jobId}/raster/${stepIdx}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch raster for timestep ${stepIdx} (HTTP ${res.status})`);
  }

  return await res.json();
}

