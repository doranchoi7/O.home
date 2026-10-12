'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { SeriesWork, SERIES_KEY } from '@/lib/seriesStore';
import { CroppedBlobImg } from '@/components/ui/CropEditor';
import { PageTitle } from '@/components/ui/PageText';
import { useConfirmDelete } from '@/components/ui/Modal';

export default function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const del = useConfirmDelete();
  const [works, setWorks, loaded] = useLocalList<SeriesWork>(SERIES_KEY, []);

  if (!loaded) return <section className="page" />;
  const w = works.find(x => x.id === id);
  if (!w) {
    return (
      <section className="page">
        <div className="page-head"><PageTitle href="/series">SERIES</PageTitle><p>시리즈를 찾을 수 없습니다</p></div>
      </section>
    );
  }

  // 날짜 과거순 → 1, 2, 3 …
  const posts = [...w.posts].sort((a, b) => a.date.localeCompare(b.date));

  const removeSeries = () =>
    del.ask(`「${w.title}」 시리즈를 삭제하시겠습니까?`, () => {
      setWorks(works.filter(x => x.id !== w.id));
      router.push('/series');
    }, `시리즈의 글 ${w.posts.length}개도 함께 삭제됩니다.`);

  return (
    <section className="page">
      <div className="page-head"><PageTitle href="/series">SERIES</PageTitle></div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="thr-head">
          <div className="poster">
            <CroppedBlobImg fileRef={w.posterId} crop={w.posterCrop} ph={w.ph} />
          </div>
          <div>
            <div className="tt">{w.title}</div>
            {w.author && <div className="author">{w.author}</div>}
            <small>글 {w.posts.length}</small>
            {isAdmin && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button className="btn btn-dark" style={{ padding: '3px 10px', fontSize: 10.5 }}
                  onClick={() => router.push(`/series/${w.id}/new`)}>＋ NEW POST</button>
                <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 10.5 }}
                  onClick={() => router.push(`/series/${w.id}/edit`)}>EDIT</button>
                <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 10.5 }}
                  onClick={removeSeries}>DELETE</button>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '6px 22px 18px' }}>
          {posts.length === 0 && (
            <p style={{ fontSize: 12.5, color: 'var(--faint)', padding: '14px 0' }}>아직 글이 없습니다</p>
          )}
          {posts.map((p, i) => (
            <div key={p.id}
              onClick={() => router.push(`/series/${w.id}/${p.id}`)}
              style={{
                display: 'flex', gap: 14, alignItems: 'baseline', padding: '12px 0',
                borderBottom: '1px solid var(--line)', cursor: 'var(--cur-pointer,pointer)',
              }}>
              <b style={{ width: 28, color: 'var(--accent)' }}>{i + 1}</b>
              <span style={{ flex: 1 }}>{p.title}</span>
              <small style={{ color: 'var(--faint)' }}>{p.date}</small>
            </div>
          ))}
        </div>
      </div>
      {del.element}
    </section>
  );
}
