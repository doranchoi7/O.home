'use client';
// 푸슝 백업 게시판 — 방(질문함) 탭 + 방문자 화면 기준 채팅 보기 + 직접 쌓는 에디터
import React, { useState } from 'react';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';
import { KTextarea } from '@/components/ui/Kit';
import { DragList } from '@/components/ui/DragList';
import { useConfirmDelete } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useSectionTitle } from '@/lib/sectionStore';
import { textOn } from '@/lib/chatBoard';
import {
  PUSHOONG_KEY, PUSHOONG_COLORS, mkPushoongItem, mkPushoongRoom,
  type PushoongItem, type PushoongRoom,
} from '@/lib/pushoongStore';
import {
  Avatar, BlobImg, ChatCss, RoomSettings, RoomTabs, StorageWarn, uploadImages, useChatBoard,
} from '@/components/chat/ChatShared';

/** 답장 버튼 (↳) — 기록용이라 눌러도 반응하지 않는 장식 */
const ReplyBtn = () => <span className="ch-rb" aria-hidden="true">↳</span>;

/* ---------- 보기 ---------- */
function PushoongView({ room }: { room: PushoongRoom }) {
  return (
    <div className="ch-box" style={{ background: room.bg, color: textOn(room.bg) }}>
      {room.items.length === 0 && (
        <div style={{ opacity: 0.6, textAlign: 'center', fontSize: 12, padding: 24 }}>아직 기록이 없습니다</div>
      )}
      {room.items.map(it => {
        const content = (
          <>
            {it.image && <BlobImg id={it.image} className="ch-pimg" />}
            {it.text && <div style={it.image ? { marginTop: 8 } : undefined}>{it.text}</div>}
          </>
        );
        if (it.side === 'owner') {
          return (
            <div key={it.id} className="ch-row">
              <Avatar id={room.avatar} shape="circle" size={34} label={room.name} />
              <div className="ch-pbub owner">{content}</div>
              <ReplyBtn />
            </div>
          );
        }
        return (
          <div key={it.id} className="ch-row r">
            <ReplyBtn />
            <div className="ch-pbub anon">{content}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- 에디터 ---------- */
function PushoongEditor({ room, onSave, onCancel }: {
  room: PushoongRoom; onSave: (items: PushoongItem[]) => void; onCancel: () => void;
}) {
  const toast = useToast();
  const [items, setItems] = useState<PushoongItem[]>(room.items);

  const patch = (id: string, p: Partial<PushoongItem>) =>
    setItems(l => l.map(x => (x.id === id ? { ...x, ...p } : x)));

  const save = () => {
    if (items.some(x => !x.text.trim() && !x.image)) {
      toast('글도 사진도 없는 말풍선이 있습니다 — 채우거나 ✕로 지워 주세요');
      return;
    }
    onSave(items);
  };

  const pickImage = async (id: string, files: File[]) => {
    const ids = await uploadImages(files.slice(0, 1), toast);
    if (ids[0]) patch(id, { image: ids[0] });
  };

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
            <div className="mini-seg">
              <button className={it.side === 'owner' ? 'on' : ''} onClick={() => patch(it.id, { side: 'owner' })}>방 주인</button>
              <button className={it.side === 'anon' ? 'on' : ''} onClick={() => patch(it.id, { side: 'anon' })}>익명 질문</button>
            </div>

            <label className="btn btn-ghost"
              style={{ padding: '4px 10px', fontSize: 10.5, cursor: 'var(--cur-pointer,pointer)' }}>
              {it.image ? '사진 교체' : '＋ 사진'}
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const fl = Array.from(e.target.files ?? []); e.target.value = ''; void pickImage(it.id, fl); }} />
            </label>
            {it.image && (
              <>
                <BlobImg id={it.image} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} />
                <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 10.5 }}
                  onClick={() => patch(it.id, { image: '' })}>사진 빼기</button>
              </>
            )}

            <span className="fx" data-tip="삭제" style={{ marginLeft: 'auto' }}
              onClick={() => setItems(l => l.filter(x => x.id !== it.id))}>✕</span>

            <div style={{ width: '100%', paddingLeft: 28 }}>
              <KTextarea value={it.text} placeholder={it.image ? '사진 아래에 같이 보일 글 (비워도 됩니다)' : '내용'}
                style={{ width: '100%', minHeight: 36 }}
                onChange={e => patch(it.id, { text: e.target.value })} />
            </div>
          </div>
        )} />

      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }}
          onClick={() => setItems([...items, mkPushoongItem('owner')])}>＋ 방 주인</button>
        <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }}
          onClick={() => setItems([...items, mkPushoongItem('anon')])}>＋ 익명 질문</button>
      </div>
    </div>
  );
}

/* ---------- 페이지 ---------- */
export function PushoongBoardPage() {
  const b = useChatBoard<PushoongRoom>('pushoong', PUSHOONG_KEY);
  const tt = useSectionTitle('pushoong', b.sec.id, '푸슝 백업');
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
    b.addRoom(mkPushoongRoom());
    setSettings(true);
  };
  const askDelete = (r: PushoongRoom) => {
    setSettings(false);
    del.ask(`질문함 「${r.name}」을 삭제하시겠습니까?`, () => { b.removeRoom(r.id); setEditing(false); },
      '이 방에 기록한 대화가 모두 사라지고 복구할 수 없습니다.');
  };

  return (
    <section className="page">
      <ChatCss />
      <div className="page-head">
        <PageTitle>{tt.title}</PageTitle>
        <EditableDesc k="pushoong-desc" def="푸슝 질문함을 백업해 둔 곳" />
      </div>

      {b.isAdmin && <StorageWarn storageKey={PUSHOONG_KEY} />}
      <RoomTabs rooms={b.rooms} currentId={room?.id ?? ''} isAdmin={b.isAdmin} addLabel="질문함"
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
            ? <PushoongEditor key={room.id} room={room}
              onCancel={() => setEditing(false)}
              onSave={items => { b.patchRoom(room.id, { items }); setEditing(false); toast('저장되었습니다'); }} />
            : <PushoongView room={room} />}

          <RoomSettings room={room} open={settings} avatarLabel="방장 프사 (방 주인 말풍선에 붙습니다)" avatarShape="circle"
            colors={[{ key: 'bg', label: '배경색', def: PUSHOONG_COLORS.bg }]}
            onClose={() => setSettings(false)}
            onApply={p => b.patchRoom(room.id, p)}
            onMove={dir => b.moveRoom(room.id, dir)}
            onDelete={() => askDelete(room)} />
        </>
      ) : (
        <div className="panel" style={{ textAlign: 'center', padding: 48, fontSize: 13, color: 'var(--faint)' }}>
          {b.isAdmin ? '위의 ＋ 질문함 버튼으로 첫 방을 만들어 보세요' : '볼 수 있는 질문함이 없습니다'}
        </div>
      )}
      {del.element}
    </section>
  );
}
