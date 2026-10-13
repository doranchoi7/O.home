'use client';
import { Suspense } from 'react';
import { useAuth } from '@/lib/auth';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';
import { SeriesForm } from '@/components/series/SeriesForm';

export default function SeriesNewPage() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <section className="page">
        <div className="page-head"><PageTitle href="/series">SERIES</PageTitle><p>관리자 전용 페이지</p></div>
      </section>
    );
  }
  return (
    <section className="page">
      <div className="page-head">
        <PageTitle href="/series">SERIES</PageTitle>
        <EditableDesc k="series-new-desc" def="새 시리즈 만들기 — 제목과 표지를 등록하면 글을 쌓을 수 있습니다" />
      </div>
      <Suspense fallback={null}><SeriesForm /></Suspense>
    </section>
  );
}
