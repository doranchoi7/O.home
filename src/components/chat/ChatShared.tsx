'use client';
// 카톡·푸슝 백업 게시판 공통 부품 — 방 목록 훅, 방 탭, 방 설정 창, 이미지 올리기, 스타일
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { isServerMode } from '@/lib/supabase';
import { TABLE_OF } from '@/lib/db';
import { useSectionParam, filterSection, secStamp, type SectionKind } from '@/lib/sectionStore';
import { ROOM_VIS, canSeeRoom, sortRooms, type RoomBase } from '@/lib/chatBoard';
import { putBlob, useBlobUrl } from '@/lib/blobStore';
import { ColorField } from '@/components/ui/ColorField';
import { KInput, KSelect } from '@/components/ui/Kit';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

/* ---------- 방 목록 훅 ---------- */
export function useChatBoard<R extends RoomBase>(kind: SectionKind, key: string) {
  const { user, isAdmin } = useAuth();
  const [all, setAll, loaded] = useLocalList<R>(key, []);
  const sec = useSectionParam(kind);
  const [sel, setSel] = useState('');

  const mine = sortRooms(filterSection(all, sec.id));
  const rooms = mine.filter(r => canSeeRoom(r, isAdmin, !!user));
  const room: R | undefined = rooms.find(r => r.id === sel) ?? rooms[0];

  const patchRoom = (id: string, p: Partial<R>) =>
    setAll(all.map(r => (r.id === id ? ({ ...r, ...p } as R) : r)));
  const addRoom = (r: R) => {
    setAll([...all, { ...r, ...secStamp(sec.id) } as R]);
    setSel(r.id);
  };
  const removeRoom = (id: string) => {
    setAll(all.filter(r => r.id !== id));
    setSel('');
  };
  const moveRoom = (id: string, dir: -1 | 1) => {
    const i = mine.findIndex(r => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= mine.length) return;
    const a = mine[i];
    const b = mine[j];
    setAll(all.map(r => (
      r.id === a.id ? ({ ...r, order: b.order } as R)
        : r.id === b.id ? ({ ...r, order: a.order } as R)
          : r
    )));
  };

  return { user, isAdmin, loaded, sec, rooms, room, select: setSel, patchRoom, addRoom, removeRoom, moveRoom };
}

/* ---------- 서버 저장 연결 확인 (관리자에게만 보임) ---------- */
export function StorageWarn({ storageKey }: { storageKey: string }) {
  if (!isServerMode() || TABLE_OF[storageKey]) return null;
  return (
    <div className="panel" style={{ padding: 14, marginBottom: 12, fontSize: 12, color: 'var(--accent)' }}>
      이 게시판 글이 서버가 아니라 이 브라우저에만 저장되고 있습니다 — src/lib/db.ts의 TABLE_OF에{' '}
      <code>{storageKey}</code> 항목을 추가해 주세요.
    </div>
  );
}

/* ---------- 이미지 ---------- */
export function BlobImg({ id, className, style }: { id: string; className?: string; style?: React.CSSProperties }) {
  const url = useBlobUrl(id || undefined);
  if (!url) {
    return <span className={className} style={{ ...style, display: 'inline-block', background: 'rgba(127,127,127,.2)' }} />;
  }
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={url} alt="" className={className} style={style} />;
}

export function Avatar({ id, shape, size, label }: {
  id: string; shape: 'circle' | 'squircle'; size: number; label?: string;
}) {
  const radius = shape === 'circle' ? '50%' : Math.round(size * 0.36);
  return (
    <span className="ch-av" style={{ width: size, height: size, borderRadius: radius }}>
      {id
        ? <BlobImg id={id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span>{(label ?? '').slice(0, 1)}</span>}
    </span>
  );
}

/** 파일을 순서대로 올려 이미지 참조(id) 목록을 돌려준다 — 파일명 숫자 순으로 정렬 */
export async function uploadImages(files: File[], toast: (m: string) => void): Promise<string[]> {
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const out: string[] = [];
  for (const f of sorted) {
    try {
      out.push(await putBlob(f));
    } catch (err) {
      toast(`이미지를 올리지 못했습니다 — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return out;
}

/* ---------- 방 탭 ---------- */
export function RoomTabs({ rooms, currentId, isAdmin, addLabel, onSelect, onAdd }: {
  rooms: RoomBase[]; currentId: string; isAdmin: boolean; addLabel: string;
  onSelect: (id: string) => void; onAdd: () => void;
}) {
  return (
    <div className="seg" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
      {rooms.map(r => (
        <button key={r.id} className={r.id === currentId ? 'on' : ''} onClick={() => onSelect(r.id)}>
          {r.name || '이름 없음'}
          {isAdmin && r.visibility !== 'public' && (
            <small style={{ marginLeft: 6, opacity: 0.7 }}>{r.visibility === 'private' ? '비공개' : '멤버'}</small>
          )}
        </button>
      ))}
      {isAdmin && <button onClick={onAdd}>＋ {addLabel}</button>}
    </div>
  );
}

/* ---------- 방 설정 창 (이름·프사·색·공개 범위·순서·삭제) ---------- */
export function RoomSettings<R extends RoomBase>({
  open, room, avatarLabel, avatarShape, colors, onClose, onApply, onMove, onDelete,
}: {
  open: boolean; room: R; avatarLabel: string; avatarShape: 'circle' | 'squircle';
  colors: { key: string; label: string; def: string }[];
  onClose: () => void; onApply: (p: Partial<R>) => void;
  onMove: (dir: -1 | 1) => void; onDelete: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const rec = room as unknown as Record<string, string>;
    const f: Record<string, string> = { name: room.name, avatar: room.avatar, visibility: room.visibility };
    colors.forEach(c => { f[c.key] = rec[c.key] || c.def; });
    setForm(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, room.id]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const pickAvatar = async (files: File[]) => {
    const ids = await uploadImages(files.slice(0, 1), toast);
    if (ids[0]) set('avatar', ids[0]);
  };

  return (
    <Modal open={open} onClose={onClose} title="방 설정"
      desc="이름 · 프사 · 색 · 공개 범위 — 적용을 눌러야 저장됩니다"
      actions={<>
        <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
        <button className="btn btn-accent" onClick={() => { onApply(form as unknown as Partial<R>); onClose(); }}>적용</button>
      </>}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label className="k-label">이름 (탭에 보이는 이름)</label>
          <KInput value={form.name ?? ''} onChange={e => set('name', e.target.value)} />
        </div>

        <div>
          <label className="k-label">{avatarLabel}</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Avatar id={form.avatar ?? ''} shape={avatarShape} size={56} label={form.name} />
            <label className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 11, cursor: 'var(--cur-pointer,pointer)' }}>
              {form.avatar ? 'CHANGE' : 'UPLOAD'}
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const fl = Array.from(e.target.files ?? []); e.target.value = ''; void pickAvatar(fl); }} />
            </label>
            {form.avatar && (
              <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 11 }}
                onClick={() => set('avatar', '')}>REMOVE</button>
            )}
          </div>
        </div>

        {colors.map(c => (
          <div key={c.key} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, minWidth: 130 }}>{c.label}</span>
            <ColorField value={form[c.key] ?? c.def} onChange={hex => set(c.key, hex)} />
            <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 10.5 }}
              onClick={() => set(c.key, c.def)}>기본값</button>
          </div>
        ))}

        <div>
          <label className="k-label">공개 범위</label>
          <KSelect minWidth={140} value={form.visibility ?? 'private'} onChange={v => set('visibility', v)}
            options={ROOM_VIS.map(o => ({ value: o.value, label: o.label }))} />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, minWidth: 130 }}>탭 순서</span>
          <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 11 }} onClick={() => onMove(-1)}>◀ 앞으로</button>
          <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 11 }} onClick={() => onMove(1)}>뒤로 ▶</button>
          <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 11, marginLeft: 'auto' }}
            onClick={onDelete}>방 삭제</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- 스타일 ---------- */
export function ChatCss() {
  return (
    <style>{`
.ch-box{max-width:480px;margin:0 auto;border-radius:14px;padding:14px 12px;min-height:240px;display:flex;flex-direction:column;gap:8px}
.ch-row{display:flex;gap:7px;align-items:flex-start}
.ch-row.r{justify-content:flex-end}
.ch-name{font-size:11.5px;margin-bottom:3px;opacity:.75}
.ch-line{display:flex;gap:5px;align-items:flex-end}
.ch-bub{padding:7px 11px;border-radius:12px;font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-word;max-width:260px}
.ch-time{font-size:10.5px;opacity:.65;white-space:nowrap}
.ch-av{flex:none;overflow:hidden;background:rgba(127,127,127,.25);display:inline-flex;align-items:center;justify-content:center;font-size:12px}
.ch-av-sp{flex:none;width:36px}
.ch-date{align-self:center;display:inline-flex;gap:5px;align-items:center;font-size:11.5px;padding:3px 12px;border-radius:20px;background:rgba(127,127,127,.28);margin:6px 0}
.ch-grid{display:grid;grid-template-columns:repeat(2,86px);gap:3px;cursor:pointer}
.ch-grid.one{grid-template-columns:180px}
.ch-cell{width:86px;height:86px;border-radius:8px;object-fit:cover;display:block}
.ch-grid.one .ch-cell{width:180px;height:auto;max-height:240px}
.ch-more{display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);color:#fff;font-size:15px}
.ch-pbub{padding:9px 12px;border-radius:12px;font-size:13px;line-height:1.5;max-width:270px;border:1px solid rgba(0,0,0,.06);white-space:pre-wrap;word-break:break-word}
.ch-pbub.owner{background:#ffffff;color:#1d2025}
.ch-pbub.anon{background:#e5e7ea;color:#1d2025}
.ch-pimg{display:block;width:100%;max-width:240px;border-radius:10px}
.ch-rb{flex:none;width:24px;height:24px;border-radius:8px;background:rgba(127,127,127,.28);color:#1d9e75;display:inline-flex;align-items:center;justify-content:center;font-size:14px;align-self:flex-end}
.ch-tools{max-width:760px;margin:0 auto 10px;display:flex;justify-content:flex-end;gap:6px}
.ch-ed{max-width:760px;margin:0 auto}
.ch-edrow{display:flex;gap:8px;align-items:center;flex-wrap:wrap;width:100%;padding:8px 0;border-bottom:1px dashed var(--line)}
.ch-no{font-size:10px;color:var(--faint);min-width:20px;text-align:right}
.ch-hint{font-size:11px;color:var(--faint)}
.ch-thumbs{display:flex;gap:6px;flex-wrap:wrap;width:100%;padding-left:28px}
.ch-thumb{position:relative;width:56px;height:56px}
.ch-thumb .fx{position:absolute;top:-4px;right:-4px;background:var(--panel);border-radius:50%;font-size:9px;padding:1px 4px}
`}</style>
  );
}
