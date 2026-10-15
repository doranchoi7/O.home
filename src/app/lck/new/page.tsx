'use client';
import { Suspense } from 'react';
import { useAuth } from '@/lib/auth';
import { PageTitle } from '@/components/ui/PageText';
import { MatchForm } from '@/components/lck/MatchForm';

export default function LckNewPage() {
  const { isAdmin } = useAuth();
  return (
    <section className="page">
      <div className="page-head"><PageTitle href="/lck">LCK 경기 기록</PageTitle>{!isAdmin && <p>관리자 전용 페이지</p>}</div>
      {isAdmin && <Suspense fallback={null}><MatchForm /></Suspense>}
    </section>
  );
}
