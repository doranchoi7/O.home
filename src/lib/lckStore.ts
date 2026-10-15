'use client';
// LCK 경기 기록 — 타입 · 챔프 보관함 저장 · 도우미
import { useEffect, useState } from 'react';
import { getRawSetting, setSetting } from './settingStore';

export type Side = 'blue' | 'red';
export const B = '#3a86d8';          // 블루 진영색 (왼쪽 고정)
export const R = '#d9534f';          // 레드 진영색 (오른쪽 고정)
export const LCK_PINK = '#f06292';   // 포인트 색 (나중에 바꾸기 쉽게 한 곳에)
export const LCK_KEY = 'ohome.lck.v1';
export const col = (s: Side | '') => (s === 'blue' ? B : s === 'red' ? R : '#9aa1ab');

export const DRAGONS = [
  { k: 'wind', name: '바람', color: '#7fb4e6' },
  { k: 'earth', name: '대지', color: '#b08a60' },
  { k: 'fire', name: '화염', color: '#f5702f' },
  { k: 'sea', name: '바다', color: '#3dc1a2' },
  { k: 'hex', name: '마법공학', color: '#4fc8ee' },
  { k: 'chem', name: '화학공학', color: '#8ee02f' },
] as const;
export const dragonColor = (k: string) => DRAGONS.find(d => d.k === k)?.color ?? '#3a4654';

export interface Player { nick: string; champ: string; k: string; d: string; a: string; dmg: string }
export interface TeamData {
  name: string; score: string;
  bans: string[]; prev: string[][];
  kills: string; deaths: string; assists: string; gold: string;
  players: Player[]; bestDmg: number; bestKda: number;
  dragons: string[]; towers: string; grubs: string; elders: string; barons: string;
}
export interface Pick { champ: string; nick: string; team: Side | '' }
export interface SetData {
  hBlue: string; hRed: string;            // 선픽 · 후픽 · 진영 · ''
  time: string; winner: '' | Side;
  mvp: number;                            // 0~4 블루, 5~9 레드, -1 없음
  mine: number;                           // 목록 카드에 올릴 내 챔프 (같은 번호 규칙)
  soul: string; herald: '' | Side;
  blue: TeamData; red: TeamData; picks: Pick[];
}
export interface LckMatch {
  id: string; secId?: string; catId?: string;
  tournament: string; season: string; round: string; gameNo: string; date: string;
  bo: number; fearless: boolean; player: string; award: '' | 'POG' | 'POM' | 'MVP';
  bestKda: string; bestDmg: string; result: '' | 'win' | 'lose';
  sets: SetData[]; review: string; rating: string; ratingNote: string;
  vis: 'public' | 'member' | 'password' | 'private';
  visibility: 'public' | 'member' | 'private';   // 서버 규칙용 (비밀번호 공개는 public으로 저장)
  pwHash?: string; created: number;
  board?: RatingBoard;
}

export const emptyTeam = (): TeamData => ({
  name: '', score: '', bans: ['', '', '', '', ''], prev: [],
  kills: '', deaths: '', assists: '', gold: '',
  players: Array.from({ length: 5 }, () => ({ nick: '', champ: '', k: '', d: '', a: '', dmg: '' })),
  bestDmg: -1, bestKda: -1, dragons: ['', '', '', ''], towers: '', grubs: '', elders: '', barons: '',
});
export const emptySet = (): SetData => ({
  hBlue: '진영', hRed: '', time: '', winner: '', mvp: -1, mine: -1, soul: '', herald: '',
  blue: emptyTeam(), red: emptyTeam(), picks: Array.from({ length: 10 }, () => ({ champ: '', nick: '', team: '' })),
});

/** 피어리스: 앞 세트들의 챔프 줄을 팀 이름 기준으로 모은다 (진영이 바뀌어도 같은 팀 줄로) */
export function fillPrev(sets: SetData[], idx: number): { blue: string[][]; red: string[][] } {
  const cur = sets[idx];
  const out = { blue: [] as string[][], red: [] as string[][] };
  for (let i = 0; i < idx; i++) {
    const s = sets[i];
    const row = (side: Side) => {
      const nm = cur[side].name.trim();
      const t = nm && s.red.name.trim() === nm ? s.red : nm && s.blue.name.trim() === nm ? s.blue : s[side];
      return t.players.map(p => p.champ);
    };
    out.blue.push(row('blue')); out.red.push(row('red'));
  }
  return out;
}

/** 45200 → 45.2K, 이미 45.2K면 그대로 */
export function fmtBig(v: string): string {
  const t = (v ?? '').trim();
  if (!t) return '';
  if (/k$/i.test(t)) return t.toUpperCase();
  const n = Number(t.replace(/,/g, ''));
  return !isNaN(n) && n >= 1000 ? `${(n / 1000).toFixed(1)}K` : t;
}
export const dateKo = (d: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return m ? `${m[1]}. ${+m[2]}. ${+m[3]}.` : d;
};
export const setChamp = (s: SetData, i: number) => (i < 0 ? '' : i < 5 ? s.blue.players[i]?.champ : s.red.players[i - 5]?.champ) ?? '';
export const sortMatches = (l: LckMatch[]) =>
  [...l].sort((a, b) => b.date.localeCompare(a.date) || (b.created ?? 0) - (a.created ?? 0));

/* ───── 챔프 보관함 (설정 'ohome.lckchamps.v1') ───── */
export interface Champ { id: string; name: string; img: string }
const CK = 'ohome.lckchamps.v1';
const EV = 'ohome-lckchamps';
let cache: Champ[] | null = null;
export function getChamps(): Champ[] {
  if (!cache) {
    try { const raw = getRawSetting(CK); cache = raw ? (JSON.parse(raw) as Champ[]) : []; } catch { cache = []; }
  }
  return cache as Champ[];
}
export function saveChamps(c: Champ[]) {
  cache = c;
  setSetting(CK, c);
  try { window.dispatchEvent(new Event(EV)); } catch { /* 무시 */ }
}
export function useChamps(): Champ[] {
  const [, force] = useState(0);
  useEffect(() => {
    const h = () => force(n => n + 1);
    window.addEventListener(EV, h);
    return () => window.removeEventListener(EV, h);
  }, []);
  return getChamps();
}
export const sortChamps = (c: Champ[]) => [...c].sort((a, b) => a.name.localeCompare(b.name, 'ko'));

// 오늘 날짜 (YYYY-MM-DD)
export function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 비밀번호 해시 (SHA-256, 비동기)
export async function hashPw(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface RateRow { nickL: string; nickR: string; scoreL: string; scoreR: string; hi: '' | 'L' | 'R' }
export interface RatingBoard { title: string; teamL: string; teamR: string; score: string; rows: RateRow[] }
export const emptyBoard = (): RatingBoard => ({
  title: '', teamL: '', teamR: '', score: '',
  rows: Array.from({ length: 5 }, () => ({ nickL: '', nickR: '', scoreL: '', scoreR: '', hi: '' as const })),
});
export const boardFilled = (b?: RatingBoard) => !!b && b.rows.some(r => r.scoreL.trim() || r.scoreR.trim());
