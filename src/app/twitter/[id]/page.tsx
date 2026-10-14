'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { TWITTER_KEY, type Tweet } from '@/lib/twitterStore';
import { PageTitle } from '@/components/ui/PageText';
import { useSectionTitle } from '@/lib/sectionStore';
import { useConfirmDelete } from '@/components/ui/Modal';
import { TweetCard } from '@/components/twitter/TweetCard';

export default function TweetViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const del = useConfirmDelete();
  const [all, setAll, loaded] = useLocalList<Tweet>(TWITTER_KEY, []);
  const t = all.find(x => x.id === id);
  const tt = useSectionTitle('twitter', t?.secId, '트위터');

  if (!loaded) return <section className="page" />;
  const ok = t && (isAdmin || t.visibility === 'public' || (t.visibility === 'member' && user));
  if (!t || !ok) {
    return (
      <section className="page">
        <div className="page-head"><PageTitle href={tt.href}>{tt.title}</PageTitle><p>트윗을 찾을 수 없습니다</p></div>
      </section>
    );
  }

  const remove = () =>
    del.ask('이 트윗을 삭제하시겠습니까?', () => {
      setAll(all.filter(x => x.id !== t.id));
      router.push(tt.href);
    });

  const sm = { padding: '3px 10px', fontSize: 10.5 };
  return (
    <section className="page">
      <div className="page-head"><PageTitle href={tt.href}>{tt.title}</PageTitle></div>
      <div style={{ maxWidth: 600, margin: '0 auto 10px', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <button className="btn btn-ghost" style={sm} onClick={() => router.push(tt.href)}>LIST</button>
        {isAdmin && (
          <>
            <button className="btn btn-ghost" style={sm} onClick={() => router.push(`/twitter/${t.id}/edit`)}>EDIT</button>
            <button className="btn btn-ghost" style={sm} onClick={remove}>DELETE</button>
          </>
        )}
      </div>
      <div className="panel" style={{ maxWidth: 600, margin: '0 auto', padding: 0 }}>
        <TweetCard d={t} />
      </div>
      {del.element}
    </section>
  );
}
