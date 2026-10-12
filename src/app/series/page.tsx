'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { SeriesWork, SERIES_KEY } from '@/lib/seriesStore';
import { CroppedBlobImg } from '@/components/ui/CropEditor';
import { EditableDesc, PageTitle } from '@/components/ui/PageText';

export default function SeriesPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [works, , loaded] = useLocalList<SeriesWork>(SERIES_KEY, []);

  const visible = works.filter(
    w => isAdmin || w.visibility === 'public' || (w.visibility === 'member' && user),
  );

  if (!loaded) return <section className="page" />;

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle>SERIES</PageTitle>
        <EditableDesc k="series-desc" def="연재글을 시리즈별로 모아둔 곳" />
      </div>

      <div className="toolrow">
        <div />
        {isAdmin && (
          <button className="btn btn-dark" style={{ whiteSpace: 'nowrap' }}
            onClick={() => router.push('/series/new')}>＋ NEW SERIES</button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: 48, fontSize: 13, color: 'var(--faint)' }}>
          시리즈가 없습니다
        </div>
      ) : (
        <div className="g5">
          {visible.map(w => (
            <div key={w.id} className="panel thr-card" onClick={() => router.push(`/series/${w.id}`)}>
              <div className="th">
                <CroppedBlobImg fileRef={w.posterId} crop={w.posterCrop} ph={w.ph} />
              </div>
              <div className="info">
                <div className="tt">{w.title}</div>
                {w.author && <div className="row">{w.author}</div>}
                <div className="row"><b>글</b> {w.posts.length}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
