import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { bgVertexShader, bgFragmentShader, lightRayVertexShader, lightRayFragmentShader } from './shaders';

const MAIN_LIGHT_DIRECTION = new THREE.Vector3(0, -1.0, 0).normalize();

/**
 * 创建深海背景材质的 uniform 结构
 * @returns 用于深海雾场 shader 的初始 uniform 集合
 */
function createBackgroundUniforms() {
  return {
    uTime: { value: 0 },
    uCameraPos: { value: new THREE.Vector3() },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uLightDir: { value: MAIN_LIGHT_DIRECTION.clone() },
  };
}

/**
 * 创建光线材质的 uniform 结构
 * @param options 光线层的雾化、扩散和强度参数
 * @returns 用于深海光线动画与雾衰减的初始 uniform 集合
 */
function createLightRayUniforms(options: LightRayUniformOptions) {
  return {
    uTime: { value: 0 },
    uCameraPos: { value: new THREE.Vector3() },
    uFogNear: { value: options.fogNear },
    uFogFar: { value: options.fogFar },
    uLightDir: { value: MAIN_LIGHT_DIRECTION.clone() },
    uBeamSpread: { value: options.beamSpread },
    uBeamSoftness: { value: options.beamSoftness },
    uBeamIntensity: { value: options.beamIntensity },
    uBeamColor: { value: new THREE.Color(options.beamColor) },
  };
}

/**
 * 创建确定性伪随机数生成器
 * @param seed 固定种子
 * @returns 返回 [0,1) 区间的随机数函数
 */
function createPRNG(seed: number) {
  let x = seed | 0;
  if (x === 0) x = 123456789;
  return function rand() {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) & 0x7fffffff) / 0x80000000;
  };
}

type LightRayLayout = {
  position: THREE.Vector3;
  rotationZ: number;
  scale: THREE.Vector3;
};

type LightRayUniformOptions = {
  fogNear: number;
  fogFar: number;
  beamSpread: number;
  beamSoftness: number;
  beamIntensity: number;
  beamColor: THREE.ColorRepresentation;
};

/**
 * 生成固定布局的深海光线实例数据
 * @param count 光线数量
 * @returns 光线位置、旋转与缩放数据
 */
function createLightRayLayouts(count: number) {
  const random = createPRNG(20260303 ^ count);
  const layouts: LightRayLayout[] = [];
  const focalOffset = 0.0;

  for (let i = 0; i < count; i++) {
    const t = i / Math.max(count - 1, 1);
    const cluster = (t - 0.5) * 22;
    const x = focalOffset + cluster + (random() - 0.5) * 3.5;
    const y = 26 + random() * 3.0;
    const z = -24 + random() * 8.0;
    const width = 4.8 + random() * 2.0;
    const height = 70 + random() * 24.0;
    const rotationZ = -0.018 + random() * 0.036;

    layouts.push({
      position: new THREE.Vector3(x, y, z),
      rotationZ,
      scale: new THREE.Vector3(width, height, 1),
    });
  }

  return layouts;
}

/**
 * 深海背景组件
 * - 基于世界空间视线方向模拟深海雾场
 * - 不再包含水泡粒子系统
 */
const DeepSeaBackground = () => {
  const bgMeshRef = useRef<THREE.Mesh>(null);
  const bgMatRef = useRef<THREE.ShaderMaterial>(null);
  const lightRayHaloMeshRef = useRef<THREE.InstancedMesh>(null);
  const lightRayHaloMatRef = useRef<THREE.ShaderMaterial>(null);
  const lightRayCoreMeshRef = useRef<THREE.InstancedMesh>(null);
  const lightRayCoreMatRef = useRef<THREE.ShaderMaterial>(null);
  const bgScaleCacheRef = useRef<{ aspect: number; z: number; fov: number } | null>(null);
  const bgUniforms = useMemo(() => createBackgroundUniforms(), []);
  const lightRayHaloUniforms = useMemo(
    () =>
      createLightRayUniforms({
        fogNear: 4,
        fogFar: 48,
        beamSpread: 7.8,
        beamSoftness: 7.2,
        beamIntensity: 0.12,
        beamColor: '#4f86c8',
      }),
    [],
  );
  const lightRayCoreUniforms = useMemo(
    () =>
      createLightRayUniforms({
        fogNear: 6,
        fogFar: 42,
        beamSpread: 3.8,
        beamSoftness: 4.2,
        beamIntensity: 0.015,
        beamColor: '#9fc7ee',
      }),
    [],
  );
  const lightRayLayouts = useMemo(() => createLightRayLayouts(3), []);
  const lightRayDummy = useMemo(() => new THREE.Object3D(), []);

  const lightRaySeeds = useMemo(() => {
    const seeds = new Float32Array(lightRayLayouts.length);
    for (let i = 0; i < lightRayLayouts.length; i++) {
      // 避免使用 Math.random() 引发 react-hooks/purity 报错，
      // 使用基于索引的确定性哈希公式来生成固定种子
      seeds[i] = ((i * 1234.5678) % 100.0) + 1.0;
    }
    return seeds;
  }, [lightRayLayouts.length]);

  /**
   * 初始化光线实例矩阵与随机种子，保证布局稳定且不在渲染循环中重复计算
   */
  useLayoutEffect(() => {
    const haloMesh = lightRayHaloMeshRef.current;
    const coreMesh = lightRayCoreMeshRef.current;
    if (!haloMesh || !coreMesh) return;

    for (let i = 0; i < lightRayLayouts.length; i++) {
      const layout = lightRayLayouts[i];
      lightRayDummy.position.copy(layout.position);
      lightRayDummy.rotation.set(0, 0, layout.rotationZ);
      lightRayDummy.scale.copy(layout.scale);
      lightRayDummy.updateMatrix();
      haloMesh.setMatrixAt(i, lightRayDummy.matrix);
      coreMesh.setMatrixAt(i, lightRayDummy.matrix);
    }

    haloMesh.instanceMatrix.needsUpdate = true;
    coreMesh.instanceMatrix.needsUpdate = true;

    // 手动注入 aSeed，避免 JSX 解析报错
    haloMesh.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(lightRaySeeds, 1));
    coreMesh.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(lightRaySeeds, 1));
  }, [lightRayDummy, lightRayLayouts, lightRaySeeds]);

  /**
   * 更新深海背景的时间、相机与尺寸相关 uniform
   */
  useFrame(({ clock, camera, size }) => {
    const time = clock.getElapsedTime();

    if (bgMatRef.current) {
      bgMatRef.current.uniforms.uTime.value = time;
      bgMatRef.current.uniforms.uCameraPos.value.copy(camera.position);
      bgMatRef.current.uniforms.uResolution.value.set(size.width, size.height);
    }

    if (lightRayHaloMatRef.current) {
      lightRayHaloMatRef.current.uniforms.uTime.value = time;
      lightRayHaloMatRef.current.uniforms.uCameraPos.value.copy(camera.position);
    }

    if (lightRayCoreMatRef.current) {
      lightRayCoreMatRef.current.uniforms.uTime.value = time;
      lightRayCoreMatRef.current.uniforms.uCameraPos.value.copy(camera.position);
    }

    if (bgMeshRef.current) {
      const depth = 80;
      const z = camera.position.z;
      const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 75;
      const aspect = camera instanceof THREE.PerspectiveCamera ? camera.aspect : 1.77;

      const prev = bgScaleCacheRef.current;
      if (!prev || prev.aspect !== aspect || prev.z !== z || prev.fov !== fov) {
        const distance = z + depth;
        const vFov = (fov * Math.PI) / 180;
        const height = 2 * Math.tan(vFov / 2) * distance;
        const width = height * aspect;
        bgMeshRef.current.scale.set(width, height, 1);
        bgScaleCacheRef.current = { aspect, z, fov };
      }
    }
  });

  return (
    <>
      <mesh ref={bgMeshRef} position={[0, 0, -80]} renderOrder={-20}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={bgMatRef}
          vertexShader={bgVertexShader}
          fragmentShader={bgFragmentShader}
          uniforms={bgUniforms}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      <instancedMesh
        ref={lightRayHaloMeshRef}
        args={[
          undefined as unknown as THREE.BufferGeometry,
          undefined as unknown as THREE.Material,
          lightRayLayouts.length,
        ]}
        frustumCulled={false}
        renderOrder={-11}
      >
        <planeGeometry args={[1, 1, 1, 12]} />
        <shaderMaterial
          ref={lightRayHaloMatRef}
          vertexShader={lightRayVertexShader}
          fragmentShader={lightRayFragmentShader}
          uniforms={lightRayHaloUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
        />
      </instancedMesh>

      <instancedMesh
        ref={lightRayCoreMeshRef}
        args={[
          undefined as unknown as THREE.BufferGeometry,
          undefined as unknown as THREE.Material,
          lightRayLayouts.length,
        ]}
        frustumCulled={false}
        renderOrder={-10}
      >
        <planeGeometry args={[1, 1, 1, 12]} />
        <shaderMaterial
          ref={lightRayCoreMatRef}
          vertexShader={lightRayVertexShader}
          fragmentShader={lightRayFragmentShader}
          uniforms={lightRayCoreUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
        />
      </instancedMesh>
    </>
  );
};

export default DeepSeaBackground;
