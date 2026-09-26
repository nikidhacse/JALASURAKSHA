import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import srtmElevation from '../data/indiaSRTMElevation.json';
import realisticMapData from '../data/indiaRealisticMapData.json';
import damImages from '../data/damImages.json';
import southIndiaDamsData from '../data/south_india_dams.json';
import { 
  Compass, 
  RotateCcw, 
  ArrowRight, 
  MapPin, 
  ShieldAlert, 
  Activity, 
  Camera,
  X,
  Database,
  Info,
  CheckCircle2,
  ExternalLink,
  Layers,
  AlertTriangle,
  Droplets,
  ShieldCheck
} from 'lucide-react';

// Geographic Bounding Box matching stitched ESRI satellite texture & SRTM grid
const BOUNDS = {
  west: 67.5,
  east: 101.25,
  north: 40.9799,
  south: 0.0
};

const CENTER_LON = 84.375; // (67.5 + 101.25) / 2
const CENTER_LAT = 20.49;  // (40.9799 + 0.0) / 2
const SCALE = 6.2;
const ELEVATION_SCALE = 3.6; // Vertical exaggeration for orbital terrain relief

// Convert Geographic Lat/Lon to 3D Cartesian coordinates based on real SRTM elevation
function geoToVector3(lat, lon, heightOffset = 0) {
  const x = (lon - CENTER_LON) * SCALE;
  const z = -(lat - CENTER_LAT) * SCALE;
  const y = getSRTMElevationAt(lat, lon) + heightOffset;
  return new THREE.Vector3(x, y, z);
}

// Bilinear interpolation of real SRTM elevation grid
function getSRTMElevationAt(lat, lon) {
  const { west, east, north, south } = BOUNDS;
  if (lon < west || lon > east || lat < south || lat > north) {
    return 0.0;
  }

  const u = (lon - west) / (east - west);
  const v = (north - lat) / (north - south);

  const maxCol = srtmElevation.gridCols - 1;
  const maxRow = srtmElevation.gridRows - 1;

  const colF = u * maxCol;
  const rowF = v * maxRow;

  const c0 = Math.max(0, Math.min(maxCol, Math.floor(colF)));
  const c1 = Math.max(0, Math.min(maxCol, Math.ceil(colF)));
  const r0 = Math.max(0, Math.min(maxRow, Math.floor(rowF)));
  const r1 = Math.max(0, Math.min(maxRow, Math.ceil(rowF)));

  const e00 = srtmElevation.elevations[r0][c0] || 0;
  const e10 = srtmElevation.elevations[r0][c1] || 0;
  const e01 = srtmElevation.elevations[r1][c0] || 0;
  const e11 = srtmElevation.elevations[r1][c1] || 0;

  const fracX = colF - c0;
  const fracY = rowF - r0;

  const top = e00 * (1 - fracX) + e10 * fracX;
  const bottom = e01 * (1 - fracX) + e11 * fracX;
  const elevM = top * (1 - fracY) + bottom * fracY;

  // Convert meters to 3D units (scale ~3.6 units per 1000m)
  return Math.max(0.0, (elevM / 1000.0) * ELEVATION_SCALE);
}

export default function ThreeIndiaMap({
  selectedDam,
  onSelectDam,
  onProceedToBreach
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const markersRef = useRef([]);
  const riversDataRef = useRef([]);
  const activeRiverPulseRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // Active State Filter: 'ALL' | 'Tamil Nadu' | 'Kerala' | 'Karnataka' | 'Andhra Pradesh'
  const [activeStateFilter, setActiveStateFilter] = useState('ALL');

  // Currently inspected dam for rich CWC NRLD Detail Panel
  const [inspectedDam, setInspectedDam] = useState(
    southIndiaDamsData.dams.find(d => d.id === selectedDam?.id) || southIndiaDamsData.dams[0]
  );

  // Hovered Dam State for Floating HUD Info Card
  const [hoveredDam, setHoveredDam] = useState(null);
  const [hudPos, setHudPos] = useState({ x: 0, y: 0, visible: false });
  const [isZooming, setIsZooming] = useState(false);

  // Camera lerp target
  const cameraTargetRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 900;
    const height = container.clientHeight || 560;

    // 1. Scene, Camera, WebGL Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060b14);
    scene.fog = new THREE.FogExp2(0x060b14, 0.0016);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2500);
    camera.position.set(0, 190, 165);
    camera.lookAt(0, 4, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.06;
    controls.minDistance = 25;
    controls.maxDistance = 380;
    controls.target.set(0, 4, 0);
    controlsRef.current = controls;

    // 2. Real Solar & Atmospheric Hemisphere Lighting
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.9);
    sunLight.position.set(130, 240, 95);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 20;
    sunLight.shadow.camera.far = 700;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.72);
    scene.add(hemiLight);

    // 3. Real Satellite-Draped Terrain Mesh with Actual SRTM Elevation Displacements
    const cols = srtmElevation.gridCols; // 96
    const rows = srtmElevation.gridRows; // 128
    const { west, east, north, south } = BOUNDS;

    const terrainWidth = (east - west) * SCALE;
    const terrainHeight = (north - south) * SCALE;

    const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainHeight, cols - 1, rows - 1);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const elevM = srtmElevation.elevations[r][c] || 0;
        const yVal = Math.max(0.0, (elevM / 1000.0) * ELEVATION_SCALE);
        posAttr.setY(idx, yVal);
      }
    }
    terrainGeo.computeVertexNormals();

    // 4. Stitched ESRI Satellite Texture
    const textureLoader = new THREE.TextureLoader();
    const satelliteTexture = textureLoader.load(
      '/satellite_basemap.jpg',
      () => renderer.render(scene, camera)
    );
    satelliteTexture.wrapS = THREE.ClampToEdgeWrapping;
    satelliteTexture.wrapT = THREE.ClampToEdgeWrapping;
    satelliteTexture.minFilter = THREE.LinearMipmapLinearFilter;
    satelliteTexture.magFilter = THREE.LinearFilter;
    satelliteTexture.colorSpace = THREE.SRGBColorSpace;

    const terrainMat = new THREE.MeshStandardMaterial({
      map: satelliteTexture,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: false
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    scene.add(terrainMesh);

    // 5. Stylized Ocean Pedestal
    const oceanGeo = new THREE.PlaneGeometry(terrainWidth * 1.5, terrainHeight * 1.5);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x05131a,
      roughness: 0.15,
      metalness: 0.75
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.position.y = -0.35;
    oceanMesh.receiveShadow = true;
    scene.add(oceanMesh);

    // 6. Major Indian River Channels
    const riverObjects = [];
    realisticMapData.rivers.forEach(r => {
      const pts3D = r.coords.map(pt => geoToVector3(pt[1], pt[0], 0.45));
      if (pts3D.length < 2) return;

      const curve = new THREE.CatmullRomCurve3(pts3D, false, 'catmullrom', 0.15);
      const tubeGeo = new THREE.TubeGeometry(curve, pts3D.length * 6, r.width || 0.55, 6, false);
      const isSelectedReach = r.associatedDamId === selectedDam?.id;

      const tubeMat = new THREE.MeshStandardMaterial({
        color: isSelectedReach ? 0x6bbf9e : 0x0f2922,
        emissive: isSelectedReach ? 0x4a9d7f : 0x000000,
        emissiveIntensity: isSelectedReach ? 1.6 : 0.0,
        roughness: 0.3,
        metalness: 0.4,
        transparent: true,
        opacity: isSelectedReach ? 1.0 : 0.88
      });

      const riverMesh = new THREE.Mesh(tubeGeo, tubeMat);
      scene.add(riverMesh);

      riverObjects.push({
        id: r.id,
        name: r.name,
        damId: r.associatedDamId,
        mesh: riverMesh,
        curve
      });
    });
    riversDataRef.current = riverObjects;

    // 7. Active Reach Particle Flow Animation
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleOffsets = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particleOffsets[i] = i / particleCount;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x6bbf9e,
      size: 3.2,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    activeRiverPulseRef.current = {
      system: particleSystem,
      offsets: particleOffsets,
      count: particleCount,
      activeCurve: null
    };

    // 8. 3D Dam Markers: Tactical glowing beacons for all 20 South Indian Dams
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);

    const markers = [];

    southIndiaDamsData.dams.forEach(dam => {
      const coords = dam.coordinates || dam.coords;
      const pos = geoToVector3(coords[0], coords[1], 0.7);
      const isCurrent = selectedDam?.id === dam.id;

      const damObj = new THREE.Group();
      damObj.position.copy(pos);
      damObj.userData = { dam, isDamMarker: true };

      // Base glowing tactical pad
      const basePadGeo = new THREE.CylinderGeometry(2.4, 2.8, 0.6, 16);
      const basePadMat = new THREE.MeshStandardMaterial({
        color: isCurrent ? 0x4a9d7f : 0x2d6b54,
        emissive: isCurrent ? 0x6bbf9e : 0x3d7a52,
        emissiveIntensity: 0.95
      });
      const basePad = new THREE.Mesh(basePadGeo, basePadMat);
      damObj.add(basePad);

      // Rotating radar circle
      const ringGeo = new THREE.RingGeometry(2.8, 3.8, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isCurrent ? 0x6bbf9e : 0x4a9d7f,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const scanRing = new THREE.Mesh(ringGeo, ringMat);
      damObj.add(scanRing);

      // Outer shockwave pulse ring
      const pulseRingGeo = new THREE.RingGeometry(3.9, 4.4, 24);
      pulseRingGeo.rotateX(-Math.PI / 2);
      const pulseRingMat = new THREE.MeshBasicMaterial({
        color: 0x4a9d7f,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
      damObj.add(pulseRing);

      // Vertical holographic tactical beam
      const beamGeo = new THREE.CylinderGeometry(0.3, 0.8, 16, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: isCurrent ? 0x4a9d7f : 0x6bbf9e,
        transparent: true,
        opacity: isCurrent ? 0.85 : 0.45
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 8;
      damObj.add(beam);

      // Apex beacon sphere
      const sphereGeo = new THREE.SphereGeometry(1.2, 12, 12);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: isCurrent ? 0xe8ede8 : 0x6bbf9e,
        emissive: isCurrent ? 0x6bbf9e : 0x3d7a52,
        emissiveIntensity: 1.4
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.y = 16;
      damObj.add(sphere);

      // Invisible hit sphere for mouse raycasting
      const hitGeo = new THREE.SphereGeometry(6.0, 8, 8);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.y = 8;
      hitMesh.userData = { dam, isDamMarker: true };
      damObj.add(hitMesh);

      markerGroup.add(damObj);

      markers.push({
        group: damObj,
        hitMesh,
        dam,
        scanRing,
        pulseRing,
        beam,
        basePad,
        basePadMat,
        sphere
      });
    });

    markersRef.current = markers;

    // 9. Mouse Raycaster for Dam Hover & Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hitMeshes = markers.map(m => m.hitMesh);
      const intersects = raycaster.intersectObjects(hitMeshes, true);

      if (intersects.length > 0) {
        const targetDam = intersects[0].object.userData.dam;
        setHoveredDam(targetDam);
        setHudPos({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          visible: true
        });
        container.style.cursor = 'pointer';
      } else {
        setHoveredDam(null);
        setHudPos(prev => ({ ...prev, visible: false }));
        container.style.cursor = 'grab';
      }
    };

    const handleClick = (event) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hitMeshes = markers.map(m => m.hitMesh);
      const intersects = raycaster.intersectObjects(hitMeshes, true);

      if (intersects.length > 0) {
        const clickedDam = intersects[0].object.userData.dam;
        setInspectedDam(clickedDam);
        onSelectDam(clickedDam);

        const coords = clickedDam.coordinates || clickedDam.coords;
        const damPos = geoToVector3(coords[0], coords[1], 0);
        cameraTargetRef.current = {
          camPos: new THREE.Vector3(damPos.x + 16, damPos.y + 38, damPos.z + 36),
          lookAt: new THREE.Vector3(damPos.x, damPos.y + 3, damPos.z),
          progress: 0
        };
        setIsZooming(true);
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('click', handleClick);

    // 10. Main Animation Render Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Rotate Dam Marker Radar Rings & Pulse Shockwaves
      markers.forEach(m => {
        if (m.scanRing) {
          m.scanRing.rotation.z += 0.025;
        }
        if (m.pulseRing) {
          const pulse = (Math.sin(elapsed * 4.0) + 1) * 0.5;
          const scale = 1.0 + pulse * 0.45;
          m.pulseRing.scale.set(scale, scale, 1);
          m.pulseRing.material.opacity = 0.6 - pulse * 0.5;
        }
      });

      // Flow Active River Highlight Pulse along selected dam reach
      if (activeRiverPulseRef.current && activeRiverPulseRef.current.activeCurve) {
        const arp = activeRiverPulseRef.current;
        const posAttr = arp.system.geometry.attributes.position;
        for (let i = 0; i < arp.count; i++) {
          arp.offsets[i] += delta * 0.18;
          if (arp.offsets[i] > 1.0) arp.offsets[i] -= 1.0;

          const pt = arp.activeCurve.getPoint(arp.offsets[i]);
          posAttr.array[i * 3] = pt.x;
          posAttr.array[i * 3 + 1] = pt.y + 0.35;
          posAttr.array[i * 3 + 2] = pt.z;
        }
        posAttr.needsUpdate = true;
      }

      // Smooth Camera Zoom Interpolation
      if (cameraTargetRef.current) {
        const ct = cameraTargetRef.current;
        ct.progress += delta * 1.5;
        const t = Math.min(1.0, ct.progress);

        camera.position.lerp(ct.camPos, 0.08);
        controls.target.lerp(ct.lookAt, 0.08);

        if (t >= 0.98) {
          cameraTargetRef.current = null;
          setIsZooming(false);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('click', handleClick);
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update selected dam styling & activate river downstream highlight
  useEffect(() => {
    if (!selectedDam || !markersRef.current) return;

    markersRef.current.forEach(m => {
      const isCurrent = m.dam.id === selectedDam.id;
      if (m.basePadMat) {
        m.basePadMat.color.setHex(isCurrent ? 0x4a9d7f : 0x2d6b54);
        m.basePadMat.emissive.setHex(isCurrent ? 0x6bbf9e : 0x3d7a52);
        m.basePadMat.emissiveIntensity = isCurrent ? 1.6 : 0.95;
      }
      if (m.sphere) {
        m.sphere.material.emissiveIntensity = isCurrent ? 2.2 : 1.2;
        m.sphere.material.color.setHex(isCurrent ? 0xe8ede8 : 0x6bbf9e);
      }
      if (m.beam) {
        m.beam.material.opacity = isCurrent ? 0.85 : 0.45;
        m.beam.material.color.setHex(isCurrent ? 0x4a9d7f : 0x6bbf9e);
      }
    });

    let matchedCurve = null;
    if (riversDataRef.current) {
      riversDataRef.current.forEach(r => {
        const isSelectedReach = r.damId === selectedDam.id;
        if (isSelectedReach) {
          r.mesh.material.emissive.setHex(0x4a9d7f);
          r.mesh.material.emissiveIntensity = 1.6;
          r.mesh.material.color.setHex(0x6bbf9e);
          r.mesh.material.opacity = 1.0;
          if (!matchedCurve) {
            matchedCurve = r.curve;
          }
        } else {
          r.mesh.material.emissive.setHex(0x000000);
          r.mesh.material.emissiveIntensity = 0.0;
          r.mesh.material.color.setHex(0x0f2922);
          r.mesh.material.opacity = 0.88;
        }
      });
    }

    if (activeRiverPulseRef.current) {
      activeRiverPulseRef.current.activeCurve = matchedCurve;
      activeRiverPulseRef.current.system.visible = !!matchedCurve;
    }
  }, [selectedDam]);

  // Reset to full Subcontinent View
  const handleResetView = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraTargetRef.current = {
      camPos: new THREE.Vector3(0, 190, 165),
      lookAt: new THREE.Vector3(0, 4, 0),
      progress: 0
    };
    setIsZooming(true);
  };

  // Zoom into specific Dam Basin & open detail panel
  const handleZoomDam = (dam) => {
    setInspectedDam(dam);
    onSelectDam(dam);
    const coords = dam.coordinates || dam.coords;
    const damPos = geoToVector3(coords[0], coords[1], 0);
    cameraTargetRef.current = {
      camPos: new THREE.Vector3(damPos.x + 16, damPos.y + 38, damPos.z + 36),
      lookAt: new THREE.Vector3(damPos.x, damPos.y + 3, damPos.z),
      progress: 0
    };
    setIsZooming(true);
  };

  // State-wise Camera Focus
  const handleStateFilterChange = (stateName) => {
    setActiveStateFilter(stateName);
    if (!cameraRef.current || !controlsRef.current) return;

    if (stateName === 'ALL') {
      cameraTargetRef.current = {
        camPos: new THREE.Vector3(0, 190, 165),
        lookAt: new THREE.Vector3(0, 4, 0),
        progress: 0
      };
    } else if (stateName === 'Tamil Nadu') {
      cameraTargetRef.current = {
        camPos: new THREE.Vector3(-30, 85, 80),
        lookAt: new THREE.Vector3(-42, 2, 56),
        progress: 0
      };
    } else if (stateName === 'Kerala') {
      cameraTargetRef.current = {
        camPos: new THREE.Vector3(-36, 75, 88),
        lookAt: new THREE.Vector3(-48, 2, 65),
        progress: 0
      };
    } else if (stateName === 'Karnataka') {
      cameraTargetRef.current = {
        camPos: new THREE.Vector3(-38, 90, 58),
        lookAt: new THREE.Vector3(-50, 4, 38),
        progress: 0
      };
    } else if (stateName === 'Andhra Pradesh') {
      cameraTargetRef.current = {
        camPos: new THREE.Vector3(-18, 95, 48),
        lookAt: new THREE.Vector3(-32, 4, 28),
        progress: 0
      };
    }
    setIsZooming(true);
  };

  // Filter visible dams based on state filter
  const filteredDams = activeStateFilter === 'ALL'
    ? southIndiaDamsData.dams
    : southIndiaDamsData.dams.filter(d => d.state.includes(activeStateFilter));

  const stateCounts = {
    'ALL': southIndiaDamsData.dams.length,
    'Tamil Nadu': southIndiaDamsData.dams.filter(d => d.state.includes('Tamil Nadu')).length,
    'Kerala': southIndiaDamsData.dams.filter(d => d.state.includes('Kerala')).length,
    'Karnataka': southIndiaDamsData.dams.filter(d => d.state.includes('Karnataka')).length,
    'Andhra Pradesh': southIndiaDamsData.dams.filter(d => d.state.includes('Andhra Pradesh')).length
  };

  return (
    <div className="w-full relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0a100c] shadow-2xl">
      {/* 3D Canvas Mount Point */}
      <div 
        ref={mountRef} 
        style={{ width: '100%', height: '580px', minHeight: '520px' }}
        className="w-full h-[580px] cursor-grab active:cursor-grabbing" 
      />

      {/* Top Left: Subcontinent Telemetry & State Filter Tabs */}
      <div className="absolute top-3 left-3 flex flex-col gap-2 z-10 pointer-events-auto">
        <div className="bg-[#101a14]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-800/50 shadow-xl flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <div className="font-mono text-xs">
            <span className="text-cyan-400 font-bold tracking-wider">
              SOUTH INDIA CWC NRLD AUDIT SCOPE
            </span>
            <span className="text-slate-400 text-[10px] block">
              20 Specified Large Dams • SRTM 30m Displaced Terrain
            </span>
          </div>
        </div>

        {/* State Cluster Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[#0d1410]/90 backdrop-blur-md p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
          {['ALL', 'Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh'].map((stateName) => {
            const isSelected = activeStateFilter === stateName;
            return (
              <button
                key={stateName}
                onClick={() => handleStateFilterChange(stateName)}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {stateName === 'ALL' ? 'ALL REGIONS' : stateName.toUpperCase()} ({stateCounts[stateName]})
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <button
          onClick={handleResetView}
          title="Reset to Subcontinent Overview"
          className="bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">OVERVIEW</span>
        </button>

        {selectedDam && (
          <button
            onClick={() => handleZoomDam(selectedDam)}
            title="Focus Camera onto Selected Basin"
            className="bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/80 px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">FOCUS DAM</span>
          </button>
        )}
      </div>

      {/* Floating 3D Hover Quick Card */}
      {hudPos.visible && hoveredDam && !inspectedDam && (
        <div
          style={{
            left: `${Math.min(window.innerWidth - 320, Math.max(20, hudPos.x + 18))}px`,
            top: `${Math.min(460, Math.max(20, hudPos.y - 70))}px`,
          }}
          className="absolute z-20 pointer-events-none w-72 bg-[#101a14]/95 backdrop-blur-xl border border-cyan-500/60 rounded-xl p-3 shadow-2xl space-y-2 animate-in fade-in zoom-in-95 duration-150 font-mono"
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-1.5">
            <div>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                {hoveredDam.state}
              </span>
              <h4 className="font-display font-bold text-sm text-slate-100 mt-1">
                {hoveredDam.name}
              </h4>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
              {hoveredDam.downstreamContext?.floodRiskLevel || 'MONITORED'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[8.5px]">RIVER</span>
              <span className="text-slate-200 font-bold truncate block">{hoveredDam.river}</span>
            </div>
            <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[8.5px]">GROSS STORAGE</span>
              <span className="text-cyan-400 font-bold">{hoveredDam.grossStorageTmc} TMC</span>
            </div>
          </div>

          <div className="text-[9.5px] text-cyan-400 flex items-center justify-between pt-0.5">
            <span>Click marker for full CWC audit</span>
            <ArrowRight className="w-3 h-3 animate-pulse" />
          </div>
        </div>
      )}

      {/* COMPREHENSIVE VERIFIABLE CWC NRLD DETAIL PANEL (On Dam Marker Click) */}
      {inspectedDam && (
        <div className="absolute top-3 right-3 bottom-16 w-full max-w-[430px] bg-[#0c140f]/95 backdrop-blur-xl border border-cyan-700/70 rounded-xl p-4 shadow-2xl z-30 flex flex-col justify-between overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
          {/* Top Panel Header */}
          <div className="border-b border-slate-800 pb-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {inspectedDam.state}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                    {inspectedDam.sourcing?.cwcNrldCode || 'CWC SPECIFIED'}
                  </span>
                  {inspectedDam.isFullySimulated && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      LIVE 2D TWIN
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-base text-white mt-1 leading-snug">
                  {inspectedDam.name}
                </h3>
              </div>
              <button
                onClick={() => setInspectedDam(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close Detail Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Dossier Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar py-2.5 space-y-3 text-xs font-mono">
            {/* Sensitive Dual-State Alert (Mullaperiyar) */}
            {inspectedDam.hasDualStateJurisdiction && (
              <div className="bg-amber-950/60 border border-amber-600/80 p-2.5 rounded-lg text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>CRITICAL DUAL-STATE JURISDICTION</span>
                </div>
                <p className="text-[10px] leading-relaxed text-amber-100">
                  {inspectedDam.dualStateDetails}
                </p>
              </div>
            )}

            {/* Geographical & Administrative Identity */}
            <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">River &amp; Basin:</span>
                <span className="text-cyan-300 font-semibold text-right">{inspectedDam.river}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nearest City:</span>
                <span className="text-slate-200 text-right">{inspectedDam.nearestCity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Coordinates:</span>
                <span className="text-slate-300 text-right">
                  {inspectedDam.coordinates[0]}° N, {inspectedDam.coordinates[1]}° E
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dam Type:</span>
                <span className="text-slate-200 text-right truncate max-w-[220px]" title={inspectedDam.damType}>
                  {inspectedDam.damType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Year Completed:</span>
                <span className="text-slate-200">{inspectedDam.builtYear}</span>
              </div>
            </div>

            {/* Technical Specifications Matrix */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[9px]">STRUCTURAL HEIGHT</span>
                <span className="text-white font-bold">{inspectedDam.heightM} m</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[9px]">CREST LENGTH</span>
                <span className="text-cyan-400 font-bold">{inspectedDam.lengthM.toLocaleString()} m</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[9px]">GROSS STORAGE</span>
                <span className="text-amber-400 font-bold">{inspectedDam.grossStorageTmc} TMC</span>
                <span className="text-slate-400 block text-[8.5px]">({inspectedDam.grossStorageMcm} MCM)</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[9px]">CATCHMENT AREA</span>
                <span className="text-white font-bold">{inspectedDam.catchmentAreaKm2.toLocaleString()} km²</span>
              </div>
            </div>

            {/* Primary Purposes */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Primary Purposes:
              </span>
              <div className="flex flex-wrap gap-1">
                {inspectedDam.primaryPurpose?.map((p) => (
                  <span
                    key={p}
                    className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-300"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Downstream Impact & Vulnerable Districts */}
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 space-y-1 text-[10.5px]">
              <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-slate-800/80 pb-1">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-red-400" />
                  Downstream Risk Context
                </span>
                <span className="text-amber-400 text-[10px]">
                  Pop: {inspectedDam.downstreamContext?.estimatedVulnerablePop}
                </span>
              </div>
              <div className="text-slate-300 pt-0.5">
                <span className="text-slate-500">Districts: </span>
                {inspectedDam.downstreamContext?.districts?.join(', ')}
              </div>
              <div className="text-slate-300">
                <span className="text-slate-500">Key Reach: </span>
                {inspectedDam.downstreamContext?.keySettlements?.slice(0, 4).join(' → ')}
              </div>
            </div>

            {/* Auditable Data Notes & CWC Source Registry Box */}
            <div className="bg-[#121f17] border border-cyan-800/50 p-2.5 rounded-lg space-y-1 text-[10px]">
              <div className="flex items-center justify-between text-cyan-400 font-bold border-b border-cyan-900/60 pb-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  CWC Registry &amp; Audit Notes
                </span>
                <span className="text-[9px] text-slate-400">
                  {inspectedDam.sourcing?.cwcNrldCode}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans text-[10.5px]">
                {inspectedDam.dataNotes}
              </p>
              <div className="text-[9px] text-slate-400 font-mono pt-1">
                Source: {inspectedDam.sourcing?.reference}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              onClick={() => {
                onSelectDam(inspectedDam);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-300 transition-all cursor-pointer"
            >
              Select Basin
            </button>

            {inspectedDam.isFullySimulated ? (
              <button
                onClick={onProceedToBreach}
                className="btn btn-primary text-xs px-3.5 py-1.5 font-semibold shadow-lg shadow-cyan-600/25 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>Launch 2D Simulation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-1 rounded">
                Telemetry Verified [SIH PS161]
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bottom Bar: Interactive Dam Selection Chips (Filtered by State) */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2.5 bg-[#0d1410]/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800/90 shadow-2xl z-10">
        {/* Dam Quick-Select Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[820px]">
          <span className="text-[10px] font-mono text-slate-400 uppercase hidden md:inline shrink-0">
            {activeStateFilter === 'ALL' ? 'DAMS (20):' : `${activeStateFilter.toUpperCase()}:`}
          </span>
          {filteredDams.map((dam) => {
            const isSelected = selectedDam?.id === dam.id;
            return (
              <button
                key={dam.id}
                onClick={() => handleZoomDam(dam)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/30'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span 
                  className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-cyan-400'}`} 
                />
                <span>{dam.name.split(' ')[0]}</span>
                <span className="text-[9px] opacity-75">({dam.grossStorageTmc}T)</span>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onProceedToBreach}
            className="btn btn-primary text-xs font-semibold px-3 py-1.5 shadow-lg shadow-cyan-600/20 flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Proceed to Breach Scenario</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
