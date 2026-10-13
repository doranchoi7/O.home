'use client';
import { useCallback, useEffect, useState } from 'react';
import type { ThreadWork, ThreadCat } from '@/lib/threadStore';
import { getRawSetting, setSetting } from '@/lib/settingStore';
import { MAIN_SEC } from '@/lib/sectionStore';

export type SeriesPost = {
  id: string;
  title: string;
  text: string;
  rich?: boolean; // true면 text가 에디터 HTML (없으면 예전 일반 글)
  images: string[];
  date: string; // 직접 입력한 날짜 (YYYY-MM-DD)
};

export type SeriesWork = {
  id: string;
  title: string;
  author?: string;
  posterId?: string;
  posterCrop?: ThreadWork['posterCrop'];
  ph?: ThreadWork['ph'];
  secId?: string;
  catId?: string;
  visibility: 'public' | 'member' | 'private';
  created: string;
  posts: SeriesPost[];
};

export const SERIES_KEY = 'ohome.series.v1';

export interface SeriesSettings {
  cats: ThreadCat[];
  secCats?: Record<string, ThreadCat[]>;
}
const DEFAULT_SERIES_SETTINGS: SeriesSettings = { cats: [] };

export const seriesCats = (s: SeriesSettings, secId: string): ThreadCat[] =>
  (secId === MAIN_SEC ? s.cats : s.secCats?.[secId] ?? s.cats);

export const seriesCatsPatch = (
  s: SeriesSettings, secId: string, cats: ThreadCat[],
): Partial<SeriesSettings> =>
  (secId === MAIN_SEC ? { cats } : { secCats: { ...s.secCats, [secId]: cats } });

const SET_KEY = 'ohome.seriesset.v1';

export function useSeriesSettings(): [SeriesSettings, (patch: Partial<SeriesSettings>) => void, boolean] {
  const [st, setSt] = useState<SeriesSettings>(DEFAULT_SERIES_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = getRawSetting(SET_KEY);
      if (raw) setSt({ ...DEFAULT_SERIES_SETTINGS, ...JSON.parse(raw) });
    } catch { /* 기본값 */ }
    setLoaded(true);
  }, []);
  const patch = useCallback((p: Partial<SeriesSettings>) => {
    setSt(s => {
      const n = { ...s, ...p };
      try { setSetting(SET_KEY, n); } catch { /* 무시 */ }
      return n;
    });
  }, []);
  return [st, patch, loaded];
}
