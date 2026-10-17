'use client';
// 설정에 저장하는 {이름: 글자} 지도 — 탭 설명 메모에 쓴다
import { useCallback, useEffect, useState } from 'react';
import { getRawSetting, setSetting } from './settingStore';

export function useJsonMap(key: string): [Record<string, string>, (k: string, v: string) => void] {
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const raw = getRawSetting(key);
      if (raw) setMap(JSON.parse(raw) as Record<string, string>);
    } catch { /* 빈 지도로 시작 */ }
  }, [key]);
  const put = useCallback((k: string, v: string) => {
    setMap(prev => {
      const next = { ...prev };
      if (v) next[k] = v; else delete next[k];
      try { setSetting(key, next); } catch { /* 무시 */ }
      return next;
    });
  }, [key]);
  return [map, put];
}
