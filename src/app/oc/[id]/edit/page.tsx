'use client';
// 자캐 수정 (관리자 전용)
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { OC_KEY, OC_SEED, OcChar } from '@/lib/ocStore';
import { OcForm } from '@/components/oc/OcForm';
import { useToast } from '@/components/ui/Toast';
import { PageTitle } from '@/components/ui/PageText';

export default function OcEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [chars, setChars, loaded] = useLocalList<OcChar>(OC_KEY, OC_SEED);
  const c = chars.find(x => x.id === id);

  if (!loaded) return <section className="page" />;
  if (!isAdmin || !c) {
    return <section className="page"><div className="page-head"><PageTitle>OC LIST</PageTitle><p>캐릭터를 찾을 수 없거나 권한이 없습니다</p></div></section>;
  }
  return (
    <section className="page">
      <div className="page-head"><PageTitle>EDIT OC</PageTitle><p>{c.name}</p></div>
      <OcForm initial={c}
        onCancel={() => router.push('/oc')}
        onSave={v => {
          setChars(chars.map(x => (x.id === c.id ? { ...x, ...v } : x)));
          toast('저장되었습니다');
          router.push('/oc');
        }} />
    </section>
  );
}
