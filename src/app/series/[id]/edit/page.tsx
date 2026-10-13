'use client';
import React, { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { SeriesWork, SERIES_KEY, useSeriesSettings, seriesCats } from '@/lib/seriesStore';
import { MAIN_SEC } from '@/lib/sectionStore';
import { putBlob, useBlobUrl } from '@/lib/blobStore';
import { CropEditor, CropImg, CropValue } from '@/components/ui/CropEditor';
import { PageTitle } from '@/components/ui/PageText';
import { KInput, KSelect, KLabel } from '@/components/ui/Kit';
import { useToast } from '@/components/ui/Toast';

function EditForm({ w, works, setWorks }: {
  w: SeriesWork; works: SeriesWork[]; setWorks: (v: SeriesWork[]) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [settings] = useSeriesSettings();
  const cats = seriesCats(settings, w.secId ?? MAIN_SEC);
  const [catId, setCatId] = useState(w.catId ?? '');
  const [title, setTitle] = useState(w.title);
  const [author, setAuthor] = useState(w.author ?? '');
  const [vis, setVis] = useState<SeriesWork['visibility']>(w.visibility);
  const [poster, setPoster] = useState<File | null>(null);
  const [posterUrl, setPosterUrl] = useState('');
  const [crop, setCrop] = useState<CropValue | undefined>(w.posterCrop);
  const [cropOpen, setCropOpen] = useState(false);
  const posterRef = useRef<HTMLInputElement>(null);
  const origUrl = useBlobUrl(w.posterId);
  const previewUrl = posterUrl || origUrl;

  const save = async () => {
    if (!title.trim()) { toast('시리즈 제목을 입력해 주세요'); return; }
    const posterId = poster ? await putBlob(poster) : w.posterId;
    setWorks(works.map(x => x.id === w.id ? {
      ...x,
      title: title.trim(),
      author: author.trim() || undefined,
      catId: catId || undefined,
      visibility: vis,
      posterId,
      posterCrop: crop,
    } : x));
    toast('저장되었습니다');
    router.push(`/series/${w.id}`);
  };

  return (
    <>
      <div className="panel" style={{ maxWidth: 560, margin: '0 auto', padding: 26 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <KLabel>Title</KLabel>
            <KInput value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <KLabel>Author (optional)</KLabel>
            <KInput value={author} onChange={e => setAuthor(e.target.value)} />
          </div>
          
          {cats.length > 0 && (
            <div>
              <KLabel>Category</KLabel>
              <KSelect minWidth={130} value={catId} onChange={setCatId}
                options={[{ value: '', label: '분류 없음' }, ...cats.map(c => ({ value: c.id, label: c.label }))]} />
            </div>
          )}
          
          <div>
            <KLabel>Visibility</KLabel>
            <KSelect minWidth={130} value={vis} onChange={v => setVis(v as SeriesWork['visibility'])}
              options={[
                { value: 'public', label: '전체공개' },
                { value: 'member', label: '멤버공개' },
                { value: 'private', label: '나만보기' },
              ]} />
          </div>
          <div>
            <KLabel>Poster</KLabel>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div
                style={{
                  width: 110, aspectRatio: '3/4', borderRadius: 9, overflow: 'hidden',
                  cursor: 'var(--cur-pointer,pointer)', border: '1.5px dashed var(--line)',
                  position: 'relative', flexShrink: 0,
                }}
                onClick={() => posterRef.current?.click()}>
                {previewUrl && <CropImg src={previewUrl} crop={crop} />}
              </div>
              <input ref={posterRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setPoster(f); setPosterUrl(URL.createObjectURL(f)); setCrop(undefined); setCropOpen(true); }
                  e.target.value = '';
                }} />
              {previewUrl && (
                <button className="btn btn-ghost" style={{ padding: '5px 11px', fontSize: 11 }}
                  onClick={() => setCropOpen(true)}>✂ 위치·확대 조정</button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <button className="btn btn-ghost" onClick={() => router.push(`/series/${w.id}`)}>CANCEL</button>
            <button className="btn btn-dark" onClick={save}>SAVE</button>
          </div>
        </div>
      </div>
      {previewUrl && (
        <CropEditor open={cropOpen} src={previewUrl} aspect="3:4" initial={crop}
          onClose={() => setCropOpen(false)}
          onApply={c => { setCrop(c); setCropOpen(false); }} />
      )}
    </>
  );
}

export default function SeriesEditPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const [works, setWorks, loaded] = useLocalList<SeriesWork>(SERIES_KEY, []);

  if (!loaded) return <section className="page" />;
  const w = works.find(x => x.id === id);

  if (!isAdmin || !w) {
    return (
      <section className="page">
        <div className="page-head"><PageTitle href="/series">SERIES</PageTitle><p>관리자 전용이거나 없는 시리즈입니다</p></div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-head"><PageTitle href={`/series/${w.id}`}>{w.title}</PageTitle></div>
      <EditForm w={w} works={works} setWorks={setWorks} />
    </section>
  );
}
