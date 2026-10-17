'use client';
// 게임 코디 백업 — 게임은 탭으로 · 캐릭터 전신 이미지 · 직접 만든 코디템 항목(사진은 선택)
// 항목 틀은 게임 탭마다 한 번만 만들어 두면 새 코디에 자동으로 깔리고, 글마다 추가·삭제·순서 변경도 된다
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useSectionParam, filterSection, sectionSetter, MAIN_SEC } from '@/lib/sectionStore';
import { useLocalList, newId } from '@/lib/postStore';
import { useTypeCats } from '@/lib/boardTypeStore';
import type { Visibility } from '@/lib/charStore';
import {
  StyleDoc, StyleLook, StyleTpl, StyleItem,
  STYLE_KEY, STYLE_SEED, STYLE_PER, STYLE_CARD_MIN, STYLE_RATIO,
} from '@/lib/styleStore';
import { Pager, KSelect, KInput } from '@/components/ui/Kit';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { DragList } from '@/components/ui/DragList';
import { PageTitle } from '@/components/ui/PageText';
import { useBlobUrl, putBlob } from '@/lib/blobStore';
import { useToast } from '@/components/ui/Toast';

/** 이미지 한 장 — 저장된 파일(imgId) 또는 방금 고른 미리보기(preview) */
function Pic({ imgId, preview, fit = 'cover', style }: {
  imgId?: string; preview?: string; fit?: 'cover' | 'contain'; style?: React.CSSProperties;
}) {
  const url = useBlobUrl(imgId || undefined);
  const src = preview ?? url ?? null;
  if (!src) return <div style={{ background: 'var(--line)', ...style }} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" draggable={false} style={{ objectFit: fit, display: 'block', ...style }} />
  );
}

/** 코디템 한 줄 — 모서리 둥근 사각형 안에 사진, 옆에 이름. 사진은 있을 때만 */
function ItemRow({ it }: { it: StyleItem }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
      {it.imgId && (
        <div style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--line)' }}>
          <Pic imgId={it.imgId} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <small style={{ display: 'block', color: 'var(--faint)', fontSize: 10.5 }}>{it.label}</small>
        <span style={{ fontSize: 13 }}>{it.name || '—'}</span>
      </div>
    </div>
  );
}

/* ---------- 항목 틀 편집 (게임 탭마다) ---------- */
function TplEditor({ game, slots, onClose, onSave }: {
  game: string;
  slots: { id: string; label: string }[];
  onClose: () => void;
  onSave: (slots: { id: string; label: string }[]) => void;
}) {
  const [list, setList] = useState(slots);
  const patch = (id: string, label: string) => setList(list.map(s => (s.id === id ? { ...s, label } : s)));
  return (
    <Modal open small title={`${game} 항목 틀`}
      desc="이 게임에서 새 코디를 만들면 아래 항목이 자동으로 깔립니다 — 이미 쓴 코디는 바뀌지 않습니다"
      onClose={onClose}
      actions={<>
        <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
        <button className="btn btn-accent" onClick={() => {
          onSave(list.map(s => ({ ...s, label: s.label.trim() })).filter(s => s.label));
        }}>SAVE</button>
      </>}>
      <DragList items={list} keyOf={s => s.id} onReorder={setList}
        render={s => (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', padding: '3px 0' }}>
            <span className="drag-h" style={{ fontSize: 11 }}>⠿</span>
            <KInput value={s.label} placeholder="항목 이름 (예: 헤어)" onChange={e => patch(s.id, e.target.value)}
              style={{ flex: 1, minWidth: 0 }} />
            <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 10.5 }}
              onClick={() => setList(list.filter(x => x.id !== s.id))}>DELETE</button>
          </div>
        )} />
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }}
          onClick={() => setList([...list, { id: newId(), label: '' }])}>＋ ADD</button>
      </div>
    </Modal>
  );
}

/* ---------- 코디 올리기·수정 ---------- */
interface EditItem extends StyleItem { file?: File; preview?: string }
interface SaveData { catId: string; title: string; bodyImgId: string; items: StyleItem[]; visibility: Visibility }

function StyleEditor({ look, cats, defaultCat, slotsOf, onClose, onSave }: {
  look: StyleLook | null;
  cats: { id: string; label: string }[];
  defaultCat: string;
  slotsOf: (catId: string) => { id: string; label: string }[];
  onClose: () => void;
  onSave: (d: SaveData) => void;
}) {
  const toast = useToast();
  const urls = useRef<string[]>([]);
  const bodyRef = useRef<HTMLInputElement>(null);
  const fromTpl = (catId: string): EditItem[] =>
    slotsOf(catId).map(s => ({ id: newId(), label: s.label, name: '', imgId: '' }));

  const firstCat = defaultCat || cats[0]?.id || '';
  const [catId, setCatId] = useState(look?.catId ?? firstCat);
  const [title, setTitle] = useState(look?.title ?? '');
  const [bodyFile, setBodyFile] = useState<File | null>(null);
  const [bodyUrl, setBodyUrl] = useState<string | null>(null);
  const [items, setItems] = useState<EditItem[]>(look ? look.items.map(i => ({ ...i })) : fromTpl(firstCat));
  const [vis, setVis] = useState<Visibility>(look?.visibility ?? 'public');
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { urls.current.forEach(u => URL.revokeObjectURL(u)); }, []);
  const makeUrl = (f: File) => { const u = URL.createObjectURL(f); urls.current.push(u); return u; };

  const patchItem = (id: string, p: Partial<EditItem>) =>
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...p } : i)));

  const onGame = (v: string) => {
    setCatId(v);
    // 새 코디는 고른 게임의 항목 틀로 다시 깐다 (수정 중인 글은 건드리지 않는다)
    if (!look) setItems(fromTpl(v));
  };

  const save = async () => {
    if (!catId) { toast('게임 탭을 선택해 주세요'); return; }
    if (!look && !bodyFile) { toast('캐릭터 전신 이미지를 선택해 주세요'); return; }
    setBusy(true);
    try {
      const bodyImgId = bodyFile ? await putBlob(bodyFile) : look!.bodyImgId;
      const out: StyleItem[] = [];
      for (const it of items) {
        const imgId = it.file ? await putBlob(it.file) : it.imgId;
        out.push({ id: it.id, label: it.label.trim(), name: it.name.trim(), imgId });
      }
      onSave({ catId, title: title.trim(), bodyImgId, items: out, visibility: vis });
    } catch (err) {
      toast(`이미지를 저장소에 올리지 못했습니다 — ${err instanceof Error ? err.message : String(err)}`);
      setBusy(false);
    }
  };

  return (
    <Modal open title={look ? '코디 수정' : '코디 올리기'}
      desc="게임을 고르면 그 게임의 항목 틀이 깔립니다 — 항목은 이 글에서만 추가·삭제·순서 변경할 수 있어요"
      onClose={onClose}
      actions={<>
        <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
        <button className="btn btn-accent" disabled={busy} style={{ opacity: busy ? 0.5 : 1 }}
          onClick={save}>{busy ? '올리는 중…' : 'SAVE'}</button>
      </>}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <KSelect minWidth={140} value={catId} onChange={onGame}
            options={cats.map(c => ({ value: c.id, label: c.label || '게임' }))} />
          <KSelect minWidth={110} value={vis} onChange={v => setVis(v as Visibility)}
            options={[
              { value: 'public', label: '전체공개' },
              { value: 'member', label: '멤버공개' },
              { value: 'private', label: '나만보기' },
            ]} />
        </div>
        <KInput value={title} placeholder="제목 (선택)" onChange={e => setTitle(e.target.value)} />

        {/* 캐릭터 전신 이미지 */}
        <input ref={bodyRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) { setBodyFile(f); setBodyUrl(makeUrl(f)); }
          }} />
        <div onClick={() => bodyRef.current?.click()} style={{
          width: 180, aspectRatio: STYLE_RATIO, borderRadius: 12, overflow: 'hidden', margin: '0 auto',
          border: '1.5px dashed var(--line)', cursor: 'var(--cur-pointer,pointer)', position: 'relative',
        }}>
          {(bodyUrl || look) ? (
            <Pic imgId={look?.bodyImgId} preview={bodyUrl ?? undefined} fit="contain"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 12, color: 'var(--faint)', textAlign: 'center' }}>
              ＋ 캐릭터 전신 이미지
            </div>
          )}
        </div>

        {/* 코디템 항목 */}
        <div>
          <b style={{ fontSize: 12.5 }}>코디템</b>
          <DragList items={items} keyOf={i => i.id} onReorder={setItems}
            render={it => (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', padding: '4px 0' }}>
                <span className="drag-h" style={{ fontSize: 11 }}>⠿</span>
                <label style={{
                  width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                  border: '1.5px dashed var(--line)', display: 'grid', placeItems: 'center',
                  fontSize: 10, color: 'var(--faint)', cursor: 'var(--cur-pointer,pointer)', position: 'relative',
                }} data-tip="사진 (선택)">
                  {(it.preview || it.imgId) ? (
                    <Pic imgId={it.imgId} preview={it.preview}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                  ) : '사진'}
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) patchItem(it.id, { file: f, preview: makeUrl(f) });
                    }} />
                </label>
                <KInput value={it.label} placeholder="항목" onChange={e => patchItem(it.id, { label: e.target.value })}
                  style={{ width: 80, fontSize: 12 }} />
                <KInput value={it.name} placeholder="코디템 이름" onChange={e => patchItem(it.id, { name: e.target.value })}
                  style={{ flex: 1, minWidth: 0, fontSize: 12 }} />
                <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 10.5 }}
                  onClick={() => setItems(items.filter(x => x.id !== it.id))}>✕</button>
              </div>
            )} />
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }}
              onClick={() => setItems([...items, { id: newId(), label: '', name: '', imgId: '' }])}>＋ 항목 추가</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- 페이지 ---------- */
function StylePageInner() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const sec = useSectionParam('style');
  const [allRows, setAllRows, loaded] = useLocalList<StyleDoc>(STYLE_KEY, STYLE_SEED);
  const rows = filterSection(allRows, sec.id);
  // 이 섹션 자리만 교체 — 다른 게시판 것이 지워지지 않는다
  const setRows = sectionSetter(allRows, sec.id, setAllRows);
  const { catsOf } = useTypeCats();
  // 게임 탭 목록을 못 읽어도 페이지는 뜨게 — 그때는 「전체」만 보인다
  let cats: { id: string; label: string }[] = [];
  try { cats = (catsOf('style', sec.id) ?? []) as { id: string; label: string }[]; } catch { cats = []; }

  const [tab, setTab] = useState('');
  const curTab = cats.some(c => c.id === tab) ? tab : '';
  const [page, setPage] = useState(1);
  const [view, setView] = useState<StyleLook | null>(null);
  const [edit, setEdit] = useState<StyleLook | 'new' | null>(null);
  const [tplOpen, setTplOpen] = useState(false);
  const [delLook, setDelLook] = useState<StyleLook | null>(null);
  useEffect(() => { setPage(1); }, [curTab]);

  const looks = rows.filter((r): r is StyleLook => r.kind === 'look');
  const tpls = rows.filter((r): r is StyleTpl => r.kind === 'tpl');
  const tplOf = (catId: string) => tpls.find(t => t.catId === catId);
  const slotsOf = (catId: string) => tplOf(catId)?.slots ?? [];
  const gameName = (catId: string) => cats.find(c => c.id === catId)?.label || '게임';

  const visible = looks
    .filter(p => isAdmin || p.visibility === 'public' || (p.visibility === 'member' && !!user))
    .filter(p => !curTab || p.catId === curTab);
  const pages = Math.max(1, Math.ceil(visible.length / STYLE_PER));
  const cur = Math.min(page, pages);
  const paged = visible.slice((cur - 1) * STYLE_PER, cur * STYLE_PER);

  const saveTpl = (catId: string, slots: { id: string; label: string }[]) => {
    const old = tplOf(catId);
    if (old) setRows(rows.map(r => (r.id === old.id ? { ...old, slots } : r)));
    else setRows([{
      kind: 'tpl', id: newId(), catId, slots, date: new Date().toISOString(),
      authorId: user?.id ?? '', visibility: 'public',
    }, ...rows]);
    setTplOpen(false);
    toast('항목 틀을 저장했습니다');
  };

  const saveLook = (d: SaveData2) => {
    if (edit === 'new') {
      setRows([{
        kind: 'look', id: newId(), ...d, date: new Date().toISOString(), authorId: user?.id ?? '',
      }, ...rows]);
    } else if (edit) {
      const id = edit.id;
      setRows(rows.map(r => (r.id === id && r.kind === 'look' ? { ...r, ...d } : r)));
    }
    setEdit(null);
  };

  if (!loaded) return <section className="page" />;

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle>{sec.id === MAIN_SEC ? 'STYLE' : sec.name}</PageTitle>
      </div>

      <div className="toolrow">
        <div className="seg">
          <button className={curTab === '' ? 'on' : ''} onClick={() => setTab('')}>전체</button>
          {cats.map(c => (
            <button key={c.id} className={curTab === c.id ? 'on' : ''} onClick={() => setTab(c.id)}>{c.label || '게임'}</button>
          ))}
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8 }}>
            {curTab && (
              <button className="btn btn-ghost" onClick={() => setTplOpen(true)}>항목 틀</button>
            )}
            <button className="btn btn-dark" onClick={() => {
              if (cats.length === 0) { toast('환경설정 > 게임 코디 탭에서 게임을 먼저 추가해 주세요'); return; }
              setEdit('new');
            }}>＋ WRITE</button>
          </div>
        )}
      </div>

      {visible.length > 0 ? (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: `repeat(auto-fill, minmax(${STYLE_CARD_MIN}px, 1fr))` }}>
          {paged.map(p => (
            <div key={p.id} onClick={() => setView(p)} style={{ cursor: 'var(--cur-pointer,pointer)' }}>
              <div style={{
                position: 'relative', aspectRatio: STYLE_RATIO, borderRadius: 14, overflow: 'hidden',
                background: 'var(--panel)', border: '1px solid var(--line)',
              }}>
                <Pic imgId={p.bodyImgId} fit="contain" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
              </div>
              <div style={{ padding: '6px 4px 0', fontSize: 12 }}>
                <b>{p.title || gameName(p.catId)}</b>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel" style={{ textAlign: 'center', padding: 44, fontSize: 13, color: 'var(--faint)' }}>
          {cats.length === 0 && isAdmin
            ? '환경설정 > 게임 코디 탭에서 게임을 먼저 추가해 주세요'
            : isAdmin ? '아직 코디가 없습니다 — 오른쪽 위 WRITE로 올려 주세요' : '게시물이 없습니다'}
        </div>
      )}
      {visible.length > STYLE_PER && <Pager page={cur} total={pages} onChange={setPage} />}

      {/* 코디 보기 */}
      {view && (
        <Modal open title={view.title || gameName(view.catId)} desc={gameName(view.catId)}
          onClose={() => setView(null)}
          actions={<>
            {isAdmin && <button className="btn btn-ghost" onClick={() => { setEdit(view); setView(null); }}>EDIT</button>}
            {isAdmin && <button className="btn btn-ghost" onClick={() => { setDelLook(view); setView(null); }}>DELETE</button>}
            <button className="btn btn-dark" onClick={() => setView(null)}>CLOSE</button>
          </>}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--panel)', border: '1px solid var(--line)' }}>
              <Pic imgId={view.bodyImgId} fit="contain" style={{ width: '100%', maxHeight: 420 }} />
            </div>
            <div>{view.items.map(it => <ItemRow key={it.id} it={it} />)}</div>
          </div>
        </Modal>
      )}

      {edit && (
        <StyleEditor look={edit === 'new' ? null : edit} cats={cats} defaultCat={curTab} slotsOf={slotsOf}
          onClose={() => setEdit(null)} onSave={saveLook} />
      )}

      {tplOpen && curTab && (
        <TplEditor game={gameName(curTab)} slots={slotsOf(curTab)}
          onClose={() => setTplOpen(false)} onSave={s => saveTpl(curTab, s)} />
      )}

      <ConfirmModal open={!!delLook} title="이 코디를 삭제하시겠습니까?"
        body="삭제한 코디는 복구할 수 없습니다."
        onClose={() => setDelLook(null)}
        buttons={[
          { label: 'DELETE', kind: 'accent', onClick: () => {
            const id = delLook?.id;
            setDelLook(null);
            if (id) setRows(rows.filter(r => r.id !== id));
          } },
          { label: 'CANCEL', kind: 'ghost', onClick: () => setDelLook(null) },
        ]} />
    </section>
  );
}

type SaveData2 = { catId: string; title: string; bodyImgId: string; items: StyleItem[]; visibility: Visibility };

/** ?s= 를 읽으므로 Suspense 경계가 필요하다 (Next App Router) */
export default function StylePage() {
  return <Suspense fallback={<section className="page" />}><StylePageInner /></Suspense>;
}
