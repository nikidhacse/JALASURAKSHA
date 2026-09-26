import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import srtmElevation from '../data/indiaSRTMElevation.json';
import realisticMapData from '../data/indiaRealisticMapData.json';
import damImages from '../data/damImages.json';
import indiaGeo from '../data/indiaGeoData.json';
import { 
  Compass, 
  RotateCcw, 
  ArrowRight, 
  MapPin, 
  ShieldAlert, 
  Activity, 
  Camera 
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

// Generate high-DPI cartographic city landmark sprite
function createLandmarkSprite(name, isMajor = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 64);

  // Subtle dot anchor
  ctx.beginPath();
  ctx.arc(24, 32, isMajor ? 5 : 3.5, 0, Math.PI * 2);
  ctx.fillStyle = isMajor ? '#38bdf8' : '#94a3b8';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // Monospace cartographic label
  ctx.font = isMajor ? 'bold 22px monospace' : '500 18px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillText(name.toUpperCase(), 36, 38);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ 
    map: texture, 
    transparent: true, 
    depthTest: false 
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(16, 4, 1);
  return sprite;
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
    const height = container.clientHeight || 540;

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
    controls.minDistance = 30;
    controls.maxDistance = 380;
    controls.target.set(0, 4, 0);
    controlsRef.current = controls;

    // 2. Real Solar & Atmospheric Hemisphere Lighting
    // Directional sunlight approximating afternoon solar angle
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.9);
    sunLight.position.set(130, 240, 95);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 20;
    sunLight.shadow.camera.far = 700;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    // Soft sky and ground hemisphere fill light (natural ambient bounce)
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

    const pos = terrainGeo.attributes.position;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const elevM = srtmElevation.elevations[r][c] || 0.0;

        // Displace from actual SRTM elevation data
        const yVal = Math.max(0.0, (elevM / 1000.0) * ELEVATION_SCALE);
        pos.setY(idx, yVal);
      }
    }
    terrainGeo.computeVertexNormals();

    // Load Real Satellite Imagery Texture (ESRI World Imagery Tile Mosaic)
    const textureLoader = new THREE.TextureLoader();
    const satelliteTexture = textureLoader.load('/textures/india_satellite_5.jpg', () => {
      renderer.render(scene, camera);
    });
    satelliteTexture.colorSpace = THREE.SRGBColorSpace;
    satelliteTexture.anisotropy = 8;
    satelliteTexture.wrapS = THREE.ClampToEdgeWrapping;
    satelliteTexture.wrapT = THREE.ClampToEdgeWrapping;

    const terrainMat = new THREE.MeshStandardMaterial({
      map: satelliteTexture,
      roughness: 0.82,
      metalness: 0.04,
      flatShading: false
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    scene.add(terrainMesh);

    // Deep Bathymetric Ocean Floor
    const oceanGeo = new THREE.PlaneGeometry(terrainWidth * 1.5, terrainHeight * 1.5);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x050c18,
      roughness: 0.9,
      metalness: 0.1
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.position.y = -0.8;
    oceanMesh.receiveShadow = true;
    scene.add(oceanMesh);

    // 4. Subtle State & Basin Administrative Boundaries
    const borderMat = new THREE.LineBasicMaterial({
      color: 0x64748b,
      transparent: true,
      opacity: 0.35,
      linewidth: 1
    });

    realisticMapData.stateBorders.forEach(borderCoords => {
      const bPts = borderCoords.map(([lon, lat]) => geoToVector3(lat, lon, 0.25));
      const bGeo = new THREE.BufferGeometry().setFromPoints(bPts);
      const bLine = new THREE.Line(bGeo, borderMat);
      scene.add(bLine);
    });

    // 5. Realistic Rivers: Rendered as Natural Dark Riverbed Channels from Orbit
    const riversList = [];

    realisticMapData.rivers.forEach(river => {
      const pts = river.coords.map(([lon, lat]) => geoToVector3(lat, lon, 0.15));
      const curve = new THREE.CatmullRomCurve3(pts);

      // Natural river channel: Dark Prussian-blue water ribbon hugging the terrain
      const riverGeo = new THREE.TubeGeometry(curve, pts.length * 3, 0.32, 5, false);
      const naturalRiverMat = new THREE.MeshStandardMaterial({
        color: 0x0e2744,
        emissive: 0x000000, // Non-emissive by default per requirement 3!
        roughness: 0.45,
        metalness: 0.65,
        transparent: true,
        opacity: 0.88
      });
      const riverMesh = new THREE.Mesh(riverGeo, naturalRiverMat);
      riverMesh.userData = { riverId: river.id, damId: river.associatedDamId };
      scene.add(riverMesh);

      // Tributaries (e.g. Bhavani River reach)
      if (river.tributaries) {
        river.tributaries.forEach(trib => {
          const tribPts = trib.coords.map(([lon, lat]) => geoToVector3(lat, lon, 0.15));
          const tribCurve = new THREE.CatmullRomCurve3(tribPts);
          const tribGeo = new THREE.TubeGeometry(tribCurve, tribPts.length * 3, 0.28, 5, false);
          const tribMat = new THREE.MeshStandardMaterial({
            color: 0x0e2744,
            emissive: 0x000000,
            roughness: 0.45,
            metalness: 0.65,
            transparent: true,
            opacity: 0.88
          });
          const tribMesh = new THREE.Mesh(tribGeo, tribMat);
          tribMesh.userData = { riverId: river.id, damId: trib.associatedDamId };
          scene.add(tribMesh);
          riversList.push({ mesh: tribMesh, curve: tribCurve, damId: trib.associatedDamId, isTributary: true });
        });
      }

      riversList.push({ mesh: riverMesh, curve, damId: river.associatedDamId, isTributary: false });
    });

    riversDataRef.current = riversList;

    // 6. Dynamic Highlight Wave Particles for the Currently-Selected Dam's Downstream River
    const pulseCount = 35;
    const pulseGeo = new THREE.BufferGeometry();
    const pulsePositions = new Float32Array(pulseCount * 3);
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3));

    const pulseMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 2.8,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const pulseParticles = new THREE.Points(pulseGeo, pulseMat);
    scene.add(pulseParticles);

    activeRiverPulseRef.current = {
      system: pulseParticles,
      count: pulseCount,
      offsets: Array.from({ length: pulseCount }, (_, i) => i / pulseCount),
      activeCurve: null
    };

    // 7. Cartographic City & Landmark Labels for Grounding Scale
    const landmarkGroup = new THREE.Group();
    realisticMapData.landmarks.forEach(lm => {
      const pos = geoToVector3(lm.lat, lm.lon, 0.9);
      const isMajor = lm.type === 'capital' || lm.type === 'metro';
      const sprite = createLandmarkSprite(lm.name, isMajor);
      sprite.position.copy(pos);
      landmarkGroup.add(sprite);
    });
    scene.add(landmarkGroup);

    // 8. Dam Interactive 3D Markers (Tactical UI Chrome)
    const markers = [];
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);

    indiaGeo.damsMarkers.forEach(dam => {
      const pos = geoToVector3(dam.coords[0], dam.coords[1], 0.7);
      const isCurrent = selectedDam?.id === dam.id;

      const damObj = new THREE.Group();
      damObj.position.copy(pos);
      damObj.userData = { dam, isDamMarker: true };

      // Base glowing tactical pad
      const basePadGeo = new THREE.CylinderGeometry(2.4, 2.8, 0.6, 16);
      const basePadMat = new THREE.MeshStandardMaterial({
        color: isCurrent ? 0x06b6d4 : 0x0ea5e9,
        emissive: isCurrent ? 0x06b6d4 : 0x0284c7,
        emissiveIntensity: 0.95
      });
      const basePad = new THREE.Mesh(basePadGeo, basePadMat);
      damObj.add(basePad);

      // Rotating radar circle
      const ringGeo = new THREE.RingGeometry(2.8, 3.8, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isCurrent ? 0x22d3ee : 0x38bdf8,
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
        color: 0x06b6d4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
      damObj.add(pulseRing);

      // Vertical holographic tactical beam
      const beamGeo = new THREE.CylinderGeometry(0.3, 0.8, 16, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: isCurrent ? 0x06b6d4 : 0x38bdf8,
        transparent: true,
        opacity: isCurrent ? 0.8 : 0.45
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 8;
      damObj.add(beam);

      // Apex beacon sphere
      const sphereGeo = new THREE.SphereGeometry(1.2, 12, 12);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: isCurrent ? 0xffffff : 0x38bdf8,
        emissive: isCurrent ? 0x06b6d4 : 0x0284c7,
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
        onSelectDam(clickedDam);

        const damPos = geoToVector3(clickedDam.coords[0], clickedDam.coords[1], 0);
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

    // 1. Update 3D Dam Markers
    markersRef.current.forEach(m => {
      const isCurrent = m.dam.id === selectedDam.id;
      if (m.basePadMat) {
        m.basePadMat.color.setHex(isCurrent ? 0x06b6d4 : 0x0ea5e9);
        m.basePadMat.emissive.setHex(isCurrent ? 0x06b6d4 : 0x0284c7);
        m.basePadMat.emissiveIntensity = isCurrent ? 1.6 : 0.95;
      }
      if (m.sphere) {
        m.sphere.material.emissiveIntensity = isCurrent ? 2.2 : 1.2;
        m.sphere.material.color.setHex(isCurrent ? 0xffffff : 0x38bdf8);
      }
      if (m.beam) {
        m.beam.material.opacity = isCurrent ? 0.85 : 0.45;
        m.beam.material.color.setHex(isCurrent ? 0x06b6d4 : 0x38bdf8);
      }
    });

    // 2. Update Rivers: Natural dark water for all rivers, save tactical glow ONLY for active reach
    let matchedCurve = null;

    if (riversDataRef.current) {
      riversDataRef.current.forEach(r => {
        const isSelectedReach = r.damId === selectedDam.id;
        if (isSelectedReach) {
          // Tactical highlighted downstream reach
          r.mesh.material.emissive.setHex(0x06b6d4);
          r.mesh.material.emissiveIntensity = 1.6;
          r.mesh.material.color.setHex(0x22d3ee);
          r.mesh.material.opacity = 1.0;
          if (!matchedCurve || r.isTributary) {
            matchedCurve = r.curve;
          }
        } else {
          // Natural dark satellite river channel (non-emissive)
          r.mesh.material.emissive.setHex(0x000000);
          r.mesh.material.emissiveIntensity = 0.0;
          r.mesh.material.color.setHex(0x0e2744);
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

  // Zoom into specific Dam Basin
  const handleZoomDam = (dam) => {
    onSelectDam(dam);
    const damPos = geoToVector3(dam.coords[0], dam.coords[1], 0);
    cameraTargetRef.current = {
      camPos: new THREE.Vector3(damPos.x + 16, damPos.y + 38, damPos.z + 36),
      lookAt: new THREE.Vector3(damPos.x, damPos.y + 3, damPos.z),
      progress: 0
    };
    setIsZooming(true);
  };

  return (
    <div className="w-full relative overflow-hidden rounded-2xl border border-cyan-900/50 bg-[#060a13] shadow-2xl">
      {/* 3D Canvas Mount Point */}
      <div 
        ref={mountRef} 
        style={{ width: '100%', height: '540px', minHeight: '480px' }}
        className="w-full h-[540px] cursor-grab active:cursor-grabbing" 
      />

      {/* Top Left HUD Telemetry Overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
        <div className="bg-[#091120]/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-cyan-800/60 shadow-xl flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <div className="font-mono text-xs">
            <span className="text-cyan-400 font-bold tracking-wider">
              REAL SRTM 30m ELEVATION • ESRI SATELLITE SENSING
            </span>
            <span className="text-slate-400 text-[10px] block">
              PHOTOREALISTIC DISPLACED RELIEF • NATURAL MEANDER RIVERBEDS
            </span>
          </div>
        </div>

        {/* Selected Dam Chip */}
        <div className="bg-[#0b162c]/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 text-[11px] font-mono flex items-center gap-3">
          <span className="text-slate-400">ACTIVE BASIN:</span>
          <span className="text-cyan-300 font-semibold">{selectedDam?.river || 'Cauvery'}</span>
          <span className="text-slate-600">|</span>
          <span className="text-amber-300 font-semibold">{selectedDam?.name || 'Bhavanisagar'}</span>
        </div>
      </div>

      {/* Top Right Tactical Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={handleResetView}
          title="Reset to Subcontinent Overview"
          className="bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span>SUBCONTINENT VIEW</span>
        </button>

        {selectedDam && (
          <button
            onClick={() => handleZoomDam(selectedDam)}
            title="Focus Camera onto Selected Basin"
            className="bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/80 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>ZOOM TO BASIN</span>
          </button>
        )}
      </div>

      {/* Floating 3D Hover Info Card */}
      {hudPos.visible && hoveredDam && (
        <div
          style={{
            left: `${Math.min(window.innerWidth - 320, Math.max(20, hudPos.x + 18))}px`,
            top: `${Math.min(460, Math.max(20, hudPos.y - 70))}px`,
          }}
          className="absolute z-20 pointer-events-none w-72 bg-[#091224]/95 backdrop-blur-xl border border-cyan-500/60 rounded-xl p-3 shadow-2xl shadow-cyan-950/60 space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
            <div>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                {hoveredDam.state}
              </span>
              <h4 className="font-display font-bold text-sm text-white mt-1">
                {hoveredDam.name}
              </h4>
            </div>
            <span 
              style={{ backgroundColor: `${hoveredDam.riskColor}25`, color: hoveredDam.riskColor, borderColor: hoveredDam.riskColor }}
              className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border"
            >
              {hoveredDam.riskLevel}
            </span>
          </div>

          {damImages[hoveredDam.id] && (
            <div className="h-24 rounded-lg overflow-hidden relative border border-slate-800">
              <img
                src={damImages[hoveredDam.id].imageUrl}
                alt={hoveredDam.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 right-1 bg-black/75 px-1.5 py-0.5 rounded text-[8px] font-mono text-cyan-300">
                Wikimedia Commons
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[9px]">RIVER</span>
              <span className="text-slate-200 font-bold truncate block">{hoveredDam.river}</span>
            </div>
            <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[9px]">STORAGE (FRL)</span>
              <span className="text-cyan-400 font-bold">{hoveredDam.capacityMm3} Mm³</span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-cyan-400 flex items-center justify-between pt-1">
            <span>Click marker to focus basin</span>
            <ArrowRight className="w-3 h-3 animate-pulse" />
          </div>
        </div>
      )}

      {/* Bottom Bar: Interactive Dam Selection Chips & Photorealistic Legend */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-3 bg-[#081020]/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800/90 shadow-2xl">
        {/* Dam Quick-Select Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-mono text-slate-400 uppercase hidden sm:inline">
            SELECT DAM:
          </span>
          {indiaGeo.damsMarkers.map((dam) => {
            const isSelected = selectedDam?.id === dam.id;
            return (
              <button
                key={dam.id}
                onClick={() => handleZoomDam(dam)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/30'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span 
                  className={`w-2 h-2 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-cyan-400'}`} 
                />
                <span>{dam.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Legend & Action Button */}
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-mono text-slate-400 hidden xl:flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-1 bg-[#0e2744] border border-slate-600 inline-block" /> Natural Riverbed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-1 bg-cyan-400 inline-block" /> Active Surge Reach
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Dam Beacon
            </span>
          </div>

          <button
            onClick={onProceedToBreach}
            className="btn btn-primary text-xs font-semibold px-4 py-2 shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <span>Proceed to Breach Scenario</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
