'use client';
import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalList, newId } from '@/lib/postStore';
import { SeriesWork, SERIES_KEY } from '@/lib/seriesStore';
import { putBlob } from '@/lib/blobStore';
import { CropEditor, CropImg, CropValue } from '@/components/ui/CropEditor';
import { KInput, KSelect, KLabel } from '@/components/ui/Kit';
import { useToast } from '@/components/ui/Toast';

const PHS = ['cool', 'warm', 'pale', 'red'];

export function SeriesForm() {
  const router = useRouter();
  const toast = useToast();
  const [works, setWorks] = useLocalList<SeriesWork>(SERIES_KEY, []);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [vis, setVis] = useState<SeriesWork['visibility']>('public');
  const [poster, setPoster] = useState<File | null>(null);
  const [posterUrl, setPosterUrl] = useState('');
  const [crop, setCrop] = useState<CropValue | undefined>(undefined);
  const [cropOpen, setCropOpen] = useState(false);
  const posterRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    if (!title.trim()) { toast('시리즈 제목을 입력해 주세요'); return; }
    const posterId = poster ? await putBlob(poster) : undefined;
    const w: SeriesWork = {
      id: newId(),
      title: title.trim(),
      author: author.trim() || undefined,
      visibility: vis,
      posterId,
      posterCrop: crop,
      ph: PHS[works.length % PHS.length],
      created: new Date().toISOString(),
      posts: [],
    };
    setWorks([w, ...works]);
    toast('시리즈가 만들어졌습니다');
    router.push('/series');
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
                {posterUrl && <CropImg src={posterUrl} crop={crop} />}
              </div>
              <input ref={posterRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setPoster(f); setPosterUrl(URL.createObjectURL(f)); setCrop(undefined); setCropOpen(true); }
                  e.target.value = '';
                }} />
              {posterUrl && (
                <button className="btn btn-ghost" style={{ padding: '5px 11px', fontSize: 11 }}
                  onClick={() => setCropOpen(true)}>✂ 위치·확대 조정</button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <button className="btn btn-ghost" onClick={() => router.push('/series')}>CANCEL</button>
            <button className="btn btn-dark" onClick={save}>ADD</button>
          </div>
        </div>
      </div>
      {posterUrl && (
        <CropEditor open={cropOpen} src={posterUrl} aspect="3:4" initial={crop}
          onClose={() => setCropOpen(false)}
          onApply={c => { setCrop(c); setCropOpen(false); }} />
      )}
    </>
  );
}
