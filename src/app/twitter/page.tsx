'use client';
import React, { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { TWITTER_KEY, sortTweets, type Tweet } from '@/lib/twitterStore';
import { useSectionParam, useSectionTitle, filterSection, secQuery } from '@/lib/sectionStore';
import { useTypeCats } from '@/lib/boardTypeStore';
import { EditableDesc, PageTitle } from '@/components/ui/PageText';
import { TweetRow, TweetCss } from '@/components/twitter/TweetCard';

function TwitterPageInner() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [all, , loaded] = useLocalList<Tweet>(TWITTER_KEY, []);
  const sec = useSectionParam('twitter');
  const { title } = useSectionTitle('twitter', sec.id, '트위터');
  const { catsOf } = useTypeCats();
  const cats = catsOf('twitter', sec.id);
  const [cat, setCat] = useState('all');

  if (!loaded) return <section className="page" />;

  const list = sortTweets(
    filterSection(all, sec.id)
      .filter(t => isAdmin || t.visibility === 'public' || (t.visibility === 'member' && user))
      .filter(t => cat === 'all' || t.catId === cat),
  );

  return (
    <section className="page">
      <TweetCss />
      <div className="page-head">
        <PageTitle>{title}</PageTitle>
        <EditableDesc k="twitter-desc" def="트윗을 모아둔 곳" />
      </div>

      <div className="toolrow">
        {cats.length > 0 ? (
          <div className="seg">
            <button className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>전체</button>
            {cats.map(c => (
              <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>{c.label}</button>
            ))}
          </div>
        ) : <div />}
        {isAdmin && (
          <button className="btn btn-dark" style={{ whiteSpace: 'nowrap' }}
            onClick={() => router.push('/twitter/new' + secQuery('twitter', sec.id))}>＋ NEW TWEET</button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: 48, fontSize: 13, color: 'var(--faint)' }}>
          트윗이 없습니다 (불러온 {all.length}개 / 로그인 {user ? 'O' : 'X'})
        </div>
      ) : (
        <div className="panel" style={{ maxWidth: 600, margin: '0 auto', padding: 0 }}>
          {list.map(t => <TweetRow key={t.id} d={t} onOpen={() => router.push(`/twitter/${t.id}`)} />)}
        </div>
      )}
    </section>
  );
}

export default function TwitterPage() {
  return <Suspense fallback={<section className="page" />}><TwitterPageInner /></Suspense>;
}
