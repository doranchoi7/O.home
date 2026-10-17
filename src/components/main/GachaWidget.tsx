'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useMainStore } from '@/lib/mainStore';
import { MONS, Mon } from '@/lib/gachaMons';

type Phase = 'idle' | 'turn' | 'drop' | 'open' | 'result';
const DEX_KEY = 'ohome.gacha.dex';

function loadDex(): string[] {
  try { return JSON.parse(localStorage.getItem(DEX_KEY) ?? '[]'); } catch { return []; }
}

export function GachaWidget() {
  const { editOn } = useMainStore();
  const [phase, setPhase] = useState<Phase>('idle');
  const [picked, setPicked] = useState<Mon | null>(null);
  const [dex, setDex] = useState<string[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setDex(loadDex());
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const pull = () => {
    if (editOn || phase !== 'idle' || MONS.length === 0) return;
    const mon = MONS[Math.floor(Math.random() * MONS.length)];
    setPicked(mon);
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
        <img className="g-mon" src={picked.src} alt={picked.name} draggable={false} />
        <p className="g-name">{picked.name}</p>
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
