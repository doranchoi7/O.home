'use client';
// useSearchParams(?s=게시판)를 쓰므로 Suspense 경계로 감싼다
import { Suspense } from 'react';
import { KakaoBoardPage } from '@/components/kakaotalk/KakaoBoard';

export default function KakaotalkPage() {
  return <Suspense fallback={<section className="page" />}><KakaoBoardPage /></Suspense>;
}
