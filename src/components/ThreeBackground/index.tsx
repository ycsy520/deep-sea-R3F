
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import DeepSeaBackground from './DeepSeaBackground';
import Boids from './Boids';

/**
 * 检测当前环境是否支持 WebGL2
 * @returns 支持 WebGL2 返回 true，否则返回 false
 */
function canUseWebGL2() {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

type WebGLContextEventsProps = {
  onLost: () => void;
  onRestored: () => void;
};

/**
 * 监听 WebGL context 丢失/恢复事件，避免用户遇到无提示白屏
 */
const WebGLContextEvents = ({ onLost, onRestored }: WebGLContextEventsProps) => {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    const handleLost = (event: Event) => {
      event.preventDefault();
      onLost();
    };

    const handleRestored = () => {
      onRestored();
    };

    canvas.addEventListener('webglcontextlost', handleLost, { passive: false });
    canvas.addEventListener('webglcontextrestored', handleRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost);
      canvas.removeEventListener('webglcontextrestored', handleRestored);
    };
  }, [gl, onLost, onRestored]);

  return null;
};

// 相机控制组件 (实现视差效果)
const CameraRig = () => {
  const { camera, pointer } = useThree();
  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const cameraRef = useRef(camera);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);
  
  useFrame(() => {
    // 原始逻辑: mouseX = (event.clientX - windowHalfX) * 0.05;
    // R3F pointer.x 是 -1 到 1。
    // 假设宽 1920 -> half 960 -> max delta 960 -> * 0.05 = 48.
    // 所以 pointer.x * 48 大概就是原始的偏移量。
    // 这里我们稍微调整参数以获得舒适的效果。
    
    const targetX = isTouch ? 0 : pointer.x * 20;
    const targetY = isTouch ? 0 : -pointer.y * 20; // pointer.y 向上为正，原始 clientY 向下为正，需反转
    
    // 平滑插值
    const cam = cameraRef.current;
    cam.position.x += (targetX - cam.position.x) * 0.05;
    cam.position.y += (targetY - cam.position.y) * 0.05;
    
    cam.lookAt(0, 0, 0);
  });
  
  return null;
};

// 响应式相机位置调整
const ResponsiveCamera = () => {
  const { camera, size } = useThree();
  const cameraRef = useRef(camera);
  
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    const isPortrait = size.height > size.width;
    const cam = cameraRef.current;
    cam.position.z = isPortrait ? 55 : 40;
    cam.updateProjectionMatrix();
  }, [size]);
  
  return null;
};

const ThreeBackground = () => {
  const [isContextLost, setIsContextLost] = useState(false);
  const webgl2Supported = useMemo(() => canUseWebGL2(), []);
  const maxDpr = typeof window !== 'undefined' ? Math.min(1.8, window.devicePixelRatio || 1) : 1.5;

  const handleContextLost = useCallback(() => {
    setIsContextLost(true);
  }, []);

  const handleContextRestored = useCallback(() => {
    setIsContextLost(false);
  }, []);

  if (!webgl2Supported) {
    return (
      <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none">
        <div className="absolute left-4 bottom-4 text-[11px] tracking-[0.26em] uppercase text-blue-200/70">
          WebGL2 NOT SUPPORTED
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none">
      {isContextLost && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#020813]/70 backdrop-blur-xl">
          <div className="text-center px-6">
            <div className="text-white text-sm tracking-[0.22em] uppercase">WebGL Context Lost</div>
            <div className="mt-3 text-blue-200/80 text-xs tracking-[0.18em] uppercase">
              请刷新页面或切换到其他标签再返回
            </div>
          </div>
        </div>
      )}
      <Canvas
        camera={{ position: [0, 0, 40], fov: 75, near: 1, far: 1000 }}
        dpr={[1, maxDpr]} // 支持高清屏且自适应上限
        gl={{ antialias: true, alpha: false }}
      >
        <WebGLContextEvents onLost={handleContextLost} onRestored={handleContextRestored} />
        <CameraRig />
        <ResponsiveCamera />
        
        
        <fog attach="fog" args={[0x020813, 10, 80]} />
        
        {/* 内容组件 */}
        <DeepSeaBackground />
        <Boids />
      </Canvas>
    </div>
  );
};

export default ThreeBackground;
