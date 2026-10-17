'use client';
// 앨범 게시판 — 이미지만 작은 카드로 · 사용자가 만든 탭 · 한 번에 한 장 업로드 · 카드에 보일 위치 지정
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth';
import { useSectionParam, filterSection, sectionSetter, MAIN_SEC } from '@/lib/sectionStore';
import { useLocalList, newId } from '@/lib/postStore';
import { useTypeCats } from '@/lib/boardTypeStore';
import type { Visibility } from '@/lib/charStore';
import {
  AlbumItem, ALBUM_KEY, ALBUM_SEED, ALBUM_RATIO, ALBUM_CARD_MIN, ALBUM_PER,
} from '@/lib/albumStore';
import { Pager, KSelect } from '@/components/ui/Kit';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Lightbox } from '@/components/ui/Lightbox';
import { PageTitle } from '@/components/ui/PageText';
import { useBlobUrl, putBlob } from '@/lib/blobStore';
import { useToast } from '@/components/ui/Toast';

type Focus = { x: number; y: number };
const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** 카드 안의 이미지 — 지정한 위치가 보이게 잘라서 채운다 */
function FocusImg({ imgId, focus }: { imgId: string; focus: Focus }) {
  const url = useBlobUrl(imgId);
  if (!url) return <div style={{ position: 'absolute', inset: 0, background: 'var(--line)' }} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" draggable={false} style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      objectFit: 'cover', objectPosition: `${focus.x}% ${focus.y}%`,
    }} />
  );
}

interface SaveData { imgId: string; focus: Focus; catId: string; visibility: Visibility }

/** 올리기·수정 창 — 이미지 한 장, 드래그로 카드에 보일 부분 맞추기, 탭, 공개 범위 */
function AlbumEditor({ item, cats, defaultCat, onClose, onSave }: {
  item: AlbumItem | null;
  cats: { id: string; label: string }[];
  defaultCat: string;
  onClose: () => void;
  onSave: (d: SaveData) => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const savedUrl = useBlobUrl(item?.imgId);
  const src = localUrl ?? savedUrl ?? null;
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [focus, setFocus] = useState<Focus>(item?.focus ?? { x: 50, y: 50 });
  const [catId, setCatId] = useState(item?.catId ?? defaultCat);
  const [vis, setVis] = useState<Visibility>(item?.visibility ?? 'public');
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setNat(null);
    setFocus({ x: 50, y: 50 });
    setLocalUrl(URL.createObjectURL(f));
  };

  // 미리보기를 끌면 사진이 같이 움직이고, 보이는 그대로가 카드에 나온다
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!src) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, fx: focus.x, fy: focus.y };
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const box = boxRef.current;
    if (!d || !box || !nat) return;
    const r = box.getBoundingClientRect();
    const s = Math.max(r.width / nat.w, r.height / nat.h);
    const ox = nat.w * s - r.width;    // 가로로 넘치는 길이
    const oy = nat.h * s - r.height;   // 세로로 넘치는 길이
    setFocus({
      x: ox > 1 ? clamp(d.fx - ((e.clientX - d.x) / ox) * 100) : d.fx,
      y: oy > 1 ? clamp(d.fy - ((e.clientY - d.y) / oy) * 100) : d.fy,
    });
  };
  const onUp = () => { drag.current = null; };

  const save = async () => {
    if (!item && !file) { toast('이미지를 선택해 주세요'); return; }
    setBusy(true);
    try {
      const imgId = file ? await putBlob(file) : item!.imgId;
      onSave({ imgId, focus: { x: Math.round(focus.x), y: Math.round(focus.y) }, catId, visibility: vis });
    } catch (err) {
      toast(`이미지를 저장소에 올리지 못했습니다 — ${err instanceof Error ? err.message : String(err)}`);
      setBusy(false);
    }
  };

  return (
    <Modal open small title={item ? '앨범 수정' : '앨범에 올리기'}
      desc="이미지는 한 장씩 올립니다 — 미리보기를 끌어서 카드에 보일 부분을 맞춰 주세요"
      onClose={onClose}
      actions={<>
        <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
        <button className="btn btn-accent" disabled={busy} style={{ opacity: busy ? 0.5 : 1 }}
          onClick={save}>{busy ? '올리는 중…' : 'SAVE'}</button>
      </>}>
      <div style={{ display: 'grid', gap: 12 }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />

        <div ref={boxRef}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onClick={() => { if (!src) fileRef.current?.click(); }}
          style={{
            position: 'relative', width: 260, maxWidth: '100%', aspectRatio: ALBUM_RATIO, margin: '0 auto',
            borderRadius: 'var(--radius-s, 10px)', overflow: 'hidden',
            border: src ? '1px solid var(--line)' : '1.5px dashed var(--line)',
            background: 'var(--panel)', touchAction: 'none',
            cursor: src ? 'grab' : 'var(--cur-pointer,pointer)',
          }}>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" draggable={false}
              onLoad={e => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                objectPosition: `${focus.x}% ${focus.y}%`, userSelect: 'none', pointerEvents: 'none',
              }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 12, color: 'var(--faint)' }}>
              ＋ 이미지 선택
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 11 }}
            onClick={() => fileRef.current?.click()}>{src ? '다른 이미지로 바꾸기' : '이미지 선택'}</button>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <KSelect minWidth={130} value={catId} onChange={setCatId}
            options={[{ value: '', label: '탭 없음' }, ...cats.map(c => ({ value: c.id, label: c.label || '분류' }))]} />
          <KSelect minWidth={110} value={vis} onChange={v => setVis(v as Visibility)}
            options={[
              { value: 'public', label: '전체공개' },
              { value: 'member', label: '멤버공개' },
              { value: 'private', label: '나만보기' },
            ]} />
        </div>
      </div>
    </Modal>
  );
}

function AlbumPageInner() {
  const { user, isAdmin } = useAuth();
  const sec = useSectionParam('album');
  const [allPosts, setAllPosts, loaded] = useLocalList<AlbumItem>(ALBUM_KEY, ALBUM_SEED);
  const posts = filterSection(allPosts, sec.id);
  // 이 섹션 자리만 교체 — 다른 앨범의 그림이 지워지지 않는다
  const setPosts = sectionSetter(allPosts, sec.id, setAllPosts);
  const { catsOf } = useTypeCats();
  const cats = catsOf('album', sec.id);

  const [tab, setTab] = useState('');
  const curTab = cats.some(c => c.id === tab) ? tab : '';
  const [page, setPage] = useState(1);
  const [view, setView] = useState<number | null>(null);          // 크게 보기 순번
  const [edit, setEdit] = useState<AlbumItem | 'new' | null>(null);
  const [delPost, setDelPost] = useState<AlbumItem | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; post: AlbumItem } | null>(null);

  useEffect(() => {
    if (!ctx) return;
    const close = () => setCtx(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [ctx]);
  useEffect(() => { setPage(1); }, [curTab]);

  const visible = posts
    .filter(p => isAdmin || p.visibility === 'public' || (p.visibility === 'member' && !!user))
    .filter(p => !curTab || p.catId === curTab);

  const pages = Math.max(1, Math.ceil(visible.length / ALBUM_PER));
  const cur = Math.min(page, pages);
  const start = (cur - 1) * ALBUM_PER;
  const paged = visible.slice(start, start + ALBUM_PER);

  const onSave = (d: SaveData) => {
    if (edit === 'new') {
      setPosts([{
        id: newId(), imgId: d.imgId, focus: d.focus, catId: d.catId, visibility: d.visibility,
        date: new Date().toISOString(), authorId: user?.id ?? '',
      }, ...posts]);
    } else if (edit) {
      const id = edit.id;
      setPosts(posts.map(x => (x.id === id ? { ...x, ...d } : x)));
    }
    setEdit(null);
  };

  if (!loaded) return <section className="page" />;

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle>{sec.id === MAIN_SEC ? 'ALBUM' : sec.name}</PageTitle>
      </div>

      <div className="toolrow">
        <div className="seg">
          <button className={curTab === '' ? 'on' : ''} onClick={() => setTab('')}>전체</button>
          {cats.map(c => (
            <button key={c.id} className={curTab === c.id ? 'on' : ''} onClick={() => setTab(c.id)}>{c.label || '분류'}</button>
          ))}
        </div>
        {isAdmin && (
          <button className="btn btn-dark" onClick={() => setEdit('new')}>＋ UPLOAD</button>
        )}
      </div>

      {visible.length > 0 ? (
        <div style={{
          display: 'grid', gap: 10,
          gridTemplateColumns: `repeat(auto-fill, minmax(${ALBUM_CARD_MIN}px, 1fr))`,
        }}>
          {paged.map((p, i) => (
            <div key={p.id}
              onClick={() => setView(start + i)}
              onContextMenu={e => {
                if (!isAdmin) return;
                e.preventDefault();
                setCtx({ x: e.clientX, y: e.clientY, post: p });
              }}
              style={{
                position: 'relative', aspectRatio: ALBUM_RATIO, overflow: 'hidden',
                borderRadius: 'var(--radius-s, 10px)', background: 'var(--line)',
                cursor: 'var(--cur-pointer,pointer)',
              }}>
              <FocusImg imgId={p.imgId} focus={p.focus} />
            </div>
          ))}
        </div>
      ) : (
        <div className="panel" style={{ textAlign: 'center', padding: 44, fontSize: 13, color: 'var(--faint)' }}>
          {isAdmin ? '아직 그림이 없습니다 — 오른쪽 위 UPLOAD로 올려 주세요' : '게시물이 없습니다'}
        </div>
      )}
      {visible.length > ALBUM_PER && <Pager page={cur} total={pages} onChange={setPage} />}

      {/* 크게 보기 — 지금 탭에 보이는 그림끼리 ‹ ›로 넘긴다 */}
      {view !== null && visible[view] && (
        <Lightbox srcs={visible.map(p => p.imgId)} index={view} onClose={() => setView(null)} />
      )}

      {edit && (
        <AlbumEditor item={edit === 'new' ? null : edit} cats={cats} defaultCat={curTab}
          onClose={() => setEdit(null)} onSave={onSave} />
      )}

      {/* 우클릭 메뉴 (관리자) */}
      {ctx && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed', left: ctx.x, top: ctx.y, zIndex: 130,
          background: 'var(--panel-solid,#fff)', border: '1px solid var(--line)', borderRadius: 9,
          boxShadow: 'var(--sh-dd)', padding: 4, display: 'grid', minWidth: 120,
        }} onMouseDown={e => e.stopPropagation()}>
          <button style={{ padding: '7px 12px', fontSize: 12, borderRadius: 6, textAlign: 'left' }}
            onClick={() => { setEdit(ctx.post); setCtx(null); }}>수정</button>
          <button style={{ padding: '7px 12px', fontSize: 12, borderRadius: 6, textAlign: 'left' }}
            onClick={() => { setDelPost(ctx.post); setCtx(null); }}>삭제</button>
        </div>,
        document.body,
      )}

      <ConfirmModal open={!!delPost} title="이 그림을 삭제하시겠습니까?"
        body="삭제한 그림은 복구할 수 없습니다."
        onClose={() => setDelPost(null)}
        buttons={[
          { label: 'DELETE', kind: 'accent', onClick: () => {
            const id = delPost?.id;
            setDelPost(null);
            if (id) setPosts(posts.filter(x => x.id !== id));
          } },
          { label: 'CANCEL', kind: 'ghost', onClick: () => setDelPost(null) },
        ]} />
    </section>
  );
}

/** ?s= 를 읽으므로 Suspense 경계가 필요하다 (Next App Router) */
export default function AlbumPage() {
  return <Suspense fallback={<section className="page" />}><AlbumPageInner /></Suspense>;
}
