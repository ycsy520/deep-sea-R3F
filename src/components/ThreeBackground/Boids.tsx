import { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { birdVertexShader, birdFragmentShader } from './shaders';

/**
 * 生成确定性伪随机数生成器（PRNG）
 * @param seed 种子（32 位有符号整数）
 * @returns 返回 [0,1) 区间的随机数函数
 */
function createPRNG(seed: number) {
  let x = seed | 0;
  if (x === 0) x = 123456789; // 避免零种子退化
  return function rand() {
    // xorshift32
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    // 转为 [0,1)
    // 0x7fffffff 保证正数范围，2^31 约为 2147483648
    return ((x >>> 0) & 0x7fffffff) / 0x80000000;
  };
}

/**
 * 将字符串哈希为 32 位整数种子
 * @param s 待哈希字符串
 * @returns 32 位整数种子
 */
function hashStringToSeed(s: string) {
  let h = 2166136261 >>> 0; // FNV-1a 起始值
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h | 0) || 1;
}

const _separation = new THREE.Vector3();
const _alignment = new THREE.Vector3();
const _cohesion = new THREE.Vector3();
const _diff = new THREE.Vector3();
const _dummyUp = new THREE.Vector3(0, 0, 1);
const _tempDir = new THREE.Vector3();

type BoidsProps = {
  count?: number;
  maxSpeed?: number;
  bounds?: number;
};

/**
 * Boids 群集组件（基于 InstancedMesh）
 * - 支持移动端/横竖屏自适应
 * - 使用确定性 PRNG 初始化，避免渲染期不纯
 */
const Boids = ({ count, maxSpeed, bounds }: BoidsProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geomRef = useRef<THREE.ConeGeometry>(null);

  useLayoutEffect(() => {
    if (geomRef.current) {
      geomRef.current.rotateX(Math.PI / 2);
    }
  }, []);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isPortrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;

  const BOID_COUNT = typeof count === 'number' ? count : (isMobile ? 80 : 150);
  const BOUNDS = typeof bounds === 'number' ? bounds : (isPortrait ? 25 : 30);
  const SPEED = typeof maxSpeed === 'number' ? maxSpeed : 0.08;
  const SEPARATION_DISTANCE = 2.0;
  const ALIGNMENT_DISTANCE = 4.0;

  const birds = useMemo(() => {
    // 基于参数构建稳定种子，保证在同一参数下结果可复现
    const seedKey = JSON.stringify({ BOID_COUNT, BOUNDS, SPEED });
    const prng = createPRNG(hashStringToSeed(seedKey));
    return Array.from({ length: BOID_COUNT }, () => {
      const px = (prng() - 0.5) * BOUNDS;
      const py = (prng() - 0.5) * BOUNDS;
      const pz = (prng() - 0.5) * BOUNDS;
      const vx = (prng() - 0.5) * SPEED;
      const vy = (prng() - 0.5) * SPEED;
      const vz = (prng() - 0.5) * SPEED;
      return {
        position: new THREE.Vector3(px, py, pz),
        velocity: new THREE.Vector3(vx, vy, vz),
        acceleration: new THREE.Vector3(),
      };
    });
  }, [BOID_COUNT, BOUNDS, SPEED]);

  const colors = useMemo(() => {
    const premiumPalette = ['#FF7F50', '#FF6B6B', '#FFA07A', '#FF4500', '#F08080'];
    const colorArray = new Float32Array(BOID_COUNT * 3);
    const _color = new THREE.Color();
    // 与 birds 初始化保持相同的种子，保证实例颜色在相同参数下稳定
    const seedKey = JSON.stringify({ BOID_COUNT, BOUNDS, SPEED, palette: premiumPalette.length });
    const prng = createPRNG(hashStringToSeed(seedKey));
    for (let i = 0; i < BOID_COUNT; i++) {
      const hex = premiumPalette[Math.floor(prng() * premiumPalette.length)];
      _color.set(hex);
      _color.toArray(colorArray, i * 3);
    }
    return colorArray;
  }, [BOID_COUNT, BOUNDS, SPEED]);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const color = new THREE.Color();
    for (let i = 0; i < BOID_COUNT; i++) {
      color.fromArray(colors, i * 3);
      mesh.setColorAt(i, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [colors, BOID_COUNT]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (materialRef.current) materialRef.current.uniforms.uTime.value = time;

    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < birds.length; i++) {
      const bird = birds[i];
      _separation.set(0, 0, 0);
      _alignment.set(0, 0, 0);
      _cohesion.set(0, 0, 0);
      let cnt = 0;

      for (let j = 0; j < birds.length; j++) {
        if (i === j) continue;
        const other = birds[j];
        const distSq = bird.position.distanceToSquared(other.position);
        if (distSq < SEPARATION_DISTANCE * SEPARATION_DISTANCE) {
          _diff.subVectors(bird.position, other.position);
          _diff.divideScalar(Math.max(distSq, 0.1));
          _separation.add(_diff);
        }
        if (distSq < ALIGNMENT_DISTANCE * ALIGNMENT_DISTANCE) {
          _alignment.add(other.velocity);
          _cohesion.add(other.position);
          cnt++;
        }
      }

      if (cnt > 0) {
        _alignment.divideScalar(cnt).normalize().multiplyScalar(SPEED);
        _cohesion.divideScalar(cnt);
        _cohesion.sub(bird.position);
        _cohesion.normalize().multiplyScalar(SPEED * 0.5);
      }

      if (bird.position.length() > BOUNDS) {
        _tempDir.copy(bird.position).negate().normalize().multiplyScalar(0.05);
        bird.acceleration.add(_tempDir);
      }

      bird.acceleration.add(_separation.multiplyScalar(0.04));
      bird.acceleration.add(_alignment.multiplyScalar(0.02));
      bird.acceleration.add(_cohesion.multiplyScalar(0.02));

      bird.velocity.add(bird.acceleration).clampLength(0, SPEED);
      bird.position.add(bird.velocity);
      bird.acceleration.set(0, 0, 0);

      dummy.position.copy(bird.position);
      if (bird.velocity.lengthSq() > 0.0001) {
        _tempDir.copy(bird.velocity).normalize();
        dummy.quaternion.setFromUnitVectors(_dummyUp, _tempDir);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[
        undefined as unknown as THREE.BufferGeometry,
        undefined as unknown as THREE.Material,
        BOID_COUNT,
      ]}
    >
      <coneGeometry ref={geomRef} args={[0.12, 0.6, 3]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        vertexShader={birdVertexShader}
        fragmentShader={birdFragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
};

export default Boids;
