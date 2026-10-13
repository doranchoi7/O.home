'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { SeriesWork, SERIES_KEY } from '@/lib/seriesStore';
import { PageTitle } from '@/components/ui/PageText';
import { useConfirmDelete } from '@/components/ui/Modal';

export default function SeriesPostPage() {
  const { id, postId } = useParams<{ id: string; postId: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const del = useConfirmDelete();
  const [works, setWorks, loaded] = useLocalList<SeriesWork>(SERIES_KEY, []);

  if (!loaded) return <section className="page" />;
  const w = works.find(x => x.id === id);
  const posts = w ? [...w.posts].sort((a, b) => a.date.localeCompare(b.date)) : [];
  const idx = posts.findIndex(p => p.id === postId);
  const p = idx >= 0 ? posts[idx] : undefined;

  if (!w || !p) {
    return (
      <section className="page">
        <div className="page-head"><PageTitle href="/series">SERIES</PageTitle><p>글을 찾을 수 없습니다</p></div>
      </section>
    );
  }

  const prev = posts[idx - 1];
  const next = posts[idx + 1];

  const removePost = () =>
    del.ask('이 글을 삭제하시겠습니까?', () => {
      setWorks(works.map(x => x.id === w.id ? { ...x, posts: x.posts.filter(y => y.id !== p.id) } : x));
      router.push(`/series/${w.id}`);
    });

  return (
    <section className="page">
      <div className="page-head"><PageTitle href={`/series/${w.id}`}>{w.title}</PageTitle></div>

      <div className="panel" style={{ maxWidth: 720, margin: '0 auto', padding: 30, position: 'relative' }}>
        {isAdmin && (
          <div style={{ position: 'absolute', top: 18, right: 20, display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 10.5 }}
              onClick={() => router.push(`/series/${w.id}/${p.id}/edit`)}>EDIT</button>
            <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 10.5 }}
              onClick={removePost}>DELETE</button>
          </div>
        )}
        <small style={{ color: 'var(--accent)' }}>{idx + 1}화</small>
        <h2 style={{ margin: '4px 0 6px' }}>{p.title}</h2>
        <small style={{ color: 'var(--faint)' }}>{p.date}</small>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.85, marginTop: 24, fontSize: 14 }}>{p.text}</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 36 }}>
          <button className="btn btn-ghost" disabled={!prev}
            onClick={() => prev && router.push(`/series/${w.id}/${prev.id}`)}>← 이전 글</button>
          <button className="btn btn-ghost" onClick={() => router.push(`/series/${w.id}`)}>목록</button>
          <button className="btn btn-ghost" disabled={!next}
            onClick={() => next && router.push(`/series/${w.id}/${next.id}`)}>다음 글 →</button>
        </div>

      </div>
      {del.element}
    </section>
  );
}
