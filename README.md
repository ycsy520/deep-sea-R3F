## XYLON Portfolio · Deep Sea R3F Template

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
