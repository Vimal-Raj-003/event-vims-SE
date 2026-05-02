"use client";

import { useEffect, useRef, useCallback } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseOpacity: number;
  layer: "back" | "front";
}

interface Pulse {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
  opacity: number;
}

export function NetworkAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const pulsesRef = useRef<Pulse[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const frameRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });

  const isMobile = useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const dpr = window.devicePixelRatio || 1;
    const mobile = isMobile();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w: rect.width, h: rect.height };
    };
    resize();

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas.parentElement || canvas);

    // Initialize nodes
    const { w, h } = sizeRef.current;
    const nodes: Node[] = [];
    const backCount = mobile ? 12 : 24;
    const frontCount = mobile ? 4 : 7;

    for (let i = 0; i < backCount; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: Math.random() * 1 + 1,
        baseOpacity: Math.random() * 0.08 + 0.1,
        layer: "back",
      });
    }
    for (let i = 0; i < frontCount; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: Math.random() * 2.5 + 3,
        baseOpacity: Math.random() * 0.25 + 0.45,
        layer: "front",
      });
    }
    nodesRef.current = nodes;

    // Initialize pulse dots
    const pulses: Pulse[] = [];
    if (!mobile) {
      for (let i = 0; i < 5; i++) {
        pulses.push({
          fromNode: Math.floor(Math.random() * nodes.length),
          toNode: Math.floor(Math.random() * nodes.length),
          progress: Math.random(),
          speed: Math.random() * 0.003 + 0.002,
          opacity: Math.random() * 0.4 + 0.3,
        });
      }
    }
    pulsesRef.current = pulses;

    // Mouse tracking
    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    if (!mobile) {
      canvas.parentElement?.addEventListener("mousemove", onMouse);
      canvas.parentElement?.addEventListener("mouseleave", onMouseLeave);
    }

    const connectionDist = mobile ? 100 : 150;
    const mouseInfluence = 80;

    const draw = () => {
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Update positions
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > w) node.vx *= -1;
        if (node.y < 0 || node.y > h) node.vy *= -1;
        node.x = Math.max(0, Math.min(w, node.x));
        node.y = Math.max(0, Math.min(h, node.y));
      }

      // Draw back-layer connections (very subtle)
      const backNodes = nodes.filter((n) => n.layer === "back");
      for (let i = 0; i < backNodes.length; i++) {
        for (let j = i + 1; j < backNodes.length; j++) {
          const a = backNodes[i]!;
          const b = backNodes[j]!;
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < connectionDist * 1.2) {
            const opacity = (1 - dist / (connectionDist * 1.2)) * 0.06;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(129,140,248,${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw back-layer nodes
      for (const node of backNodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(129,140,248,${node.baseOpacity})`;
        ctx.fill();
      }

      // Draw front-layer connections
      const frontNodes = nodes.filter((n) => n.layer === "front");
      for (let i = 0; i < frontNodes.length; i++) {
        for (let j = i + 1; j < frontNodes.length; j++) {
          const a = frontNodes[i]!;
          const b = frontNodes[j]!;
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < connectionDist) {
            const baseOpacity = (1 - dist / connectionDist) * 0.2;
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            const mouseDist = Math.hypot(midX - mx, midY - my);
            const boost = mouseDist < mouseInfluence ? (1 - mouseDist / mouseInfluence) * 0.2 : 0;
            const opacity = baseOpacity + boost;

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(129,140,248,${opacity})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw front-layer nodes with glow
      for (const node of frontNodes) {
        const mouseDist = Math.hypot(node.x - mx, node.y - my);
        const boost = mouseDist < mouseInfluence ? (1 - mouseDist / mouseInfluence) * 0.3 : 0;
        const opacity = node.baseOpacity + boost;

        // Glow halo
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, node.radius * 4
        );
        gradient.addColorStop(0, `rgba(129,140,248,${opacity * 0.3})`);
        gradient.addColorStop(1, "rgba(129,140,248,0)");
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(129,140,248,${opacity})`;
        ctx.fill();
      }

      // Draw pulse dots traveling along connections
      for (const pulse of pulses) {
        if (pulse.fromNode >= nodes.length || pulse.toNode >= nodes.length) continue;
        const from = nodes[pulse.fromNode]!;
        const to = nodes[pulse.toNode]!;
        const dist = Math.hypot(from.x - to.x, from.y - to.y);
        if (dist > connectionDist * 1.5) continue;

        pulse.progress += pulse.speed;
        if (pulse.progress > 1) {
          pulse.progress = 0;
          pulse.fromNode = Math.floor(Math.random() * nodes.length);
          pulse.toNode = Math.floor(Math.random() * nodes.length);
        }

        const px = from.x + (to.x - from.x) * pulse.progress;
        const py = from.y + (to.y - from.y) * pulse.progress;

        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(196,181,253,${pulse.opacity})`;
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    if (prefersReducedMotion) {
      // Draw one static frame
      draw();
    } else {
      frameRef.current = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      if (!mobile) {
        canvas.parentElement?.removeEventListener("mousemove", onMouse);
        canvas.parentElement?.removeEventListener("mouseleave", onMouseLeave);
      }
    };
  }, [isMobile]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    />
  );
}
