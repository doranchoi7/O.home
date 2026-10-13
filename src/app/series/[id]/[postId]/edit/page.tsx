'use client';
import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { SeriesWork, SeriesPost, SERIES_KEY } from '@/lib/seriesStore';
import { PageTitle } from '@/components/ui/PageText';
import { KInput, KLabel } from '@/components/ui/Kit';
import { RichEditor } from '@/components/ui/RichEditor';
import { useToast } from '@/components/ui/Toast';

function EditForm({ w, p, works, setWorks }: {
  w: SeriesWork; p: SeriesPost; works: SeriesWork[]; setWorks: (v: SeriesWork[]) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(p.title);
  const [date, setDate] = useState(p.date);
  const [text, setText] = useState(p.text);

  const save = () => {
    if (!title.trim()) { toast('글 제목을 입력해 주세요'); return; }
    if (!text.trim()) { toast('내용을 입력해 주세요'); return; }
    setWorks(works.map(x => x.id === w.id ? {
      ...x,
      posts: x.posts.map(y => y.id === p.id ? { ...y, title: title.trim(), text, rich: true, date } : y),
    } : x));
    toast('저장되었습니다');
    router.push(`/series/${w.id}/${p.id}`);
  };

  return (
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
          <button className="btn btn-ghost" onClick={() => router.push(`/series/${w.id}/${p.id}`)}>CANCEL</button>
          <button className="btn btn-dark" onClick={save}>SAVE</button>
        </div>
      </div>
    </div>
  );
}

export default function SeriesPostEditPage() {
  const { id, postId } = useParams<{ id: string; postId: string }>();
  const { isAdmin } = useAuth();
  const [works, setWorks, loaded] = useLocalList<SeriesWork>(SERIES_KEY, []);

  if (!loaded) return <section className="page" />;
  const w = works.find(x => x.id === id);
  const p = w?.posts.find(y => y.id === postId);

  if (!isAdmin || !w || !p) {
    return (
      <section className="page">
        <div className="page-head"><PageTitle href="/series">SERIES</PageTitle><p>관리자 전용이거나 없는 글입니다</p></div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-head"><PageTitle href={`/series/${w.id}`}>{w.title}</PageTitle></div>
      <EditForm w={w} p={p} works={works} setWorks={setWorks} />
    </section>
  );
}
