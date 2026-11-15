"""RICORRENZA editable cinematic asset handoff, Blender 4.2+.

First rebuild the original, rigged character:
    node scripts/generate-cinematic-character.mjs
Then run (Blender must be installed separately):
    blender --background --python scripts/blender-cinematic-assets.py -- --output /tmp/rico-assets

The JS source is the authoritative character geometry/rig/Walk/Idle generator.
This script imports that generated original rig for refinement, builds an editable
floating campus, gothic gate and portal kit, and exports separate GLBs and .blend.
The runtime currently constructs its environment/energy shader in React Three Fiber;
the environment exports below are optional artist handoff assets, not runtime deps.

Art direction: original faceted gate warden, emerald cloth, obsidian armor, antique
gold. This is a stylized base mesh and procedural animation, not photoreal character
sculpture, mocap, cloth simulation, or an architectural survey of IQ City.
"""
import argparse
import math
import pathlib
import random
import sys

import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--output', default='/tmp/ricorrenza-cinematic-assets')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
output = pathlib.Path(args.output).expanduser().resolve()
output.mkdir(parents=True, exist_ok=True)
project = pathlib.Path(__file__).resolve().parents[1]
source = project / 'public/models/cinematic/warden-v2.glb'
if not source.exists():
    raise FileNotFoundError('Run node scripts/generate-cinematic-character.mjs first: ' + str(source))

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    if collection.name != 'Collection' and collection.users == 0:
        bpy.data.collections.remove(collection)
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.render.fps = 30
bpy.context.scene.frame_start = 0
bpy.context.scene.frame_end = 36


def material(name, color, metallic=0.0, roughness=0.5, emission=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*color, 1)
        bsdf.inputs['Emission Strength'].default_value = emission
    return mat


stone = material('Weathered emerald slate', (0.025, 0.085, 0.063), .22, .83)
gold = material('Aged metallic gold', (.48, .31, .09), .87, .31)
glass = material('Dark green glazing', (.02, .115, .08), .62, .22)
energy = material('Emerald energy', (.075, 1.0, .36), .15, .3, 3)
window = material('Warm campus windows', (.55, .39, .13), .2, .4, .7)


def collection(name):
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col


def place(obj, col, name, mat):
    obj.name = name
    for previous in list(obj.users_collection):
        previous.objects.unlink(obj)
    col.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    return obj


def cube(col, name, loc, size, mat=stone, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = place(bpy.context.object, col, name, mat)
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new('Edge wear bevel', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


def cylinder(col, name, loc, radius, depth, mat=stone, vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    return place(bpy.context.object, col, name, mat)


def torus(col, name, loc, radius, tube, mat=gold):
    bpy.ops.mesh.primitive_torus_add(major_segments=64, minor_segments=8, location=loc,
                                    major_radius=radius, minor_radius=tube, rotation=(math.pi / 2, 0, 0))
    return place(bpy.context.object, col, name, mat)


def line(col, name, points, radius=.06, mat=gold):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 1
    curve.bevel_depth = radius
    curve.bevel_resolution = 1
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for point, xyz in zip(spline.points, points):
        point.co = (*xyz, 1)
    obj = bpy.data.objects.new(name, curve)
    col.objects.link(obj)
    curve.materials.append(mat)
    return obj


def export(col, filename, animations=False):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in col.objects:
        obj.select_set(True)
    if col.objects:
        bpy.context.view_layer.objects.active = list(col.objects)[0]
    bpy.ops.export_scene.gltf(filepath=str(output / filename), export_format='GLB',
                              use_selection=True, export_yup=True, export_animations=animations,
                              export_animation_mode='ACTIONS', export_force_sampling=True,
                              export_skins=True, export_extras=True)


# Preserve the exact original skinned character and both animation actions.
warden = collection('01_ORIGINAL_WARDEN_RIG')
bpy.ops.import_scene.gltf(filepath=str(source))
imported = list(bpy.context.selected_objects)
for obj in imported:
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    warden.objects.link(obj)
    obj['Art_status'] = 'Stylized base; refine sculpt, retopology, PBR cloth and gait in Blender'
export(warden, 'warden-refinement.glb', animations=True)
for obj in imported:
    obj.hide_set(True)

# Blender uses Z-up. The glTF exporter converts this environment to Y-up.
environment = collection('02_FLOATING_REALM_AND_CAMPUS')
random.seed(2026)
for island_id, (x, y, z, radius) in enumerate([(0, 0, 0, 18), (-28, -6, 3, 7), (27, 12, 6, 6), (-20, 32, 1, 5)]):
    vertices, faces = [], []
    sides = 14
    for ring, (height, scale) in enumerate([(z, 1), (z - 1.7, 1.04), (z - 5, .67), (z - 12, .13)]):
        for i in range(sides):
            a = i / sides * math.pi * 2
            r = radius * scale * (1 + random.uniform(-.1, .1))
            vertices.append((x + math.cos(a) * r, y + math.sin(a) * r, height + random.uniform(-.3, .3)))
    for ring in range(3):
        for i in range(sides):
            a, b = ring * sides + i, ring * sides + (i + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces.append(tuple(range(sides - 1, -1, -1)))
    mesh = bpy.data.meshes.new('Faceted floating rock')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new('Floating_island_%02d' % island_id, mesh)
    environment.objects.link(obj)
    mesh.materials.append(stone)
    cylinder(environment, 'Island gold terrace rim', (x, y, z + .1), radius * .98, .12, gold, sides)

# Original campus interpretation: entrance remains physically open for camera travel.
cube(environment, 'Campus wing west', (-7.4, -2, 5), (9.8, 6, 10), stone, .12)
cube(environment, 'Campus wing east', (7.4, -2, 5), (9.8, 6, 10), stone, .12)
cube(environment, 'Campus entrance header', (0, -2, 8.7), (5, 6, 2.6), stone, .1)
cube(environment, 'Gold entrance canopy', (0, -6, 4.1), (7, 5.2, .22), gold, .06)
for x in (-3.15, 3.15):
    cylinder(environment, 'Entrance column', (x, -7.2, 2), .17, 4, gold)
for wing in (-1, 1):
    for floor in range(5):
        for bay in range(6):
            x = wing * (3.4 + bay * 1.45)
            cube(environment, 'Green campus glazing', (x, -5.04, 1.15 + floor * 1.7), (1.12, .055, 1.22), glass)
            cube(environment, 'Warm interior window', (x, -5.09, 1.15 + floor * 1.7), (.52, .02, .81), window)
for y in (-10, -3, 5):
    for side in (-1, 1):
        x = side * 12.5
        cylinder(environment, 'Gothic pier', (x, y, 4), .52, 8, stone)
        cylinder(environment, 'Pier capital', (x, y, 8), .76, .3, gold)
    points = []
    for i in range(33):
        a = i / 32 * math.pi
        points.append((math.cos(a) * 12.5, y, 7.8 + math.sin(a) * 5.5))
    line(environment, 'Gothic vault rib', points, .2, stone)
    line(environment, 'Gold vault inlay', [(x, yy - .04, z) for x, yy, z in points], .035, gold)
export(environment, 'realm-kit.glb')

portal = collection('03_EMERALD_PORTAL_KIT')
for radius, tube, mat in [(4.3, .25, stone), (4.05, .08, gold), (3.83, .045, energy), (3.63, .025, energy)]:
    torus(portal, 'Portal concentric ring', (0, 0, 4.4), radius, tube, mat)
for i in range(24):
    a = i / 24 * math.pi * 2
    obj = cube(portal, 'Portal rune %02d' % i, (math.cos(a) * 4.05, -.03, 4.4 + math.sin(a) * 4.05), (.08, .1, .31), gold)
    obj.rotation_euler.y = -a
for side in (-1, 1):
    cube(portal, 'Portal plinth', (side * 4.45, .1, .6), (1.4, 1.4, 1.2), stone, .06)
    cylinder(portal, 'Portal pedestal', (side * 4.45, .1, 2.5), .32, 3.2, gold)
export(portal, 'portal-kit.glb')

# Store an editable inspection scene; the web runtime supplies its own lighting.
lighting = collection('04_REFERENCE_LIGHTING')
for name, loc, color, power in [('Emerald key', (2, -10, 10), (.2, 1, .55), 1800), ('Gold rim', (-8, 2, 7), (1, .67, .25), 2500)]:
    data = bpy.data.lights.new(name, 'AREA')
    data.energy, data.color, data.shape, data.size = power, color, 'DISK', 8
    obj = bpy.data.objects.new(name, data)
    lighting.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (Vector((0, 0, 2)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(output / 'ricorrenza-cinematic.blend'))
print('Exported original rig plus editable realm and portal kits to', output)
