'use client';
import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { LCK_KEY, type LckMatch } from '@/lib/lckStore';
import { useSectionTitle } from '@/lib/sectionStore';
import { PageTitle } from '@/components/ui/PageText';
import { MatchForm } from '@/components/lck/MatchForm';

export default function LckEditPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const [all, , loaded] = useLocalList<LckMatch>(LCK_KEY, []);
  const m = all.find(x => x.id === id);
  const tt = useSectionTitle('lck', m?.secId, 'LCK 경기 기록');
  if (!loaded) return <section className="page" />;
  if (!isAdmin || !m) {
    return <section className="page"><div className="page-head"><PageTitle href={tt.href}>{tt.title}</PageTitle><p>관리자 전용이거나 없는 기록입니다</p></div></section>;
  }
  return (
    <section className="page">
      <div className="page-head"><PageTitle href={tt.href}>{tt.title}</PageTitle></div>
      <Suspense fallback={null}><MatchForm match={m} /></Suspense>
    </section>
  );
}
