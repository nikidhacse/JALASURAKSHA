// JALASURAKSHA Dam & Hydro-Geography Database
// Specialized data repository covering high-risk Indian river basins matching SIH26161 / NTRO criteria

export const DAMS_DATABASE = [
  {
    id: 'bhavanisagar',
    name: 'Bhavanisagar Dam',
    river: 'Bhavani River (Cauvery Basin)',
    state: 'Tamil Nadu',
    district: 'Erode',
    damType: 'Earthen Dam with Masonry Spillway',
    builtYear: 1955,
    crestLength: 8797, // meters (one of the longest earthen dams in the world)
    damHeight: 40.0, // meters
    fullReservoirLevel: 32.0, // meters (105 ft)
    storageCapacityMm3: 928, // Million cubic meters
    catchmentAreaKm2: 4200,
    normalDischargeM3s: 580,
    maxSpillwayDischargeM3s: 3400,
    riverSlope: 0.0014, // 1.4 m / km
    manningsN: 0.035, // Natural river channel with gravel & brush
    centerCoords: [11.4704, 77.1132],
    zoom: 11,
    satelliteImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
    description: 'Constructed across the Bhavani River downstream of the Moyar River confluence. A sudden breach poses catastrophic risk to dense agrarian and urban settlements along Sathyamangalam, Gobichettipalayam, and Bhavani town.',
    
    // Upstream & downstream elevation profile (DEM samples along 50 km reach)
    elevationProfile: [
      { km: 0, elevation: 280, riverBed: 240, label: 'Dam Crest / Reservoir Toe' },
      { km: 5, elevation: 258, riverBed: 232, label: 'Sirumugai Reach' },
      { km: 12, elevation: 245, riverBed: 224, label: 'Kalingarayan Headworks' },
      { km: 22, elevation: 236, riverBed: 218, label: 'Sathyamangalam Gorge' },
      { km: 35, elevation: 222, riverBed: 206, label: 'Gobichettipalayam Plains' },
      { km: 50, elevation: 198, riverBed: 185, label: 'Bhavani-Cauvery Confluence' }
    ],

    // River centerline waypoints downstream of dam
    riverCenterline: [
      [11.4704, 77.1132], // Bhavanisagar Dam
      [11.4580, 77.1350],
      [11.4420, 77.1650], // Sirumugai
      [11.4650, 77.2100],
      [11.5050, 77.2400], // Sathyamangalam Entry
      [11.5120, 77.2550], // Sathy Bridge
      [11.4980, 77.2950],
      [11.4820, 77.3400],
      [11.4650, 77.3850],
      [11.4500, 77.4400], // Gobichettipalayam Reach
      [11.4420, 77.5100],
      [11.4460, 77.5800],
      [11.4490, 77.6800]  // Bhavani Town Confluence
    ],

    // Downstream settlements with baseline risk profiles
    settlements: [
      {
        id: 'set-1',
        name: 'Sirumugai Town',
        coords: [11.4420, 77.1650],
        distanceKm: 6.2,
        population: 24800,
        elevationM: 238,
        warningPhase: 'CRITICAL',
        criticalArrivalTimeMin: 18, // Flood wave arrives in 18 mins
        peakDepthM: 4.8,
        peakVelocityMs: 5.2,
        vulnerableHouseholds: 2150
      },
      {
        id: 'set-2',
        name: 'Sathyamangalam Municipality',
        coords: [11.5050, 77.2450],
        distanceKm: 18.5,
        population: 41200,
        elevationM: 225,
        warningPhase: 'WARNING',
        criticalArrivalTimeMin: 38, // Flood wave arrives in 38 mins
        peakDepthM: 3.4,
        peakVelocityMs: 3.8,
        vulnerableHouseholds: 3840
      },
      {
        id: 'set-3',
        name: 'Gobichettipalayam Sub-basin',
        coords: [11.4500, 77.4400],
        distanceKm: 34.0,
        population: 62500,
        elevationM: 212,
        warningPhase: 'ADVISORY',
        criticalArrivalTimeMin: 72,
        peakDepthM: 2.1,
        peakVelocityMs: 2.4,
        vulnerableHouseholds: 1920
      },
      {
        id: 'set-4',
        name: 'Bhavani Town & Sangameshwarar',
        coords: [11.4490, 77.6800],
        distanceKm: 52.0,
        population: 68000,
        elevationM: 190,
        warningPhase: 'MONITORING',
        criticalArrivalTimeMin: 135,
        peakDepthM: 1.6,
        peakVelocityMs: 1.8,
        vulnerableHouseholds: 2400
      }
    ],

    // Critical Infrastructure Assets
    infrastructure: {
      bridges: [
        {
          id: 'br-1',
          name: 'Sirumugai Bypass Bridge',
          coords: [11.4450, 77.1700],
          elevationM: 236.5,
          submergenceThresholdM: 235.0,
          inundationTimeMin: 22,
          status: 'At Risk',
          structuralClass: 'RCC 4-Span'
        },
        {
          id: 'br-2',
          name: 'NH-948 Sathyamangalam Causeway & High Bridge',
          coords: [11.5120, 77.2550],
          elevationM: 224.2,
          submergenceThresholdM: 223.5,
          inundationTimeMin: 42,
          status: 'Impending Cut-off',
          structuralClass: 'Masonry Arch + Steel Superstructure'
        },
        {
          id: 'br-3',
          name: 'Bhavani-Cauvery Confluence Bridge',
          coords: [11.4480, 77.6750],
          elevationM: 191.0,
          submergenceThresholdM: 189.5,
          inundationTimeMin: 140,
          status: 'Operational',
          structuralClass: 'Prestressed Concrete'
        }
      ],
      hospitals: [
        {
          id: 'hosp-1',
          name: 'Sathyamangalam Govt General Hospital',
          coords: [11.5080, 77.2480],
          bedCount: 150,
          elevationM: 228.0,
          floodRisk: 'High (Ground Floor Inundation predicted T+48 min)',
          generatorVulnerability: 'Critical (Basement Level)',
          icuPatients: 14
        },
        {
          id: 'hosp-2',
          name: 'Sirumugai Community Health Centre',
          coords: [11.4480, 77.1620],
          bedCount: 40,
          elevationM: 241.0,
          floodRisk: 'Severe (Surrounded by water at T+26 min)',
          generatorVulnerability: 'Elevated Pad',
          icuPatients: 4
        }
      ],
      schoolsShelters: [
        {
          id: 'shelter-1',
          name: 'Govt Higher Secondary School & Hilltop Pavilion',
          coords: [11.5220, 77.2350],
          capacity: 3500,
          elevationM: 265.0,
          safeStatus: 'SAFE HIGH GROUND (+40m above flood level)',
          hasHelipad: true,
          waterSupply: 'Gravity fed borewell'
        },
        {
          id: 'shelter-2',
          name: 'Sirumugai Hillock Temple Community Hall',
          coords: [11.4350, 77.1520],
          capacity: 1800,
          elevationM: 272.0,
          safeStatus: 'SAFE HIGH GROUND (+34m above flood level)',
          hasHelipad: false,
          waterSupply: 'Rainwater harvesting & 20kL tanker'
        }
      ],
      totalBuildingsEstimated: 4860,
      totalRoadsKm: 142.5
    },

    // Evacuation Routes Benchmark
    evacuationRoutes: [
      {
        id: 'route-fast',
        name: 'Route Alpha (Direct NH-948 Highway)',
        type: 'SHORTEST BUT DEADLY',
        distanceKm: 4.8,
        driveTimeMin: 12,
        lowestElevationM: 222.0,
        floodIntersectionTimeMin: 24, // Flood wave submerges road at T+24 min!
        status: 'HAZARDOUS',
        warning: 'Road cross-drainage overtopped at km 2.4 within 24 min. High risk of vehicle wash-away!'
      },
      {
        id: 'route-safe',
        name: 'Route Bravo (Karavalur Ridge High-Elevation Bypass)',
        type: 'SAFEST RECOMMENDED',
        distanceKm: 7.2,
        driveTimeMin: 18,
        lowestElevationM: 254.0,
        floodIntersectionTimeMin: 999, // Elevation remains above maximum flood wave height
        status: 'GUARANTEED SAFE',
        warning: 'High clearance corridor. Elevation remains > 254m MSL (safety margin +30m).'
      }
    ],

    // Satellite Validation Reference Data (Sentinel-1 SAR)
    satelliteValidation: {
      platform: 'Sentinel-1C Synthetic Aperture Radar (SAR)',
      orbit: 'Descending 143',
      frequency: 'C-band (5.405 GHz) VV + VH Polarisation',
      acquisitionTimestamp: '2026-09-24T18:22:40Z',
      geeAssetId: 'COPERNICUS/S1_GRD/S1C_IW_GRDH_1SDV_20260924T182240',
      observedWaterAreaKm2: 32.4,
      modelPredictedAreaKm2: 34.8,
      intersectionOverUnionIoU: 0.886,
      criticalSuccessIndexCSI: 0.842,
      hitRate: 0.924,
      falseAlarmRate: 0.081
    }
  },

  {
    id: 'idukki',
    name: 'Idukki & Cheruthoni Dam',
    river: 'Periyar River',
    state: 'Kerala',
    district: 'Idukki',
    damType: 'Double Curvature Arch Dam & Concrete Gravity Spillway',
    builtYear: 1976,
    crestLength: 365,
    damHeight: 168.9, // meters (one of the highest arch dams in Asia)
    fullReservoirLevel: 2403.0, // ft MSL (732.4 m)
    storageCapacityMm3: 1996,
    catchmentAreaKm2: 649,
    normalDischargeM3s: 750,
    maxSpillwayDischargeM3s: 5010,
    riverSlope: 0.0052, // Steep mountain gorge
    manningsN: 0.048, // Boulder and rock-strewn gorge
    centerCoords: [9.8498, 76.9744],
    zoom: 11,
    satelliteImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    description: 'High-head arch dam in the Western Ghats. A failure of Cheruthoni saddle dam triggers an immense high-velocity bore wave traveling through narrow gorges into Karimban, Chelachuvadu, and Aluva.',
    elevationProfile: [
      { km: 0, elevation: 732, riverBed: 565, label: 'Cheruthoni Spillway Base' },
      { km: 8, elevation: 490, riverBed: 410, label: 'Karimban Gorge' },
      { km: 24, elevation: 320, riverBed: 250, label: 'Chelachuvadu River Valley' },
      { km: 45, elevation: 120, riverBed: 75, label: 'Neriamangalam Bridge' },
      { km: 75, elevation: 22, riverBed: 8, label: 'Aluva - Kochi Delta' }
    ],
    riverCenterline: [
      [9.8498, 76.9744],
      [9.8650, 76.9600],
      [9.8820, 76.9400],
      [9.9150, 76.9150],
      [9.9500, 76.8800],
      [10.010, 76.8100],
      [10.100, 76.6200],
      [10.110, 76.3500]
    ],
    settlements: [
      {
        id: 'id-set-1',
        name: 'Cheruthoni Town & Bus Terminal',
        coords: [9.8780, 76.9680],
        distanceKm: 3.5,
        population: 18200,
        elevationM: 580,
        warningPhase: 'CRITICAL',
        criticalArrivalTimeMin: 11,
        peakDepthM: 7.8,
        peakVelocityMs: 8.4,
        vulnerableHouseholds: 1600
      },
      {
        id: 'id-set-2',
        name: 'Karimban Settlement',
        coords: [9.9150, 76.9150],
        distanceKm: 12.0,
        population: 9500,
        elevationM: 420,
        warningPhase: 'CRITICAL',
        criticalArrivalTimeMin: 22,
        peakDepthM: 6.2,
        peakVelocityMs: 6.8,
        vulnerableHouseholds: 820
      },
      {
        id: 'id-set-3',
        name: 'Aluva Industrial Corridor',
        coords: [10.110, 76.3500],
        distanceKm: 78.0,
        population: 280000,
        elevationM: 14,
        warningPhase: 'ADVISORY',
        criticalArrivalTimeMin: 180,
        peakDepthM: 2.8,
        peakVelocityMs: 2.1,
        vulnerableHouseholds: 18500
      }
    ],
    infrastructure: {
      bridges: [
        { id: 'id-br-1', name: 'Cheruthoni Old Bridge', coords: [9.8780, 76.9680], elevationM: 575, submergenceThresholdM: 572, inundationTimeMin: 13, status: 'Overtopped in 13 min' }
      ],
      hospitals: [
        { id: 'id-hosp-1', name: 'Idukki District Hospital', coords: [9.8550, 76.9780], bedCount: 220, elevationM: 640, floodRisk: 'High Ground Safe', icuPatients: 18 }
      ],
      schoolsShelters: [
        { id: 'id-sh-1', name: 'St. George High School Shelter', coords: [9.8900, 76.9800], capacity: 2500, elevationM: 670, safeStatus: 'SAFE HIGH GROUND' }
      ],
      totalBuildingsEstimated: 6400,
      totalRoadsKm: 195.0
    },
    evacuationRoutes: [
      { id: 'id-r-1', name: 'Painavu Ridge Route', type: 'SAFEST RECOMMENDED', distanceKm: 8.4, driveTimeMin: 22, lowestElevationM: 650, floodIntersectionTimeMin: 999, status: 'GUARANTEED SAFE' },
      { id: 'id-r-2', name: 'Low Valley River Road', type: 'SHORTEST BUT DEADLY', distanceKm: 4.1, driveTimeMin: 10, lowestElevationM: 570, floodIntersectionTimeMin: 14, status: 'HAZARDOUS' }
    ],
    satelliteValidation: {
      platform: 'Sentinel-1B C-SAR',
      orbit: 'Ascending 012',
      acquisitionTimestamp: '2026-09-22T04:15:10Z',
      observedWaterAreaKm2: 41.2,
      modelPredictedAreaKm2: 43.6,
      intersectionOverUnionIoU: 0.892,
      criticalSuccessIndexCSI: 0.854
    }
  },

  {
    id: 'sardarsarovar',
    name: 'Sardar Sarovar Dam',
    river: 'Narmada River',
    state: 'Gujarat',
    district: 'Narmada',
    damType: 'Concrete Gravity Dam',
    builtYear: 2017,
    crestLength: 1210,
    damHeight: 163.0,
    fullReservoirLevel: 138.68, // meters
    storageCapacityMm3: 9500,
    catchmentAreaKm2: 88000,
    normalDischargeM3s: 2200,
    maxSpillwayDischargeM3s: 84950,
    riverSlope: 0.0009,
    manningsN: 0.030,
    centerCoords: [21.8315, 73.7485],
    zoom: 11,
    satelliteImage: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1200&q=80',
    description: 'Terminal dam on the Narmada River. Features 30 radial gates. Inundation models evaluate propagation through Garudeshwar, Tilakwada, Chandod, and the industrial coastal hub of Bharuch.',
    elevationProfile: [
      { km: 0, elevation: 140, riverBed: 60, label: 'Dam Spillway Apron' },
      { km: 12, elevation: 48, riverBed: 32, label: 'Garudeshwar Weir' },
      { km: 38, elevation: 34, riverBed: 20, label: 'Tilakwada Plains' },
      { km: 82, elevation: 18, riverBed: 6, label: 'Bharuch Estuary' }
    ],
    riverCenterline: [
      [21.8315, 73.7485],
      [21.8550, 73.7100],
      [21.8900, 73.6500],
      [21.9300, 73.5200],
      [21.8500, 73.3000],
      [21.7000, 73.0000]
    ],
    settlements: [
      { id: 'ss-set-1', name: 'Garudeshwar', coords: [21.8550, 73.7100], distanceKm: 8.5, population: 14500, elevationM: 42, warningPhase: 'CRITICAL', criticalArrivalTimeMin: 24, peakDepthM: 5.6, peakVelocityMs: 4.8 },
      { id: 'ss-set-2', name: 'Tilakwada', coords: [21.9300, 73.5200], distanceKm: 28.0, population: 26000, elevationM: 30, warningPhase: 'WARNING', criticalArrivalTimeMin: 58, peakDepthM: 4.1, peakVelocityMs: 3.2 },
      { id: 'ss-set-3', name: 'Bharuch City', coords: [21.7000, 73.0000], distanceKm: 85.0, population: 220000, elevationM: 12, warningPhase: 'ADVISORY', criticalArrivalTimeMin: 195, peakDepthM: 2.2, peakVelocityMs: 1.6 }
    ],
    infrastructure: {
      bridges: [
        { id: 'ss-br-1', name: 'Golden Bridge Bharuch', coords: [21.7000, 73.0000], elevationM: 14.5, submergenceThresholdM: 13.8, inundationTimeMin: 210, status: 'Watchlist' }
      ],
      hospitals: [
        { id: 'ss-hosp-1', name: 'Rajpipla Civil Hospital', coords: [21.8700, 73.5600], bedCount: 300, elevationM: 50, floodRisk: 'Low Risk', icuPatients: 24 }
      ],
      schoolsShelters: [
        { id: 'ss-sh-1', name: 'Kevadia Relief Complex', coords: [21.8400, 73.7200], capacity: 5000, elevationM: 85, safeStatus: 'SAFE ELEVATED' }
      ],
      totalBuildingsEstimated: 12800,
      totalRoadsKm: 310.0
    },
    evacuationRoutes: [
      { id: 'ss-r-1', name: 'State Highway 11 Elevated Bypass', type: 'SAFEST RECOMMENDED', distanceKm: 14.0, driveTimeMin: 20, lowestElevationM: 65, floodIntersectionTimeMin: 999, status: 'GUARANTEED SAFE' },
      { id: 'ss-r-2', name: 'Riverbank Causeway Road', type: 'SHORTEST BUT DEADLY', distanceKm: 8.5, driveTimeMin: 14, lowestElevationM: 32, floodIntersectionTimeMin: 32, status: 'HAZARDOUS' }
    ],
    satelliteValidation: {
      platform: 'Sentinel-1A SAR',
      orbit: 'Descending 067',
      acquisitionTimestamp: '2026-09-23T12:08:30Z',
      observedWaterAreaKm2: 78.5,
      modelPredictedAreaKm2: 82.1,
      intersectionOverUnionIoU: 0.912,
      criticalSuccessIndexCSI: 0.880
    }
  },

  {
    id: 'hirakud',
    name: 'Hirakud Dam',
    river: 'Mahanadi River',
    state: 'Odisha',
    district: 'Sambalpur',
    damType: 'Composite Dam (Earthen + Concrete + Masonry)',
    builtYear: 1957,
    crestLength: 25790, // meters (one of the longest in the world)
    damHeight: 60.96,
    fullReservoirLevel: 192.02, // meters (630 ft)
    storageCapacityMm3: 5896,
    catchmentAreaKm2: 83400,
    normalDischargeM3s: 2800,
    maxSpillwayDischargeM3s: 42450,
    riverSlope: 0.0008,
    manningsN: 0.033,
    centerCoords: [21.5700, 83.8700],
    zoom: 11,
    satelliteImage: 'https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?auto=format&fit=crop&w=1200&q=80',
    description: 'Massive multipurpose project on the Mahanadi River. Simulation models water release surges impacting Sambalpur city, Burla, Binka, and downstream delta agricultural zones.',
    elevationProfile: [
      { km: 0, elevation: 192, riverBed: 145, label: 'Spillway Channel Base' },
      { km: 8, elevation: 152, riverBed: 138, label: 'Sambalpur City Limits' },
      { km: 35, elevation: 135, riverBed: 122, label: 'Binka Reach' },
      { km: 68, elevation: 118, riverBed: 105, label: 'Sonepur Confluence' }
    ],
    riverCenterline: [
      [21.5700, 83.8700],
      [21.5100, 83.9200],
      [21.4600, 83.9700],
      [21.3200, 83.8500],
      [21.1500, 83.8000]
    ],
    settlements: [
      { id: 'hk-set-1', name: 'Sambalpur Municipal Area', coords: [21.4600, 83.9700], distanceKm: 14.0, population: 335000, elevationM: 148, warningPhase: 'CRITICAL', criticalArrivalTimeMin: 32, peakDepthM: 4.2, peakVelocityMs: 3.4 },
      { id: 'hk-set-2', name: 'Burla Township', coords: [21.5000, 83.8800], distanceKm: 5.2, population: 46000, elevationM: 160, warningPhase: 'CRITICAL', criticalArrivalTimeMin: 16, peakDepthM: 3.8, peakVelocityMs: 3.9 }
    ],
    infrastructure: {
      bridges: [
        { id: 'hk-br-1', name: 'Mahanadi Sambalpur Bridge', coords: [21.4650, 83.9650], elevationM: 152, submergenceThresholdM: 150.5, inundationTimeMin: 45, status: 'At Risk' }
      ],
      hospitals: [
        { id: 'hk-hosp-1', name: 'VIMSAR Medical College Burla', coords: [21.4950, 83.8750], bedCount: 950, elevationM: 172, floodRisk: 'Safe High Ground', icuPatients: 65 }
      ],
      schoolsShelters: [
        { id: 'hk-sh-1', name: 'Sambalpur University Stadium Camp', coords: [21.4980, 83.8850], capacity: 6000, elevationM: 175, safeStatus: 'SAFE ELEVATED' }
      ],
      totalBuildingsEstimated: 15400,
      totalRoadsKm: 340.0
    },
    evacuationRoutes: [
      { id: 'hk-r-1', name: 'Burla Hilltop Bypass', type: 'SAFEST RECOMMENDED', distanceKm: 6.5, driveTimeMin: 15, lowestElevationM: 170, floodIntersectionTimeMin: 999, status: 'GUARANTEED SAFE' },
      { id: 'hk-r-2', name: 'Ring Road Embankment', type: 'SHORTEST BUT DEADLY', distanceKm: 4.2, driveTimeMin: 11, lowestElevationM: 146, floodIntersectionTimeMin: 28, status: 'HAZARDOUS' }
    ],
    satelliteValidation: {
      platform: 'Sentinel-1C SAR',
      orbit: 'Ascending 089',
      acquisitionTimestamp: '2026-09-24T00:30:15Z',
      observedWaterAreaKm2: 54.2,
      modelPredictedAreaKm2: 57.0,
      intersectionOverUnionIoU: 0.895,
      criticalSuccessIndexCSI: 0.862
    }
  },

  {
    id: 'teesta',
    name: 'Chungthang / Teesta-III Dam',
    river: 'Teesta River (Eastern Himalayas)',
    state: 'Sikkim',
    district: 'Mangan',
    damType: 'Concrete-Faced Rockfill Dam (CFRD)',
    builtYear: 2017,
    crestLength: 220,
    damHeight: 60.0,
    fullReservoirLevel: 1572.0, // meters MSL
    storageCapacityMm3: 45,
    catchmentAreaKm2: 2450,
    normalDischargeM3s: 450,
    maxSpillwayDischargeM3s: 7000,
    riverSlope: 0.0240, // Extreme mountain gradient (24 m/km!)
    manningsN: 0.055, // Turbulent mountain river with boulders
    centerCoords: [27.6040, 88.6470],
    zoom: 12,
    satelliteImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    description: 'Catastrophic historical analogue: South Lhonak Glacial Lake Outburst Flood (GLOF) overtopped and washed away the Chungthang dam in Oct 2023. Real simulation validates extreme Himalayan high-velocity debris-laden bore wave propagation down to Dikchu, Singtam, and Rangpo.',
    elevationProfile: [
      { km: 0, elevation: 1572, riverBed: 1510, label: 'Chungthang CFRD Toe' },
      { km: 15, elevation: 1150, riverBed: 1080, label: 'Dikchu Suspension Bridge' },
      { km: 38, elevation: 420, riverBed: 360, label: 'Singtam Commercial Hub' },
      { km: 58, elevation: 310, riverBed: 250, label: 'Rangpo Border Bridge' }
    ],
    riverCenterline: [
      [27.6040, 88.6470],
      [27.5300, 88.5800],
      [27.4200, 88.5300],
      [27.2300, 88.4900],
      [27.1800, 88.5200]
    ],
    settlements: [
      { id: 'te-set-1', name: 'Dikchu Village & Powerhouse', coords: [27.4200, 88.5300], distanceKm: 18.0, population: 4200, elevationM: 1120, warningPhase: 'CRITICAL', criticalArrivalTimeMin: 14, peakDepthM: 9.4, peakVelocityMs: 11.2 },
      { id: 'te-set-2', name: 'Singtam Riverfront Ward', coords: [27.2300, 88.4900], distanceKm: 42.0, population: 14800, elevationM: 390, warningPhase: 'CRITICAL', criticalArrivalTimeMin: 34, peakDepthM: 7.8, peakVelocityMs: 8.5 },
      { id: 'te-set-3', name: 'Rangpo Interstate Checkpost', coords: [27.1800, 88.5200], distanceKm: 62.0, population: 19500, elevationM: 280, warningPhase: 'WARNING', criticalArrivalTimeMin: 52, peakDepthM: 6.2, peakVelocityMs: 6.8 }
    ],
    infrastructure: {
      bridges: [
        { id: 'te-br-1', name: 'Indrani Bridge Singtam', coords: [27.2350, 88.4920], elevationM: 395, submergenceThresholdM: 392, inundationTimeMin: 35, status: 'Catastrophic Washaway Risk' }
      ],
      hospitals: [
        { id: 'te-hosp-1', name: 'Singtam District Hospital', coords: [27.2380, 88.4980], bedCount: 120, elevationM: 415, floodRisk: 'Low Direct Risk (Access Road Blocked)', icuPatients: 10 }
      ],
      schoolsShelters: [
        { id: 'te-sh-1', name: 'Govt Senior Secondary School Singtam Hill', coords: [27.2450, 88.4850], capacity: 2200, elevationM: 480, safeStatus: 'SAFE RIDGE CAMP' }
      ],
      totalBuildingsEstimated: 3200,
      totalRoadsKm: 88.0
    },
    evacuationRoutes: [
      { id: 'te-r-1', name: 'Ridge Mountain Highway NH-10 Upper', type: 'SAFEST RECOMMENDED', distanceKm: 7.8, driveTimeMin: 25, lowestElevationM: 460, floodIntersectionTimeMin: 999, status: 'GUARANTEED SAFE' },
      { id: 'te-r-2', name: 'Riverside Lowland Highway', type: 'SHORTEST BUT DEADLY', distanceKm: 3.5, driveTimeMin: 8, lowestElevationM: 380, floodIntersectionTimeMin: 18, status: 'HAZARDOUS' }
    ],
    satelliteValidation: {
      platform: 'Sentinel-1A SAR (Post-GLOF)',
      orbit: 'Descending 121',
      acquisitionTimestamp: '2023-10-04T12:10:00Z',
      observedWaterAreaKm2: 21.8,
      modelPredictedAreaKm2: 23.4,
      intersectionOverUnionIoU: 0.884,
      criticalSuccessIndexCSI: 0.849
    }
  }
];
