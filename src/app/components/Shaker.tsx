'use client';
import { useEffect, useRef, useState } from 'react';

const STICKERS = ['/stickers/1.png', '/stickers/2.png', '/stickers/3.png'];
const COUNT = 10;
const W = 200, H = 200, SIZE = 44;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export default function Shaker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pos, setPos] = useState({ x: 40, y: 120 });

  const matterRef = useRef<any>(null);
  const bodiesRef = useRef<any[]>([]);
  const audioRef = useRef<AudioContext | null>(null);
  const lastSound = useRef(0);
  const drag = useRef<{ sx: number; sy: number; lx: number; ly: number } | null>(null);

  const playRattle = () => {
    const now = performance.now();
    if (now - lastSound.current < 90) return;
    lastSound.current = now;
    const ctx = (audioRef.current ??= new AudioContext());
    const len = Math.floor(ctx.sampleRate * 0.08);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1200;
    const g = ctx.createGain();
        g.gain.value = 0.18;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start();
  };

  const shake = (dx: number, dy: number) => {
    const M = matterRef.current;
    if (!M) return;
    const power = Math.hypot(dx, dy);
    if (power < 2) return;
    bodiesRef.current.forEach((b) => {
      M.Body.setVelocity(b, {
        x: clamp(b.velocity.x - dx * 0.25 + (Math.random() - 0.5) * 0.6, -14, 14),
        y: clamp(b.velocity.y - dy * 0.25 + (Math.random() - 0.5) * 0.6, -14, 14),
      });
      M.Body.setAngularVelocity(b, b.angularVelocity + (Math.random() - 0.5) * 0.03);
    });
    if (power > 8) playRattle();
  };

  useEffect(() => {
    let raf = 0;
    let dead = false;
    let engine: any;

    (async () => {
      const M = (await import('matter-js')).default;
      matterRef.current = M;
      const { Engine, Bodies, Composite } = M;

      const imgs = (await Promise.all(
        STICKERS.map(
          (src) =>
            new Promise<HTMLImageElement | null>((res) => {
              const im = new Image();
              im.onload = () => res(im);
              im.onerror = () => res(null);
              im.src = src;
            })
        )
      )).filter(Boolean) as HTMLImageElement[];
      if (dead || !imgs.length) return;

      engine = Engine.create();
      const t = 100;
      Composite.add(engine.world, [
        Bodies.rectangle(W / 2, H + t / 2, W + t * 2, t, { isStatic: true }),
        Bodies.rectangle(W / 2, -t / 2, W + t * 2, t, { isStatic: true }),
        Bodies.rectangle(-t / 2, H / 2, t, H * 2, { isStatic: true }),
        Bodies.rectangle(W + t / 2, H / 2, t, H * 2, { isStatic: true }),
      ]);

      const items: { body: any; img: HTMLImageElement }[] = [];
      for (let i = 0; i < COUNT; i++) {
        const img = imgs[i % imgs.length];
        const body = Bodies.circle(
          SIZE / 2 + Math.random() * (W - SIZE),
          Math.random() * (H / 2),
          SIZE * 0.42,
          { restitution: 0.2, friction: 0.6, frictionAir: 0.03 }
        );
        items.push({ body, img });
      }
      Composite.add(engine.world, items.map((i) => i.body));
      bodiesRef.current = items.map((i) => i.body);

      const canvas = canvasRef.current!;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);

      const loop = () => {
        Engine.update(engine, 1000 / 60);
        ctx.clearRect(0, 0, W, H);
        items.forEach(({ body, img }) => {
          const r = SIZE / Math.max(img.width, img.height);
          const w = img.width * r, h = img.height * r;
          ctx.save();
          ctx.translate(body.position.x, body.position.y);
          ctx.rotate(body.angle);
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
          ctx.restore();
        });
        raf = requestAnimationFrame(loop);
      };
      loop();
    })();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      if (engine) matterRef.current?.Engine.clear(engine);
    };
  }, []);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX - pos.x, sy: e.clientY - pos.y, lx: e.clientX, ly: e.clientY };
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    setPos({ x: e.clientX - d.sx, y: e.clientY - d.sy });
    shake(e.clientX - d.lx, e.clientY - d.ly);
    d.lx = e.clientX;
    d.ly = e.clientY;
  };
  const onUp = () => { drag.current = null; };

  return (
    <div
      style={{
        position: 'fixed', left: pos.x, top: pos.y, zIndex: 50,
        background: 'rgba(255,255,255,.88)', borderRadius: 18, padding: 12,
        boxShadow: '0 6px 20px rgba(243,199,215,.55)', userSelect: 'none',
      }}
    >
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        style={{
          cursor: 'grab', touchAction: 'none', padding: '2px 4px 10px',
          fontSize: 11, fontWeight: 600, letterSpacing: 2, color: '#e7a4b7',
        }}
      >
        SHAKER
      </div>
      <div style={{
        borderRadius: 12, border: '1.5px solid #f3c7d7', overflow: 'hidden',
        background: 'linear-gradient(180deg, #fff7fa, #f3c7d7)',
      }}>
        <canvas ref={canvasRef} style={{ width: W, height: H, display: 'block' }} />
      </div>
    </div>
  );
}
