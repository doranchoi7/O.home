'use client';
// 팝 백업 게시판 — 방 탭 + 고정 비율 채팅창(상단 헤더 고정, 안에서만 스크롤) + 직접 쌓는 에디터
import React, { useEffect, useRef, useState } from 'react';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';
import { KInput, KTextarea } from '@/components/ui/Kit';
import { DragList } from '@/components/ui/DragList';
import { Modal, useConfirmDelete } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useSectionTitle } from '@/lib/sectionStore';
import { dateLabel, textOn } from '@/lib/chatBoard';
import { useBlobUrl } from '@/lib/blobStore';
import {
  POP_KEY, POP_COLORS, POP_RATIO, MAX_PHOTOS, mkPopItem, mkPopRoom,
  type PopItem, type PopRoom,
} from '@/lib/popStore';
import {
  Avatar, BlobImg, ChatCss, RoomSettings, RoomTabs, StorageWarn, uploadImages, useChatBoard,
} from '@/components/chat/ChatShared';

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** 디데이 문구 — 날짜가 있으면 "다시 또 만나 D+123", 없으면 문구만 */
function ddayText(label: string, date: string): string {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec((date ?? '').trim());
  if (!m) return label;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  const tag = diff > 0 ? `D+${diff}` : diff < 0 ? `D${diff}` : 'D-Day';
  return label ? `${label} ${tag}` : tag;
}

/** 이름 뒤 체크마크 */
function Check({ ink }: { ink: string }) {
  const white = ink === '#ffffff';
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none' }}>
      <circle cx="12" cy="12" r="11" fill={ink} opacity={0.85} />
      <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke={white ? '#444' : '#fff'}
        strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- 사진 묶음 (격자, 눌러서 전체 보기) ---------- */
function PhotoGrid({ images }: { images: string[] }) {
  const [open, setOpen] = useState(false);
  const n = images.length;
  if (n === 0) return null;
  const shown = n > 4 ? images.slice(0, 3) : images;
  return (
    <>
      <div className={'ch-grid' + (n === 1 ? ' one' : '')} onClick={() => setOpen(true)}>
        {shown.map((id, i) => <BlobImg key={`${id}-${i}`} id={id} className="ch-cell" />)}
        {n > 4 && <span className="ch-cell ch-more">+{n - 3}</span>}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={`사진 ${n}장`}
        actions={<button className="btn btn-ghost" onClick={() => setOpen(false)}>CLOSE</button>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
          {images.map((id, i) => (
            <BlobImg key={`${id}-${i}`} id={id}
              style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />
          ))}
        </div>
      </Modal>
    </>
  );
}

function PopCss() {
  return (
    <style>{`
.pp-win{position:relative;width:min(100%,380px);margin:0 auto;border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
.pp-head{position:relative;z-index:1;flex:none;padding:16px 16px 10px;text-align:center}
.pp-title{display:inline-flex;gap:4px;align-items:center;font-size:16px;font-weight:700}
.pp-sub{font-size:11.5px;opacity:.85;margin-top:2px}
.pp-scroll{position:relative;z-index:1;flex:1 1 0;min-height:0;overflow-y:auto;padding:6px 12px 14px;display:flex;flex-direction:column;gap:8px}
.pp-scroll::-webkit-scrollbar{width:4px}
.pp-scroll::-webkit-scrollbar-thumb{background:rgba(127,127,127,.5);border-radius:4px}
.pp-scroll .ch-bub{max-width:230px}
.pp-meta{display:flex;gap:5px;align-items:center;font-size:11.5px;margin-bottom:3px}
.pp-meta.r{justify-content:flex-end}
.pp-me{font-size:10.5px;padding:1px 6px;border-radius:8px;background:rgba(127,127,127,.35)}
.pp-col{min-width:0;display:flex;flex-direction:column}
.pp-col.r{align-items:flex-end}
`}</style>
  );
}

/* ---------- 보기 ---------- */
function PopView({ room }: { room: PopRoom }) {
  const ink = room.ink === 'black' ? '#1d2025' : '#ffffff';
  const shadow = room.ink === 'black' ? 'none' : '0 1px 3px rgba(0,0,0,.55)';
  const meta: React.CSSProperties = { color: ink, textShadow: shadow };
  const focus = room.bgFocus ?? { x: 50, y: 50 };

  return (
    <div className="pp-win" style={{ aspectRatio: POP_RATIO, background: room.bg }}>
      {room.bgImage && (
        <BlobImg id={room.bgImage} style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: `${focus.x}% ${focus.y}%`,
        }} />
      )}

      {/* 상단 고정 헤더 */}
      <div className="pp-head" style={meta}>
        <div className="pp-title">{room.title || room.name}<Check ink={ink} /></div>
        <div className="pp-sub">{ddayText(room.ddayLabel, room.ddayDate)}</div>
      </div>

      {/* 채팅 내역 — 여기만 스크롤 */}
      <div className="pp-scroll">
        {room.items.length === 0 && (
          <div style={{ ...meta, opacity: 0.7, textAlign: 'center', fontSize: 12, padding: 24 }}>아직 기록이 없습니다</div>
        )}
        {room.items.map((it, i) => {
          if (it.type === 'date') {
            return (
              <div key={it.id} className="ch-date" style={meta}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
                {dateLabel(it.date)}
              </div>
            );
          }
          const prev = room.items[i - 1];
          const cont = !!prev && prev.type !== 'date' && prev.side === it.side && prev.name === it.name;
          const right = it.side === 'right';
          const bubbleBg = right ? room.rightBg : room.leftBg;
          const body = it.type === 'photos'
            ? <PhotoGrid images={it.images} />
            : <div className="ch-bub" style={{ background: bubbleBg, color: textOn(bubbleBg) }}>{it.text}</div>;

          if (right) {
            return (
              <div key={it.id} className="ch-row r">
                <div className="pp-col r">
                  {!cont && (
                    <div className="pp-meta r" style={meta}>
                      <span className="pp-me">나</span>
                      {it.time && <span>{it.time}</span>}
                    </div>
                  )}
                  {body}
                </div>
              </div>
            );
          }
          return (
            <div key={it.id} className="ch-row">
              {cont
                ? <span className="ch-av-sp" />
                : <Avatar id={room.avatar} shape="circle" size={36} label={it.name} />}
              <div className="pp-col">
                {!cont && (
                  <div className="pp-meta" style={meta}>
                    {it.name && <span>{it.name}</span>}
                    <Check ink={ink} />
                    {it.time && <span>{it.time}</span>}
                  </div>
                )}
                {body}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 화면 설정 (헤더 이름·디데이·글씨색·배경 이미지) ---------- */
function PopScreenSettings({ open, room, onClose, onApply }: {
  open: boolean; room: PopRoom; onClose: () => void; onApply: (p: Partial<PopRoom>) => void;
}) {
  const toast = useToast();
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const [title, setTitle] = useState('');
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  const [ink, setInk] = useState<'white' | 'black'>('white');
  const [bgImage, setBgImage] = useState('');
  const [focus, setFocus] = useState({ x: 50, y: 50 });
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const url = useBlobUrl(bgImage || undefined);

  useEffect(() => {
    if (!open) return;
    setTitle(room.title ?? '');
    setLabel(room.ddayLabel ?? '');
    setDate(room.ddayDate ?? '');
    setInk(room.ink ?? 'white');
    setBgImage(room.bgImage ?? '');
    setFocus(room.bgFocus ?? { x: 50, y: 50 });
    setNat(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, room.id]);

  const pick = async (files: File[]) => {
    const ids = await uploadImages(files.slice(0, 1), toast);
    if (ids[0]) { setBgImage(ids[0]); setFocus({ x: 50, y: 50 }); setNat(null); }
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!url) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, fx: focus.x, fy: focus.y };
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const box = boxRef.current;
    if (!d || !box || !nat) return;
    const r = box.getBoundingClientRect();
    const s = Math.max(r.width / nat.w, r.height / nat.h);
    const ox = nat.w * s - r.width;
    const oy = nat.h * s - r.height;
    setFocus({
      x: ox > 1 ? clamp(d.fx - ((e.clientX - d.x) / ox) * 100) : d.fx,
      y: oy > 1 ? clamp(d.fy - ((e.clientY - d.y) / oy) * 100) : d.fy,
    });
  };
  const onUp = () => { drag.current = null; };

  const apply = () => {
    onApply({
      title: title.trim(), ddayLabel: label.trim(), ddayDate: date.trim(), ink, bgImage,
      bgFocus: { x: Math.round(focus.x), y: Math.round(focus.y) },
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="화면 설정"
      desc="헤더 · 디데이 · 글씨색 · 배경 이미지 — 적용을 눌러야 저장됩니다"
      actions={<>
        <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
        <button className="btn btn-accent" onClick={apply}>적용</button>
      </>}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label className="k-label">헤더 이름 (예: 최현준임)</label>
          <KInput value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 140px' }}>
            <label className="k-label">디데이 문구</label>
            <KInput value={label} placeholder="다시 또 만나" onChange={e => setLabel(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label className="k-label">디데이 날짜</label>
            <KInput value={date} placeholder="2026-04-05" onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, minWidth: 130 }}>이름·체크·시간 글씨색</span>
          <div className="mini-seg">
            <button className={ink === 'white' ? 'on' : ''} onClick={() => setInk('white')}>흰색</button>
            <button className={ink === 'black' ? 'on' : ''} onClick={() => setInk('black')}>검은색</button>
          </div>
        </div>

        <div>
          <label className="k-label">배경 이미지 (끌어서 보일 부분 맞추기)</label>
          <div ref={boxRef}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            style={{
              position: 'relative', width: 180, maxWidth: '100%', aspectRatio: POP_RATIO, margin: '6px auto',
              borderRadius: 10, overflow: 'hidden', background: room.bg || POP_COLORS.bg,
              border: '1px solid var(--line)', touchAction: 'none', cursor: url ? 'grab' : 'default',
            }}>
            {url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" draggable={false}
                onLoad={e => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                  objectPosition: `${focus.x}% ${focus.y}%`, userSelect: 'none', pointerEvents: 'none',
                }} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <label className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 11, cursor: 'var(--cur-pointer,pointer)' }}>
              {bgImage ? 'CHANGE' : 'UPLOAD'}
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const fl = Array.from(e.target.files ?? []); e.target.value = ''; void pick(fl); }} />
            </label>
            {bgImage && (
              <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 11 }}
                onClick={() => setBgImage('')}>REMOVE</button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- 에디터 (날짜 구분선·채팅·사진 묶음을 원하는 순서로 쌓기) ---------- */
function PopEditor({ room, onSave, onCancel }: {
  room: PopRoom; onSave: (items: PopItem[]) => void; onCancel: () => void;
}) {
  const toast = useToast();
  const [items, setItems] = useState<PopItem[]>(room.items);

  const patch = (id: string, p: Partial<PopItem>) =>
    setItems(l => l.map(x => (x.id === id ? { ...x, ...p } : x)));

  const add = (type: PopItem['type']) => {
    const lastChat = [...items].reverse().find(x => x.type !== 'date');
    const lastDate = [...items].reverse().find(x => x.type === 'date');
    const it = mkPopItem(type, lastChat);
    if (type === 'date') it.date = lastDate?.date ?? '';
    setItems([...items, it]);
  };

  const save = () => {
    const bad = items.find(x =>
      (x.type === 'chat' && !x.text.trim())
      || (x.type === 'photos' && x.images.length === 0)
      || (x.type === 'date' && !x.date.trim()));
    if (bad) { toast('내용이 비어 있는 항목이 있습니다 — 채우거나 ✕로 지워 주세요'); return; }
    onSave(items);
  };

  const addPhotos = async (it: PopItem, files: File[]) => {
    const remain = MAX_PHOTOS - it.images.length;
    if (remain <= 0) { toast(`사진은 한 묶음에 ${MAX_PHOTOS}장까지입니다`); return; }
    if (files.length > remain) toast(`${MAX_PHOTOS}장까지만 올라갑니다 — 앞의 ${remain}장만 올립니다`);
    const ids = await uploadImages(files.slice(0, remain), toast);
    setItems(l => l.map(x => (x.id === it.id ? { ...x, images: [...x.images, ...ids] } : x)));
  };

  const adds = (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => add('date')}>＋ 날짜 구분선</button>
      <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => add('chat')}>＋ 채팅</button>
      <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => add('photos')}>＋ 사진 묶음</button>
    </div>
  );

  return (
    <div className="ch-ed panel" style={{ padding: 18 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <b style={{ fontSize: 13 }}>{room.name} 편집</b>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost" style={{ padding: '5px 14px', fontSize: 11 }} onClick={onCancel}>CANCEL</button>
          <button className="btn btn-dark" style={{ padding: '5px 18px', fontSize: 11 }} onClick={save}>SAVE</button>
        </div>
      </div>

      <DragList items={items} keyOf={x => x.id} onReorder={setItems}
        render={(it, i) => (
          <div className="ch-edrow">
            <span className="drag-h">⠿</span>
            <span className="ch-no">{i + 1}</span>

            {it.type === 'date' ? (
              <>
                <b style={{ fontSize: 12 }}>날짜 구분선</b>
                <KInput value={it.date} placeholder="2026-04-05" style={{ width: 130 }}
                  onChange={e => patch(it.id, { date: e.target.value })} />
                <span className="ch-hint">{dateLabel(it.date)}</span>
              </>
            ) : (
              <>
                <div className="mini-seg">
                  <button className={it.side === 'left' ? 'on' : ''} onClick={() => patch(it.id, { side: 'left' })}>상대</button>
                  <button className={it.side === 'right' ? 'on' : ''} onClick={() => patch(it.id, { side: 'right' })}>나</button>
                </div>
                {it.side === 'left' && (
                  <KInput value={it.name} placeholder="이름" style={{ width: 100 }}
                    onChange={e => patch(it.id, { name: e.target.value })} />
                )}
                <KInput value={it.time} placeholder="오후 7:02" style={{ width: 100 }}
                  onChange={e => patch(it.id, { time: e.target.value })} />
                {it.type === 'chat' ? (
                  <KTextarea value={it.text} placeholder="내용" style={{ flex: '1 1 220px', minHeight: 36 }}
                    onChange={e => patch(it.id, { text: e.target.value })} />
                ) : (
                  <label className="btn btn-ghost"
                    style={{ padding: '4px 10px', fontSize: 10.5, cursor: 'var(--cur-pointer,pointer)' }}>
                    ＋ 사진 ({it.images.length}/{MAX_PHOTOS})
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                      onChange={e => { const fl = Array.from(e.target.files ?? []); e.target.value = ''; void addPhotos(it, fl); }} />
                  </label>
                )}
              </>
            )}

            <span className="fx" data-tip="삭제" style={{ marginLeft: 'auto' }}
              onClick={() => setItems(l => l.filter(x => x.id !== it.id))}>✕</span>

            {it.type === 'photos' && it.images.length > 0 && (
              <div className="ch-thumbs">
                {it.images.map((id, k) => (
                  <span key={`${id}-${k}`} className="ch-thumb">
                    <BlobImg id={id} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }} />
                    <span className="fx" onClick={() =>
                      setItems(l => l.map(x => (x.id === it.id ? { ...x, images: x.images.filter((_, j) => j !== k) } : x)))}>✕</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )} />

      <div style={{ marginTop: 12 }}>{adds}</div>
    </div>
  );
}

/* ---------- 페이지 ---------- */
export function PopBoardPage() {
  const b = useChatBoard<PopRoom>('pop', POP_KEY);
  const tt = useSectionTitle('pop', b.sec.id, '팝 백업');
  const toast = useToast();
  const del = useConfirmDelete();
  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState(false);
  const [screen, setScreen] = useState(false);

  if (!b.loaded) return <section className="page" />;
  const room = b.room;

  const select = (id: string) => {
    if (editing) { toast('편집 중에는 방을 바꿀 수 없습니다 — SAVE나 CANCEL을 먼저 눌러 주세요'); return; }
    b.select(id);
  };
  const addRoom = () => {
    if (editing) { toast('편집 중에는 방을 만들 수 없습니다 — SAVE나 CANCEL을 먼저 눌러 주세요'); return; }
    b.addRoom(mkPopRoom());
    setSettings(true);
  };
  const askDelete = (r: PopRoom) => {
    setSettings(false);
    del.ask(`채팅방 「${r.name}」을 삭제하시겠습니까?`, () => { b.removeRoom(r.id); setEditing(false); },
      '이 방에 기록한 대화가 모두 사라지고 복구할 수 없습니다.');
  };

  return (
    <section className="page">
      <ChatCss />
      <PopCss />
      <div className="page-head">
        <PageTitle>{tt.title}</PageTitle>
        <EditableDesc k="pop-desc" def="팝 대화를 모아둔 곳" />
      </div>

      {b.isAdmin && <StorageWarn storageKey={POP_KEY} />}
      <RoomTabs rooms={b.rooms} currentId={room?.id ?? ''} isAdmin={b.isAdmin} addLabel="채팅방"
        onSelect={select} onAdd={addRoom} />

      {room ? (
        <>
          {b.isAdmin && !editing && (
            <div className="ch-tools">
              <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 11 }} onClick={() => setSettings(true)}>방 설정</button>
              <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 11 }} onClick={() => setScreen(true)}>화면 설정</button>
              <button className="btn btn-dark" style={{ padding: '4px 14px', fontSize: 11 }} onClick={() => setEditing(true)}>편집</button>
            </div>
          )}
          {editing
            ? <PopEditor key={room.id} room={room}
              onCancel={() => setEditing(false)}
              onSave={items => { b.patchRoom(room.id, { items }); setEditing(false); toast('저장되었습니다'); }} />
            : <PopView room={room} />}

          <RoomSettings room={room} open={settings} avatarLabel="상대 프사 (원형으로 보입니다)" avatarShape="circle"
            colors={[
              { key: 'bg', label: '배경색 (이미지 없을 때)', def: POP_COLORS.bg },
              { key: 'leftBg', label: '왼쪽 말풍선 (상대)', def: POP_COLORS.leftBg },
              { key: 'rightBg', label: '오른쪽 말풍선 (나)', def: POP_COLORS.rightBg },
            ]}
            onClose={() => setSettings(false)}
            onApply={p => b.patchRoom(room.id, p)}
            onMove={dir => b.moveRoom(room.id, dir)}
            onDelete={() => askDelete(room)} />

          <PopScreenSettings room={room} open={screen}
            onClose={() => setScreen(false)}
            onApply={p => b.patchRoom(room.id, p)} />
        </>
      ) : (
        <div className="panel" style={{ textAlign: 'center', padding: 48, fontSize: 13, color: 'var(--faint)' }}>
          {b.isAdmin ? '위의 ＋ 채팅방 버튼으로 첫 방을 만들어 보세요' : '볼 수 있는 대화가 없습니다'}
        </div>
      )}
      {del.element}
    </section>
  );
}
