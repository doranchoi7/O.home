'use client';
import React, { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { SeriesWork, SERIES_KEY, useSeriesSettings, seriesCats } from '@/lib/seriesStore';
import { useSectionParam, filterSection, secQuery } from '@/lib/sectionStore';
import { CroppedBlobImg } from '@/components/ui/CropEditor';
import { EditableDesc, PageTitle } from '@/components/ui/PageText';

function SeriesPageInner() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [worksAll, , loaded] = useLocalList<SeriesWork>(SERIES_KEY, []);
  const sec = useSectionParam('series');
  const works = filterSection(worksAll, sec.id);
  const [settings] = useSeriesSettings();
  const cats = seriesCats(settings, sec.id);
  const [cat, setCat] = useState('all');

  const visible = works
    .filter(w => isAdmin || w.visibility === 'public' || (w.visibility === 'member' && user))
    .filter(w => cat === 'all' || w.catId === cat);

  if (!loaded) return <section className="page" />;

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle>{sec.id === 'main' ? 'SERIES' : sec.name}</PageTitle>
        <EditableDesc k="series-desc" def="연재글을 시리즈별로 모아둔 곳" />
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
            onClick={() => router.push('/series/new' + secQuery('series', sec.id))}>＋ NEW SERIES</button>
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


export default function SeriesPage() {
  return <Suspense fallback={<section className="page" />}><SeriesPageInner /></Suspense>;
}
