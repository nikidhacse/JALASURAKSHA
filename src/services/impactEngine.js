// JALASURAKSHA Infrastructure Impact Engine
// Quantifies consequence analytics across buildings, roads, bridges, hospitals, shelters, and crops

export function assessInfrastructureImpact({ dam, simulationState, breachInfo }) {
  const { currentSimMinute, settlementsStatus, distanceReachedKm, floodedAreaKm2 } = simulationState;
  const infra = dam.infrastructure;

  const maxReachKm = (dam.elevationProfile && dam.elevationProfile.length > 0)
    ? dam.elevationProfile[dam.elevationProfile.length - 1].km
    : 50;

  // Fraction of total reach impacted
  const reachFraction = Math.min(1.0, distanceReachedKm / Math.max(1, maxReachKm));

  // 1. Buildings Damage Analysis
  const totalBuildingsInBasin = infra?.totalBuildingsEstimated || 5000;
  const floodedBuildings = Math.round(totalBuildingsInBasin * reachFraction * 0.58);
  
  // USBR Hazard Rating Distribution
  const catastrophicCollapse = Math.round(floodedBuildings * 0.18);
  const severeWallDamage = Math.round(floodedBuildings * 0.34);
  const partialInundation = Math.round(floodedBuildings * 0.48);

  // 2. Roads Submergence
  const totalRoadsKm = infra?.totalRoadsKm || 120.0;
  const submergedRoadsKm = Number((totalRoadsKm * reachFraction * 0.45).toFixed(1));
  const cutOffRoadIntersections = Math.round(submergedRoadsKm * 0.8);

  // 3. Bridges Status Assessment
  const bridges = infra?.bridges || [];
  const bridgesStatus = bridges.map((br) => {
    const isCutOff = currentSimMinute >= br.inundationTimeMin;
    const timeRemaining = br.inundationTimeMin - currentSimMinute;
    
    let operationalState = 'OPEN & CLEAR';
    let badgeClass = 'emerald';
    
    if (isCutOff) {
      operationalState = 'OVERTOPPED / CLOSED';
      badgeClass = 'red';
    } else if (timeRemaining <= 15) {
      operationalState = 'CRITICAL OVERTOPPING IMMINENT';
      badgeClass = 'red';
    } else if (timeRemaining <= 30) {
      operationalState = 'RESTRICTED / EMERGENCY TRAFFIC ONLY';
      badgeClass = 'amber';
    }

    return {
      ...br,
      isCutOff,
      timeRemaining,
      operationalState,
      badgeClass
    };
  });

  // 4. Hospitals Assessment
  const hospitals = infra?.hospitals || [];
  const hospitalsStatus = hospitals.map((hosp) => {
    // Distance from dam approximation
    return {
      ...hosp,
      status: hosp.floodRisk?.includes('Severe') ? 'URGENT EVACUATION' : hosp.floodRisk?.includes('High') ? 'PREPARE EVACUATION' : 'SAFE RECEPTION'
    };
  });

  // 5. Schools and Designated Shelters
  const shelters = infra?.schoolsShelters || [];
  const sheltersStatus = shelters.map((sh) => {
    return {
      ...sh,
      occupancyPercent: Math.min(95, Math.round(reachFraction * 85)),
      isOperational: true
    };
  });

  // 6. Agricultural Inundation
  const agriculturalHectares = Math.round(floodedAreaKm2 * 68); // ~68 ha per km2 in fertile river delta
  const estimatedCropLossCroreInr = Number((agriculturalHectares * 0.018).toFixed(2)); // ~1.8 Lakh per ha

  // 7. Population Risk
  const totalPopulationAtRisk = settlementsStatus
    .filter(s => s.isReached || s.minutesUntilFlood < 60)
    .reduce((acc, curr) => acc + curr.population, 0);

  const totalVulnerableHouseholds = settlementsStatus
    .filter(s => s.isReached || s.minutesUntilFlood < 60)
    .reduce((acc, curr) => acc + curr.vulnerableHouseholds, 0);

  return {
    floodedBuildings,
    totalBuildingsInBasin,
    catastrophicCollapse,
    severeWallDamage,
    partialInundation,
    submergedRoadsKm,
    totalRoadsKm,
    cutOffRoadIntersections,
    bridgesStatus,
    hospitalsStatus,
    sheltersStatus,
    agriculturalHectares,
    estimatedCropLossCroreInr,
    totalPopulationAtRisk,
    totalVulnerableHouseholds
  };
}
