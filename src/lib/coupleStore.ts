'use client';
// 커플 다이어리 — 글(ohome.couple.v1 → Firestore 'couple')과 설정(ohome.coupleset.v1)
// 기존 다이어리(ohome.diary.v1)와는 저장 위치가 완전히 달라서 서로 섞이지 않는다.
import { useCallback, useEffect, useState } from 'react';
import { getSetting, setSetting, onSettingChange } from './settingStore';
import type { CropValue } from '@/components/ui/CropEditor';

export const COUPLE_KEY = 'ohome.couple.v1';
const COUPLE_SET_KEY = 'ohome.coupleset.v1';

export type Who = 'a' | 'b';

/** 두 사람 — 이름·하트 색은 여기서만 바꾸면 된다 */
export const NICKS: Record<Who, { name: string; color: string }> = {
  a: { name: '어리고싶다', color: '#f06f96' },      // 분홍 하트
  b: { name: '나는 악마다', color: '#3aa0d8' },   // 파란 하트
};

export interface CouplePost {
  id: string;
  secId?: string;
  title: string;
  body: string;
  date: string;          // YYYY-MM-DD (직접 지정)
  who: Who;              // 작성자
  read: boolean;         // 읽음 여부 (직접 지정)
  created: number;       // 입력 순서 (같은 날짜일 때 정렬용)
  visibility: 'public' | 'member' | 'private';
}

export interface CoupleSettings {
  pwHash: string;        // 비밀번호(SHA-256 해시) — 비어 있으면 잠금 없음
  start: string;         // 만남 시작일 YYYY-MM-DD (이 날이 1일째)
  notice: string;
  today: string;
  total: string;
  photo: string;         // 대표 사진 참조
  photoCrop?: CropValue; // 4:3 크롭 좌표
}

export const DEFAULT_SETTINGS: CoupleSettings = {
  pwHash: '', start: '', notice: '아프지 말기', today: '0', total: '0', photo: '',
};

type SettingMap = Record<string, Partial<CoupleSettings>>;

/** 이 게시판(secId)의 설정 + 저장 함수 */
export function useCoupleSettings(secId: string): [CoupleSettings, (p: Partial<CoupleSettings>) => void] {
  const [all, setAll] = useState<SettingMap>(() => getSetting<SettingMap>(COUPLE_SET_KEY, {}));
  useEffect(() => {
    const read = () => setAll(getSetting<SettingMap>(COUPLE_SET_KEY, {}));
    read();
    return onSettingChange(k => { if (k === COUPLE_SET_KEY) read(); });
  }, []);
  const patch = useCallback((p: Partial<CoupleSettings>) => {
    const base = getSetting<SettingMap>(COUPLE_SET_KEY, {});
    setSetting(COUPLE_SET_KEY, { ...base, [secId]: { ...(base[secId] ?? {}), ...p } });
  }, [secId]);
  return [{ ...DEFAULT_SETTINGS, ...(all[secId] ?? {}) }, patch];
}

/* ---------- 도우미 ---------- */
export const pad = (n: number) => String(n).padStart(2, '0');

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** 만남 N일째 — 시작일이 1일째. 시작일이 없거나 미래면 null */
export function daysTogether(start: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start);
  if (!m) return null;
  const [ty, tm, td] = todayStr().split('-').map(Number);
  const a = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const b = Date.UTC(ty, tm - 1, td);
  const n = Math.floor((b - a) / 86400000) + 1;
  return n >= 1 ? n : null;
}

/** 최신이 위 — 날짜 → 나중에 입력한 순 */
export const sortPosts = (list: CouplePost[]) =>
  [...list].sort((a, b) => b.date.localeCompare(a.date) || (b.created ?? 0) - (a.created ?? 0));

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
