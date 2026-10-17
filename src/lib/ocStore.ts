'use client';
// 자캐 목록 — 데이터 형식 · 직업별 항목 정의 · 정렬 규칙
// ★ 직업을 추가하거나 직업별 입력칸을 바꾸고 싶으면 아래 JOBS 만 고치면 된다.
import type { CropValue } from '@/components/ui/CropEditor';

export const OC_KEY = 'ohome.oc.v1';

/* ------------------------------------------------------------------
 * 항목 종류
 *  text   : 글자 (가나다순이 먼저)
 *  number : 숫자 (높은 순이 먼저)
 *  rank   : 순서가 있는 선택지 — options 의 뒤쪽이 "높음" (높은 순이 먼저)
 *  select : 순서 없는 선택지 (options 순서대로 오름차순이 먼저)
 * ------------------------------------------------------------------ */
export type FieldType = 'text' | 'number' | 'rank' | 'select';

export interface FieldDef {
  key: string;            // 저장 이름 (한 번 정하면 바꾸지 말 것 — 기존 글의 값이 이 이름으로 저장됨)
  label: string;          // 화면에 보이는 이름
  type: FieldType;
  options?: string[];     // rank · select 일 때 선택지
  unit?: string;          // 숫자 뒤에 붙는 단위 (예: '학년')
  then?: string;          // 같은 값일 때 이어서 정렬할 항목 key (예: 학교급이 같으면 학년순)
}

export interface JobDef {
  id: string;
  label: string;          // 탭 이름
  fields: FieldDef[];
  defaultSort?: { key: string; dir: 'asc' | 'desc' };   // 이 탭의 기본 정렬 (없으면 등록순)
}

export const JOBS: JobDef[] = [
  {
    id: 'pro', label: '롤프로게이머',
    fields: [
      { key: 'team', label: '팀', type: 'text' },
      { key: 'pos', label: '포지션', type: 'select', options: ['탑', '정글', '미드', '원딜', '서폿'] },
      { key: 'tier', label: '솔랭 티어', type: 'rank',
        options: ['아이언', '브론즈', '실버', '골드', '플래티넘', '에메랄드', '다이아몬드', '마스터', '그랜드마스터', '챌린저'] },
    ],
  },
  {
    id: 'idol', label: '아이돌',
    fields: [
      { key: 'group', label: '그룹', type: 'text' },
      { key: 'pos', label: '포지션', type: 'text' },
    ],
  },
  {
    id: 'baseball', label: '야구선수',
    fields: [
      { key: 'team', label: '팀', type: 'text' },
      { key: 'pos', label: '포지션', type: 'select', options: ['투수', '포수', '내야수', '외야수', '지명타자'] },
      { key: 'num', label: '등번호', type: 'number' },
    ],
  },
  {
    id: 'student', label: '학생',
    // 학생 탭은 들어가면 대 > 고 > 중 > 초 순 (같으면 학년 높은 순)
    defaultSort: { key: 'x:level', dir: 'desc' },
    fields: [
      { key: 'level', label: '학교급', type: 'rank', options: ['초', '중', '고', '대'], then: 'grade' },
      { key: 'school', label: '학교', type: 'text' },
      { key: 'grade', label: '학년', type: 'number', unit: '학년' },
    ],
  },
  {
    id: 'etc', label: '기타',
    fields: [
      { key: 'jobName', label: '직업', type: 'text' },
    ],
  },
];

export const jobOf = (id: string) => JOBS.find(j => j.id === id);

/* ---------- 글 형식 ---------- */
export interface OcChar {
  id: string;
  name: string;
  job: string;                       // JOBS 의 id — 캐릭터당 하나
  age?: number;
  birthM?: number; birthD?: number;  // 생일은 날짜 선택이 아니라 'n월 n일' (생년 없이 가능)
  height?: number; weight?: number;
  blood?: string;
  x: Record<string, string>;         // 직업별 입력칸 값 (key → 값)
  memo: string;                      // 소개 (마크다운)
  img?: string; crop?: CropValue;
}
export const OC_SEED: OcChar[] = [];
export const BLOODS = ['A', 'B', 'O', 'AB'];

/* ---------- 표의 열 ---------- */
export type ColType = FieldType | 'birth' | 'job';
export interface Col {
  key: string; label: string; type: ColType;
  options?: string[]; unit?: string; then?: string;
}

const COMMON: Col[] = [
  { key: 'name', label: '이름', type: 'text' },
  { key: 'age', label: '나이', type: 'number', unit: '세' },
  { key: 'birth', label: '생일', type: 'birth' },
  { key: 'height', label: '키', type: 'number', unit: 'cm' },
  { key: 'weight', label: '체중', type: 'number', unit: 'kg' },
  { key: 'blood', label: '혈액형', type: 'select', options: BLOODS },
];

/** 탭('all' 또는 직업 id)에 보이는 열 */
export function colsFor(tab: string): Col[] {
  if (tab === 'all') return [...COMMON, { key: 'job', label: '직업', type: 'job', options: JOBS.map(j => j.id) }];
  const j = jobOf(tab);
  return [...COMMON, ...(j?.fields ?? []).map(f => ({ ...f, key: 'x:' + f.key }))];
}

export function rawOf(c: OcChar, key: string): string | number | undefined {
  if (key.startsWith('x:')) return c.x?.[key.slice(2)];
  return (c as unknown as Record<string, string | number | undefined>)[key];
}

/** 화면에 보이는 글자 */
export function display(c: OcChar, col: Col): string {
  if (col.type === 'birth') {
    if (c.birthM && c.birthD) return `${c.birthM}월 ${c.birthD}일`;
    return c.birthM ? `${c.birthM}월` : '';
  }
  if (col.type === 'job') return jobOf(c.job)?.label ?? '';
  const v = rawOf(c, col.key);
  if (v === undefined || v === null || v === '') return '';
  return col.type === 'number' && col.unit ? `${v}${col.unit}` : String(v);
}

/** 정렬에 쓰는 값 — 비어 있으면 null (항상 맨 아래) */
export function sortVal(c: OcChar, col: Col): number | string | null {
  if (col.type === 'birth') return c.birthM ? c.birthM * 100 + (c.birthD ?? 0) : null;
  if (col.type === 'job') { const i = JOBS.findIndex(j => j.id === c.job); return i < 0 ? null : i; }
  const v = rawOf(c, col.key);
  if (v === undefined || v === null || v === '') return null;
  if (col.type === 'number') { const n = Number(v); return Number.isFinite(n) ? n : null; }
  if (col.type === 'rank' || col.type === 'select') { const i = (col.options ?? []).indexOf(String(v)); return i < 0 ? null : i; }
  return String(v);
}

/** 처음 눌렀을 때 방향 — 숫자·순위는 높은 순, 글자·생일·선택은 앞쪽(ㄱ, 1/1)부터 */
export const firstDir = (col: Col): 'asc' | 'desc' =>
  col.type === 'number' || col.type === 'rank' ? 'desc' : 'asc';

export interface Sort { key: string; dir: 'asc' | 'desc' }

/** 등록순(배열 순서) 기준 정렬. key 가 'reg' 면 등록 순서 그대로 */
export function sortChars(list: OcChar[], cols: Col[], sort: Sort): OcChar[] {
  const order = new Map(list.map((c, i) => [c.id, i]));
  const sign = sort.dir === 'asc' ? 1 : -1;
  const byKey = (k: string) => cols.find(c => c.key === k);
  const col = byKey(sort.key);
  const then = col?.then ? byKey('x:' + col.then) : undefined;

  const cmpVal = (a: OcChar, b: OcChar, cl: Col): number => {
    const va = sortVal(a, cl), vb = sortVal(b, cl);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;            // 빈 값은 방향과 상관없이 아래로
    if (vb === null) return -1;
    const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'ko');
    return r * sign;
  };

  return [...list].sort((a, b) => {
    if (sort.key === 'reg' || !col) return ((order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)) * sign;
    const r = cmpVal(a, b, col);
    if (r !== 0) return r;
    if (then) { const r2 = cmpVal(a, b, then); if (r2 !== 0) return r2; }
    return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
  });
}

export const defaultSortOf = (tab: string): Sort => {
  const d = jobOf(tab)?.defaultSort;
  return d ? { ...d } : { key: 'reg', dir: 'asc' };
};
