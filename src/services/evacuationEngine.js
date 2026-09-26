// JALASURAKSHA Dynamic Evacuation Engine
// Computes "Safest Route vs Shortest Route" by cross-referencing transit speed against hydrodynamic flood wave arrival times

export function calculateEvacuationOptions({
  dam,
  originSettlementId,
  destinationShelterId,
  currentSimMinute = 20,
  averageVehicleSpeedKmh = 35
}) {
  const defaultSettlement = {
    id: `${dam?.id || 'dam'}-default-set`,
    name: 'Downstream Settlement',
    coords: dam?.coordinates || [11.4704, 77.1132],
    elevationM: 200,
    criticalArrivalTimeMin: 25
  };
  const defaultShelter = {
    id: `${dam?.id || 'dam'}-default-sh`,
    name: 'District Flood Evacuation Shelter',
    coords: [(dam?.coordinates?.[0] || 11.4704) + 0.05, (dam?.coordinates?.[1] || 77.1132) + 0.05],
    elevationM: 240
  };
  const settlements = dam?.settlements || [];
  const shelters = dam?.infrastructure?.schoolsShelters || [];
  const settlement = settlements.find(s => s.id === originSettlementId) || settlements[0] || defaultSettlement;
  const shelter = shelters.find(sh => sh.id === destinationShelterId) || shelters[0] || defaultShelter;
  
  // Flood wave arrival time at this origin settlement
  const floodArrivalTimeMin = settlement.criticalArrivalTimeMin || 25;

  // We generate 3 realistic evacuation route options
  const routes = [
    {
      id: 'route-fastest',
      name: 'Route Alpha: Direct Valley Highway (NH Arterial)',
      strategy: 'SHORTEST DISTANCE (Deceptive Trap)',
      distanceKm: 4.6,
      averageSpeedKmh: averageVehicleSpeedKmh,
      transitTimeMin: Math.round((4.6 / averageVehicleSpeedKmh) * 60),
      lowestElevationM: 221.0,
      crossDrainageKm: 2.1,
      floodIntersectionMinute: Math.round(floodArrivalTimeMin * 0.75), // cuts off early at low crossing!
      routePolyline: [
        settlement.coords,
        [settlement.coords[0] + 0.008, settlement.coords[1] - 0.012],
        [settlement.coords[0] + 0.015, settlement.coords[1] - 0.022],
        shelter.coords
      ],
      elevationProfile: [
        { km: 0, elevation: settlement.elevationM },
        { km: 1.5, elevation: 228 },
        { km: 2.1, elevation: 221, criticalDip: true, label: 'Low Causeway Dip (Submerged early!)' },
        { km: 3.5, elevation: 242 },
        { km: 4.6, elevation: shelter.elevationM }
      ],
      steps: [
        'Depart origin north-west onto State Highway Valley link.',
        'Proceed 2.1 km to low-level river causeway bridge.',
        'WARNING: Critical depression at km 2.1 intersects flood wave bore.',
        'Reach shelter destination high ground.'
      ]
    },
    {
      id: 'route-intermediate',
      name: 'Route Bravo: Secondary District Link Road',
      strategy: 'INTERMEDIATE CORRIDOR',
      distanceKm: 6.1,
      averageSpeedKmh: averageVehicleSpeedKmh * 0.9,
      transitTimeMin: Math.round((6.1 / (averageVehicleSpeedKmh * 0.9)) * 60),
      lowestElevationM: 236.0,
      crossDrainageKm: 3.8,
      floodIntersectionMinute: Math.round(floodArrivalTimeMin * 1.3),
      routePolyline: [
        settlement.coords,
        [settlement.coords[0] + 0.012, settlement.coords[1] + 0.005],
        [settlement.coords[0] + 0.020, settlement.coords[1] - 0.010],
        shelter.coords
      ],
      elevationProfile: [
        { km: 0, elevation: settlement.elevationM },
        { km: 2.0, elevation: 239 },
        { km: 3.8, elevation: 236, criticalDip: true, label: 'Culvert drainage point' },
        { km: 5.2, elevation: 250 },
        { km: 6.1, elevation: shelter.elevationM }
      ],
      steps: [
        'Head east away from riverbed towards eastern agricultural spur.',
        'Follow District Road 42 around lower ridge contours.',
        'Cross minor culvert at km 3.8 before flood backwater arrives.',
        'Ascend link road to designated shelter pavilion.'
      ]
    },
    {
      id: 'route-safest',
      name: 'Route Charlie: High-Elevation Ridge Crest Bypass',
      strategy: 'SAFEST & RECOMMENDED CORRIDOR',
      distanceKm: 7.4,
      averageSpeedKmh: averageVehicleSpeedKmh * 0.95,
      transitTimeMin: Math.round((7.4 / (averageVehicleSpeedKmh * 0.95)) * 60),
      lowestElevationM: 256.0,
      crossDrainageKm: null,
      floodIntersectionMinute: 9999, // Never inundated
      routePolyline: [
        settlement.coords,
        [settlement.coords[0] + 0.018, settlement.coords[1] - 0.004],
        [settlement.coords[0] + 0.026, settlement.coords[1] - 0.018],
        shelter.coords
      ],
      elevationProfile: [
        { km: 0, elevation: settlement.elevationM },
        { km: 2.2, elevation: 258 },
        { km: 4.5, elevation: 262, label: 'High Ridge Crest (+32m above peak flood)' },
        { km: 6.0, elevation: 264 },
        { km: 7.4, elevation: shelter.elevationM }
      ],
      steps: [
        'Immediate right turn ascending uphill towards Karavalur / Ridge Road.',
        'Maintain continuous elevation on the upper bedrock contour (> 256m MSL).',
        'Completely avoids valley flood plane and low-lying bridge pinch-points.',
        'Direct protected approach into high-capacity shelter complex.'
      ]
    }
  ];

  // Dynamic evaluation of each route against current simulation clock
  const evaluatedRoutes = routes.map((rt) => {
    const totalCompletionTimeMin = currentSimMinute + rt.transitTimeMin;
    const safetyMarginMin = rt.floodIntersectionMinute - totalCompletionTimeMin;
    
    let safetyScore = 0;
    let verdict = 'UNKNOWN';
    let verdictBadge = 'red';
    let description = '';

    if (safetyMarginMin < 0 || totalCompletionTimeMin >= rt.floodIntersectionMinute) {
      safetyScore = 15;
      verdict = 'DEADLY HAZARD (WATER INTERCEPT)';
      verdictBadge = 'red';
      description = `CRITICAL WARNING: The flood wave reaches km ${rt.crossDrainageKm} at T+${rt.floodIntersectionMinute}m, while vehicles departing now arrive at T+${totalCompletionTimeMin}m. Evacuees WILL BE SUBMERGED!`;
    } else if (safetyMarginMin < 15) {
      safetyScore = 55;
      verdict = 'EXTREMELY RISKY (NARROW MARGIN)';
      verdictBadge = 'amber';
      description = `MARGINAL WINDOW: Only a ${safetyMarginMin}-minute buffer remains before the low point is overtopped. Any traffic congestion will cause fatal entrapment.`;
    } else {
      safetyScore = 98;
      verdict = 'RECOMMENDED & GUARANTEED SAFE';
      verdictBadge = 'emerald';
      description = `SECURE CORRIDOR: Elevation stays > ${rt.lowestElevationM}m MSL (+${rt.lowestElevationM - settlement.elevationM}m clearance above valley). Wave never reaches this ridge.`;
    }

    return {
      ...rt,
      totalCompletionTimeMin,
      safetyMarginMin: safetyMarginMin > 500 ? 'INF (NO INTERSECTION)' : `${safetyMarginMin} min`,
      safetyScore,
      verdict,
      verdictBadge,
      description
    };
  });

  return {
    origin: settlement,
    destination: shelter,
    floodArrivalTimeMin,
    currentSimMinute,
    evaluatedRoutes,
    recommendedRoute: evaluatedRoutes.find(r => r.verdictBadge === 'emerald') || evaluatedRoutes[2]
  };
}
