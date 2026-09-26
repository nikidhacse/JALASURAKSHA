import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function ThreeTerrainTwin({
  dam,
  rasterData = null,
  simulationState,
  breachInfo,
  cameraPreset = 'overview'
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const terrainMeshRef = useRef(null);
  const terrainGeoRef = useRef(null);
  const waterMeshRef = useRef(null);
  const waterGeoRef = useRef(null);
  const waterMatRef = useRef(null);
  const sprayParticlesRef = useRef(null);
  const sprayPositionsRef = useRef(null);
  const sprayVelocitiesRef = useRef(null);
  const sprayLifetimesRef = useRef(null);

  const gridW = 64;
  const gridH = 128;
  const terrainWidth = 400;
  const terrainHeight = 600;

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 850;
    const height = container.clientHeight || 520;

    // 1. Three.js Scene, Camera, WebGL Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060b14);
    scene.fog = new THREE.FogExp2(0x060b14, 0.0026);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(48, width / height, 1, 3000);
    camera.position.set(0, 240, 310);
    camera.lookAt(0, -10, -70);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // OrbitControls for interactive navigation
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 30;
    controls.maxDistance = 650;
    controls.target.set(0, -10, -70);
    controlsRef.current = controls;

    // 2. Tactical Atmosphere Lighting
    const ambientLight = new THREE.AmbientLight(0x94a3b8, 1.1);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    sunLight.position.set(160, 320, 110);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const redBeacon = new THREE.PointLight(0xef4444, 3.2, 400);
    redBeacon.position.set(0, 56, 110);
    scene.add(redBeacon);

    // 3. Terrain Heightmap Mesh from DEM
    const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainHeight, gridW - 1, gridH - 1);
    terrainGeo.rotateX(-Math.PI / 2);

    const tPos = terrainGeo.attributes.position;
    for (let i = 0; i < tPos.count; i++) {
      const x = tPos.getX(i);
      const z = tPos.getZ(i);

      // Baseline slope dropping from reservoir (z = 150) to downstream (z = -300)
      const valleyCenter = Math.sin(z * 0.015) * 45;
      const distFromValley = Math.abs(x - valleyCenter);
      const baseSlope = (150 - z) * 0.12;
      const ridgeHeight = Math.pow(Math.min(distFromValley / 70, 1), 2) * 85;
      const noise = (Math.sin(x * 0.05) + Math.cos(z * 0.05)) * 6;

      let y = baseSlope + ridgeHeight + noise;
      if (distFromValley < 30) {
        y -= (30 - distFromValley) * 1.2;
      }
      tPos.setY(i, y);
    }
    terrainGeo.computeVertexNormals();
    terrainGeoRef.current = terrainGeo;

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x172133,
      roughness: 0.88,
      metalness: 0.14,
      flatShading: true
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);
    terrainMeshRef.current = terrainMesh;

    // Muted reservoir teal wireframe contour overlay
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x4a9d7f,
      wireframe: true,
      transparent: true,
      opacity: 0.08
    });
    const wireMesh = new THREE.Mesh(terrainGeo, wireMat);
    wireMesh.position.y += 0.4;
    scene.add(wireMesh);

    // 4. Dam Barrier Structure
    const damGeo = new THREE.BoxGeometry(160, 48, 25);
    const damMat = new THREE.MeshStandardMaterial({
      color: 0x24352b,
      roughness: 0.75,
      metalness: 0.2
    });
    const damMesh = new THREE.Mesh(damGeo, damMat);
    damMesh.position.set(0, 42, 110);
    damMesh.castShadow = true;
    scene.add(damMesh);

    // Breach opening cutout
    const breachWidth = Number(breachInfo?.breachWidthM || 100);
    const breachWidth3D = Math.min(90, Math.max(20, breachWidth * 0.25));
    const breachGeo = new THREE.BoxGeometry(breachWidth3D, 50, 27);
    const breachMat = new THREE.MeshStandardMaterial({
      color: 0x0a140e,
      roughness: 0.95
    });
    const breachMesh = new THREE.Mesh(breachGeo, breachMat);
    breachMesh.position.set(0, 42, 110);
    scene.add(breachMesh);

    // 5. Dynamic Water Flood Surface with Fresnel / Reflective Shader (Earthy Reservoir Palette)
    const waterGeo = new THREE.PlaneGeometry(terrainWidth, terrainHeight, gridW - 1, gridH - 1);
    waterGeo.rotateX(-Math.PI / 2);

    const wPos = waterGeo.attributes.position;
    const aDepth = new Float32Array(gridW * gridH);
    const aVelocity = new Float32Array(gridW * gridH);

    for (let i = 0; i < gridW * gridH; i++) {
      wPos.setY(i, tPos.getY(i) - 25.0);
      aDepth[i] = 0.0;
      aVelocity[i] = 0.0;
    }
    waterGeo.setAttribute('aDepth', new THREE.BufferAttribute(aDepth, 1));
    waterGeo.setAttribute('aVelocity', new THREE.BufferAttribute(aVelocity, 1));
    waterGeo.computeVertexNormals();
    waterGeoRef.current = waterGeo;

    // Custom Fresnel & Reflective Water Shader (Reservoir Water Teal-Green)
    const waterShader = {
      uniforms: {
        uTime: { value: 0.0 },
        uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
        uSunColor: { value: new THREE.Color(0xd7eee1) },
        uSkyColor: { value: new THREE.Color(0x8ecbb4) },
        uDeepWaterColor: { value: new THREE.Color(0x0c2720) },
        uMidWaterColor: { value: new THREE.Color(0x215c4d) },
        uShallowWaterColor: { value: new THREE.Color(0x4a9d7f) },
        uFoamColor: { value: new THREE.Color(0xf2faf5) }
      },
      vertexShader: `
        attribute float aDepth;
        attribute float aVelocity;
        varying float vDepth;
        varying float vVelocity;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;
        uniform float uTime;

        void main() {
          vDepth = aDepth;
          vVelocity = aVelocity;

          vec3 transformed = position;
          if (aDepth > 0.05) {
            // Dynamic wave ripple displacement along current
            float wave = sin(position.x * 0.18 + uTime * 3.2) * cos(position.z * 0.12 + uTime * 2.4) * min(0.65, aVelocity * 0.14);
            transformed.y += wave;
          }

          vec4 worldPos = modelMatrix * vec4(transformed, 1.0);
          vWorldPos = worldPos.xyz;
          vNormal = normalize(mat3(modelMatrix) * normal);
          vViewDir = normalize(cameraPosition - worldPos.xyz);

          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying float vDepth;
        varying float vVelocity;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;

        uniform float uTime;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uSkyColor;
        uniform vec3 uDeepWaterColor;
        uniform vec3 uMidWaterColor;
        uniform vec3 uShallowWaterColor;
        uniform vec3 uFoamColor;

        void main() {
          if (vDepth < 0.02) {
            discard;
          }

          // 1. Depth-Based Water Color Gradient
          vec3 waterColor;
          if (vDepth > 3.0) {
            waterColor = mix(uMidWaterColor, uDeepWaterColor, smoothstep(3.0, 8.0, vDepth));
          } else if (vDepth > 1.0) {
            waterColor = mix(uShallowWaterColor, uMidWaterColor, smoothstep(1.0, 3.0, vDepth));
          } else {
            waterColor = uShallowWaterColor;
          }

          // 2. High-Velocity Foam & White Water Crests
          float foamFactor = smoothstep(2.0, 5.5, vVelocity);
          float rippleFoam = (sin(vWorldPos.z * 0.6 + uTime * 5.0) > 0.65) ? 0.25 : 0.0;
          foamFactor = clamp(foamFactor + rippleFoam, 0.0, 1.0);
          vec3 baseFluid = mix(waterColor, uFoamColor, foamFactor * 0.85);

          // 3. Fresnel Reflectance (Glancing angles reflect sky & sunlight)
          float cosTheta = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
          float fresnel = pow(1.0 - cosTheta, 3.2);
          vec3 reflected = mix(baseFluid, uSkyColor, fresnel * 0.75);

          // 4. Specular Sunlight Glisten
          vec3 halfVec = normalize(uSunDir + vViewDir);
          float spec = pow(max(0.0, dot(vNormal, halfVec)), 32.0);
          vec3 finalColor = reflected + uSunColor * (spec * 0.6);

          // Alpha transparency based on water depth
          float alpha = clamp(vDepth * 0.45 + 0.42, 0.0, 0.94);
          gl_FragColor = vec4(finalColor, alpha);
        }
      `
    };

    const waterMat = new THREE.ShaderMaterial({
      uniforms: waterShader.uniforms,
      vertexShader: waterShader.vertexShader,
      fragmentShader: waterShader.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    });
    waterMatRef.current = waterMat;

    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    scene.add(waterMesh);
    waterMeshRef.current = waterMesh;

    // 6. Breach Point High-Energy Turbulence & Aerated Spray Particle System
    const sprayCount = 1200;
    const sprayGeo = new THREE.BufferGeometry();
    const sprayPositions = new Float32Array(sprayCount * 3);
    const sprayVelocities = new Float32Array(sprayCount * 3);
    const sprayLifetimes = new Float32Array(sprayCount);
    const sprayColors = new Float32Array(sprayCount * 3);

    for (let i = 0; i < sprayCount; i++) {
      // Erupt from dam breach opening at (0, 42, 110)
      sprayPositions[i * 3] = (Math.random() - 0.5) * (breachWidth3D * 0.8);
      sprayPositions[i * 3 + 1] = 42 + (Math.random() - 0.5) * 8;
      sprayPositions[i * 3 + 2] = 110 + (Math.random() - 0.5) * 6;

      // Downstream velocity burst (-Z direction) + turbulent spread
      sprayVelocities[i * 3] = (Math.random() - 0.5) * 28;
      sprayVelocities[i * 3 + 1] = Math.random() * 20 + 4;
      sprayVelocities[i * 3 + 2] = -(Math.random() * 55 + 20);

      sprayLifetimes[i] = Math.random();

      // White aerated spray colors
      sprayColors[i * 3] = 0.92;
      sprayColors[i * 3 + 1] = 0.98;
      sprayColors[i * 3 + 2] = 1.0;
    }

    sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPositions, 3));
    sprayGeo.setAttribute('color', new THREE.BufferAttribute(sprayColors, 3));

    const sprayMat = new THREE.PointsMaterial({
      size: 3.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    const sprayParticles = new THREE.Points(sprayGeo, sprayMat);
    scene.add(sprayParticles);
    sprayParticlesRef.current = sprayParticles;
    sprayPositionsRef.current = sprayPositions;
    sprayVelocitiesRef.current = sprayVelocities;
    sprayLifetimesRef.current = sprayLifetimes;

    // 7. Settlement Infrastructure Pins
    if (dam.settlements) {
      dam.settlements.slice(0, 4).forEach((s, idx) => {
        const zPos = 70 - idx * 110;
        const xPos = Math.sin(zPos * 0.015) * 45 + (idx % 2 === 0 ? 25 : -25);

        const pinGeo = new THREE.CylinderGeometry(2, 6, 12, 8);
        const pinMat = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0x991b1b,
          roughness: 0.3
        });
        const pin = new THREE.Mesh(pinGeo, pinMat);
        pin.position.set(xPos, 32 - idx * 6, zPos);
        scene.add(pin);
      });
    }

    // 8. Animation Render Loop
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Update Water Shader Uniforms
      if (waterMatRef.current) {
        waterMatRef.current.uniforms.uTime.value = elapsed;
      }

      // Update Turbulent Breach Spray Particle System
      if (sprayParticlesRef.current && sprayPositionsRef.current && sprayVelocitiesRef.current) {
        const pPos = sprayPositionsRef.current;
        const pVel = sprayVelocitiesRef.current;
        const pLife = sprayLifetimesRef.current;

        // Turbulence intensity: scales with peak breach outflow & early minutes
        const currentMin = simulationState?.currentSimMinute || 20;
        const dischargeFactor = Math.max(0.3, Math.min(1.5, (breachInfo?.peakOutflowM3s || 8000) / 10000));
        const earlyPhaseFactor = currentMin <= 30 ? 1.4 : Math.max(0.25, 1.0 - (currentMin - 30) / 60);
        const turbulenceMultiplier = dischargeFactor * earlyPhaseFactor;

        for (let i = 0; i < sprayCount; i++) {
          pLife[i] += delta * (0.8 + turbulenceMultiplier * 0.4);

          // Gravity effect
          pVel[i * 3 + 1] -= 9.8 * delta * 2.2;

          pPos[i * 3] += pVel[i * 3] * delta;
          pPos[i * 3 + 1] += pVel[i * 3 + 1] * delta;
          pPos[i * 3 + 2] += pVel[i * 3 + 2] * delta * (1.0 + turbulenceMultiplier * 0.5);

          // Reset when particle lifetime ends or drops below riverbed
          if (pLife[i] > 1.0 || pPos[i * 3 + 1] < -10 || pPos[i * 3 + 2] < -280) {
            pLife[i] = 0.0;
            pPos[i * 3] = (Math.random() - 0.5) * (breachWidth3D * 0.9);
            pPos[i * 3 + 1] = 40 + Math.random() * 8;
            pPos[i * 3 + 2] = 110 + (Math.random() - 0.5) * 6;

            pVel[i * 3] = (Math.random() - 0.5) * (24 * turbulenceMultiplier);
            pVel[i * 3 + 1] = (Math.random() * 22 + 6) * turbulenceMultiplier;
            pVel[i * 3 + 2] = -(Math.random() * 50 + 20) * turbulenceMultiplier;
          }
        }

        sprayParticlesRef.current.geometry.attributes.position.needsUpdate = true;
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
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [dam, breachInfo]);

  // Real 2D Raster Integration: Depth & Velocity Grids from Backend
  useEffect(() => {
    if (!waterGeoRef.current || !terrainGeoRef.current) return;

    const wPos = waterGeoRef.current.attributes.position;
    const tPos = terrainGeoRef.current.attributes.position;
    const aDepth = waterGeoRef.current.attributes.aDepth.array;
    const aVelocity = waterGeoRef.current.attributes.aVelocity.array;

    if (rasterData?.depth_grid && rasterData.depth_grid.length > 0) {
      const dGrid = rasterData.depth_grid;
      const vGrid = rasterData.velocity_grid || [];
      const eGrid = rasterData.elevation_grid || [];

      const rows = dGrid.length;
      const cols = dGrid[0].length;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          if (idx >= wPos.count) continue;

          // 1. Terrain elevation from DEM raster
          let yTerr = tPos.getY(idx);
          if (eGrid.length > r && eGrid[r].length > c) {
            const demM = eGrid[r][c];
            yTerr = (demM - 220.0) * 0.45;
            tPos.setY(idx, yTerr);
          }

          // 2. Depth & Velocity values from current timestep
          const depthM = dGrid[r][c];
          const velM = vGrid.length > r && vGrid[r].length > c ? vGrid[r][c] : 0.0;

          aDepth[idx] = depthM;
          aVelocity[idx] = velM;

          if (depthM > 0.04) {
            // Water elevation above terrain
            wPos.setY(idx, yTerr + Math.max(1.1, depthM * 0.85));
          } else {
            // Unflooded: hide below terrain surface
            wPos.setY(idx, yTerr - 20.0);
          }
        }
      }

      tPos.needsUpdate = true;
      wPos.needsUpdate = true;
      waterGeoRef.current.attributes.aDepth.needsUpdate = true;
      waterGeoRef.current.attributes.aVelocity.needsUpdate = true;
      waterGeoRef.current.computeVertexNormals();
      terrainGeoRef.current.computeVertexNormals();
    }
  }, [rasterData]);

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl border border-slate-800 bg-[#0d1410] shadow-2xl">
      <div ref={mountRef} style={{ width: '100%', height: '460px', minHeight: '440px' }} className="w-full h-[460px] cursor-grab active:cursor-grabbing" />

      {/* 3D Overlays */}
      <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-800/60 text-[11px] font-mono text-cyan-400 flex items-center gap-2 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span>FRESNEL REFLECTIVE WATER SHADER • BREACH TURBULENCE FIELD</span>
      </div>

      <div className="absolute top-3 right-3 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400">
        <span>Orbit Controls: Drag to Rotate • Pinch/Scroll to Zoom</span>
      </div>

      <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md px-3.5 py-2 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 flex items-center gap-4 shadow-lg flex-wrap">
        <span>Dam: <b className="text-slate-100">{dam.name.split(' ')[0]}</b></span>
        <span>Timeline: <b className="text-cyan-400">T+{rasterData?.timestep_min ?? simulationState?.currentSimMinute ?? 0}m</b></span>
        <span>Max Depth: <b className="text-cyan-300">{rasterData?.max_depth_m ?? 0.0}m</b></span>
        <span>Peak Vel: <b className="text-amber-400">{rasterData?.max_velocity_ms ?? 0.0}m/s</b></span>
        <span>Inundated: <b className="text-emerald-400">{rasterData?.flooded_area_km2 ?? 0.0} km²</b></span>
      </div>
    </div>
  );
}
