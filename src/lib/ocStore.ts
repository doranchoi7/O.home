'use client';
// 자캐 목록 — 글 형식 · 설정(직업 탭 / 입력칸 / 선택지 / 표에 보일 항목) · 정렬 규칙
// 직업·입력칸·선택지·이미지는 코드가 아니라 /oc/settings (관리자 전용)에서 고친다.
// 아래 defaultConfig() 는 "처음 한 번만 쓰이는 예시 값" — 설정을 저장하고 나면 설정이 우선한다.
import { useCallback, useEffect, useState } from 'react';
import { getSetting, setSetting, onSettingChange } from '@/lib/settingStore';
import type { CropValue } from '@/components/ui/CropEditor';

export const OC_KEY = 'ohome.oc.v1';
export const OC_CFG_KEY = 'ohome.occfg.v1';

/** 티어형 항목에서 세부 단계 값이 저장되는 이름 뒤에 붙는 꼬리표 (x['tier'] = 큰 단계, x['tier__sub'] = 세부 단계) */
export const SUB = '__sub';

/* ---------- 설정 형식 ---------- */
/**
 * text   : 글자
 * number : 숫자 (높은 순이 먼저)
 * select : 선택형 — 선택지 순서가 곧 정렬 순서
 * tier   : 티어형 — 큰 단계 + 세부 단계 두 번 고름. 큰 단계 순서 → 세부 단계 순서로 정렬
 */
export type FieldType = 'text' | 'number' | 'select' | 'tier';

export interface OcOption {
  id: string;       // 저장되는 값 (이름을 바꿔도 안 변함 → 이미 등록한 캐릭터가 이름 변경을 따라감)
  label: string;    // 화면에 보이는 이름
  img?: string;     // 표에서 값 왼쪽에 붙는 이미지 (파일 id)
}

export interface FieldDef {
  key: string;                // 저장 이름 (바꾸지 않음)
  label: string;
  type: FieldType;
  options?: OcOption[];       // select / tier(큰 단계)
  sub?: OcOption[];           // tier(세부 단계)
  unit?: string;              // number 뒤에 붙는 단위
  showImg?: boolean;          // 표에 선택지 이미지를 보일지 (기본 true)
  firstDesc?: boolean;        // 처음 누르면 목록 "아래쪽"부터(= 높은 쪽부터) 보일지
  then?: string;              // 같은 값일 때 이어서 정렬할 입력칸 key
}

export interface JobDef {
  id: string;
  label: string;
  fields: FieldDef[];
  defaultSort?: { key: string; dir: 'asc' | 'desc' };   // 이 탭의 기본 정렬 (없으면 등록순)
}

export interface OcConfig {
  jobs: JobDef[];
  cols: Record<string, string[]>;   // 탭별 표에 보일 항목(순서 포함). 없으면 기본값
}

export const uid = (p = 'o') => p + Math.random().toString(36).slice(2, 8);

/** 처음 쓰는 예시 — 선택지의 id 를 예전 이름과 같게 둬서 이미 등록한 캐릭터 값이 그대로 이어진다 */
const O = (...p: [string, string?][]): OcOption[] => p.map(([id, label]) => ({ id, label: label ?? id }));

export function defaultConfig(): OcConfig {
  return {
    cols: {},
    jobs: [
      {
        id: 'pro', label: '롤프로게이머',
        fields: [
          { key: 'team', label: '팀', type: 'text' },
          { key: 'pos', label: '포지션', type: 'select',
            options: O(['탑', '탑 (TOP)'], ['정글', '정글 (JGL)'], ['미드', '미드 (MID)'], ['원딜', '원딜 (ADC)'], ['서폿', '서포터 (SPT)']) },
          { key: 'tier', label: '솔랭 티어', type: 'tier', firstDesc: true,
            options: O(['아이언'], ['브론즈'], ['실버'], ['골드'], ['플래티넘'], ['에메랄드'], ['다이아몬드'], ['마스터'], ['그랜드마스터'], ['챌린저']),
            sub: O(['s4', '4'], ['s3', '3'], ['s2', '2'], ['s1', '1']) },
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
          { key: 'pos', label: '포지션', type: 'select', options: O(['투수'], ['포수'], ['내야수'], ['외야수'], ['지명타자']) },
          { key: 'num', label: '등번호', type: 'number' },
        ],
      },
      {
        id: 'student', label: '학생',
        defaultSort: { key: 'x:level', dir: 'desc' },   // 학생 탭: 대 > 고 > 중 > 초
        fields: [
          { key: 'level', label: '학교급', type: 'select', firstDesc: true, then: 'grade', options: O(['초'], ['중'], ['고'], ['대']) },
          { key: 'school', label: '학교', type: 'text' },
          { key: 'grade', label: '학년', type: 'number', unit: '학년' },
        ],
      },
      { id: 'etc', label: '기타', fields: [{ key: 'jobName', label: '세부 직업', type: 'text' }] },
    ],
  };
}

const readCfg = (): OcConfig => {
  const v = getSetting<OcConfig | null>(OC_CFG_KEY, null);
  return v && Array.isArray(v.jobs) ? { jobs: v.jobs, cols: v.cols ?? {} } : defaultConfig();
};

export function useOcConfig(): [OcConfig, (c: OcConfig) => void, boolean] {
  const [cfg, setCfg] = useState<OcConfig>(() => defaultConfig());
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setCfg(readCfg()); setLoaded(true);
    return onSettingChange(k => { if (k === OC_CFG_KEY) setCfg(readCfg()); });
  }, []);
  const save = useCallback((c: OcConfig) => { setSetting(OC_CFG_KEY, c); setCfg(c); }, []);
  return [cfg, save, loaded];
}

export const jobOf = (cfg: OcConfig, id: string) => cfg.jobs.find(j => j.id === id);

/* ---------- 글 형식 ---------- */
export interface OcChar {
  id: string;
  name: string;
  job: string;                       // JobDef.id — 캐릭터당 하나
  age?: number;
  birthM?: number; birthD?: number;  // 생일은 'n월 n일' (생년 없이 가능)
  height?: number; weight?: number;
  blood?: string;
  x: Record<string, string>;         // 직업별 입력칸 값 (key → 값. select·tier 는 선택지 id)
  memo: string;
  img?: string; crop?: CropValue;
}
export const OC_SEED: OcChar[] = [];
export const BLOODS = ['A', 'B', 'O', 'AB'];

/* ---------- 표의 열 ---------- */
export type ColType = FieldType | 'birth' | 'job' | 'blood';
export interface Col {
  key: string; label: string; type: ColType;
  unit?: string;
  field?: FieldDef;     // 'x:...' 열이 따라가는 입력칸 정의 (여러 직업에 같은 key 가 있으면 첫 번째)
}

const COMMON: Col[] = [
  { key: 'name', label: '이름', type: 'text' },
  { key: 'age', label: '나이', type: 'number', unit: '세' },
  { key: 'birth', label: '생일', type: 'birth' },
  { key: 'height', label: '키', type: 'number', unit: 'cm' },
  { key: 'weight', label: '체중', type: 'number', unit: 'kg' },
  { key: 'blood', label: '혈액형', type: 'blood' },
];

function fieldCols(jobs: JobDef[]): Col[] {
  const seen = new Map<string, Col>();
  jobs.forEach(j => j.fields.forEach(f => {
    if (!seen.has(f.key)) seen.set(f.key, { key: 'x:' + f.key, label: f.label, type: f.type, unit: f.unit, field: f });
  }));
  return [...seen.values()];
}

/** 탭에서 고를 수 있는 모든 열 ('all' 탭은 모든 직업의 입력칸을 합쳐서) */
export function allCols(cfg: OcConfig, tab: string): Col[] {
  if (tab === 'all') return [...COMMON, { key: 'job', label: '직업', type: 'job' }, ...fieldCols(cfg.jobs)];
  const j = jobOf(cfg, tab);
  return [...COMMON, ...fieldCols(j ? [j] : [])];
}

/** 아무것도 설정하지 않았을 때 보이는 열 */
export function defaultKeys(cfg: OcConfig, tab: string): string[] {
  const common = COMMON.map(c => c.key);
  if (tab === 'all') return [...common, 'job'];
  return [...common, ...(jobOf(cfg, tab)?.fields ?? []).map(f => 'x:' + f.key)];
}

/** 지금 표에 보이는 열 — 이름은 항상 맨 앞 */
export function visibleCols(cfg: OcConfig, tab: string): Col[] {
  const all = allCols(cfg, tab);
  const saved = cfg.cols?.[tab];
  const keys = saved && saved.length ? saved : defaultKeys(cfg, tab);
  const out: Col[] = [all[0]];
  keys.forEach(k => {
    if (k === 'name') return;
    const c = all.find(x => x.key === k);
    if (c && !out.includes(c)) out.push(c);
  });
  return out;
}

/* ---------- 값 읽기 ---------- */
export interface CellVal { text: string; imgs: string[] }

/** 표(또는 상세)에 보일 글자와 이미지 */
export function cell(c: OcChar, col: Col, cfg: OcConfig): CellVal {
  const none: CellVal = { text: '', imgs: [] };
  if (col.type === 'birth') {
    if (c.birthM && c.birthD) return { text: `${c.birthM}월 ${c.birthD}일`, imgs: [] };
    return { text: c.birthM ? `${c.birthM}월` : '', imgs: [] };
  }
  if (col.type === 'job') return { text: jobOf(cfg, c.job)?.label ?? '', imgs: [] };
  if (!col.key.startsWith('x:')) {
    const v = (c as unknown as Record<string, string | number | undefined>)[col.key];
    if (v === undefined || v === null || v === '') return none;
    return { text: col.unit ? `${v}${col.unit}` : String(v), imgs: [] };
  }
  // 직업별 입력칸 — 이 캐릭터 자신의 직업 정의로 읽는다 (전체 탭에서도 정확하게)
  const key = col.key.slice(2);
  const f = jobOf(cfg, c.job)?.fields.find(x => x.key === key);
  const raw = c.x?.[key];
  if (!f || raw === undefined || raw === '') return none;
  const showImg = f.showImg !== false;
  if (f.type === 'number') return { text: f.unit ? `${raw}${f.unit}` : raw, imgs: [] };
  if (f.type === 'select') {
    const o = f.options?.find(x => x.id === raw);
    return o ? { text: o.label, imgs: showImg && o.img ? [o.img] : [] } : none;
  }
  if (f.type === 'tier') {
    const big = f.options?.find(x => x.id === raw);
    if (!big) return none;
    const sub = f.sub?.find(x => x.id === c.x?.[key + SUB]);
    const imgs = showImg ? [big.img, sub?.img].filter(Boolean) as string[] : [];
    return { text: sub ? `${big.label} ${sub.label}` : big.label, imgs };
  }
  return { text: raw, imgs: [] };
}

/** 정렬에 쓰는 값 — 비어 있으면 null (항상 맨 아래) */
export function sortVal(c: OcChar, col: Col, cfg: OcConfig): number | string | null {
  if (col.type === 'birth') return c.birthM ? c.birthM * 100 + (c.birthD ?? 0) : null;
  if (col.type === 'job') { const i = cfg.jobs.findIndex(j => j.id === c.job); return i < 0 ? null : i; }
  if (col.type === 'blood') { const i = BLOODS.indexOf(c.blood ?? ''); return i < 0 ? null : i; }
  if (!col.key.startsWith('x:')) {
    const v = (c as unknown as Record<string, string | number | undefined>)[col.key];
    if (v === undefined || v === null || v === '') return null;
    if (col.type === 'number') { const n = Number(v); return Number.isFinite(n) ? n : null; }
    return String(v);
  }
  const key = col.key.slice(2);
  const raw = c.x?.[key];
  if (raw === undefined || raw === '') return null;
  const f = col.field;
  if (col.type === 'number') { const n = Number(raw); return Number.isFinite(n) ? n : null; }
  if (col.type === 'select') { const i = (f?.options ?? []).findIndex(o => o.id === raw); return i < 0 ? null : i; }
  if (col.type === 'tier') {
    const bi = (f?.options ?? []).findIndex(o => o.id === raw);
    if (bi < 0) return null;
    const si = (f?.sub ?? []).findIndex(o => o.id === c.x?.[key + SUB]);
    return bi * 1000 + (si + 1);     // 큰 단계 먼저, 같으면 세부 단계 (세부 없음 = 가장 낮음)
  }
  const t = cell(c, col, cfg).text;
  return t === '' ? null : t;
}

/** 처음 눌렀을 때 방향 — 숫자는 높은 순, 선택·티어는 설정에 따라, 나머지는 앞에서부터 */
export const firstDir = (col: Col): 'asc' | 'desc' =>
  col.type === 'number' ? 'desc' : (col.type === 'select' || col.type === 'tier') && col.field?.firstDesc ? 'desc' : 'asc';

export interface Sort { key: string; dir: 'asc' | 'desc' }

/** cols 에는 allCols(cfg, tab) 을 넘긴다 (표에서 숨긴 열로도 정렬·이어정렬이 되도록) */
export function sortChars(list: OcChar[], cols: Col[], sort: Sort, cfg: OcConfig): OcChar[] {
  const order = new Map(list.map((c, i) => [c.id, i]));
  const sign = sort.dir === 'asc' ? 1 : -1;
  const byKey = (k: string) => cols.find(c => c.key === k);
  const col = byKey(sort.key);
  const then = col?.field?.then ? byKey('x:' + col.field.then) : undefined;

  const cmp = (a: OcChar, b: OcChar, cl: Col): number => {
    const va = sortVal(a, cl, cfg), vb = sortVal(b, cl, cfg);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;            // 빈 값은 방향과 상관없이 아래로
    if (vb === null) return -1;
    const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'ko');
    return r * sign;
  };

  return [...list].sort((a, b) => {
    if (sort.key === 'reg' || !col) return ((order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)) * sign;
    const r = cmp(a, b, col);
    if (r !== 0) return r;
    if (then) { const r2 = cmp(a, b, then); if (r2 !== 0) return r2; }
    return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
  });
}

export const defaultSortOf = (cfg: OcConfig, tab: string): Sort => {
  const d = jobOf(cfg, tab)?.defaultSort;
  return d ? { ...d } : { key: 'reg', dir: 'asc' };
};
