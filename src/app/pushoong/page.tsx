'use client';
// useSearchParams(?s=게시판)를 쓰므로 Suspense 경계로 감싼다
import { Suspense } from 'react';
import { PushoongBoardPage } from '@/components/pushoong/PushoongBoard';

export default function PushoongPage() {
  return <Suspense fallback={<section className="page" />}><PushoongBoardPage /></Suspense>;
}
