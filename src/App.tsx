import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Menu, X, ArrowUpRight, Github, Twitter, Mail, Instagram, ChevronDown } from 'lucide-react';
import ThreeBackground from './components/ThreeBackground';

// --- 工具函数 ---
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

// --- 核心组件：加载动画 (Preloader) ---
interface PreloaderProps {
  onComplete: () => void;
}

const Preloader = ({ onComplete }: PreloaderProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 15) + 2;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(onComplete, 800);
      }
      setProgress(current);
    }, 150);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[100] bg-[#020813] flex flex-col items-center justify-center transition-transform duration-1000 ease-[cubic-bezier(0.87,0,0.13,1)] ${progress === 100 ? '-translate-y-full delay-500' : ''}`}>
      <div className="overflow-hidden mb-4">
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">
          XYLON.
        </h1>
      </div>
      <div className="w-48 h-[1px] bg-[#051c33] relative overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-white transition-all duration-200 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-4 text-blue-200 text-xs tracking-[0.3em] font-mono opacity-80">
        {progress.toString().padStart(3, '0')}% / DEEP SEA PROTOCOL
      </div>
    </div>
  );
};

// --- 核心组件：定制化光标 (Custom Cursor) ---
const CustomCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isTouch] = useState(() => {
    if (typeof window !== 'undefined') {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
    }
    return false;
  });

  useEffect(() => {
    // 检测是否为触摸设备，触屏设备直接禁用自定义光标以防止交互残留
    if (isTouch) {
      document.body.style.cursor = 'auto'; // 恢复原生逻辑
      return;
    }

    document.body.style.cursor = 'none';

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;
    let reqId = 0;
    let isRunning = false;
    let hovering = false;

    const render = () => {
      cursorX = lerp(cursorX, mouseX, 0.15);
      cursorY = lerp(cursorY, mouseY, 0.15);
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
      }
      const dx = mouseX - cursorX;
      const dy = mouseY - cursorY;
      if (dx * dx + dy * dy < 0.25) {
        isRunning = false;
        reqId = 0;
        return;
      }
      reqId = requestAnimationFrame(render);
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isRunning) {
        isRunning = true;
        reqId = requestAnimationFrame(render);
      }
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const next = Boolean(target.closest('a, button, .hover-target'));
      if (next !== hovering) {
        hovering = next;
        setIsHovering(next);
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const next = Boolean(target.closest('a, button, .hover-target'));
      if (next !== hovering) {
        hovering = next;
        setIsHovering(next);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', onMouseOver);
    window.addEventListener('mouseout', onMouseOut);

    isRunning = true;
    reqId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
      window.removeEventListener('mouseout', onMouseOut);
      if (reqId) cancelAnimationFrame(reqId);
      document.body.style.cursor = 'auto';
    };
  }, [isTouch]);

  if (isTouch) return null;

  return (
    <div
      ref={cursorRef}
      className={`fixed top-0 left-0 pointer-events-none z-[999] mix-blend-difference flex items-center justify-center transition-[width,height,opacity,filter] duration-300 ease-out ${isHovering ? 'w-20 h-20' : 'w-10 h-10'} rounded-full`}
    >
      <div className={`absolute inset-0 rounded-full border ${isHovering ? 'border-white/40 bg-white/10' : 'border-white/70 bg-white/5'} backdrop-blur-md`} />
      <div className={`absolute rounded-full bg-white ${isHovering ? 'w-2 h-2' : 'w-1.5 h-1.5'}`} />
      <span className={`text-black text-[10px] font-bold tracking-widest uppercase transition-opacity duration-200 ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
        VIEW
      </span>
    </div>
  );
};

// --- 核心组件：平滑滚动包装器 (Smooth Scroll) ---
const SmoothScroll = ({ children }: { children: ReactNode }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [pageHeight, setPageHeight] = useState(0);
  const [isTouchDevice] = useState(() => {
    if (typeof window !== 'undefined') {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
    }
    return false;
  });
  const [reduced] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    // 触屏设备（手机/iPad）禁用 JS 拦截的平滑滚动，保留原生顺滑的弹性滚动体验
    if (isTouchDevice || reduced) {
      return;
    }

    const el = scrollContainerRef.current;
    if (!el) return;

    let current = window.scrollY;
    let target = current;
    let reqId = 0;
    let isRunning = false;

    const render = () => {
      current = lerp(current, target, 0.12);
      el.style.transform = `translate3d(0, -${current}px, 0)`;

      const delta = target - current;
      if (delta * delta < 0.25) {
        el.style.transform = `translate3d(0, -${target}px, 0)`;
        isRunning = false;
        reqId = 0;
        return;
      }
      reqId = requestAnimationFrame(render);
    };

    const requestTick = () => {
      if (isRunning) return;
      isRunning = true;
      reqId = requestAnimationFrame(render);
    };

    const onScroll = () => {
      target = window.scrollY;
      requestTick();
    };

    const updateHeight = () => {
      setPageHeight(el.getBoundingClientRect().height);
      onScroll();
    };

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    updateHeight();
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (reqId) cancelAnimationFrame(reqId);
    };
  }, [isTouchDevice, reduced]);

  if (isTouchDevice || reduced) {
    return <div className="relative z-10 w-full overflow-x-hidden">{children}</div>;
  }

  return (
    <>
      <div style={{ height: pageHeight }} />
      <div ref={scrollContainerRef} className="fixed top-0 left-0 w-full overflow-hidden will-change-transform z-10">
        {children}
      </div>
    </>
  );
};

// --- UI 组件 ---

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-4 sm:px-6 md:px-10 pt-4 sm:pt-6 md:pt-8">
      <div className="mx-auto max-w-7xl ui-glass ui-shadow-soft rounded-2xl px-4 sm:px-6 md:px-7 py-3.5 md:py-4 flex justify-between items-center">
        <div className="text-xl md:text-2xl font-bold tracking-tighter hover-target relative z-50">
          XYLON<span className="text-blue-600">.</span>
        </div>

        <div className="hidden md:flex items-center gap-10 text-[11px] uppercase tracking-[0.26em] font-medium ui-text-muted">
          <a href="#about" className="hover:text-white transition-colors hover-target">品牌介绍</a>
          <a href="#works" className="hover:text-white transition-colors hover-target">精选作品</a>
          <a href="#contact" className="hover:text-white transition-colors hover-target">联系我们</a>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          aria-label="Toggle Menu"
          className="md:hidden hover-target relative z-50 rounded-full border ui-hairline bg-white/5 hover:bg-white/10 transition-colors p-2.5"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-[#020813]/70 backdrop-blur-2xl flex flex-col items-center justify-center gap-10 text-3xl font-black z-40">
          <a href="#about" onClick={() => setIsOpen(false)} className="hover-target hover:text-blue-300 transition-colors tracking-tight">ABOUT</a>
          <a href="#works" onClick={() => setIsOpen(false)} className="hover-target hover:text-blue-300 transition-colors tracking-tight">WORKS</a>
          <a href="#contact" onClick={() => setIsOpen(false)} className="hover-target hover:text-blue-300 transition-colors tracking-tight">CONTACT</a>
        </div>
      )}
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="relative h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
      <div className="z-10 mt-10 max-w-6xl mx-auto">
        <div className="inline-flex items-center gap-3 ui-glass rounded-full px-4 py-2 text-[10px] sm:text-[11px] uppercase tracking-[0.34em] ui-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400/80" />
          Generative · Interactive · Motion
        </div>

        <h1 className="mt-7 text-5xl sm:text-7xl md:text-[9rem] lg:text-[10rem] font-black tracking-tighter leading-[0.92] uppercase">
          <span className="text-white drop-shadow-2xl">Crafting</span>
          <br />
          <span className="bg-gradient-to-b from-white via-white to-blue-200/70 text-transparent bg-clip-text drop-shadow-2xl">Dimensions</span>
        </h1>

        <p className="mt-6 text-blue-200/80 text-sm sm:text-lg md:text-xl max-w-xs sm:max-w-2xl mx-auto uppercase tracking-[0.22em] font-light">
          数字化设计工作室 · 重新定义人机交互的感官深度
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <a
            href="#works"
            className="hover-target inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[11px] uppercase tracking-[0.28em] bg-blue-600/90 hover:bg-blue-600 transition-colors ui-shadow-soft"
          >
            Explore Works <ArrowUpRight size={16} />
          </a>
          <a
            href="#contact"
            className="hover-target inline-flex items-center justify-center rounded-full px-6 py-3 text-[11px] uppercase tracking-[0.28em] ui-glass hover:bg-white/10 transition-colors"
          >
            Get in Touch
          </a>
        </div>
      </div>

      <div className="absolute bottom-10 animate-bounce text-white/40 motion-reduce:animate-none">
        <ChevronDown size={22} className="md:w-7 md:h-7" />
      </div>
    </section>
  );
};

const ProjectCard = ({ title, category, initial }: { title: string; category: string; initial: string }) => (
  <div className="group hover-target relative aspect-[4/5] rounded-2xl cursor-none p-px bg-gradient-to-br from-white/14 via-white/6 to-blue-500/24 ui-shadow-soft">
    <div className="relative h-full rounded-[15px] overflow-hidden bg-[#030e1f]/55 backdrop-blur-xl border border-white/6">
      <div className="pointer-events-none absolute left-[-60%] top-[-20%] h-[140%] w-[40%] rotate-12 bg-gradient-to-r from-transparent via-white/14 to-transparent blur-md opacity-0 translate-x-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100 group-hover:translate-x-[260%]" />

      <div className="absolute inset-0 bg-gradient-to-t from-[#020813] via-transparent to-transparent opacity-90 transition-opacity duration-700 group-hover:opacity-100" />

      <div className="absolute inset-0 scale-100 group-hover:scale-[1.07] transition-transform duration-[1.4s] ease-out">
        <div className="w-full h-full flex items-center justify-center text-white/6 text-7xl md:text-9xl font-black italic select-none">
          {initial}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-6 md:p-10 translate-y-2 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
        <p className="text-[10px] md:text-xs uppercase tracking-[0.26em] text-blue-200/80 mb-2 md:mb-3 font-semibold">
          {category}
        </p>
        <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 md:mb-6 tracking-tight">
          {title}
        </h3>
        <div className="flex items-center text-white/90 text-xs md:text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
          探索详情 <ArrowUpRight className="ml-1 md:ml-2" size={16} />
        </div>
      </div>
    </div>
  </div>
);

const App = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="text-white selection:bg-blue-300 selection:text-[#020813] font-sans antialiased min-h-screen overflow-x-hidden">
      
      {!isLoaded && <Preloader onComplete={() => setIsLoaded(true)} />}
      
      <CustomCursor />
      <ThreeBackground />
      <Navbar />

      <SmoothScroll>
        <main className={`transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
          <Hero />

          <section id="about" className="py-24 md:py-40 px-6 md:px-8 max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 md:gap-20 items-center">
              <div>
                <h2 className="text-xs md:text-sm uppercase tracking-[0.4em] text-blue-300 font-black mb-6 md:mb-8 italic">// WHO WE ARE</h2>
                <p className="text-3xl sm:text-4xl md:text-6xl font-medium leading-[1.2] md:leading-[1.1] tracking-tighter drop-shadow-lg">
                  XYlon 是一家跨学科工作室，在这里 <span className="text-white opacity-90">艺术与代码</span> 完美碰撞。我们构建能够呼吸的数字生命。
                </p>
              </div>
              <div className="space-y-6 md:space-y-10 text-blue-100/60 text-base md:text-xl leading-relaxed font-light">
                <p>
                  我们专注于通过生成式算法和实时渲染技术，为品牌构建独特的数字化叙事。我们利用 WebGL 和集群算法模拟，创造出超越物理界限的深海级交互体验。
                </p>
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="h-[1px] w-12 md:w-20 bg-[#1a4b6e]" />
                  <span className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-blue-300">EST. 2024 / DIGITAL FRONTIER</span>
                </div>
              </div>
            </div>
          </section>

          <section id="works" className="py-24 md:py-40 px-6 md:px-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 md:mb-20 border-b border-[#0a1e38] pb-8 md:pb-10">
              <h2 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter uppercase drop-shadow-2xl mb-4 md:mb-0">Selected<br />Works</h2>
              <p className="text-blue-200 text-xs md:text-sm uppercase tracking-[0.2em] font-medium leading-loose opacity-70 max-w-xs md:text-right">
                专注于 WebGL、实时生成艺术与沉浸式交互设计。
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
              <ProjectCard title="Lumina" category="GENERATIVE ART" initial="L" />
              <ProjectCard title="Aether" category="3D INTERACTIVE" initial="A" />
              <ProjectCard title="Nebula" category="BRAND IDENTITY" initial="N" />
              <ProjectCard title="Pulse" category="MOTION SYSTEM" initial="P" />
              <ProjectCard title="Vertex" category="AR EXPERIENCE" initial="V" />
              <ProjectCard title="Origins" category="EXPERIMENTAL" initial="O" />
            </div>
          </section>

          <section id="contact" className="py-24 md:py-40 px-6 md:px-8 bg-[#020813]/80 backdrop-blur-3xl border-t border-[#0a1e38]">
            <div className="max-w-7xl mx-auto text-center">
              <div className="ui-glass ui-shadow-soft rounded-3xl border ui-hairline px-6 md:px-12 py-16 md:py-20">
                <h2 className="text-7xl md:text-[11rem] font-black tracking-tighter uppercase leading-none mb-14 italic text-white/90">
                  Let's<br /><span className="text-blue-600">Dive.</span>
                </h2>
                <div className="flex flex-col items-center gap-8 md:gap-10">
                  <a href="mailto:hello@xylon.studio" className="hover-target text-2xl sm:text-3xl md:text-5xl font-light hover:text-blue-300 transition-colors tracking-tight">
                    hello@xylon.studio
                  </a>
                  <div className="flex gap-8 md:gap-12 text-[#1a4b6e] pt-6 md:pt-10 justify-center">
                    <a href="#" aria-label="Twitter" className="hover-target hover:text-white transition-colors cursor-none"><Twitter size={24} className="md:w-7 md:h-7" /></a>
                    <a href="#" aria-label="GitHub" className="hover-target hover:text-white transition-colors cursor-none"><Github size={24} className="md:w-7 md:h-7" /></a>
                    <a href="#" aria-label="Instagram" className="hover-target hover:text-white transition-colors cursor-none"><Instagram size={24} className="md:w-7 md:h-7" /></a>
                    <a href="mailto:hello@xylon.studio" aria-label="Email" className="hover-target hover:text-white transition-colors cursor-none"><Mail size={24} className="md:w-7 md:h-7" /></a>
                  </div>
                </div>
              </div>
              
              <footer className="mt-24 md:mt-40 pt-8 md:pt-10 border-t border-[#0a1e38] flex flex-col md:flex-row justify-between items-center gap-4 text-[#1a4b6e] text-[8px] md:text-[10px] uppercase tracking-[0.4em] font-bold text-center md:text-left">
                <p>© 2026 XYLON DIGITAL STUDIO. ALL RIGHTS RESERVED.</p>
                <p className="text-blue-300 opacity-50">CRAFTED WITH PASSION & ALGORITHMS</p>
              </footer>
            </div>
          </section>
        </main>
      </SmoothScroll>
    </div>
  );
};

export default App;
