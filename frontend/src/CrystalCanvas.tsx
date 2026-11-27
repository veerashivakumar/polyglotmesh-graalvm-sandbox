import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/** Tracks mesh geometries and materials so shared instances are disposed once. */
export function trackMeshResources() {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const listMaterials = (material: THREE.Material | THREE.Material[]) => (Array.isArray(material) ? material : [material]);
  return {
    own(mesh: THREE.Mesh) {
      geometries.add(mesh.geometry);
      listMaterials(mesh.material).forEach((material) => materials.add(material));
    },
    release(mesh: THREE.Mesh) {
      if (geometries.delete(mesh.geometry)) mesh.geometry.dispose();
      listMaterials(mesh.material).forEach((material) => {
        if (materials.delete(material)) material.dispose();
      });
    },
    disposeRemaining() {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      geometries.clear();
      materials.clear();
    },
  };
}

/** Three.js port of the reference runtime crystal, with deterministic teardown. */
export function CrystalCanvas({ pulseKey }: { pulseKey: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneApi = useRef<{ pulse: () => void } | undefined>(undefined);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 7.2;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xfde6d8, 1.25));
    const peachLight = new THREE.PointLight(0xfdba74, 2.6, 20);
    peachLight.position.set(4, 3, 5);
    scene.add(peachLight);
    const lavenderLight = new THREE.PointLight(0xc084fc, 2.8, 20);
    lavenderLight.position.set(-4, -2, 5);
    scene.add(lavenderLight);

    const resources = trackMeshResources();
    const crystalGroup = new THREE.Group();
    scene.add(crystalGroup);
    const crystalMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xeef2ff, emissive: 0xd8b4fe, emissiveIntensity: 0.25,
      roughness: 0.12, metalness: 0.15, clearcoat: 1, transparent: true, opacity: 0.94,
    });
    const mainStar = new THREE.Group();
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.35, 0), crystalMaterial);
    mainStar.add(core);
    resources.own(core);
    const spikeGeometry = new THREE.OctahedronGeometry(0.55, 0);
    const verticalSpike = new THREE.Mesh(spikeGeometry, crystalMaterial);
    verticalSpike.scale.set(0.65, 3.3, 0.65);
    const horizontalSpike = new THREE.Mesh(spikeGeometry, crystalMaterial);
    horizontalSpike.scale.set(3.3, 0.65, 0.65);
    mainStar.add(verticalSpike, horizontalSpike);
    resources.own(verticalSpike);
    resources.own(horizontalSpike);
    const wireframe = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.42, 0),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, wireframe: true, transparent: true, opacity: 0.32 }),
    );
    mainStar.add(wireframe);
    resources.own(wireframe);
    crystalGroup.add(mainStar);

    const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.022, 16, 100), new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.42 }));
    ringA.rotation.x = Math.PI / 2.4;
    crystalGroup.add(ringA);
    resources.own(ringA);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.85, 0.018, 16, 100), new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.38 }));
    ringB.rotation.x = -Math.PI / 3;
    crystalGroup.add(ringB);
    resources.own(ringB);

    const gemGeometry = new THREE.OctahedronGeometry(0.26, 0);
    const satellites = [0x4f46e5, 0xf97316, 0x9333ea].map((color) => new THREE.Mesh(gemGeometry, new THREE.MeshStandardMaterial({ color, roughness: 0.2 })));
    satellites[0].position.set(2.35, 0.2, 0);
    satellites[1].position.set(-1.4, -0.4, 2.2);
    satellites[2].position.set(-0.8, 0.5, -2.3);
    satellites.forEach((gem) => {
      crystalGroup.add(gem);
      resources.own(gem);
    });
    const ripples: { mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; scale: number; opacity: number }[] = [];
    let spinBoost = 1;
    let targetRotX = 0.2;
    let targetRotY = 0;
    let dragging = false;
    let previousX = 0;
    let previousY = 0;
    let frame = 0;
    let disposed = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const releaseRipple = (mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>) => {
      crystalGroup.remove(mesh);
      resources.release(mesh);
    };
    const clearRipples = () => {
      while (ripples.length > 0) {
        const ripple = ripples.pop();
        if (ripple) releaseRipple(ripple.mesh);
      }
    };
    const pulse = () => {
      if (reducedMotion.matches || disposed) return;
      spinBoost = 3.2;
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(1.4, 1.52, 64),
        new THREE.MeshBasicMaterial({ color: 0x6366f1, side: THREE.DoubleSide, transparent: true, opacity: 0.75 }),
      );
      mesh.rotation.x = (Math.random() - 0.5) * 1.2;
      mesh.rotation.y = (Math.random() - 0.5) * 1.2;
      crystalGroup.add(mesh);
      resources.own(mesh);
      ripples.push({ mesh, scale: 1, opacity: 0.75 });
    };
    sceneApi.current = { pulse };

    const pointerDown = (event: PointerEvent) => {
      dragging = true;
      previousX = event.clientX;
      previousY = event.clientY;
      pulse();
    };
    const pointerMove = (event: PointerEvent) => {
      if (dragging) {
        targetRotY += (event.clientX - previousX) * 0.012;
        targetRotX += (event.clientY - previousY) * 0.012;
        previousX = event.clientX;
        previousY = event.clientY;
        if (reducedMotion.matches) {
          crystalGroup.rotation.y = targetRotY;
          crystalGroup.rotation.x = targetRotX;
          renderer.render(scene, camera);
        }
      } else if (!reducedMotion.matches) {
        targetRotY = ((event.clientX / window.innerWidth) * 2 - 1) * 0.45;
        targetRotX = ((event.clientY / window.innerHeight) * 2 - 1) * 0.32;
      }
    };
    const pointerUp = () => { dragging = false; };
    host.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointercancel', pointerUp);

    const stopLoop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const start = performance.now();
    function animate(now: number) {
      if (disposed || document.hidden) return;
      if (reducedMotion.matches) {
        clearRipples();
        renderer.render(scene, camera);
        return;
      }
      const t = (now - start) / 1000;
      spinBoost += (1 - spinBoost) * 0.05;
      crystalGroup.rotation.y += (targetRotY - crystalGroup.rotation.y) * 0.07;
      crystalGroup.rotation.x += (targetRotX - crystalGroup.rotation.x) * 0.07;
      mainStar.rotation.y += 0.008 * spinBoost;
      mainStar.position.y = Math.sin(t * 2.2) * 0.12;
      ringA.rotation.z += 0.006 * spinBoost;
      ringB.rotation.z -= 0.005 * spinBoost;
      satellites[0].position.set(Math.cos(t * 1.4) * 2.35, Math.sin(t * 1.1) * 0.7, Math.sin(t * 1.4) * 2.35);
      satellites[1].position.set(Math.cos(t * 1.4 + 2.1) * 2.85, -Math.sin(t * 1.2) * 0.8, Math.sin(t * 1.4 + 2.1) * 2.85);
      satellites[2].position.set(Math.cos(t * 1.4 + 4.2) * 2.55, Math.cos(t * 1.3) * 0.75, Math.sin(t * 1.4 + 4.2) * 2.55);
      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        const ripple = ripples[i];
        ripple.scale += 0.07;
        ripple.opacity -= 0.025;
        ripple.mesh.scale.set(ripple.scale, ripple.scale, 1);
        ripple.mesh.material.opacity = Math.max(0, ripple.opacity);
        if (ripple.opacity <= 0) {
          releaseRipple(ripple.mesh);
          ripples.splice(i, 1);
        }
      }
      renderer.render(scene, camera);
      if (!disposed && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(animate);
    }
    const startLoop = () => {
      if (disposed) return;
      stopLoop();
      if (document.hidden || reducedMotion.matches) {
        if (reducedMotion.matches) clearRipples();
        renderer.render(scene, camera);
        return;
      }
      frame = requestAnimationFrame(animate);
    };
    const onVisibility = () => startLoop();
    const onMotionChange = () => startLoop();
    document.addEventListener('visibilitychange', onVisibility);
    reducedMotion.addEventListener('change', onMotionChange);
    startLoop();
    pulse();

    return () => {
      disposed = true;
      stopLoop();
      observer.disconnect();
      host.removeEventListener('pointerdown', pointerDown);
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('pointercancel', pointerUp);
      document.removeEventListener('visibilitychange', onVisibility);
      reducedMotion.removeEventListener('change', onMotionChange);
      sceneApi.current = undefined;
      clearRipples();
      resources.disposeRemaining();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => { sceneApi.current?.pulse(); }, [pulseKey]);
  return <div ref={hostRef} className="pm-crystal-canvas" role="img" aria-label="Interactive 3D iridescent runtime crystal. Drag to rotate; move the pointer to influence its orientation." />;
}
