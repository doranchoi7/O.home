'use client';
// 자캐 목록 설정 (관리자 전용)
import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { OC_KEY, OC_SEED, OcChar, useOcConfig } from '@/lib/ocStore';
import { OcSettings } from '@/components/oc/OcSettings';
import { useToast } from '@/components/ui/Toast';
import { PageTitle } from '@/components/ui/PageText';

export default function OcSettingsPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [cfg, saveCfg, cfgLoaded] = useOcConfig();
  const [chars, , loaded] = useLocalList<OcChar>(OC_KEY, OC_SEED);

  if (!loaded || !cfgLoaded) return <section className="page" />;
  if (!isAdmin) {
    return <section className="page"><div className="page-head"><PageTitle>OC LIST</PageTitle><p>관리자만 설정할 수 있습니다</p></div></section>;
  }
  return (
    <section className="page">
      <div className="page-head"><PageTitle>OC SETTINGS</PageTitle><p>직업 탭 · 입력칸 · 선택지 · 표 항목</p></div>
      <OcSettings cfg={cfg} chars={chars}
        onCancel={() => router.push('/oc')}
        onSave={c => { saveCfg(c); toast('저장되었습니다'); router.push('/oc'); }} />
    </section>
  );
}
