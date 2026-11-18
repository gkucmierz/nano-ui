/**
 * Curated Top-3 360° Spherical GLSL Shaders for the NanoPanorama360 Playground Demo.
 *
 * Architectural Boundary (PKG-PURITY-01 / Zero Library Bundle Bloat):
 * Lives exclusively under `src/playground/` — compiled ONLY into the docs/playground app,
 * adding 0 bytes to `@gkucmierz/nano-ui` (`dist/nano-ui.js`).
 *
 * Adapted from `shader-showcase-app` (`shaders.7u.pl`) Channels #017, #035, and #006
 * onto true `4π`-steradian spherical camera rays `(u_yaw, u_pitch, u_tanHalfFov, u_aspect)`.
 */

const SHARED_GLSL_PREAMBLE = `precision highp float;
varying vec2 v_ndc;
uniform float u_yaw;
uniform float u_pitch;
uniform float u_tanHalfFov;
uniform float u_fovDeg;
uniform float u_aspect;
uniform float u_time;
uniform vec2 u_resolution;

float safePow(float x, float e) {
  return pow(max(x, 0.0), e);
}

vec3 safePow3(vec3 v, float e) {
  return pow(max(v, vec3(0.0)), vec3(e));
}

float safeAtan(float y, float x) {
  float sx = abs(x) < 1e-5 ? (x < 0.0 ? -1e-5 : 1e-5) : x;
  return atan(y, sx);
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float hash31(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z
  );
}

float fbm2(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i = 0; i < 5; i++) {
    v += a * noise2(p);
    p = m * p * 2.02 + vec2(11.3, 7.1);
    a *= 0.5;
  }
  return v;
}

float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise3(p);
    p = p * 2.03 + vec3(7.3, 13.7, 5.9);
    a *= 0.5;
  }
  return v;
}

vec3 blackbody(float kelvin) {
  float t = clamp(kelvin, 900.0, 32000.0) / 100.0;
  vec3 c;
  if (t <= 66.0) {
    c.r = 1.0;
    c.g = clamp(0.39008158 * log(max(t, 1.0)) - 0.63184144, 0.0, 1.0);
  } else {
    c.r = clamp(1.29293618 * safePow(t - 60.0, -0.13320476), 0.0, 1.0);
    c.g = clamp(1.12989086 * safePow(t - 60.0, -0.07551485), 0.0, 1.0);
  }
  if (t >= 66.0) {
    c.b = 1.0;
  } else if (t <= 19.0) {
    c.b = 0.0;
  } else {
    c.b = clamp(0.54320679 * log(max(t - 10.0, 1.0)) - 1.19625409, 0.0, 1.0);
  }
  return c;
}

vec3 acesFilmic(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

vec3 computeSphereRay(vec2 ndc) {
  float cp = cos(u_pitch);
  float sp = sin(u_pitch);
  float cy = cos(u_yaw);
  float sy = sin(u_yaw);
  vec3 fwd = vec3(sy * cp, sp, cy * cp);
  vec3 right = vec3(cy, 0.0, -sy);
  vec3 up = vec3(-sy * sp, cp, -cy * sp);
  return normalize(fwd + (ndc.x * u_tanHalfFov * u_aspect) * right + (ndc.y * u_tanHalfFov) * up);
}
`;

export const KERR_BLACK_HOLE_360_GLSL = `${SHARED_GLSL_PREAMBLE}
vec3 kerrStarfield(vec3 dir) {
  vec3 d = normalize(dir);
  float galPlane = exp(-6.8 * abs(d.y * 0.84 - d.x * 0.32 + 0.12 * d.z));
  float dust = fbm3(d * 5.8 + vec3(0.0, 0.0, u_time * 0.008));
  float coreGlow = safePow(max(dot(d, normalize(vec3(0.28, 0.08, 0.95))), 0.0), 5.0);
  vec3 mw = mix(vec3(0.010, 0.016, 0.038), vec3(0.20, 0.14, 0.28), galPlane * dust);
  mw += vec3(0.22, 0.15, 0.09) * galPlane * coreGlow * 0.85;

  vec3 cell = floor(d * 210.0);
  float h = hash31(cell);
  float star = smoothstep(0.985, 0.999, h);
  vec3 sCol = blackbody(mix(3200.0, 16500.0, hash31(cell + 19.7)));
  mw += sCol * star * 1.45;

  vec3 companionDir = normalize(vec3(0.32 * sin(u_time * 0.14), 0.11 * cos(u_time * 0.11), 0.94));
  float align = max(dot(d, companionDir), 0.0);
  mw += vec3(1.5, 1.85, 2.7) * safePow(align, 260.0) * 2.2
      + vec3(0.42, 0.68, 1.32) * safePow(align, 26.0) * 0.42;
  return mw;
}

void main() {
  vec3 rd = computeSphereRay(v_ndc);
  vec3 ro = vec3(0.0, 1.12, -7.65);

  float aSpin = 0.88;
  float dopplerExp = 3.1;
  float baseTemp = 11800.0;
  float rHorizon = 0.5 * (1.0 + sqrt(max(1.0 - aSpin * aSpin, 0.04)));
  float rIsco = mix(3.0, 1.18, aSpin);
  float rOuter = 6.6;

  vec3 pos = ro;
  vec3 vel = rd;
  vec3 spinAxis = vec3(0.14, 0.99, 0.0);

  vec3 accumDisk = vec3(0.0);
  float transmittance = 1.0;
  float minR = 100.0;
  bool captured = false;

  for (int i = 0; i < 64; i++) {
    float r = length(pos);
    minR = min(minR, r);
    if (r < rHorizon) {
      captured = true;
      break;
    }
    if (r > 15.5 && i > 10) break;

    float dt = clamp(0.074 * (r - rHorizon * 0.72), 0.028, 0.36);
    vec3 angMom = cross(pos, vel);
    float h2 = dot(angMom, angMom);
    float r2 = r * r;
    float r5 = r2 * r2 * r;

    vec3 accelGR = -1.5 * h2 * pos / max(r5, 1e-4);
    vec3 accelKerr = 0.85 * aSpin * cross(spinAxis, vel) / max(r2 * r2, 1e-4);

    vec3 nextVel = normalize(vel + (accelGR + accelKerr) * dt);
    vec3 nextPos = pos + 0.5 * (vel + nextVel) * dt;

    float h0 = dot(pos, spinAxis);
    float h1 = dot(nextPos, spinAxis);
    if (h0 * h1 <= 0.0 && transmittance > 0.02) {
      float frac = abs(h0) / max(abs(h0 - h1), 1e-5);
      vec3 hitP = mix(pos, nextPos, frac);
      vec3 diskPlane = hitP - spinAxis * dot(hitP, spinAxis);
      float diskR = length(diskPlane);

      if (diskR > rIsco && diskR < rOuter) {
        float radialNorm = (diskR - rIsco) / (rOuter - rIsco);
        float innerTaper = smoothstep(0.0, 0.08, radialNorm);
        float outerTaper = 1.0 - smoothstep(0.62, 1.0, radialNorm);

        float phi = safeAtan(diskPlane.z, diskPlane.x);
        float omega = 1.0 / (safePow(diskR, 1.5) + 0.5 * aSpin);
        float spiralArg = phi - u_time * omega * 3.8 + 5.4 * log(diskR);
        float rings = 0.55 + 0.45 * sin(diskR * 9.2 - u_time * 1.9 + 2.3 * fbm2(vec2(diskR * 2.4, spiralArg * 0.5)));
        float shear = fbm2(vec2(diskR * 3.6, spiralArg * 0.85));
        float density = innerTaper * outerTaper * mix(0.65, rings * (0.55 + 0.85 * shear), 0.78);

        vec3 orbDir = normalize(cross(spinAxis, diskPlane));
        float beta = clamp(sqrt(0.5 / max(diskR - 0.35 * aSpin, 0.65)), 0.0, 0.78);
        float gamma = inversesqrt(max(1.0 - beta * beta, 0.12));
        float gravRed = sqrt(clamp(1.0 - 0.92 / diskR, 0.08, 1.0));
        float cosEmit = dot(orbDir, -vel);
        float doppler = gravRed / max(gamma * (1.0 - beta * cosEmit), 0.22);
        float beam = safePow(doppler, dopplerExp);

        vec3 thermalCol = blackbody(baseTemp * safePow(rIsco / diskR, 0.75) * doppler);
        vec3 diskRad = thermalCol * density * beam * 1.65;
        float alpha = clamp(density * 0.82, 0.0, 0.94);
        accumDisk += transmittance * diskRad;
        transmittance *= (1.0 - alpha);
      }
    }

    pos = nextPos;
    vel = nextVel;
  }

  float rPhoton = mix(1.5, 1.04, aSpin * 0.65);
  float photonRing = exp(-32.0 * abs(minR - rPhoton));
  vec3 ringCol = blackbody(baseTemp * 1.35) * photonRing * 1.25;

  vec3 bg = captured ? vec3(0.0) : kerrStarfield(vel);
  vec3 col = acesFilmic(accumDisk + transmittance * bg + ringCol);
  col = safePow3(col, 1.0 / 2.2);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const AURORA_BOREALIS_FJORD_360_GLSL = `${SHARED_GLSL_PREAMBLE}
vec2 curlWind2(vec2 p) {
  float e = 0.04;
  float n1 = fbm2(p + vec2(0.0, e));
  float n2 = fbm2(p - vec2(0.0, e));
  float n3 = fbm2(p + vec2(e, 0.0));
  float n4 = fbm2(p - vec2(e, 0.0));
  return vec2(n1 - n2, -(n3 - n4)) / (2.0 * e);
}

float curtainDensity(vec2 xz, float altFrac) {
  float t = u_time * 0.36;
  vec2 wind = curlWind2(xz * 0.42 + vec2(t * 0.32, -t * 0.20));
  vec2 warped = xz + wind * 0.95;
  float sheet1 = sin(warped.x * 2.1 + 1.35 * sin(warped.y * 1.4 - t * 1.15) + t * 0.78);
  float sheet2 = sin(warped.x * 3.3 - warped.y * 0.85 + 1.15 * cos(warped.x * 1.3 + t * 0.88));
  float ridge1 = exp(-abs(sheet1) * 7.2);
  float ridge2 = exp(-abs(sheet2) * 8.4) * 0.65;
  float rays = 0.62 + 0.38 * sin(warped.x * 16.0 + warped.y * 9.0 - u_time * 1.7);
  float vertEnv = smoothstep(0.0, 0.14, altFrac) * exp(-altFrac * 2.35);
  return (ridge1 + ridge2) * rays * vertEnv;
}

vec3 traceAuroraSky(vec3 ro, vec3 rd) {
  vec3 skyBg = mix(vec3(0.010, 0.024, 0.052), vec3(0.002, 0.005, 0.015), clamp(rd.y * 1.5, 0.0, 1.0));

  // Seamless 3D directional starfield (zero pole or azimuth seam)
  vec3 d = normalize(rd);
  vec3 cell = floor(d * 195.0);
  float sh = hash31(cell);
  float twinkle = 0.68 + 0.32 * sin(u_time * 2.8 + sh * 43.0);
  float star = smoothstep(0.985, 0.999, sh) * smoothstep(0.02, 0.18, d.y);
  skyBg += blackbody(mix(4200.0, 14500.0, hash31(cell + 11.3))) * star * twinkle * 1.15;

  // Seamless 360-degree periodic fjord mountain silhouette (evaluated on unit circle ring)
  vec2 ringDir = normalize(d.xz + vec2(1e-5, 0.0));
  float mtnH = 0.068 * fbm2(ringDir * 2.8 + vec2(4.2, 1.7))
             + 0.026 * (ringDir.x * ringDir.y)
             - 0.012;
  if (d.y < mtnH) {
    float snow = smoothstep(mtnH - 0.032, mtnH, d.y);
    float moonRim = 0.5 + 0.5 * ringDir.y;
    return mix(vec3(0.005, 0.010, 0.019), vec3(0.032, 0.062, 0.088) * (0.65 + 0.55 * moonRim), snow * 0.72);
  }

  vec2 magTilt = vec2(0.09, -0.16);
  float denom = max(d.y, 0.082);
  float tStart = (0.95 - ro.y) / denom;
  float tEnd = (3.45 - ro.y) / denom;
  float dt = (tEnd - tStart) / 34.0;

  vec3 aur = vec3(0.0);
  for (int i = 0; i < 34; i++) {
    float fi = (float(i) + 0.5) / 34.0;
    float t = mix(tStart, tEnd, fi);
    vec3 pos = ro + d * t;
    vec2 magXZ = pos.xz - pos.y * magTilt;
    float dens = curtainDensity(magXZ * 0.42, fi);

    vec3 cViolet = vec3(0.58, 0.20, 1.02) * exp(-fi * 10.5) * 0.85;
    vec3 cGreen = vec3(0.08, 1.12, 0.52) * smoothstep(0.0, 0.12, fi) * smoothstep(0.76, 0.18, fi);
    vec3 cCrimson = vec3(1.06, 0.15, 0.34) * smoothstep(0.22, 0.78, fi) * 0.95;

    aur += (cViolet + cGreen + cCrimson) * dens * dt * 0.62;
  }

  float horizonFade = smoothstep(0.0, 0.14, d.y);
  return skyBg + aur * horizonFade * 1.18;
}

void main() {
  vec3 rd = computeSphereRay(v_ndc);
  vec3 ro = vec3(0.0, 0.18, 0.0);

  vec3 col;
  if (rd.y >= -0.002) {
    col = traceAuroraSky(ro, rd);
  } else {
    float wDist = -ro.y / min(rd.y, -0.004);
    vec3 wPos = ro + rd * min(wDist, 28.0);
    float r1 = noise2(wPos.xz * vec2(6.5, 16.5) + vec2(u_time * 0.42, -u_time * 0.72));
    float r2 = noise2(wPos.xz * vec2(13.5, 28.0) - vec2(u_time * 0.34, u_time * 0.92));
    vec3 wNorm = normalize(vec3((r1 - 0.5) * 0.11, 1.0, (r2 - 0.5) * 0.17));

    vec3 reflRd = reflect(rd, wNorm);
    reflRd.y = abs(reflRd.y) + 0.025;
    vec3 reflCol = traceAuroraSky(ro, normalize(reflRd));

    float fresnel = 0.16 + 0.84 * safePow(1.0 - clamp(-rd.y, 0.0, 1.0), 4.0);
    col = mix(vec3(0.003, 0.012, 0.024), reflCol * 0.88, fresnel);
  }

  col = acesFilmic(col);
  col = safePow3(col, 1.0 / 2.2);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const GYROID_LABYRINTH_360_GLSL = `${SHARED_GLSL_PREAMBLE}
float smaxSmooth(float a, float b, float k) {
  float kk = max(k, 1e-4);
  float h = clamp(0.5 + 0.5 * (a - b) / kk, 0.0, 1.0);
  return mix(b, a, h) + kk * h * (1.0 - h);
}

vec2 gyroidMap(vec3 pos) {
  float scale1 = 1.35;
  vec3 q = pos * scale1;
  float g1 = dot(sin(q), cos(q.yzx)) / scale1;
  float shell = abs(g1) - 0.115;

  vec3 q2 = pos * 6.4;
  float g2 = dot(sin(q2), cos(q2.yzx)) / 6.4;
  float d = shell - 0.022 * g2;

  // Smooth flight corridor along Z so camera never intersects walls in 360° view
  float tunnelClear = length(pos.xy) - 0.56;
  d = smaxSmooth(d, -tunnelClear, 0.24);

  float side = g1 >= 0.0 ? 1.0 : 0.0;
  return vec2(d * 0.72, side);
}

vec3 gyroidNormal(vec3 pos) {
  vec2 e = vec2(1.0, -1.0) * 0.002;
  return normalize(
    e.xyy * gyroidMap(pos + e.xyy).x +
    e.yyx * gyroidMap(pos + e.yyx).x +
    e.yxy * gyroidMap(pos + e.yxy).x +
    e.xxx * gyroidMap(pos + e.xxx).x
  );
}

void main() {
  vec3 rd = computeSphereRay(v_ndc);
  float zTravel = u_time * 0.58;
  vec3 ro = vec3(0.11 * sin(zTravel * 0.45), 0.11 * cos(zTravel * 0.38), zTravel);
  vec3 orbWorld = ro + vec3(0.22 * sin(u_time * 0.85), 0.16 * cos(u_time * 0.68), 2.35);

  float t = 0.0;
  vec2 hit = vec2(100.0, 0.0);
  float orbGlow = 0.0;

  for (int i = 0; i < 64; i++) {
    vec3 pos = ro + rd * t;
    hit = gyroidMap(pos);
    float dOrb = length(pos - orbWorld);
    orbGlow += 0.012 / (0.045 + dOrb * dOrb * 2.4);
    if (hit.x < 0.0016 || t > 17.5) break;
    t += hit.x;
  }

  vec3 deepBg = vec3(0.010, 0.028, 0.054);
  vec3 col = deepBg;

  if (t <= 17.5 && hit.x < 0.02) {
    vec3 pos = ro + rd * t;
    vec3 nor = gyroidNormal(pos);
    vec3 viewDir = -rd;

    float ao = clamp(0.42 + 2.8 * gyroidMap(pos + nor * 0.16).x, 0.08, 1.0);
    vec3 cyanChannel = vec3(0.08, 0.74, 0.98);
    vec3 coralChannel = vec3(0.98, 0.34, 0.58);
    vec3 albedo = mix(cyanChannel, coralChannel, hit.y);

    float veinWave = sin(pos.z * 2.6 - u_time * 2.3 + pos.x * 1.8 + pos.y * 1.8);
    float vein = smoothstep(0.74, 0.98, veinWave);

    vec3 toOrb = orbWorld - pos;
    float distO = max(length(toOrb), 0.2);
    vec3 lDir = toOrb / distO;
    float atten = 2.8 / (1.0 + 0.52 * distO * distO);

    float diff = max(dot(nor, lDir), 0.0) * atten;
    float spec = safePow(max(dot(nor, normalize(lDir + viewDir)), 0.0), 42.0) * atten;
    float fres = safePow(1.0 - max(dot(nor, viewDir), 0.0), 3.2);

    float sssProbe = clamp(0.5 + 2.4 * gyroidMap(pos + lDir * 0.22).x, 0.0, 1.0);
    float sss = sssProbe * safePow(clamp(dot(viewDir, -lDir) * 0.5 + 0.5, 0.0, 1.0), 2.0) * atten;

    col = albedo * (0.15 * ao + 0.88 * diff) + mix(coralChannel, cyanChannel, hit.y) * sss * 0.92;
    col += vec3(0.88, 0.96, 1.12) * spec * 0.65 + albedo * fres * 0.45 * ao;
    col += mix(vec3(0.20, 1.35, 1.65), vec3(1.65, 0.68, 0.25), hit.y) * vein * 0.65;

    float fog = 1.0 - exp(-0.019 * t * t);
    col = mix(col, deepBg, fog);
  }

  col += vec3(1.15, 0.88, 0.55) * orbGlow * 0.88;
  col = acesFilmic(col);
  col = safePow3(col, 1.0 / 2.2);
  gl_FragColor = vec4(col, 1.0);
}
`;

const utf8ByteLength = (str) => new TextEncoder().encode(str).length;

export const PANORAMA_SHOWCASE_SHADERS = [
  {
    id: 'shader-kerr',
    channel: '017',
    title: 'Czarna Dziura Kerra 360°',
    subtitle: 'Soczewkowanie grawitacyjne fotonów, relatywistyczny dysk Dopplera i pełna sfera Drogi Mlecznej',
    badge: 'Astrofizyka GR',
    accent: '#fb923c',
    initialYaw: 0,
    initialPitch: -6,
    initialFov: 72,
    autoRotate: false,
    glsl: KERR_BLACK_HOLE_360_GLSL,
    kbLabel: `${(utf8ByteLength(KERR_BLACK_HOLE_360_GLSL) / 1024).toFixed(1)} KB GLSL`,
  },
  {
    id: 'shader-aurora',
    channel: '035',
    title: 'Zorza Polarna nad Fiordem 360°',
    subtitle: 'Kurtyny jonosferyczne 557.7 nm / 630.0 nm w zenicie, bezszwowe szczyty 360° i odbicia Fresnela w wodzie',
    badge: 'Plazma & Optyka',
    accent: '#34d399',
    initialYaw: 0,
    initialPitch: 16,
    initialFov: 76,
    autoRotate: true,
    glsl: AURORA_BOREALIS_FJORD_360_GLSL,
    kbLabel: `${(utf8ByteLength(AURORA_BOREALIS_FJORD_360_GLSL) / 1024).toFixed(1)} KB GLSL`,
  },
  {
    id: 'shader-gyroid',
    channel: '006',
    title: 'Bioluminescencyjny Labirynt Gyroidu 360°',
    subtitle: 'Nieskończony przelot przez powierzchnię minimalną TPMS z rozpraszaniem podpowierzchniowym (SSS)',
    badge: 'Raymarching SDF',
    accent: '#38bdf8',
    initialYaw: 0,
    initialPitch: 0,
    initialFov: 78,
    autoRotate: false,
    glsl: GYROID_LABYRINTH_360_GLSL,
    kbLabel: `${(utf8ByteLength(GYROID_LABYRINTH_360_GLSL) / 1024).toFixed(1)} KB GLSL`,
  },
];
