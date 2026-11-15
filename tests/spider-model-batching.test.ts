import { InstancedMesh, Matrix4, Mesh, Raycaster, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createSpiderModel } from '../src/components/ui/spider/spiderModel';

describe('spider leg draw batching', () => {
  it('renders all 88 articulated leg pieces in five batches with 28 visible meshes overall', () => {
    const model = createSpiderModel();
    const visible: Mesh[] = [];
    model.root.traverseVisible(object => { if (object instanceof Mesh) visible.push(object); });
    const batches = visible.filter((object): object is InstancedMesh => object instanceof InstancedMesh);
    expect(batches).toHaveLength(5);
    expect(batches.reduce((sum, batch) => sum + batch.count, 0)).toBe(88);
    expect(visible).toHaveLength(28);
    expect(model.root.getObjectByName('leg--1-0-segment-0')?.visible).toBe(false);
    model.dispose();
  });

  it('uploads changing root-local poses without applying parent rotation twice', () => {
    const model = createSpiderModel();
    const batch = model.root.getObjectByName('gold-leg-segment-instances') as InstancedMesh;
    const original = model.legs[0].segments[0];
    const before = new Matrix4(); batch.getMatrixAt(0, before);
    model.update(.4, .3);
    model.root.rotation.y = 1.2; model.root.position.set(2, 3, 4); model.root.updateMatrixWorld(true);
    const instance = new Matrix4(); batch.getMatrixAt(0, instance);
    expect(instance.equals(before)).toBe(false);
    instance.elements.forEach((value, index) => expect(value).toBeCloseTo(original.matrix.elements[index], 6));
    const renderedWorld = new Matrix4().multiplyMatrices(batch.matrixWorld, instance);
    renderedWorld.elements.forEach((value, index) => expect(value).toBeCloseTo(original.matrixWorld.elements[index], 6));
    model.dispose();
  });

  it('keeps instanced moving feet pickable using the original named part', () => {
    const model = createSpiderModel(); model.update(.6, 0);
    model.root.rotation.y = .8; model.root.updateMatrixWorld(true);
    const foot = model.legs[0].segments[2];
    const target = foot.getWorldPosition(new Vector3());
    const ray = new Raycaster(target.clone().add(new Vector3(0, 6, 0)), new Vector3(0, -1, 0));
    const hits = ray.intersectObject(model.root, true);
    expect(hits.some(hit => hit.object === foot && hit.instanceId !== undefined)).toBe(true);
    model.dispose();
  });
});
