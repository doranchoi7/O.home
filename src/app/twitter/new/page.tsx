'use client';
import { Suspense } from 'react';
import { useAuth } from '@/lib/auth';
import { PageTitle } from '@/components/ui/PageText';
import { TweetForm } from '@/components/twitter/TweetForm';

export default function TwitterNewPage() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <section className="page">
        <div className="page-head"><PageTitle href="/twitter">트위터</PageTitle><p>관리자 전용 페이지</p></div>
      </section>
    );
  }
  return (
    <section className="page">
      <div className="page-head"><PageTitle href="/twitter">트위터</PageTitle></div>
      <Suspense fallback={null}><TweetForm /></Suspense>
    </section>
  );
}
