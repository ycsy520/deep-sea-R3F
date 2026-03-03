## Deep Sea R3F Template

一个面向作品集与品牌展示的深海主题模板（Vite + React + TypeScript + Tailwind CSS v4 + Three.js/React Three Fiber）。
核心包含两大可复用能力：

- Boids 鱼群（Instanced Mesh + 物理规则）
- 深海背景（海底光斑 + GPU 粒子气泡）

> 适用于构建沉浸式互动首页、视觉探索页面与新媒体品牌站点。


### 功能亮点
- 高性能渲染：GPU 粒子系统（Points + 自定义 Shader）；Boids 使用 InstancedMesh 与零分配循环；着色器数学运算优化（替换部分 pow）。
- 渲染纯度：初始化使用确定性 PRNG（xorshift32），避免渲染期随机导致的不纯与双渲染伪影。
- 通透视觉：玻璃态导航、渐变光影背景、细腻的滚动与悬停微交互；CSS 全局平滑滚动并尊重系统“减少动态”。
- 架构韧性：WebGL2 支持检测；WebGL Context 丢失/恢复事件处理与可视化提示；Canvas 与 DOM 高频数据隔离。
- 响应式与可访问性：移动端粒子数量自适应、DPR 上限控制、Reduced Motion 支持、键盘可访问性完善。

### 近期优化摘要（已合并）
- 渲染循环净空：去除循环内临时对象创建，统一使用模块级临时向量与 for 循环，避免 GC 抖动（见 [Boids.tsx](file:///f:/git/aicode/xylon-portfolio/src/components/ThreeBackground/Boids.tsx)）。
- 渲染纯度：Boids 初始化与实例配色使用确定性 PRNG，保证在同一参数下结果可复现；`uTime` 仅通过材质 ref 更新（见 [Boids.tsx](file:///f:/git/aicode/xylon-portfolio/src/components/ThreeBackground/Boids.tsx)）。
- GPU 粒子：初始化随机改为轻量 xorshift32；背景平面缩放计算增加缓存，仅在相机参数变更时重算（见 [DeepSeaBackground.tsx](file:///f:/git/aicode/xylon-portfolio/src/components/ThreeBackground/DeepSeaBackground.tsx)）。
- 着色器：用连乘/平方根替代部分 `pow`，在不改视觉的前提下降低 ALU 压力（见 [shaders.ts](file:///f:/git/aicode/xylon-portfolio/src/components/ThreeBackground/shaders.ts)）。
- DOM 动画：SmoothScroll 与 CustomCursor 改为“按需 RAF + 停止条件”，并使用 `passive: true` 的滚动监听（见 [App.tsx](file:///f:/git/aicode/xylon-portfolio/src/App.tsx)）。
- 韧性与降级：增加 WebGL2 检测与 WebGL Context 丢失/恢复提示（见 [ThreeBackground/index.tsx](file:///f:/git/aicode/xylon-portfolio/src/components/ThreeBackground/index.tsx)）。


## 快速开始

```bash
# 安装依赖
npm i

# 开发模式
npm run dev

# 构建产物
npm run build

# 本地预览构建产物
npm run preview
```


## 目录结构（关键文件）

```
src/
  components/
    ThreeBackground/
      index.tsx               # Three 背景容器（含 Canvas / 相机控制 / 雾 / 韧性处理）
      DeepSeaBackground.tsx   # 海底光斑 + 气泡（GPU 粒子，确定性随机 + 缓存缩放）
      Boids.tsx               # Boids 鱼群（Instanced + 规则循环 + 确定性初始化）
      shaders.ts              # 背景与气泡的 GLSL 着色器（pow 优化）
  App.tsx                     # 页面骨架/导航/Hero/Works/Contact（SmoothScroll/CustomCursor 优化）
```


## 如何使用（两种方式）

### 方式 A：一体化背景容器（推荐）

适合快速接入 —— 在你的页面中直接挂载背景容器组件。

```tsx
// 函数：App 根组件 —— 挂载通用三维背景容器（含深海光斑、气泡与鱼群）
import ThreeBackground from './components/ThreeBackground';

export default function App() {
  return (
    <div className="min-h-screen">
      <ThreeBackground />
      {/* 其余内容 */}
    </div>
  );
}
```

容器内部已：
- 创建 <Canvas> 与雾（Fog）
- 布置相机响应（横竖屏）与视差（跟随鼠标/指针）
- 挂载 DeepSeaBackground 与 Boids
- 处理 WebGL2 不支持与 WebGL Context 丢失/恢复提示


### 方式 B：在你自己的 Canvas 中按需组合

适合已有 R3F 场景，或需要定制相机/后期管线：

```tsx
// 函数：CustomScene —— 在你的 Canvas 中按需挂载深海背景与 Boids 鱼群
// 说明：展示如何在自定义 Canvas 中组合两个核心组件
import { Canvas } from '@react-three/fiber';
import DeepSeaBackground from './components/ThreeBackground/DeepSeaBackground';
import Boids from './components/ThreeBackground/Boids';

export default function CustomScene() {
  return (
    <Canvas camera={{ position: [0, 0, 40], fov: 75, near: 1, far: 1000 }}>
      {/* 可选：雾效 */}
      <fog attach="fog" args={[0x020813, 10, 80]} />

      {/* 海底光斑 + 气泡（GPU 粒子） */}
      <DeepSeaBackground />

      {/* Boids 鱼群 */}
      <Boids />
    </Canvas>
  );
}
```


## 组件说明与自定义

### DeepSeaBackground（海底光斑 + 气泡）
文件：`src/components/ThreeBackground/DeepSeaBackground.tsx`

- 海底光斑：片元着色器模拟“阳光穿透水面”的波动明暗与角度扰动。
- 气泡（GPU 粒子）：通过自定义着色器在 Vertex 阶段完成位置、生命周期、指数生长、合并/消失与侧向摆动；Fragment 模拟菲涅尔边缘与散射。
- 性能要点：
  - `uniforms` 通过 `useMemo` 缓存，时间 `uTime` 通过材质 ref 直接更新（避免 React 依赖突变）。
  - 初始化随机采用轻量 xorshift32（确定性、可复现），替代 `Math.random`/高开销三角函数方案。
  - 背景平面尺寸随相机参数变化缓存计算结果，仅在 z/fov/aspect 改变时重新计算。
  - 气泡群默认位于“左侧黄金分割线”位置，适配视觉平衡；数量移动端约 2500，桌面约 7000（可通过 props 配置）。

自定义方向：
- 修改粒子数量与范围：在组件顶部按需调整移动端/桌面阈值与喷口范围。
- 调整气泡位置：修改 `<points position={[viewport.width * -0.118, 0, 0]}>` 的系数实现黄金分割/对齐。
- 调整背景光斑风格：在 `src/components/ThreeBackground/shaders.ts` 中修改 `bgFragmentShader` 的波动频率、相位混合与亮度曲线。


### Boids（鱼群）
文件：`src/components/ThreeBackground/Boids.tsx`

- 基于常见三原则（分离/对齐/凝聚）实现群体行为，数据在 `useMemo` 初始化。
- 以 InstancedMesh 承载，几何为旋转过的锥体（朝向速度向量），每帧使用可复用向量避免 GC。
- 初始化位置/速度与实例配色使用确定性 PRNG（基于参数种子），渲染纯净且结果可复现。
- `uniforms` 对象稳定，`uTime` 仅通过材质 ref 更新；循环采用 for + 复用 Vector3，避免 `forEach/map` 带来的闭包与分配。
- 可调参数：
  - `BOID_COUNT`（数量，移动端/桌面可分开设定）
  - `BOUNDS`（活动范围）、`SPEED`（最大速）、`SEPARATION_DISTANCE`、`ALIGNMENT_DISTANCE`
  - 色板在 `colors` 初始化时定义，可替换为品牌色或动态策略


### ThreeBackground（容器）
文件：`src/components/ThreeBackground/index.tsx`

- 包含：
  - `<Canvas>` 配置（抗锯齿、dpr、near/far）
  - `CameraRig`（视差：跟随鼠标/指针，触摸设备自动收敛）
  - `ResponsiveCamera`（横竖屏自适应 z 轴）
  - 雾效（Fog）与背景组件挂载顺序
- 与页面叠放关系建议：
  - 容器建议 `z-0` + `pointer-events: none`，页面内容采用更高层级，避免背景挡住交互。
- 韧性处理：
  - WebGL2 支持检测并友好提示
  - 监听 `webglcontextlost/webglcontextrestored`，在丢失时给出覆盖提示，恢复后自动关闭


## 性能与可访问性

- InstancedMesh + 复用向量：Boids 循环内不创建临时对象，避免抖动与 GC。
- GPU 粒子：无 CPU 物理，生命周期与运动在 Vertex Shader 完成。
- Reduced Motion：对 `prefers-reduced-motion` 启用降动效策略；全局 `scroll-behavior: smooth` 并在 reduced-motion 下回退为 `auto`。
- DOM 动画循环：SmoothScroll/CustomCursor 采用“按需 RAF + 停止条件”，滚动监听使用 `{ passive: true }`。
- DPR 上限：根据设备像素比设置 `dpr={[1, Math.min(1.8, devicePixelRatio)]}`，兼顾清晰度与能耗。
- Focus 样式：键盘可访问性启用 `:focus-visible` 描边。

### 动效与像素密度进阶优化

```tsx
// 函数：ThreeBackground —— 自适应 dpr 上限，降低高分屏能耗
// 说明：将 dpr 上限与设备像素比绑定，取较小值
import { Canvas } from '@react-three/fiber';
export default function ThreeBackground() {
  const maxDpr = typeof window !== 'undefined' ? Math.min(1.8, window.devicePixelRatio || 1) : 1.5;
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 40], fov: 75, near: 1, far: 1000 }} dpr={[1, maxDpr]} gl={{ antialias: true, alpha: false }}>
        {/* ... */}
      </Canvas>
    </div>
  );
}
```

```tsx
// 函数：SmoothScroll —— 尊重 prefers-reduced-motion，必要时禁用 JS 平滑滚动
// 说明：触屏或 reduced-motion 时直接返回原生滚动容器
import { useEffect, useRef, useState, type ReactNode } from 'react';
export default function SmoothScroll({ children }: { children: ReactNode }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [pageHeight, setPageHeight] = useState(0);
  const [isTouchDevice] = useState(() => typeof window !== 'undefined'
    && ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches));
  const [reduced] = useState(() => typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    if (isTouchDevice || reduced) return;
    const updateHeight = () => {
      if (scrollContainerRef.current) setPageHeight(scrollContainerRef.current.getBoundingClientRect().height);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    if (scrollContainerRef.current) observer.observe(scrollContainerRef.current);

    let current = 0, target = 0, reqId = 0;
    const render = () => {
      target = window.scrollY;
      current = current + (target - current) * 0.08;
      if (scrollContainerRef.current) scrollContainerRef.current.style.transform = `translate3d(0, -${current}px, 0)`;
      reqId = requestAnimationFrame(render);
    };
    reqId = requestAnimationFrame(render);
    return () => { observer.disconnect(); cancelAnimationFrame(reqId); };
  }, [isTouchDevice, reduced]);

  if (isTouchDevice || reduced) return <div className="relative z-10 w-full overflow-x-hidden">{children}</div>;
  return (
    <>
      <div style={{ height: pageHeight }} />
      <div ref={scrollContainerRef} className="fixed top-0 left-0 w-full overflow-hidden will-change-transform z-10">{children}</div>
    </>
  );
}
```


## 常见问题（FAQ）

1. 背景不显示/Three 效果消失？  
   - 确认背景容器未使用负 z-index。建议容器使用 `z-0` 并设置 `pointer-events: none`，以避免被 `body/html` 背景层压住。
2. 着色器时间不更新/动画静止？  
   - 确认 `DeepSeaBackground` 与 `Boids` 使用材质 ref 更新 `uniforms.uTime.value`，且 `uniforms` 本身由 `useMemo` 缓存。
3. 移动端发热/卡顿？  
   - 适当减少 `BOID_COUNT` 与气泡数量；降低 `dpr` 上限或视差系数；调小片元着色器的波动强度与频率。
4. 页面滚动不丝滑？  
   - 已在全局 CSS 中启用 `scroll-behavior: smooth`。如使用了自定义 SmoothScroll，确保在触屏设备与 `prefers-reduced-motion: reduce` 下自动回退到原生滚动。

## 安全与合规（前端最佳实践）
- 外链统一使用 `target="_blank" rel="noopener noreferrer"`，防止 `window.opener` 劫持。
- 不在前端硬编码任何密钥/私有配置（如需，改由后端代理或使用 .env 构建注入）。
- 依赖更新前运行 `npm audit` 与锁定版本（lockfile）以减少供应链风险。

## 组件参数化建议（可选增强）

```tsx
// 函数：Boids —— 通过 props 暴露数量/速度/边界，增强复用
type BoidsProps = { count?: number; maxSpeed?: number; bounds?: number };
function Boids({ count = 150, maxSpeed = 0.08, bounds = 30 }: BoidsProps) {
  // ...
}
```

```tsx
// 函数：DeepSeaBackground —— 通过 props 暴露移动端/桌面粒子数与水平偏移（黄金分割线）
type DeepSeaBackgroundProps = { mobileCount?: number; desktopCount?: number; xOffsetRatio?: number };
function DeepSeaBackground({ mobileCount = 2500, desktopCount = 7000, xOffsetRatio = -0.118 }: DeepSeaBackgroundProps) {
  // ...
}
```

## 部署到 GitHub

1. 初始化仓库并提交：

```bash
git init
git add .
git commit -m "feat: init deep sea r3f portfolio"
```

2. 关联远端并推送：

```bash
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

3. 构建产物位于 `dist/`。如果使用 GitHub Pages，可选择：
   - 直接启用 “Pages → Deploy from a branch → 选择 /root (dist) 的静态发布分支”
   - 或用 Action（vite + pages）自动部署（可参考官方模板）


## 许可证
MIT
