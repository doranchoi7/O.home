'use client';
// 자캐 등록 (관리자 전용) — 새 캐릭터는 목록 맨 끝(= 등록순 마지막)에 들어간다
import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList, newId } from '@/lib/postStore';
import { OC_KEY, OC_SEED, OcChar } from '@/lib/ocStore';
import { OcForm } from '@/components/oc/OcForm';
import { useToast } from '@/components/ui/Toast';
import { PageTitle } from '@/components/ui/PageText';

export default function OcWritePage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [chars, setChars, loaded] = useLocalList<OcChar>(OC_KEY, OC_SEED);

  if (!loaded) return <section className="page" />;
  if (!isAdmin) {
    return <section className="page"><div className="page-head"><PageTitle>OC LIST</PageTitle><p>관리자만 등록할 수 있습니다</p></div></section>;
  }
  return (
    <section className="page">
      <div className="page-head"><PageTitle>NEW OC</PageTitle><p>캐릭터 등록</p></div>
      <OcForm initial={null}
        onCancel={() => router.push('/oc')}
        onSave={v => {
          setChars([...chars, { id: newId(), ...v }]);
          toast('등록되었습니다');
          router.push('/oc');
        }} />
    </section>
  );
}
