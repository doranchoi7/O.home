'use client';
// 게시판 유형별 설정 탭 — 환경설정의 「트위터」「LCK 기록」… 탭이 전부 이 컴포넌트 하나를 쓴다.
// 지금은 분류 리스트만 있고, 유형마다 따로 필요한 설정이 생기면 kind로 갈라서 이 안에 추가한다.
import React, { useState } from 'react';
import { ColorField } from '@/components/ui/ColorField';
import { KInput } from '@/components/ui/Kit';
import { DragList } from '@/components/ui/DragList';
import { useConfirmDelete } from '@/components/ui/Modal';
import { newId } from '@/lib/postStore';
import { threadBadgeStyle, type ThreadCat } from '@/lib/threadStore';
import { MAIN_SEC, SECTION_META, useSections, type SectionKind } from '@/lib/sectionStore';
import { useTypeCats } from '@/lib/boardTypeStore';

/** 환경설정 탭 이름 → 게시판 유형. 탭 이름을 바꾸면 settings/page.tsx의 CATEGORIES도 같이 바꾼다 */
export const TYPE_TAB_KIND: Record<string, SectionKind> = {
  '트위터': 'twitter',
  'LCK 기록': 'lck',
  '커플 다이어리': 'couple',
  '자캐 목록': 'oc',
  '푸슝': 'pushoong',
  '카톡 백업': 'kakaotalk',
  '게임 코디': 'style',
  '앨범': 'album',
  '포토카드': 'photocard',
};

export const isTypeTab = (tab: string) => tab in TYPE_TAB_KIND;

export function BoardTypePane({ tab }: { tab: string }) {
  const kind = TYPE_TAB_KIND[tab];
  const { catsOf, setCats } = useTypeCats();
  const { list } = useSections();
  const del = useConfirmDelete();
  const secs = list(kind);
  const [secId, setSecId] = useState(MAIN_SEC);
  const cur = secs.some(s => s.id === secId) ? secId : MAIN_SEC;
  const cats = catsOf(kind, cur);
  const label = SECTION_META[kind].label;

  const set = (next: ThreadCat[]) => setCats(kind, cur, next);
  const patchCat = (id: string, p: Partial<ThreadCat>) =>
    set(cats.map(c => (c.id === id ? { ...c, ...p } : c)));

  return (
    <div className="set-sec">
      <h3>{label} 분류 리스트</h3>
      <div className="d">
        글을 쓸 때 고르는 분류 — 이름 · 배경/테두리/글씨색 · ⠿ 드래그로 순서 · 추가/삭제
        {secs.length > 1 && <><br />{label} 게시판마다 따로 정합니다 — <b>손대기 전까지는 기본 게시판의 분류를 그대로 씁니다</b></>}
        <br />게시판을 새로 만드는 곳은 「게시판 관리」 탭 맨 아래입니다
      </div>
      {secs.length > 1 && (
        <div className="mini-seg" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
          {secs.map(s => (
            <button key={s.id} className={cur === s.id ? 'on' : ''} onClick={() => setSecId(s.id)}>{s.name}</button>
          ))}
        </div>
      )}
      <DragList items={cats} keyOf={c => c.id} onReorder={next => set(next)}
        render={c => (
          <div className="set-row" style={{ width: '100%' }}>
            <div className="l" style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
              <span className="drag-h">⠿</span>
              <span className="pill" style={threadBadgeStyle(c)}>{c.label || '분류'}</span>
            </div>
            <div className="cp-group" style={{ justifyContent: 'flex-end' }}>
              <KInput value={c.label} onChange={e => patchCat(c.id, { label: e.target.value })}
                style={{ width: 100, textAlign: 'right' }} />
              <span className="cp-lb">배경</span>
              <ColorField value={c.bg ?? '#1d2025'} onChange={hex => patchCat(c.id, { bg: hex })} />
              <span className="cp-lb">테두리</span>
              <ColorField value={c.border ?? c.bg ?? '#1d2025'} onChange={hex => patchCat(c.id, { border: hex })} />
              <span className="cp-lb">글씨</span>
              <ColorField value={c.fg ?? '#ffffff'} onChange={hex => patchCat(c.id, { fg: hex })} />
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 10.5 }}
                onClick={() => del.ask(`분류 「${c.label}」를 삭제하시겠습니까?`,
                  () => set(cats.filter(x => x.id !== c.id)),
                  '이 분류로 쓴 글은 유지되지만 분류 표시가 사라집니다.')}>DELETE</button>
            </div>
          </div>
        )} />
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }}
          onClick={() => set([...cats, { id: newId(), label: '새 분류' }])}>＋ ADD</button>
      </div>
      {del.element}
    </div>
  );
}
