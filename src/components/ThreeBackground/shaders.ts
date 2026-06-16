
export const birdVertexShader = `
  #ifndef USE_INSTANCING_COLOR
  attribute vec3 instanceColor;
  #endif

  varying vec2 vUv;
  varying float vDepth;
  varying vec3 vColor;
  varying vec3 vWorldPosition;
  
  uniform float uTime;
  
  void main() {
    vUv = uv;
    vColor = instanceColor;
    vec3 pos = position;
    
    vec3 instancePos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
    
    float flap = sin(uTime * 12.0 + instancePos.x * 5.0 + instancePos.z * 3.0) * 0.3;
    if (abs(pos.x) > 0.05) {
      pos.y += flap * abs(pos.x) * 2.0;
    }
    
    vec4 instancePosition = instanceMatrix * vec4(pos, 1.0);
    vec4 worldPosition = modelMatrix * instancePosition;
    vec4 mvPosition = modelViewMatrix * instancePosition;
    
    vDepth = -mvPosition.z;
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const birdFragmentShader = `
  varying vec2 vUv;
  varying float vDepth;
  varying vec3 vColor;
  varying vec3 vWorldPosition;

  uniform vec3 uCameraPos;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec3 uLightDir;
  
  void main() {
    float fogFactor = smoothstep(uFogNear, uFogFar, vDepth);
    vec3 rayDir = normalize(vWorldPosition - uCameraPos);
    float viewUp = rayDir.y * 0.5 + 0.5;
    float lightFacing = max(dot(normalize(-uLightDir), rayDir), 0.0);

    vec3 deepColor = vec3(0.008, 0.031, 0.075);
    vec3 scatterColor = vec3(0.12, 0.42, 0.82);
    vec3 waterColor = deepColor + scatterColor * (viewUp * 0.18 + lightFacing * 0.08);

    vec3 headColor = mix(vColor * 1.18, vec3(0.92, 0.97, 1.0), 0.2);
    vec3 tailColor = mix(vColor * 0.52, waterColor, 0.76);
    vec3 gradientFish = mix(tailColor, headColor, smoothstep(0.0, 1.0, vUv.y));

    float upperGlow = smoothstep(-0.2, 0.7, rayDir.y) * 0.13 + lightFacing * 0.1;
    vec3 foggedColor = waterColor + scatterColor * upperGlow;
    vec3 finalColor = mix(gradientFish, foggedColor, fogFactor);
    float alpha = mix(0.96, 0.14, fogFactor);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export const bgVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const bgFragmentShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  uniform float uTime;
  uniform vec3 uCameraPos;
  uniform vec2 uResolution;
  uniform vec3 uLightDir;

  float tri(float value) {
    return abs(fract(value) - 0.5);
  }

  vec3 tri3(vec3 value) {
    return vec3(
      tri(value.z + tri(value.y * 1.0)),
      tri(value.z + tri(value.x * 1.0)),
      tri(value.y + tri(value.x * 1.0))
    );
  }

  float triNoise3D(vec3 position, float speed, float timeValue) {
    vec3 p = position;
    float z = 1.4;
    float rz = 0.0;
    vec3 bp = p;

    for (float i = 0.0; i <= 3.0; i++) {
      vec3 dg = tri3(bp * 2.0);
      p += dg + vec3(timeValue * 0.1 * speed);
      bp *= 1.8;
      z *= 1.5;
      p *= 1.2;

      float t = tri(p.z + tri(p.x + tri(p.y)));
      rz += t / z;
      bp += vec3(0.14);
    }

    return rz;
  }

  vec3 hash23(vec2 uv) {
    float dt = dot(uv, vec2(12.9898, 78.233));
    float sn = sin(mod(dt, 3.14159265358979323846));
    return fract(vec3(43758.5453, 43758.1947, 43758.42037) * sn);
  }

  void main() {
    vec3 rayDir = normalize(vWorldPosition - uCameraPos);
    float integratedNoise = 0.0;
    vec3 uvRay = vec3(normalize(rayDir.xz) * 3.0, 0.0);
    vec2 initialRayOffset = mix(rayDir.xz, uvRay.xy, 0.5);
    vec3 samplePoint = vec3(uCameraPos.xz + initialRayOffset * 3.0, rayDir.y * 2.0);
    float factor = 0.005;
    samplePoint *= factor;
    uvRay *= factor;

    for (int i = 0; i < 5; i++) {
      float layerNoise = triNoise3D(samplePoint, 0.2, uTime);
      integratedNoise += layerNoise;
      samplePoint += uvRay;
    }

    integratedNoise = (integratedNoise / 5.0) * 1.3;

    float viewUp = rayDir.y * 0.5 + 0.5;
    vec3 colorTop = vec3(0.05, 0.22, 0.52);
    vec3 color = colorTop * viewUp * integratedNoise;

    vec2 screenUv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
    vec3 dither = (hash23(screenUv) - 0.5) * (1.0 / 255.0);
    color += dither;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const lightRayVertexShader = `
  varying vec2 vUv;
  varying float vDepth;
  varying vec3 vWorldPosition;
  varying float vSeed;

  attribute float aSeed;

  uniform float uTime;
  uniform vec3 uLightDir;

  void main() {
    vUv = uv;

    vec3 pos = position;
    float beamDepth = 1.0 - uv.y;
    float surfaceWave = sin(uTime * 0.08 + aSeed * 6.0) * 0.5 + 0.5;
    float sway = sin(uTime * 0.03 + beamDepth * 2.6 + aSeed * 8.0) * 0.03;
    pos.x += sway * (0.1 + beamDepth * 0.42);
    pos.x += uLightDir.x * beamDepth * (6.5 + surfaceWave * 1.3);
    pos.y += uLightDir.y * beamDepth * 4.8;

    vec4 instancePosition = instanceMatrix * vec4(pos, 1.0);
    vec4 worldPosition = modelMatrix * instancePosition;
    vec4 mvPosition = modelViewMatrix * instancePosition;

    vDepth = -mvPosition.z;
    vWorldPosition = worldPosition.xyz;
    vSeed = aSeed;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const lightRayFragmentShader = `
  varying vec2 vUv;
  varying float vDepth;
  varying vec3 vWorldPosition;
  varying float vSeed;

  uniform float uTime;
  uniform vec3 uCameraPos;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec3 uLightDir;
  uniform float uBeamSpread;
  uniform float uBeamSoftness;
  uniform float uBeamIntensity;
  uniform vec3 uBeamColor;

  float hash11(float value) {
    return fract(sin(value) * 43758.5453123);
  }

  void main() {
    vec3 rayDir = normalize(vWorldPosition - uCameraPos);
    float seed = hash11(vSeed);
    float lightFacing = max(dot(normalize(-uLightDir), rayDir), 0.0);
    float beamDepth = 1.0 - vUv.y;

    float staticWarp = sin(beamDepth * 6.2 + seed * 6.28318) * 0.012;
    float drift = sin(uTime * 0.05 + seed * 9.0) * 0.008;
    float surfaceWaveA = sin(vWorldPosition.x * 0.08 + uTime * 0.12 + seed * 5.0);
    float surfaceWaveB = sin(vWorldPosition.z * 0.07 - uTime * 0.1 + seed * 7.0);
    float surfaceLens = (surfaceWaveA * 0.55 + surfaceWaveB * 0.45) * 0.018;
    float shiftedCenter = (vUv.x - 0.5) + staticWarp * (0.06 + beamDepth * 0.16) + drift + surfaceLens * (0.18 + beamDepth * 0.46);
    float spread = max(uBeamSpread, 0.001);
    float softness = max(uBeamSoftness, 0.001);
    float veil = exp(-pow(abs(shiftedCenter) * (0.9 / softness), 2.0));
    float halo = exp(-pow(abs(shiftedCenter) * (1.6 / softness), 2.0));
    float shaft = exp(-pow(abs(shiftedCenter) * (3.0 / spread), 2.0));
    float core = exp(-pow(abs(shiftedCenter) * (5.2 / spread), 2.0));

    float verticalFade = mix(0.48, 1.0, pow(max(vUv.y, 0.0), 0.78));
    float entryGlow = smoothstep(0.78, 1.0, vUv.y);
    float fogFade = 1.0 - smoothstep(uFogNear, uFogFar, vDepth);
    float nearFade = smoothstep(2.0, 8.0, vDepth);
    float angleFade = smoothstep(-0.35, 0.65, rayDir.y);
    float waveShimmer = 0.92 + 0.1 * smoothstep(-0.3, 0.8, surfaceWaveA * 0.55 + surfaceWaveB * 0.45);
    float sheetBreakup = 0.98 + sin(beamDepth * 6.0 + seed * 7.0) * 0.015;
    float causticBlend = 0.84 + 0.16 * smoothstep(-0.1, 0.85, surfaceWaveA * 0.65 + surfaceWaveB * 0.35);

    float density = veil * 0.36 + halo * 0.3 + shaft * 0.2 + core * 0.06;
    float alpha = density * verticalFade * fogFade * nearFade * angleFade;
    alpha *= (0.08 + entryGlow * 0.16 + lightFacing * 0.05) * waveShimmer * sheetBreakup * causticBlend * uBeamIntensity;

    vec3 baseColor = uBeamColor * 0.28;
    vec3 highlightColor = mix(uBeamColor, vec3(0.72, 0.84, 0.96), 0.1);
    vec3 color = mix(baseColor, highlightColor, entryGlow * 0.22 + halo * 0.12 + core * 0.04 + lightFacing * 0.03);

    gl_FragColor = vec4(color, alpha);
  }
`;
