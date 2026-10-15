'use client';
// 용 · 영혼 · 오브젝트 아이콘 (SVG 단색 도형)
import React from 'react';
import { dragonColor } from '@/lib/lckStore';

function Glyph({ k, c }: { k: string; c: string }) {
  const p = { fill: 'none', stroke: c, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (k) {
    case 'wind': return <g {...p}><path d="M3 9h10a3 3 0 1 0-3-3" /><path d="M3 14h14a3 3 0 1 1-3 3" /><path d="M3 19h6" /></g>;
    case 'earth': return <g {...p}><path d="M12 3c4 3 5 8 0 16-5-8-4-13 0-16z" /><path d="M12 8v8" /></g>;
    case 'fire': return <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 3 4 0-3-1-5 0-8z" fill={c} />;
    case 'sea': return <g {...p}><path d="M12 4a8 8 0 1 0 8 8 5 5 0 1 1-5-5" /></g>;
    case 'hex': return <g {...p}><path d="M12 3l9 9-9 9-9-9z" /><path d="M12 8l4 4-4 4-4-4z" /></g>;
    case 'chem': return <g fill={c}><circle cx="8" cy="10" r="3.2" /><circle cx="16" cy="10" r="3.2" /><circle cx="12" cy="6" r="3.2" /><rect x="11" y="12" width="2" height="8" rx="1" /></g>;
    case 'tower': return <path d="M9 3h6l-1 5 2 2v3h-2v6h-4v-6H8v-3l2-2z" fill={c} />;
    case 'grub': return <g><path d="M12 3l8 3v6c0 4-3 7-8 9-5-2-8-5-8-9V6z" fill={c} /><circle cx="12" cy="11" r="3" fill="#0e1822" /></g>;
    case 'herald': return <g><path d="M2 12c3-6 17-6 20 0-3 6-17 6-20 0z" fill="none" stroke={c} strokeWidth="2" /><circle cx="12" cy="12" r="3.2" fill={c} /></g>;
    case 'elder': return <path d="M3 6l6 2 3-4 3 4 6-2-2 8-7 7-7-7z" fill={c} />;
    case 'baron': return <g><path d="M4 5l5 2h6l5-2v7c0 4-3 7-8 9-5-2-8-5-8-9z" fill={c} /><path d="M8 11l3 2M16 11l-3 2" stroke="#0e1822" strokeWidth="2" strokeLinecap="round" /></g>;
    default: return null;
  }
}

/** 용 동그란 버튼 — 안 먹은 칸(k 빈 값)은 빈 원 */
export function DragonIcon({ k, size = 34 }: { k: string; size?: number }) {
  const c = k ? dragonColor(k) : '#34404c';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flex: 'none' }}>
      <circle cx="20" cy="20" r="18" fill="#141f2a" stroke={c} strokeWidth="2" />
      {k && <g transform="translate(8 8)"><Glyph k={k} c={c} /></g>}
    </svg>
  );
}

/** 영혼 다이아몬드 — 비어 있으면 어두운 빈 다이아몬드 */
export function SoulIcon({ k, size = 54 }: { k: string; size?: number }) {
  const c = k ? dragonColor(k) : '#34404c';
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" style={{ flex: 'none' }}>
      <path d="M30 3 L57 30 L30 57 L3 30 Z" fill="#141f2a" stroke={c} strokeWidth="2.5" />
      {k && <g transform="translate(15 15) scale(1.25)"><Glyph k={k} c={c} /></g>}
    </svg>
  );
}

const OBJ: Record<string, string> = { tower: '#aab3bd', grub: '#b57cf0', herald: '#8f7be8', elder: '#b9a0f5', baron: '#c24ee0' };
export function ObjIcon({ t, size = 26, dim }: { t: keyof typeof OBJ; size?: number; dim?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flex: 'none', opacity: dim ? 0.35 : 1 }}>
      <Glyph k={t} c={OBJ[t]} />
    </svg>
  );
}
