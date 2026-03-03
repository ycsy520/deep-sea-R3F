import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { bgVertexShader, bgFragmentShader, particleVertexShader, particleFragmentShader } from './shaders';

type DeepSeaBackgroundProps = {
  mobileCount?: number;
  desktopCount?: number;
  xOffsetRatio?: number; // 基于 viewport.width 的水平偏移系数，黄金分割线默认为 -0.118
};

const DeepSeaBackground = ({ mobileCount = 2500, desktopCount = 7000, xOffsetRatio = -0.118 }: DeepSeaBackgroundProps) => {
  const bgMeshRef = useRef<THREE.Mesh>(null);
  const bgMatRef = useRef<THREE.ShaderMaterial>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const pointsMatRef = useRef<THREE.ShaderMaterial>(null);
  const bgScaleCacheRef = useRef<{ aspect: number; z: number; fov: number } | null>(null);
  
  const { viewport } = useThree();

  // 检测移动端
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  // 按照 test.tsx 的数量配置：移动端 2500，桌面端 7000
  const bubbleCount = isMobile ? mobileCount : desktopCount;
  
  // 生成气泡数据 (GPU 粒子系统)
  const { positions, emitterPos, speeds, offsets } = useMemo(() => {
    const positions = new Float32Array(bubbleCount * 3);
    const emitterPos = new Float32Array(bubbleCount * 3);
    const speeds = new Float32Array(bubbleCount);
    const offsets = new Float32Array(bubbleCount);
    
    // xorshift32：确定性随机（避免 Math.random，且比 sin 更轻量）
    let x = (123456789 ^ bubbleCount) | 0;
    if (x === 0) x = 123456789;
    const seededRandom = () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return ((x >>> 0) & 0x7fffffff) / 0x80000000;
    };

    for (let i = 0; i < bubbleCount; i++) {
      // 这里的 positions 数组即使全为0也可以，因为我们在 shader 中用 emitterPos 覆盖了
      // 但 Three.js 必须检测到 position 属性才会启动渲染
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      // 收紧喷口范围，制造强力气柱感
      emitterPos[i * 3] = (seededRandom() - 0.5) * 4.0; 
      emitterPos[i * 3 + 1] = -60;
      emitterPos[i * 3 + 2] = (seededRandom() - 0.5) * 4.0;

      speeds[i] = seededRandom() * 0.3 + 0.15; 
      offsets[i] = seededRandom();
    }
    
    return { positions, emitterPos, speeds, offsets };
  }, [bubbleCount]);

  // 使用 useMemo 缓存 uniforms 初始结构
  const bgUniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), []);

  const particleUniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), []);

  // 动画循环
  useFrame(({ clock, camera }) => {
    const time = clock.getElapsedTime();
    
    // 直接更新材质的 uniforms 属性，避免修改 React hook 依赖对象
    if (bgMatRef.current) {
      bgMatRef.current.uniforms.uTime.value = time;
    }
    if (pointsMatRef.current) {
      pointsMatRef.current.uniforms.uTime.value = time;
    }
    
    // 自适应背景尺寸
    if (bgMeshRef.current) {
      // 计算 z=-80 处的视锥体尺寸
      const depth = 80;
      const z = camera.position.z;
      const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 75;
      const aspect = camera instanceof THREE.PerspectiveCamera ? camera.aspect : 1.77;

      const prev = bgScaleCacheRef.current;
      if (!prev || prev.aspect !== aspect || prev.z !== z || prev.fov !== fov) {
        const distance = z + depth;
        const vFov = fov * Math.PI / 180;
        const height = 2 * Math.tan(vFov / 2) * distance;
        const width = height * aspect;
        bgMeshRef.current.scale.set(width, height, 1);
        bgScaleCacheRef.current = { aspect, z, fov };
      }
    }
  });

  return (
    <>
      {/* 深海背景平面 */}
      <mesh ref={bgMeshRef} position={[0, 0, -80]}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={bgMatRef}
          vertexShader={bgVertexShader}
          fragmentShader={bgFragmentShader}
          uniforms={bgUniforms}
          depthWrite={false}
        />
      </mesh>

      {/* 气泡粒子系统 (GPU) */}
      {/* 
        黄金分割线位置计算：
        视口宽度 W，中心为 0
        黄金分割点（左侧）距离左边缘 0.382W (1 - 1/1.618)
        在中心坐标系下的位置 = 0.382W - 0.5W = -0.118W
      */}
      <points ref={pointsRef} position={[viewport.width * xOffsetRatio, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-emitterPos"
            args={[emitterPos, 3]}
          />
          <bufferAttribute
            attach="attributes-speed"
            args={[speeds, 1]}
          />
          <bufferAttribute
            attach="attributes-offset"
            args={[offsets, 1]}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={pointsMatRef}
          vertexShader={particleVertexShader}
          fragmentShader={particleFragmentShader}
          uniforms={particleUniforms}
          transparent={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  );
};

export default DeepSeaBackground;
