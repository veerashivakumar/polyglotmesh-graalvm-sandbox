import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { trackMeshResources } from './CrystalCanvas';

describe('trackMeshResources', () => {
  it('disposes a shared geometry and material once', () => {
    const resources = trackMeshResources();
    const geometry = new THREE.OctahedronGeometry(0.5, 0);
    const material = new THREE.MeshBasicMaterial();
    let geometryDisposals = 0;
    let materialDisposals = 0;
    const originalGeometryDispose = geometry.dispose.bind(geometry);
    const originalMaterialDispose = material.dispose.bind(material);
    geometry.dispose = () => { geometryDisposals += 1; originalGeometryDispose(); };
    material.dispose = () => { materialDisposals += 1; originalMaterialDispose(); };

    resources.own(new THREE.Mesh(geometry, material));
    resources.own(new THREE.Mesh(geometry, material));
    resources.disposeRemaining();
    resources.disposeRemaining();

    expect(geometryDisposals).toBe(1);
    expect(materialDisposals).toBe(1);
  });

  it('releases a pulse mesh immediately and leaves shared resources for final cleanup', () => {
    const resources = trackMeshResources();
    const shared = new THREE.OctahedronGeometry(0.2, 0);
    const sharedMaterial = new THREE.MeshStandardMaterial();
    const pulseGeometry = new THREE.RingGeometry(1.4, 1.52, 8);
    const pulseMaterial = new THREE.MeshBasicMaterial();
    let sharedDisposals = 0;
    let pulseDisposals = 0;
    const originalShared = shared.dispose.bind(shared);
    const originalPulse = pulseGeometry.dispose.bind(pulseGeometry);
    shared.dispose = () => { sharedDisposals += 1; originalShared(); };
    pulseGeometry.dispose = () => { pulseDisposals += 1; originalPulse(); };

    resources.own(new THREE.Mesh(shared, sharedMaterial));
    const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
    resources.own(pulse);
    resources.release(pulse);
    resources.disposeRemaining();

    expect(pulseDisposals).toBe(1);
    expect(sharedDisposals).toBe(1);
  });
});
