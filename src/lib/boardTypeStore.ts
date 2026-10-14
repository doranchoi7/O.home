'use client';
// 게시판 유형(twitter · lck · couple · oc · pushoong · kakaotalk · style)의 분류 리스트 저장소.
// 유형 하나당 설정 파일을 따로 만들지 않고 한 키(ohome.typecats.v1)에 모두 담는다.
// seriesStore.ts와 같은 규칙: 기본 게시판은 cats, 추가로 만든 게시판은 secCats[secId].
// 추가 게시판에 분류를 따로 정하지 않았으면 기본 게시판의 분류를 그대로 쓴다.
import { useCallback, useEffect, useState } from 'react';
import type { ThreadCat } from '@/lib/threadStore';
import { getRawSetting, setSetting } from '@/lib/settingStore';
import { MAIN_SEC, type SectionKind } from '@/lib/sectionStore';

interface TypeCats {
  cats: ThreadCat[];
  secCats?: Record<string, ThreadCat[]>;
}
type AllCats = Partial<Record<SectionKind, TypeCats>>;

const KEY = 'ohome.typecats.v1';

export function useTypeCats() {
  const [all, setAll] = useState<AllCats>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = getRawSetting(KEY);
      if (raw) setAll(JSON.parse(raw) as AllCats);
    } catch { /* 기본값 */ }
    setLoaded(true);
  }, []);

  /** 이 게시판(secId)에서 쓰는 분류 목록 */
  const catsOf = (kind: SectionKind, secId: string): ThreadCat[] => {
    const t = all[kind];
    if (!t) return [];
    return secId === MAIN_SEC ? t.cats : t.secCats?.[secId] ?? t.cats;
  };

  const setCats = useCallback((kind: SectionKind, secId: string, cats: ThreadCat[]) => {
    setAll(prev => {
      const cur: TypeCats = prev[kind] ?? { cats: [] };
      const nextKind: TypeCats = secId === MAIN_SEC
        ? { ...cur, cats }
        : { ...cur, secCats: { ...cur.secCats, [secId]: cats } };
      const next: AllCats = { ...prev, [kind]: nextKind };
      try { setSetting(KEY, next); } catch { /* 무시 */ }
      return next;
    });
  }, []);

  return { catsOf, setCats, loaded };
}
