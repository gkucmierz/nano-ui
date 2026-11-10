const glslGrammar = (hljsInstance) => {
  return {
    name: 'GLSL / Shader',
    aliases: ['glsl', 'frag', 'vert', 'shader', 'wgsl', 'hlsl', 'fs', 'vs'],
    contains: [
      hljsInstance.C_LINE_COMMENT_MODE,
      hljsInstance.C_BLOCK_COMMENT_MODE,
      {
        className: 'meta',
        begin: /^\s*#[a-zA-Z_][a-zA-Z0-9_]*/,
        end: /$/,
        contains: [
          hljsInstance.C_LINE_COMMENT_MODE,
          hljsInstance.C_BLOCK_COMMENT_MODE,
          {
            className: 'number',
            match: /\b\d+(?:\.\d+)?\b/,
          },
          {
            className: 'keyword',
            match: /\b(?:es|core|compatibility|enable|require|warn|disable)\b/,
          },
        ],
      },
      {
        className: 'symbol',
        match: /@[a-zA-Z_][a-zA-Z0-9_]*/,
      },
      {
        className: 'property',
        match: /\.(?:[xyzw]{1,4}|[rgba]{1,4}|[stpq]{1,4})\b/,
      },
      {
        className: 'number',
        match: /\b0[xX][0-9a-fA-F]+[uU]?\b|\b\d+(?:\.\d*)?(?:[eE][+-]?\d+)?[fFuU]?\b|\B\.\d+(?:[eE][+-]?\d+)?[fF]?\b/,
      },
      {
        className: 'variable',
        match: /\b(?:gl_[A-Za-z0-9_]+|iResolution|iTime|iTimeDelta|iFrame|iFrameRate|iMouse|iDate|iSampleRate|iChannelTime|iChannelResolution|iChannel[0-3]|iAudio|iBeat|iParams|iPrevFrame|iPass|iFeedbackReset|uOrbit|uPointer|uTheme|fragColor|fragCoord)\b/,
      },
      {
        className: 'literal',
        match: /\b(?:true|false|PI|TAU|HALF_PI|TWO_PI|PHI|GOLDEN_RATIO|EPS|EPSILON|INF)\b/,
      },
      {
        className: 'keyword',
        match: /\b(?:attribute|binding|break|buffer|case|centroid|coherent|const|continue|default|discard|do|early_fragment_tests|else|flat|fn|for|highp|if|in|inout|invariant|layout|let|location|lowp|mediump|noperspective|out|override|patch|precise|precision|readonly|restrict|return|sample|set|shared|smooth|std140|std430|struct|subroutine|switch|uniform|var|varying|volatile|while|workgroup|writeonly)\b/,
      },
      {
        className: 'type',
        match: /\b(?:void|bool|int|uint|float|double|half|f16|f32|f64|i32|u32|atomic_uint|[dbiu]?vec[234]|vec[234][fiu]|[db]?mat[234](?:x[234])?|mat[234]x[234]f|float[234](?:x[234])?|int[234]|uint[234]|[iu]?sampler(?:1D|2D|3D|Cube|2DRect|1DArray|2DArray|CubeArray|Buffer|2DMS|2DMSArray)|sampler(?:1D|2D|Cube|2DRect|1DArray|2DArray|CubeArray)?Shadow|[iu]?image(?:1D|2D|3D|Cube|2DRect|1DArray|2DArray|CubeArray|Buffer|2DMS|2DMSArray)|texture_(?:1d|2d|2d_array|3d|cube|cube_array|multisampled_2d|storage_1d|storage_2d|storage_3d|depth_2d|depth_cube)|sampler|sampler_comparison)\b/,
      },
      {
        className: 'built_in',
        match: /\b(?:radians|degrees|sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|asinh|acosh|atanh|pow|exp|log|exp2|log2|sqrt|inversesqrt|rsqrt|abs|sign|floor|trunc|round|roundEven|ceil|fract|frac|mod|modf|min|max|clamp|saturate|mix|lerp|step|smoothstep|isnan|isinf|fma|frexp|ldexp|length|distance|dot|cross|normalize|faceforward|reflect|refract|matrixCompMult|outerProduct|transpose|determinant|inverse|lessThan|lessThanEqual|greaterThan|greaterThanEqual|equal|notEqual|any|all|not|texture|texture2D|texture3D|textureCube|textureLod|textureProj|textureGrad|textureOffset|texelFetch|texelFetchOffset|textureSize|textureQueryLod|textureQueryLevels|textureGather|textureSample|textureSampleLevel|textureLoad|textureStore|dFdx|dFdy|dFdxFine|dFdyFine|dFdxCoarse|dFdyCoarse|dpdx|dpdy|fwidth|fwidthFine|fwidthCoarse|floatBitsToInt|floatBitsToUint|intBitsToFloat|uintBitsToFloat|packHalf2x16|unpackHalf2x16|packUnorm2x16|unpackUnorm2x16|packSnorm2x16|unpackSnorm2x16|packUnorm4x8|unpackUnorm4x8|packSnorm4x8|unpackSnorm4x8|bitfieldExtract|bitfieldInsert|bitfieldReverse|bitCount|findLSB|findMSB|atomicAdd|atomicMin|atomicMax|atomicAnd|atomicOr|atomicXor|atomicExchange|atomicCompSwap|barrier|memoryBarrier|groupMemoryBarrier|workgroupBarrier|storageBarrier|EmitVertex|EndPrimitive)\b(?=\s*\()/,
      },
      {
        scope: 'title.function',
        match: /\b[A-Za-z_][A-Za-z0-9_]*(?=\s*\()/,
      },
      {
        className: 'operator',
        match: /[+\-*/%=<>!&|^~?:]+/,
      },
    ],
  };
};

export const GLSL_COMPLETIONS = [
  {
    label: 'vec2',
    insertText: 'vec2(0.0, 0.0)',
    detail: '2D floating-point vector constructor',
    kind: 'type',
  },
  {
    label: 'vec3',
    insertText: 'vec3(0.0, 0.0, 0.0)',
    detail: '3D floating-point vector (XYZ / RGB)',
    kind: 'type',
  },
  {
    label: 'vec4',
    insertText: 'vec4(0.0, 0.0, 0.0, 1.0)',
    detail: '4D homogeneous / RGBA vector',
    kind: 'type',
  },
  {
    label: 'mat2',
    insertText: 'mat2(c, -s, s, c)',
    detail: '2x2 rotation / linear transform matrix',
    kind: 'type',
  },
  {
    label: 'mat3',
    insertText: 'mat3(right, up, forward)',
    detail: '3x3 orthonormal camera / TBN basis matrix',
    kind: 'type',
  },
  {
    label: 'smoothstep',
    insertText: 'smoothstep(0.0, 1.0, x)',
    detail: 'Cubic Hermite interpolation 3t^2 - 2t^3',
    kind: 'math',
  },
  {
    label: 'mix',
    insertText: 'mix(a, b, t)',
    detail: 'Linear blend a*(1 - t) + b*t',
    kind: 'math',
  },
  {
    label: 'clamp',
    insertText: 'clamp(x, 0.0, 1.0)',
    detail: 'Constrain scalar or vector to [minVal, maxVal]',
    kind: 'math',
  },
  {
    label: 'normalize',
    insertText: 'normalize(v)',
    detail: 'Unit-length direction vector v / length(v)',
    kind: 'geom',
  },
  {
    label: 'length',
    insertText: 'length(p)',
    detail: 'Euclidean norm sqrt(dot(p, p))',
    kind: 'geom',
  },
  {
    label: 'dot',
    insertText: 'dot(a, b)',
    detail: 'Euclidean inner product of vectors',
    kind: 'geom',
  },
  {
    label: 'cross',
    insertText: 'cross(a, b)',
    detail: '3D vector cross product orthogonal to a and b',
    kind: 'geom',
  },
  {
    label: 'reflect',
    insertText: 'reflect(rd, n)',
    detail: 'Mirror reflection direction rd - 2.0*dot(n, rd)*n',
    kind: 'geom',
  },
  {
    label: 'smin',
    insertText: 'smin(d1, d2, 0.25)',
    detail: 'Inigo Quilez polynomial smooth minimum for SDF blending',
    kind: 'sdf',
  },
  {
    label: 'sdRoundBox',
    insertText: 'sdRoundBox(p, vec3(0.5), 0.08)',
    detail: 'Signed distance to rounded 3D box',
    kind: 'sdf',
  },
  {
    label: 'fbm3',
    insertText: 'fbm3(p)',
    detail: '5-octave 3D fractional Brownian motion field',
    kind: 'sdf',
  },
  {
    label: 'acesFilmic',
    insertText: 'acesFilmic(col)',
    detail: 'Narkowicz ACES Filmic HDR-to-SDR tone mapping',
    kind: 'color',
  },
  {
    label: 'texture',
    insertText: 'texture(iPrevFrame, uv)',
    detail: 'WebGL2 filtered sampler lookup',
    kind: 'tex',
  },
  {
    label: 'iResolution',
    insertText: 'iResolution.xy',
    detail: 'Viewport resolution in pixels (vec3: width, height, aspect)',
    kind: 'uni',
  },
  {
    label: 'iTime',
    insertText: 'iTime',
    detail: 'Elapsed simulation time in seconds (float)',
    kind: 'uni',
  },
  {
    label: 'iMouse',
    insertText: 'iMouse',
    detail: 'Pointer & drag coordinates in pixels (vec4)',
    kind: 'uni',
  },
  {
    label: 'iAudio',
    insertText: 'iAudio',
    detail: '4-band NanoSound spectrum: x=Sub, y=LowMid, z=HighMid, w=Brilliance',
    kind: 'uni',
  },
  {
    label: 'iBeat',
    insertText: 'iBeat',
    detail: 'Phase-locked rhythmic beat envelope [0..1]',
    kind: 'uni',
  },
  {
    label: 'iParams',
    insertText: 'iParams',
    detail: 'Live interactive 4D modulation vector (keys 1..8 / sliders)',
    kind: 'uni',
  },
];

export const glslParser = {
  id: 'glsl',
  name: 'GLSL / Shader',
  aliases: ['glsl', 'frag', 'vert', 'shader', 'wgsl', 'hlsl', 'fs', 'vs'],
  grammar: glslGrammar,
};

export default glslParser;
