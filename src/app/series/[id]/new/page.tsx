'use client';
import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList, newId } from '@/lib/postStore';
import { SeriesWork, SeriesPost, SERIES_KEY } from '@/lib/seriesStore';
import { PageTitle } from '@/components/ui/PageText';
import { KInput, KLabel } from '@/components/ui/Kit';
import { RichEditor } from '@/components/ui/RichEditor';
import { useToast } from '@/components/ui/Toast';

const today = () => new Date().toISOString().slice(0, 10);

export default function SeriesPostNewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [works, setWorks, loaded] = useLocalList<SeriesWork>(SERIES_KEY, []);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [text, setText] = useState('');

  if (!loaded) return <section className="page" />;
  const w = works.find(x => x.id === id);
  if (!isAdmin || !w) {
    return (
      <section className="page">
        <div className="page-head"><PageTitle href="/series">SERIES</PageTitle><p>관리자 전용이거나 없는 시리즈입니다</p></div>
      </section>
    );
  }

  const save = () => {
    if (!title.trim()) { toast('글 제목을 입력해 주세요'); return; }
    if (!text.trim()) { toast('내용을 입력해 주세요'); return; }
    const p: SeriesPost = { id: newId(), title: title.trim(), text, rich: true, images: [], date };
    setWorks(works.map(x => x.id === w.id ? { ...x, posts: [...x.posts, p] } : x));
    toast('글이 등록되었습니다');
    router.push(`/series/${w.id}`);
  };

  return (
    <section className="page">
      <div className="page-head"><PageTitle href={`/series/${w.id}`}>{w.title}</PageTitle></div>
      <div className="panel" style={{ maxWidth: 720, margin: '0 auto', padding: 26 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <KLabel>Title</KLabel>
              <KInput value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div style={{ width: 160 }}>
              <KLabel>Date</KLabel>
              <KInput type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <KLabel>Text</KLabel>
            <RichEditor value={text} onChange={setText} placeholder="내용을 작성하세요 — 이미지는 원하는 위치에 넣을 수 있어요" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => router.push(`/series/${w.id}`)}>CANCEL</button>
            <button className="btn btn-dark" onClick={save}>POST</button>
          </div>
        </div>
      </div>
    </section>
  );
}
