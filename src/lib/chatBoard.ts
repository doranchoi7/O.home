// 카톡·푸슝 백업 게시판이 같이 쓰는 방(room) 타입과 도우미
// 방 하나 = Firestore 문서 하나 (대화 내용은 방 안의 items 배열)
import { newId } from './postStore';

export type RoomVis = 'public' | 'member' | 'private';

export const ROOM_VIS: { value: RoomVis; label: string }[] = [
  { value: 'public', label: '전체 공개' },
  { value: 'member', label: '멤버 공개' },
  { value: 'private', label: '비공개' },
];

export interface RoomBase {
  id: string;
  secId?: string;        // 소속 게시판 (기본 게시판이면 없음)
  name: string;          // 방(탭) 이름
  avatar: string;        // 프사 이미지 참조 — 없으면 ''
  bg: string;            // 대화 영역 배경색
  visibility: RoomVis;
  order: number;         // 탭 순서 (작을수록 앞)
  created: number;
}

/** 새 방의 공통 부분 — 공개 범위는 비공개로 시작하고 방 설정에서 바꾼다 */
export function mkRoomBase(name: string, bg: string): RoomBase {
  const now = Date.now();
  return { id: newId(), name, avatar: '', bg, visibility: 'private', order: now, created: now };
}

/** 배경색 위에 올릴 글자색 (밝은 배경 → 어두운 글씨) */
export function textOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? '').trim());
  if (!m) return '#1d2025';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#1d2025' : '#ffffff';
}

export function canSeeRoom(r: RoomBase, isAdmin: boolean, loggedIn: boolean): boolean {
  return isAdmin || r.visibility === 'public' || (r.visibility === 'member' && loggedIn);
}

export function sortRooms<T extends RoomBase>(list: T[]): T[] {
  return [...list].sort((a, b) => (a.order - b.order) || (a.created - b.created));
}

/** 2026-10-16 → 2026년 10월 16일 금요일 (형식이 틀리면 입력값 그대로) */
export function dateLabel(date: string): string {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec((date ?? '').trim());
  if (!m) return date ?? '';
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (Number.isNaN(d.getTime())) return date;
  return `${m[1]}년 ${+m[2]}월 ${+m[3]}일 ${'일월화수목금토'[d.getDay()]}요일`;
}
