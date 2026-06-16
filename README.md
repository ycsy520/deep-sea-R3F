## Deep Sea R3F Template

一个面向作品集、品牌展示与沉浸式首页的深海主题模板，基于 Vite + React + TypeScript + Tailwind CSS v4 + Three.js / React Three Fiber。

当前版本的视觉方向已经从早期的“气泡粒子背景”切换为更接近 `aurelia` 项目的深海氛围：

- 世界空间深海雾场背景
- 冷蓝系 Boids 鱼群
- 极弱化的体积光辅助层
- ACES + Bloom 后期链路

> 适用于构建沉浸式互动首页、视觉探索页面与新媒体品牌站点。

## 当前特性

- 深海背景：参考 `aurelia` 的 `fogFunction` 思路，使用世界空间视线方向与 `triNoise3D` 构建深海雾场。
- 柔和后期：使用 ACES Filmic Tone Mapping 与 Bloom，提升顶部蓝光与雾场的柔和扩散感。
- 鱼群系统：Boids 使用 `InstancedMesh`，并接入统一主光方向、相机位置与雾衰减。
- 稳定渲染：初始化使用确定性 PRNG，避免渲染期随机导致的不纯与闪烁问题。
- 场景韧性：包含 WebGL2 能力检测、WebGL Context 丢失/恢复提示、DPR 上限控制。
- 交互体验：支持视差相机、平滑滚动、自定义光标、Reduced Motion 兼容。

## 已移除内容

- 已移除旧版 GPU 气泡粒子系统。
- 未引入 `aurelia` 中依赖水母体系的 godrays 方案。
- 当前光线表达以背景雾场为主，前景体积光仅作很弱的辅助层。

## 快速开始

```bash
# 安装依赖
npm i

# 开发模式
npm run dev

# 构建
npm run build

# 预览构建产物
npm run preview
```

## 目录结构

```text
src/
  components/
    ThreeBackground/
      index.tsx               # Three 背景容器（Canvas / 相机 / 雾 / ACES / Bloom / 韧性处理）
      DeepSeaBackground.tsx   # 深海背景主体（背景平面 + 极弱体积光辅助层）
      Boids.tsx               # Boids 鱼群（InstancedMesh + 雾融合 + 主光方向）
      shaders.ts              # 背景、鱼群、体积光相关 GLSL Shader
  App.tsx                     # 页面骨架 / Navbar / Hero / Works / Contact
```

## 如何使用

### 方式 A：直接挂载一体化背景容器

适合大多数作品集和品牌站点。

```tsx
import ThreeBackground from './components/ThreeBackground';

export default function App() {
  return (
    <div className="min-h-screen">
      <ThreeBackground />
      {/* 其余页面内容 */}
    </div>
  );
}
```

容器内部已完成：

- 创建 `Canvas`
- 配置相机响应与鼠标视差
- 注入雾、ACES、Bloom 与 WebGL 韧性处理
- 挂载 `DeepSeaBackground` 与 `Boids`

### 方式 B：在你自己的 Canvas 中按需组合

适合已有 R3F 场景，或希望自己控制相机和后期。

```tsx
import { Canvas } from '@react-three/fiber';
import DeepSeaBackground from './components/ThreeBackground/DeepSeaBackground';
import Boids from './components/ThreeBackground/Boids';

export default function CustomScene() {
  return (
    <Canvas camera={{ position: [0, 0, 40], fov: 75 }}>
      <fog attach="fog" args={[0x000000, 18, 120]} />
      <DeepSeaBackground />
      <Boids />
    </Canvas>
  );
}
```

## 视觉实现说明

- 背景主观感受主要来自 `src/components/ThreeBackground/shaders.ts` 中的 `bgFragmentShader`。
- 当前背景算法已经尽量向 `aurelia/src/background.js` 的雾场结构收敛。
- 当前后期强度参考 `aurelia/src/app.js` 中的 ACES 与 Bloom 参数。
- 当前并未直接复制 `aurelia` 的 WebGPU / TSL / 水母依赖链，而是将其核心视觉思路适配到当前 WebGL + R3F 项目。

## 运行要求

- 推荐使用支持 WebGL2 的现代浏览器。
- Node.js 建议使用 18+。
- Windows / macOS / Linux 均可运行，本项目默认通过 `npm` 管理依赖。

## 仓库地址

- GitHub: <https://github.com/ycsy520/deep-sea-R3F>
