'use client';
// useSearchParams(?s=게시판)를 쓰므로 Suspense 경계로 감싼다
import { Suspense } from 'react';
import { PopBoardPage } from '@/components/pop/PopBoard';

export default function PopPage() {
  return <Suspense fallback={<section className="page" />}><PopBoardPage /></Suspense>;
}
