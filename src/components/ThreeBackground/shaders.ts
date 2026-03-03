
export const birdVertexShader = `
  #ifndef USE_INSTANCING_COLOR
  attribute vec3 instanceColor;
  #endif

  varying vec2 vUv;
  varying float vDepth;
  varying vec3 vColor;
  
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
    vec4 mvPosition = modelViewMatrix * instancePosition;
    
    vDepth = -mvPosition.z; 
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const birdFragmentShader = `
  varying vec2 vUv;
  varying float vDepth;
  varying vec3 vColor;
  
  void main() {
    float fogFactor = smoothstep(15.0, 50.0, vDepth);
    vec3 bgColor = vec3(0.008, 0.031, 0.075); 
    
    vec3 headColor = vColor * 1.5; 
    vec3 tailColor = mix(vColor * 0.4, bgColor, 0.7);
    vec3 gradientFish = mix(tailColor, headColor, smoothstep(0.0, 1.0, vUv.y));
    
    vec3 finalColor = mix(gradientFish, bgColor, fogFactor);
    float alpha = mix(0.95, 0.0, fogFactor); 
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export const bgVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const bgFragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  
  void main() {
    vec3 bottomColor = vec3(0.008, 0.031, 0.075); 
    vec3 topColor = vec3(0.04, 0.25, 0.4);
    // 优化 pow(vUv.y, 1.5) => vUv.y * sqrt(vUv.y)
    vec3 color = mix(bottomColor, topColor, vUv.y * sqrt(vUv.y)); 
    
    vec2 sunPos = vec2(0.8 + sin(uTime * 0.5) * 0.08 + cos(uTime * 0.3) * 0.04, 1.2);
    float sunDist = distance(vUv, sunPos);
    
    vec2 dir = vUv - sunPos;
    float angle = atan(dir.y, dir.x);
    
    angle += sin(vUv.y * 12.0 - uTime * 0.8) * 0.05;
    angle += cos(vUv.x * 8.0 + uTime * 0.5) * 0.03;
    
    float ray1 = sin(angle * 14.0 + uTime * 0.2) * 0.5 + 0.5;
    float ray2 = sin(angle * 28.0 - uTime * 0.15) * 0.5 + 0.5;
    float ray3 = sin(angle * 50.0 + uTime * 0.3) * 0.5 + 0.5;
    
    // 优化 pow(raysBase, 1.5) => raysBase * sqrt(raysBase)
    float raysBase = ray1 * ray2 * ray3;
    float rays = raysBase * sqrt(raysBase);
    
    float breath = sin(uTime * 1.5) * 0.1 + 0.9;
    rays *= smoothstep(1.5, 0.0, sunDist) * breath;
    rays *= smoothstep(0.0, 0.6, vUv.y);
    
    vec3 rayColor = vec3(0.3, 0.8, 1.0);
    color += rayColor * rays * 1.2;
    
    float caustics = sin(vUv.x * 45.0 + uTime * 1.2) * sin(vUv.y * 25.0 - uTime * 0.8);
    // 优化 pow(x, 4.0) => (x*x)*(x*x)
    float c = caustics * 0.5 + 0.5;
    float c2 = c * c;
    caustics = c2 * c2; 
    color += vec3(0.5, 0.9, 1.0) * caustics * smoothstep(0.6, 1.1, vUv.y) * 0.5;
    
    vec2 centerUv = vUv - 0.5;
    float vignette = 1.0 - dot(centerUv, centerUv) * 1.8;
    color *= smoothstep(0.0, 1.0, vignette);
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

export const particleVertexShader = `
  attribute float speed;
  attribute float offset;
  attribute vec3 emitterPos;
  varying float vOpacity;
  varying float vShimmer;
  varying float vLife;
  uniform float uTime;

  void main() {
    // 1. 生命周期计算
    float life = mod(uTime * speed * 0.5 + offset, 1.0);
    vLife = life;

    // 2. 模拟合并逻辑：让部分粒子随着上升提前消失
    // offset 决定了粒子的“存活阈值”，模拟被吞噬的过程
    float survivalThreshold = 0.3 + 0.7 * offset; 
    float isAlive = step(life, survivalThreshold);
    
    vec3 pos = position; 
    pos.xz = emitterPos.xz;
    
    // 垂直位移：从深海向上高速移动
    pos.y = mix(-70.0, 80.0, life); 

    // 3. 动态扩散：由于合并，顶部的摆动更加从容
    float drift = pow(life, 1.2) * 6.5; 
    pos.x += sin(uTime * 2.0 + offset * 30.0) * drift;
    pos.z += cos(uTime * 1.8 + offset * 25.0) * drift;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // 4. 进化增长逻辑：底部极细 (0.05)，顶部幸存者变得非常大 (10.0)
    // 优化 pow(life, 3.5) => life^3 * sqrt(life)
    float life3 = life * life * life;
    float growth = mix(0.05, 10.0, life3 * sqrt(life)); 
    
    // 透明度：结合生命存续、边缘淡出
    // isAlive 为 0 时粒子瞬间消失，模拟合并进了附近的大气泡
    // 优化 pow(life, 5.0) => (life^4) * life
    float life2 = life * life;
    float life4 = life2 * life2;
    vOpacity = isAlive * smoothstep(0.0, 0.05, life) * (1.0 - (life4 * life));
    vShimmer = sin(uTime * 4.0 + offset * 15.0) * 0.5 + 0.5;

    gl_PointSize = growth * (500.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const particleFragmentShader = `
  varying float vShimmer;
  varying float vOpacity;
  varying float vLife;

  void main() {
    // 丢弃圆形以外的像素
    vec2 cxy = gl_PointCoord * 2.0 - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    
    // --- 动态质感：越高越通透 ---
    float rimPower = mix(1.2, 5.0, vLife);
    float rim = pow(r, rimPower); 
    
    // 侧向折射高光
    float glint = smoothstep(0.2, 0.0, length(cxy + vec2(0.35, 0.35)));
    // 优化 pow(glint, 8.0) => ((g*g)*(g*g))*((g*g)*(g*g)) 的等价写法为 g2*g2*g2*g2
    float g2 = glint * glint;
    float g4 = g2 * g2;
    glint = g4 * g4;
    
    // 内部微弱散射
    float inner = (1.0 - r) * 0.1;
    
    vec3 baseColor = vec3(0.75, 0.92, 1.0);
    vec3 finalColor = mix(baseColor, vec3(1.0), glint);
    
    // 综合透明度
    float alpha = (rim * 0.9 + glint * 1.2 + inner) * vOpacity * (0.4 + vShimmer * 0.6);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;
