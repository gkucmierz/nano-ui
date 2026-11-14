const BLENDER_SYMBOL_PATTERN = [
  'ShaderNode[A-Za-z0-9_]+',
  'GeometryNode[A-Za-z0-9_]+',
  'CompositorNode[A-Za-z0-9_]+',
  'TextureNode[A-Za-z0-9_]+',
  'CYCLES',
  'BLENDER_EEVEE_NEXT',
  'BLENDER_EEVEE',
  'BLENDER_WORKBENCH',
  'EEVEE',
  'GLB',
  'GLTF_SEPARATE',
  'FBX',
  'OBJ',
  'USD',
  'PLY',
  'STL',
  'SUBSURF',
  'BEVEL',
  'BOOLEAN',
  'SOLIDIFY',
  'MIRROR',
  'ARRAY',
  'SHRINKWRAP',
  'DISPLACE',
  'DECIMATE',
  'REMESH',
  'SIMPLE_DEFORM',
  'SKIN',
  'WIREFRAME',
  'ARMATURE',
  'NODES',
  'DIFFERENCE',
  'UNION',
  'INTERSECT',
  'EXACT',
  'FAST',
  'CATMULL_CLARK',
  'METAL',
  'OPTIX',
  'CUDA',
  'HIP',
  'GPU',
  'CPU',
  'OPEN_EXR',
  'PNG',
  'JPEG',
  'SRGB',
  'NON_COLOR',
  'FILMIC',
  'AGX',
  'AUTO',
  'EDIT',
  'OBJECT',
  'POSE',
  'SCULPT',
  'Base Color',
  'Roughness',
  'Metallic',
  'IOR',
  'Transmission Weight',
  'Coat Weight',
  'Coat Roughness',
  'Emission Color',
  'Emission Strength',
  'Subsurface Weight',
  'Specular IOR Level',
  'Alpha',
  'Normal',
].join('|');

const BLENDER_ENUM_STRING_REGEX = new RegExp(`["'](?:${BLENDER_SYMBOL_PATTERN})["']`);

const blenderGrammar = (hljsInstance) => {
  const SUBST = {
    className: 'subst',
    begin: /\{/,
    end: /\}/,
    illegal: /#/,
  };

  const TRIPLE_DOUBLE_STRING = {
    className: 'string',
    begin: /[fFrRbBuU]{0,2}"""/,
    end: /"""/,
    contains: [hljsInstance.BACKSLASH_ESCAPE, SUBST],
  };

  const TRIPLE_SINGLE_STRING = {
    className: 'string',
    begin: /[fFrRbBuU]{0,2}'''/,
    end: /'''/,
    contains: [hljsInstance.BACKSLASH_ESCAPE, SUBST],
  };

  const F_DOUBLE_STRING = {
    className: 'string',
    begin: /(?:[fF][rR]?|[rR][fF]?)"/,
    end: /"/,
    illegal: /\n/,
    contains: [hljsInstance.BACKSLASH_ESCAPE, SUBST],
  };

  const F_SINGLE_STRING = {
    className: 'string',
    begin: /(?:[fF][rR]?|[rR][fF]?)'/,
    end: /'/,
    illegal: /\n/,
    contains: [hljsInstance.BACKSLASH_ESCAPE, SUBST],
  };

  const RAW_OR_BYTE_DOUBLE_STRING = {
    className: 'string',
    begin: /[rRbBuU]{1,2}"/,
    end: /"/,
    illegal: /\n/,
    contains: [hljsInstance.BACKSLASH_ESCAPE],
  };

  const RAW_OR_BYTE_SINGLE_STRING = {
    className: 'string',
    begin: /[rRbBuU]{1,2}'/,
    end: /'/,
    illegal: /\n/,
    contains: [hljsInstance.BACKSLASH_ESCAPE],
  };

  return {
    name: 'Blender Python (bpy)',
    aliases: ['bpy', 'blender', 'blender-python', 'bmesh'],
    contains: [
      hljsInstance.HASH_COMMENT_MODE,
      {
        className: 'meta',
        match: /@[A-Za-z_][A-Za-z0-9_.]*/,
      },
      TRIPLE_DOUBLE_STRING,
      TRIPLE_SINGLE_STRING,
      {
        className: 'symbol',
        match: BLENDER_ENUM_STRING_REGEX,
      },
      F_DOUBLE_STRING,
      F_SINGLE_STRING,
      RAW_OR_BYTE_DOUBLE_STRING,
      RAW_OR_BYTE_SINGLE_STRING,
      hljsInstance.APOS_STRING_MODE,
      hljsInstance.QUOTE_STRING_MODE,
      {
        className: 'attr',
        match: /(?<!\.)\b(?:[A-Za-z_][A-Za-z0-9_]*(?==(?!=))|(?:filepath|export_[a-z0-9_]+|use_[a-z0-9_]+|segments|ring_count|radius[12]?|depth|vertices|subdivisions|levels|render_levels|shade_smooth|enter_editmode|calc_uvs|align|location|rotation|scale)(?=\s*=(?!=)))/,
      },
      {
        className: 'number',
        match: /\b0[xX][0-9a-fA-F_]+\b|\b0[bB][01_]+\b|\b0[oO][0-7_]+\b|\b\d[\d_]*(?:\.[\d_]*)?(?:[eE][+-]?\d[\d_]*)?j?\b|\B\.\d[\d_]*(?:[eE][+-]?\d[\d_]*)?j?\b/,
      },
      {
        className: 'variable',
        match: /\b(?:bpy|bmesh|mathutils|blf|gpu|gpu_extras|aud|imbuf|idprop|freestyle|bpy_extras|bl_info|C|D|self|cls)\b/,
      },
      {
        className: 'property',
        match: /\.(?:context|data|ops|types|props|utils|app|path|msgbus|view_layer|scene|collection|objects|meshes|materials|lights|cameras|armatures|actions|images|textures|worlds|node_groups|modifiers|constraints|shape_keys|key_blocks|vertex_groups|uv_layers|color_attributes|cycles|eevee|render|world|node_tree|nodes|links|inputs|outputs|default_value|location|rotation_euler|rotation_quaternion|rotation_mode|scale|dimensions|matrix_world|matrix_local|verts|edges|faces|loops|normal|co|select|hide_viewport|hide_render|active_object|active|use_nodes|engine|device|samples|filepath|image_settings|file_format|mesh|object|curve|surface|metaball|font|armature|pose|lattice|empty|camera|light|material|texture|image|uv|anim|rigidbody|cloth|fluid|ptcache|particle|sculpt|paint|vertex_paint|weight_paint|export_scene|export_mesh|export_anim|import_scene|import_mesh|import_anim|wm|screen|transform|view3d|node|outliner|sound|sequencer|clip|mask|gpencil|grease_pencil|geometry|preferences|timers|handlers|width|segments|levels|render_levels|thickness|offset|profile|operation|solver|x|y|z|w)\b(?!\s*\()/,
      },
      {
        className: 'literal',
        match: /\b(?:True|False|None|NotImplemented|Ellipsis)\b/,
      },
      {
        className: 'keyword',
        match: /\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|match|case|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/,
      },
      {
        className: 'type',
        match: /\b(?:Vector|Euler|Matrix|Quaternion|Color|BVHTree|KDTree|BMesh|BMVert|BMEdge|BMFace|BMLoop|Operator|Panel|Menu|Header|PropertyGroup|UIList|AddonPreferences|Gizmo|GizmoGroup|GeometryNodeTree|ShaderNodeTree|FloatProperty|IntProperty|BoolProperty|StringProperty|EnumProperty|FloatVectorProperty|IntVectorProperty|BoolVectorProperty|PointerProperty|CollectionProperty)\b/,
      },
      {
        className: 'built_in',
        match: /\b(?:abs|all|any|bin|bool|bytes|callable|chr|classmethod|compile|complex|delattr|dict|dir|divmod|enumerate|eval|exec|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|isinstance|issubclass|iter|len|list|locals|map|max|memoryview|min|next|object|oct|open|ord|pow|print|property|range|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|vars|zip|primitive_[a-z0-9_]+_add|create_cube|create_uvsphere|create_icosphere|create_cone|create_circle|create_grid|create_monkey|from_mesh|to_mesh|from_object|ensure_lookup_table|normal_update|calc_loop_triangles|recalc_face_normals|remove_doubles|subdivide_edges|bisect_plane|convex_hull|dissolve_limit|spin|extrude_face_region|extrude_edge_only|bevel|inset_individual|inset_region|translate|rotate|scale|bmesh_to_mesh|gltf|fbx|obj_export|save_as_mainfile|shade_smooth|shade_flat|modifier_add|modifier_apply)\b(?=\s*\()/,
      },
      {
        scope: 'title.function',
        match: /\b[A-Za-z_][A-Za-z0-9_]*(?=\s*\()/,
      },
      {
        className: 'operator',
        match: /(?:->|\*\*|\/\/|<<|>>|<=|>=|==|!=|:=|[+\-*/%=@&|^~<>])/,
      },
    ],
  };
};

export const BLENDER_COMPLETIONS = [
  {
    label: 'bpy.ops.mesh.primitive_uv_sphere_add',
    insertText: 'bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=1.0, location=(0, 0, 0))',
    detail: 'Procedural UV Sphere mesh operator',
    kind: 'ops',
  },
  {
    label: 'bpy.ops.mesh.primitive_ico_sphere_add',
    insertText: 'bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=1.0, location=(0, 0, 0))',
    detail: 'Geodesic Icosphere base mesh (quad/subdivision friendly)',
    kind: 'ops',
  },
  {
    label: 'bpy.ops.mesh.primitive_cylinder_add',
    insertText: 'bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.5, depth=1.0, location=(0, 0, 0))',
    detail: 'Procedural Cylinder mesh operator',
    kind: 'ops',
  },
  {
    label: 'bpy.ops.export_scene.gltf',
    insertText: 'bpy.ops.export_scene.gltf(filepath="public/models/model.glb", export_format="GLB", export_apply=True, export_yup=True)',
    detail: 'Export scene to binary glTF 2.0 (.glb) with Y-up axis',
    kind: 'io',
  },
  {
    label: 'bpy.ops.wm.save_as_mainfile',
    insertText: 'bpy.ops.wm.save_as_mainfile(filepath="public/models/scene.blend")',
    detail: 'Save native Blender 5.x project file (.blend)',
    kind: 'io',
  },
  {
    label: 'bpy.ops.render.render',
    insertText: 'bpy.ops.render.render(write_still=True)',
    detail: 'Execute headless Cycles / EEVEE still frame render',
    kind: 'render',
  },
  {
    label: 'bmesh.new',
    insertText: 'bm = bmesh.new()',
    detail: 'Allocate in-memory BMesh manifold topology builder',
    kind: 'bmesh',
  },
  {
    label: 'bmesh.ops.bisect_plane',
    insertText: 'bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(0, 0, 1))',
    detail: 'Slice BMesh topology cleanly along an arbitrary 3D plane',
    kind: 'bmesh',
  },
  {
    label: 'bmesh.ops.bevel',
    insertText: 'bmesh.ops.bevel(bm, geom=bm.edges[:], offset=0.008, segments=2, profile=0.5, affect="EDGES")',
    detail: 'Procedural edge/vertex bevel on BMesh geometry',
    kind: 'bmesh',
  },
  {
    label: 'bmesh.ops.convex_hull',
    insertText: 'bmesh.ops.convex_hull(bm, input=bm.verts[:])',
    detail: 'Construct 3D polyhedral convex hull from vertex cloud',
    kind: 'bmesh',
  },
  {
    label: 'ShaderNodeBsdfPrincipled',
    insertText: 'bsdf = mat.node_tree.nodes.new("ShaderNodeBsdfPrincipled")',
    detail: 'Blender 5.x Principled BSDF PBR shader node',
    kind: 'shader',
  },
  {
    label: 'Transmission Weight',
    insertText: 'bsdf.inputs["Transmission Weight"].default_value = 1.0',
    detail: 'Refractive glass/crystal dielectric transmission [0..1]',
    kind: 'shader',
  },
  {
    label: 'Coat Weight',
    insertText: 'bsdf.inputs["Coat Weight"].default_value = 1.0',
    detail: 'Clearcoat specular lacquer layer weight [0..1]',
    kind: 'shader',
  },
  {
    label: 'Emission Strength',
    insertText: 'bsdf.inputs["Emission Strength"].default_value = 4.5',
    detail: 'Radiant emissive power in Principled BSDF',
    kind: 'shader',
  },
  {
    label: 'SUBSURF',
    insertText: 'mod = obj.modifiers.new("Subsurf", "SUBSURF")\nmod.levels = 2\nmod.render_levels = 3',
    detail: 'Catmull-Clark Subdivision Surface modifier',
    kind: 'mod',
  },
  {
    label: 'BEVEL',
    insertText: 'mod = obj.modifiers.new("Bevel", "BEVEL")\nmod.width = 0.006\nmod.segments = 3',
    detail: 'Non-destructive Bevel highlight modifier',
    kind: 'mod',
  },
  {
    label: 'SOLIDIFY',
    insertText: 'mod = obj.modifiers.new("Solidify", "SOLIDIFY")\nmod.thickness = 0.025',
    detail: 'Shell wall thickness modifier',
    kind: 'mod',
  },
  {
    label: 'BOOLEAN',
    insertText: 'mod = obj.modifiers.new("Cutout", "BOOLEAN")\nmod.operation = "DIFFERENCE"\nmod.solver = "EXACT"',
    detail: 'Exact manifold CSG Boolean modifier',
    kind: 'mod',
  },
  {
    label: 'Vector',
    insertText: 'Vector((0.0, 0.0, 1.0))',
    detail: 'mathutils 3D Euclidean vector',
    kind: 'math',
  },
  {
    label: 'Euler',
    insertText: 'Euler((0.0, 0.0, 0.0), "XYZ")',
    detail: 'mathutils 3-axis Euler rotation',
    kind: 'math',
  },
  {
    label: 'CYCLES',
    insertText: 'scene.render.engine = "CYCLES"\nscene.cycles.samples = 96',
    detail: 'Configure physically based Cycles path-tracing engine',
    kind: 'render',
  },
];

export const blenderParser = {
  id: 'bpy',
  name: 'Blender Python (bpy)',
  aliases: ['bpy', 'blender', 'blender-python', 'bmesh'],
  grammar: blenderGrammar,
};

export default blenderParser;
