'use client';
// 카톡 백업 게시판 — 방(채팅방) 탭 + 카톡 PC 대화창 느낌의 보기 + 직접 쌓는 에디터
import React, { useState } from 'react';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';
import { KInput, KTextarea } from '@/components/ui/Kit';
import { DragList } from '@/components/ui/DragList';
import { Modal, useConfirmDelete } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useSectionTitle } from '@/lib/sectionStore';
import { dateLabel, textOn } from '@/lib/chatBoard';
import {
  KAKAO_KEY, KAKAO_COLORS, MAX_PHOTOS, mkKakaoItem, mkKakaoRoom,
  type KakaoItem, type KakaoRoom,
} from '@/lib/kakaoStore';
import {
  Avatar, BlobImg, ChatCss, RoomSettings, RoomTabs, StorageWarn, uploadImages, useChatBoard,
} from '@/components/chat/ChatShared';

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

/* ---------- 보기 ---------- */
function KakaoView({ room }: { room: KakaoRoom }) {
  const ink = textOn(room.bg);
  return (
    <div className="ch-box" style={{ background: room.bg, color: ink }}>
      {room.items.length === 0 && (
        <div style={{ opacity: 0.6, textAlign: 'center', fontSize: 12, padding: 24 }}>아직 기록이 없습니다</div>
      )}
      {room.items.map((it, i) => {
        if (it.type === 'date') {
          return (
            <div key={it.id} className="ch-date">
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
        const time = it.time ? <span className="ch-time">{it.time}</span> : null;

        if (right) {
          return (
            <div key={it.id} className="ch-row r">
              <div className="ch-line">{time}{body}</div>
            </div>
          );
        }
        return (
          <div key={it.id} className="ch-row">
            {cont
              ? <span className="ch-av-sp" />
              : <Avatar id={room.avatar} shape="squircle" size={36} label={it.name} />}
            <div>
              {!cont && it.name && <div className="ch-name">{it.name}</div>}
              <div className="ch-line">{body}{time}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- 에디터 (날짜 구분선·채팅·사진 묶음을 원하는 순서로 쌓기) ---------- */
function KakaoEditor({ room, onSave, onCancel }: {
  room: KakaoRoom; onSave: (items: KakaoItem[]) => void; onCancel: () => void;
}) {
  const toast = useToast();
  const [items, setItems] = useState<KakaoItem[]>(room.items);

  const patch = (id: string, p: Partial<KakaoItem>) =>
    setItems(l => l.map(x => (x.id === id ? { ...x, ...p } : x)));

  const add = (type: KakaoItem['type']) => {
    const lastChat = [...items].reverse().find(x => x.type !== 'date');
    const lastDate = [...items].reverse().find(x => x.type === 'date');
    const it = mkKakaoItem(type, lastChat);
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

  const addPhotos = async (it: KakaoItem, files: File[]) => {
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
                <KInput value={it.date} placeholder="2026-10-16" style={{ width: 130 }}
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
                <KInput value={it.time} placeholder="오후 12:23" style={{ width: 100 }}
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
export function KakaoBoardPage() {
  const b = useChatBoard<KakaoRoom>('kakaotalk', KAKAO_KEY);
  const tt = useSectionTitle('kakaotalk', b.sec.id, '카톡 백업');
  const toast = useToast();
  const del = useConfirmDelete();
  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState(false);

  if (!b.loaded) return <section className="page" />;
  const room = b.room;

  const select = (id: string) => {
    if (editing) { toast('편집 중에는 방을 바꿀 수 없습니다 — SAVE나 CANCEL을 먼저 눌러 주세요'); return; }
    b.select(id);
  };
  const addRoom = () => {
    if (editing) { toast('편집 중에는 방을 만들 수 없습니다 — SAVE나 CANCEL을 먼저 눌러 주세요'); return; }
    b.addRoom(mkKakaoRoom());
    setSettings(true);
  };
  const askDelete = (r: KakaoRoom) => {
    setSettings(false);
    del.ask(`채팅방 「${r.name}」을 삭제하시겠습니까?`, () => { b.removeRoom(r.id); setEditing(false); },
      '이 방에 기록한 대화가 모두 사라지고 복구할 수 없습니다.');
  };

  return (
    <section className="page">
      <ChatCss />
      <div className="page-head">
        <PageTitle>{tt.title}</PageTitle>
        <EditableDesc k="kakaotalk-desc" def="카톡 대화를 모아둔 곳" />
      </div>

      {b.isAdmin && <StorageWarn storageKey={KAKAO_KEY} />}
      <RoomTabs rooms={b.rooms} currentId={room?.id ?? ''} isAdmin={b.isAdmin} addLabel="채팅방"
        onSelect={select} onAdd={addRoom} />

      {room ? (
        <>
          {b.isAdmin && !editing && (
            <div className="ch-tools">
              <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 11 }} onClick={() => setSettings(true)}>방 설정</button>
              <button className="btn btn-dark" style={{ padding: '4px 14px', fontSize: 11 }} onClick={() => setEditing(true)}>편집</button>
            </div>
          )}
          {editing
            ? <KakaoEditor key={room.id} room={room}
              onCancel={() => setEditing(false)}
              onSave={items => { b.patchRoom(room.id, { items }); setEditing(false); toast('저장되었습니다'); }} />
            : <KakaoView room={room} />}

          <RoomSettings room={room} open={settings} avatarLabel="상대 프사 (둥근 사각형으로 보입니다)" avatarShape="squircle"
            colors={[
              { key: 'bg', label: '배경색', def: KAKAO_COLORS.bg },
              { key: 'leftBg', label: '왼쪽 말풍선 (상대)', def: KAKAO_COLORS.leftBg },
              { key: 'rightBg', label: '오른쪽 말풍선 (나)', def: KAKAO_COLORS.rightBg },
            ]}
            onClose={() => setSettings(false)}
            onApply={p => b.patchRoom(room.id, p)}
            onMove={dir => b.moveRoom(room.id, dir)}
            onDelete={() => askDelete(room)} />
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
