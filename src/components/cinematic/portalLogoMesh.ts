import { Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, TextureLoader } from 'three';
import { smoothRange } from './cinematicMotion';

/** One independently loaded plane; a failed logo must never suspend the movie. */
export function createPortalLogo(url: string, invalidate: () => void) {
  const material = new MeshBasicMaterial({
    transparent: true, opacity: 0, depthWrite: false, alphaTest: .005,
    toneMapped: false, fog: false,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  mesh.name = 'Published festival logo';
  mesh.position.set(0, 4.08, -75.68);
  mesh.renderOrder = 1;
  mesh.visible = false;
  let disposed = false, loaded = false;
  const texture = new TextureLoader().setCrossOrigin('anonymous').load(url, loadedTexture => {
    if (disposed) return;
    const image = loadedTexture.image;
    const width = image?.naturalWidth || image?.width || 1;
    const height = image?.naturalHeight || image?.height || 1;
    const scale = Math.min(2.7 / width, 2.7 / height);
    mesh.scale.set(width * scale, height * scale, 1);
    loadedTexture.colorSpace = SRGBColorSpace;
    material.map = loadedTexture;
    material.needsUpdate = true;
    loaded = true;
    invalidate();
  }, undefined, () => { if (!disposed) invalidate(); });

  return {
    mesh,
    update(progress: number) {
      material.opacity = smoothRange(.08, .45, progress) * (1 - smoothRange(.76, .86, progress));
      mesh.visible = loaded && material.opacity > .001;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      texture.dispose();
      material.map = null;
      material.dispose();
      mesh.geometry.dispose();
      mesh.removeFromParent();
    },
  };
}
