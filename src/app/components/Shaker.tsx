'use client';
import { useEffect, useRef, useState } from 'react';

const STICKERS = ['/stickers/1.png', '/stickers/2.png'];
const COUNT = 14;
const W = 200, H = 200, SIZE = 44;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function makeSticker(img: HTMLImageElement, size: number) {
  const pad = 10, o = 3;
  const dpr = window.devicePixelRatio || 1;
  const r = size / Math.max(img.width, img.height);
  const w = Math.round(img.width * r), h = Math.round(img.height * r);
  const cw = w + pad * 2, ch = h + pad * 2;

  // 테두리: 이미지를 사방으로 겹쳐 그린 뒤 반투명 흰색으로 칠함
  const t = document.createElement('canvas');
  t.width = cw * dpr; t.height = ch * dpr;
  const tx = t.getContext('2d')!;
  tx.scale(dpr, dpr);
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    tx.drawImage(img, pad + Math.cos(ang) * o, pad + Math.sin(ang) * o, w, h);
  }
  tx.globalCompositeOperation = 'source-in';
  tx.fillStyle = 'rgba(255,255,255,0.38)';
  tx.fillRect(0, 0, cw, ch);

  // 테두리에 그림자를 입히고 그 위에 원본 그림
  const c = document.createElement('canvas');
  c.width = cw * dpr; c.height = ch * dpr;
  const x = c.getContext('2d')!;
  x.shadowColor = 'rgba(160,110,130,0.45)';
  x.shadowBlur = 2 * dpr;
  x.shadowOffsetY = 1 * dpr;
  x.drawImage(t, 0, 0);
  x.shadowColor = 'transparent';
  x.scale(dpr, dpr);
  x.drawImage(img, pad, pad, w, h);
  return { canvas: c, w: cw, h: ch };
}

export default function Shaker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pos, setPos] = useState({ x: 40, y: 120 });

  const matterRef = useRef<any>(null);
  const bodiesRef = useRef<any[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimer = useRef<any>(null);
  const drag = useRef<{ sx: number; sy: number; lx: number; ly: number } | null>(null);

  const playRattle = () => {
    const a = (audioRef.current ??= new Audio('/shake.mp3'));
    a.loop = true;
    a.volume = 0.6;
    if (a.paused) a.play().catch(() => {});
    clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => a.pause(), 180);
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

      const sprites = imgs.map((im) => makeSticker(im, SIZE));
      const items: { body: any; sp: { canvas: HTMLCanvasElement; w: number; h: number } }[] = [];
      for (let i = 0; i < COUNT; i++) {
        const sp = sprites[i % sprites.length];
        const body = Bodies.circle(
          SIZE / 2 + Math.random() * (W - SIZE),
          Math.random() * (H / 2),
          SIZE * 0.42,
          { restitution: 0.2, friction: 0.6, frictionAir: 0.03 }
        );
        items.push({ body, sp });
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
        items.forEach(({ body, sp }) => {
          ctx.save();
          ctx.translate(body.position.x, body.position.y);
          ctx.rotate(body.angle);
          ctx.drawImage(sp.canvas, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
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
