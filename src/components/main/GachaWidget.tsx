'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useMainStore } from '@/lib/mainStore';
import { MONS, Mon } from '@/lib/gachaMons';

type Phase = 'idle' | 'turn' | 'drop' | 'open' | 'result';
const DEX_KEY = 'ohome.gacha.dex';

// 돔 안 볼 배치 — x, y는 %, r은 기울기(도), f는 좌우반전
const PILE = [
  { x: 8,  y: 2,  r: -14, f: false },
  { x: 30, y: 6,  r: 10,  f: true  },
  { x: 52, y: 0,  r: -6,  f: false },
  { x: 72, y: 8,  r: 18,  f: true  },
  { x: 0,  y: 30, r: 8,   f: true  },
  { x: 20, y: 34, r: -20, f: false },
  { x: 42, y: 28, r: 14,  f: false },
  { x: 63, y: 32, r: -8,  f: true  },
  { x: 80, y: 36, r: 22,  f: false },
  { x: 10, y: 58, r: 16,  f: false },
  { x: 33, y: 56, r: -10, f: true  },
  { x: 55, y: 60, r: 6,   f: false },
  { x: 74, y: 58, r: -16, f: true  },
];

function loadDex(): string[] {
  try { return JSON.parse(localStorage.getItem(DEX_KEY) ?? '[]'); } catch { return []; }
}

export function GachaWidget() {
  const { editOn } = useMainStore();
  const [phase, setPhase] = useState<Phase>('idle');
  const [picked, setPicked] = useState<{ mon: Mon; src: string } | null>(null);
  const [dex, setDex] = useState<string[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setDex(loadDex());
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const pull = () => {
    if (editOn || phase !== 'idle' || MONS.length === 0) return;
    const mon = MONS[Math.floor(Math.random() * MONS.length)];
    const src = mon.imgs[Math.floor(Math.random() * mon.imgs.length)];
    setPicked({ mon, src });
    setPhase('turn');
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    at(1200, () => setPhase('drop'));
    at(2400, () => setPhase('open'));
    at(3200, () => {
      setPhase('result');
      setDex(d => {
        if (d.includes(mon.id)) return d;
        const n = [...d, mon.id];
        try { localStorage.setItem(DEX_KEY, JSON.stringify(n)); } catch { /* 무시 */ }
        return n;
      });
    });
  };

  const owned = dex.filter(id => MONS.some(m => m.id === id)).length;

  if (phase === 'result' && picked) {
    return (
      <div className="panel widget gacha result" onClick={() => setPhase('idle')}>
        <b className="g-title">짜잔!</b>
        <span className="g-sub">오늘의 포켓몬</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="g-mon" src={picked.src} alt={picked.mon.name} draggable={false} />
        <p className="g-name">{picked.mon.name}</p>
        <small>누르면 닫혀요</small>
      </div>
    );
  }

  return (
    <div className="panel widget gacha" onClick={pull}>
      <div className="g-head"><span>CAPSULE TOY</span><span>도감 {owned}/{MONS.length}</span></div>
      <div className="g-machine">
        {/* eslint-disable @next/next/no-img-element */}
        <img src="/gacha/body.png" alt="" draggable={false} />
        <div className={`g-pile ${phase === 'turn' ? 'shake' : ''}`}>
          {PILE.map((b, i) => (
            <img key={i} className="g-pb" src="/gacha/ball.png" alt="" draggable={false}
              style={{
                left: `${b.x}%`, top: `${b.y}%`,
                '--r': `${b.r}deg`, '--f': b.f ? -1 : 1,
                animationDelay: `${(i % 5) * 0.03}s`,
              } as React.CSSProperties} />
          ))}
        </div>
        <img className={`g-handle ${phase === 'turn' ? 'spin' : ''}`} src="/gacha/handle.png" alt="" draggable={false} />
        {(phase === 'drop' || phase === 'open') && (
          <img className={`g-ball ${phase === 'open' ? 'pop' : 'fall'}`} src="/gacha/ball.png" alt="" draggable={false} />
        )}
        {/* eslint-enable @next/next/no-img-element */}
      </div>
      <p className="g-msg">{phase === 'idle' ? '기계를 눌러 오늘의 포켓몬을 뽑아 보세요' : '드르륵...'}</p>
    </div>
  );
}
