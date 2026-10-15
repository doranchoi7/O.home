'use client';
// 챔프 이미지 · 챔프 선택(검색) · 챔프 보관함 관리창
import React, { useRef, useState } from 'react';
import { putBlob, useBlobUrl } from '@/lib/blobStore';
import { newId } from '@/lib/postStore';
import { useChamps, saveChamps, sortChamps, type Champ } from '@/lib/lckStore';
import { Modal, useConfirmDelete } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export function ChampImg({ id, size = 40 }: { id?: string; size?: number }) {
  const c = useChamps().find(x => x.id === id);
  const url = useBlobUrl(c?.img);
  return (
    <div title={c?.name} style={{ width: size, height: size, borderRadius: 5, background: '#2a3440', flex: 'none', overflow: 'hidden' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
    </div>
  );
}

export function ChampSelect({ value, onChange, size = 40 }: { value: string; onChange: (v: string) => void; size?: number }) {
  const champs = useChamps();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const ref = useRef<HTMLButtonElement>(null);
  const openIt = () => {
    const r = ref.current!.getBoundingClientRect();
    const top = window.innerHeight - r.bottom < 330 ? Math.max(8, r.top - 322) : r.bottom + 4;
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - 276)), top });
    setQ(''); setOpen(true);
  };
  const list = sortChamps(champs).filter(c => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <button type="button" ref={ref} onClick={openIt}
        style={{ padding: 0, border: '1px dashed #aab', borderRadius: 5, background: 'none', lineHeight: 0, flex: 'none' }}>
        {value ? <ChampImg id={value} size={size} />
          : <div style={{ width: size, height: size, display: 'grid', placeItems: 'center', color: '#99a', fontSize: 18 }}>+</div>}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
          <div style={{ position: 'fixed', left: pos.left, top: pos.top, width: 268, maxHeight: 316, zIndex: 1001, background: '#fff',
            border: '1px solid #d8dbe0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.18)', padding: 8,
            display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="챔프 이름 검색"
              style={{ border: '1px solid #d8dbe0', borderRadius: 6, padding: '6px 8px', fontSize: 13, outline: 'none' }} />
            <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {value && (
                <button type="button" onClick={() => { onChange(''); setOpen(false); }}
                  style={{ gridColumn: '1 / -1', fontSize: 12, padding: 4, color: '#c55' }}>선택 지우기</button>
              )}
              {list.map(c => (
                <button type="button" key={c.id} onClick={() => { onChange(c.id); setOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 3, borderRadius: 6, textAlign: 'left', fontSize: 12 }}>
                  <ChampImg id={c.id} size={26} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                </button>
              ))}
              {list.length === 0 && <div style={{ gridColumn: '1 / -1', padding: 12, fontSize: 12, color: '#99a' }}>보관함에 챔프가 없어요</div>}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function LibRow({ c, all }: { c: Champ; all: Champ[] }) {
  const [name, setName] = useState(c.name);
  const del = useConfirmDelete();
  const rep = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const upd = (patch: Partial<Champ>) => saveChamps(all.map(x => (x.id === c.id ? { ...x, ...patch } : x)));
  const commit = () => { const n = name.trim(); if (n && n !== c.name) upd({ name: n }); else setName(c.name); };
  const sm: React.CSSProperties = { padding: '3px 9px', fontSize: 11 };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
      <ChampImg id={c.id} size={34} />
      <input value={name} onChange={e => setName(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        style={{ flex: 1, minWidth: 0, border: '1px solid var(--line)', borderRadius: 6, padding: '5px 8px', fontSize: 13, background: 'transparent', color: 'inherit' }} />
      <button className="btn btn-ghost" style={sm} onClick={() => { const n = c.name.endsWith('(구)') ? c.name : `${c.name}(구)`; setName(n); upd({ name: n }); }}>(구)</button>
      <button className="btn btn-ghost" style={sm} onClick={() => rep.current?.click()}>교체</button>
      <button className="btn btn-ghost" style={sm} onClick={() => del.ask(`'${c.name}' 을(를) 삭제하시겠습니까?`, () => saveChamps(all.filter(x => x.id !== c.id)))}>삭제</button>
      <input ref={rep} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={async e => {
          const f = e.target.files?.[0]; e.target.value = '';
          if (!f) return;
          try { upd({ img: await putBlob(f) }); } catch { toast('업로드하지 못했습니다'); }
        }} />
      {del.element}
    </div>
  );
}

export function ChampLibrary({ onClose }: { onClose: () => void }) {
  const champs = useChamps();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const up = useRef<HTMLInputElement>(null);
  const addFiles = async (files: FileList | null) => {
    if (!files || busy) return;
    setBusy(true);
    try {
      const add: Champ[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith('image/')) continue;
        add.push({ id: newId(), name: f.name.replace(/\.[^.]+$/, ''), img: await putBlob(f) });
      }
      saveChamps([...champs, ...add]);
      toast(`${add.length}개 추가되었습니다`);
    } catch { toast('업로드하지 못했습니다'); }
    setBusy(false);
  };
  const list = sortChamps(champs).filter(c => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Modal open title="챔프 보관함" desc="초상화를 한꺼번에 올리면 파일 이름이 챔프 이름이 돼요. 옛 초상화는 (구)를 눌러 이름을 바꾼 뒤 새 초상화를 같은 이름으로 추가하세요." onClose={onClose}
      actions={<button className="btn btn-dark" onClick={onClose}>닫기</button>}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="검색"
          style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 6, padding: '6px 9px', fontSize: 13, background: 'transparent', color: 'inherit' }} />
        <button className="btn btn-dark" disabled={busy} onClick={() => up.current?.click()}>{busy ? '올리는 중…' : '＋ 초상화 추가'}</button>
        <input ref={up} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={e => { void addFiles(e.target.files); e.target.value = ''; }} />
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {list.map(c => <LibRow key={c.id} c={c} all={champs} />)}
        {list.length === 0 && <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--faint)' }}>비어 있어요</div>}
      </div>
    </Modal>
  );
}
