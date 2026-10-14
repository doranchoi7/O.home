'use client';
// 새 게시판 유형 7개의 임시 페이지 — 주소·메뉴·섹션(?s=)만 동작하는 빈 껍데기.
// 유형별 목록·글쓰기·뷰어를 만들 때 각 src/app/<유형>/page.tsx에서 이 컴포넌트 대신 실제 화면으로 교체한다.
import { Suspense } from 'react';
import { useSectionParam, useSectionTitle, type SectionKind } from '@/lib/sectionStore';
import { PageTitle } from '@/components/ui/PageText';

function Inner({ kind, def }: { kind: SectionKind; def: string }) {
  const sec = useSectionParam(kind);
  const { title } = useSectionTitle(kind, sec.id, def);
  return (
    <section className="page">
      <div className="page-head"><PageTitle>{title}</PageTitle></div>
      <div className="panel" style={{ textAlign: 'center', padding: 56 }}>
        <p style={{ fontSize: 13, color: 'var(--faint)' }}>아직 만들고 있는 게시판입니다.</p>
      </div>
    </section>
  );
}

// useSearchParams는 Suspense 경계가 필요하다 (Next App Router)
export function BoardShell({ kind, def }: { kind: SectionKind; def: string }) {
  return <Suspense fallback={<section className="page" />}><Inner kind={kind} def={def} /></Suspense>;
}
