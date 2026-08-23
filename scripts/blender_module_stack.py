"""
Blender renderer for the Potentiaa hero frame sequence.

OPTIONAL. The in-browser studio at /studio already produces a usable sequence.
Use this instead when you want photoreal frames - real soft shadows, proper
depth of field, subtle subsurface on the module faces - which is what gives the
reference site its weight.

Run headless:

    blender --background --python scripts/blender_module_stack.py

Writes 90 transparent WebP frames to public/assets/module-frames/, named
frame_0000.webp ... frame_0089.webp, matching lib/frames.ts. Drop-in
replacement for the studio output - the site needs no changes.

Tested against Blender 4.x.

STALE AS OF THE WELDED MARK. This still builds the OLD hero - three separate
rounded cubes with small joiner cubes between them, in glass. The current model
is one welded brushed-metal body defined as a distance field in lib/heroModel.
Render this only if you want the previous look back; otherwise use /studio.
"""

import math
import os

import bpy

# ---- must match lib/frames.ts -------------------------------------------
FRAME_COUNT = 90
FRAME_SIZE = 600
OUT_DIR = os.path.join(os.getcwd(), "public", "assets", "module-frames")

# design.md 3 - midnight-700, blue-500, coral-500 with midnight/blue joiners
MODULES = [
    ((-1.15, 0.0, -1.15), (0.039, 0.141, 0.439, 1.0), 1.05),  # midnight-700
    ((0.0, 0.0, 0.0), (0.149, 0.365, 1.0, 1.0), 1.05),        # blue-500
    ((1.15, 0.0, 1.15), (1.0, 0.416, 0.357, 1.0), 1.05),      # coral-500
]

JOINERS = [
    ((-0.575, 0.0, -0.575), (0.102, 0.212, 0.533, 1.0), 0.42),  # midnight-600
    ((0.575, 0.0, 0.575), (0.106, 0.298, 0.878, 1.0), 0.42),    # blue-600
]


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.lights):
        for item in list(block):
            block.remove(item)


def make_material(name, rgba):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = 0.28
    bsdf.inputs["Metallic"].default_value = 0.05
    # Coat gives the glossy moulded-plastic read of the logo
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = 0.6
        bsdf.inputs["Coat Roughness"].default_value = 0.2
    return mat


def make_module(name, location, rgba, size, parent):
    bpy.ops.mesh.primitive_cube_add(size=size, location=location)
    obj = bpy.context.active_object
    obj.name = name

    bevel = obj.modifiers.new(name="Bevel", type="BEVEL")
    bevel.width = size * 0.22
    bevel.segments = 8
    bevel.limit_method = "ANGLE"

    subsurf = obj.modifiers.new(name="Smooth", type="SUBSURF")
    subsurf.levels = 1
    subsurf.render_levels = 1

    obj.data.materials.append(make_material(f"{name}_mat", rgba))
    bpy.ops.object.shade_smooth()
    obj.parent = parent
    return obj


def build():
    clear_scene()

    # Empty at the origin - everything parents to it, so one rotation spins all
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    pivot = bpy.context.active_object
    pivot.name = "StackPivot"

    for i, (loc, rgba, size) in enumerate(MODULES):
        make_module(f"Module_{i}", loc, rgba, size, pivot)
    for i, (loc, rgba, size) in enumerate(JOINERS):
        make_module(f"Joiner_{i}", loc, rgba, size, pivot)

    # ---- camera ----
    bpy.ops.object.camera_add(location=(0, -7.4, 0.5), rotation=(math.radians(90), 0, 0))
    camera = bpy.context.active_object
    camera.data.lens_unit = "FOV"
    camera.data.angle = math.radians(34)
    bpy.context.scene.camera = camera

    # ---- lighting rig: white key, coral rim, blue fill ----
    bpy.ops.object.light_add(type="AREA", location=(4, -5, 6))
    key = bpy.context.active_object
    key.data.energy = 900
    key.data.size = 6
    key.rotation_euler = (math.radians(45), 0, math.radians(35))

    bpy.ops.object.light_add(type="AREA", location=(-5, 3, -2))
    rim = bpy.context.active_object
    rim.data.energy = 420
    rim.data.size = 5
    rim.data.color = (1.0, 0.416, 0.357)

    bpy.ops.object.light_add(type="POINT", location=(-3, -4, 2))
    fill = bpy.context.active_object
    fill.data.energy = 260
    fill.data.color = (0.149, 0.365, 1.0)

    return pivot


def animate(pivot):
    scene = bpy.context.scene
    scene.frame_start = 0
    scene.frame_end = FRAME_COUNT - 1

    for i in range(FRAME_COUNT):
        t = i / FRAME_COUNT
        scene.frame_set(i)
        pivot.rotation_euler = (
            math.sin(t * math.pi * 2) * 0.16,
            math.cos(t * math.pi * 2) * 0.06,
            t * math.pi * 2,
        )
        pivot.keyframe_insert(data_path="rotation_euler", frame=i)

    # Constant interpolation between keys would stutter; linear keeps it even
    for fcurve in pivot.animation_data.action.fcurves:
        for keyframe in fcurve.keyframe_points:
            keyframe.interpolation = "LINEAR"


def configure_render():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 128
    scene.cycles.use_denoising = True

    scene.render.resolution_x = FRAME_SIZE
    scene.render.resolution_y = FRAME_SIZE
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True

    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 92

    os.makedirs(OUT_DIR, exist_ok=True)
    # Blender appends a 4-digit frame number, giving frame_0000.webp
    scene.render.filepath = os.path.join(OUT_DIR, "frame_")


if __name__ == "__main__":
    pivot = build()
    animate(pivot)
    configure_render()
    print(f"Rendering {FRAME_COUNT} frames to {OUT_DIR}")
    bpy.ops.render.render(animation=True)
    print("Done.")
