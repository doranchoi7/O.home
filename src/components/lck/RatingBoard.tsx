'use client';
import React from 'react';
import { B, R, type RatingBoard, type RateRow } from '@/lib/lckStore';
import { KInput } from '@/components/ui/Kit';

const POS = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
const GRAY = '#9aa1ab';

function Pill({ v, color }: { v: string; color: string }) {
  return (
    <span style={{ background: color, color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 4,
      width: 38, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{v || '-'}</span>
  );
}

// 표시용 (너비 300 고정 — 세트 요약표의 절반)
export function RatingView({ board }: { board: RatingBoard }) {
  const colors = (r: RateRow) => ({
    l: r.hi === 'L' ? R : r.hi === 'R' ? B : GRAY,
    r: r.hi === 'R' ? R : r.hi === 'L' ? B : GRAY,
  });
  return (
    <div style={{ width: 300, maxWidth: '100%', background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: '16px 12px 14px', boxSizing: 'border-box' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <b style={{ fontSize: 14 }}>{board.teamL}</b>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#666' }}>{board.title}</div>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{board.score}</div>
        </div>
        <b style={{ fontSize: 14, textAlign: 'right' }}>{board.teamR}</b>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {board.rows.map((r, i) => {
          const c = colors(r);
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 38px 28px 38px 1fr', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{r.nickL}</span>
              <Pill v={r.scoreL} color={c.l} />
              <span style={{ fontSize: 9, fontWeight: 800, color: '#555', textAlign: 'center' }}>{POS[i]}</span>
              <Pill v={r.scoreR} color={c.r} />
              <span style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'right' }}>{r.nickR}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 입력용
export function RatingEditor({ board, onChange, onFill }: {
  board: RatingBoard; onChange: (b: RatingBoard) => void; onFill: () => void;
}) {
  const set = (p: Partial<RatingBoard>) => onChange({ ...board, ...p });
  const row = (i: number, p: Partial<RateRow>) =>
    onChange({ ...board, rows: board.rows.map((r, j) => (j === i ? { ...r, ...p } : r)) });
  const num: React.CSSProperties = { width: 52, padding: '5px 6px', textAlign: 'center' };
  const nick: React.CSSProperties = { flex: 1, minWidth: 0, padding: '5px 7px' };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <KInput value={board.teamL} onChange={e => set({ teamL: e.target.value })} placeholder="왼쪽 팀명" style={{ width: 110 }} />
        <KInput value={board.title} onChange={e => set({ title: e.target.value })} placeholder="경기 이름" style={{ flex: 1, minWidth: 120 }} />
        <KInput value={board.score} onChange={e => set({ score: e.target.value })} placeholder="0 - 2" style={{ width: 70, textAlign: 'center' }} />
        <KInput value={board.teamR} onChange={e => set({ teamR: e.target.value })} placeholder="오른쪽 팀명" style={{ width: 110 }} />
        <button type="button" className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 11 }} onClick={onFill}>경기 정보에서 채우기</button>
      </div>
      <div style={{ display: 'grid', gap: 6, marginTop: 12 }}>
        {board.rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '34px 1fr 1fr', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--faint)' }}>{POS[i]}</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <KInput list="lck-nicks" value={r.nickL} onChange={e => row(i, { nickL: e.target.value })} placeholder="선수" style={nick} />
              <KInput value={r.scoreL} onChange={e => row(i, { scoreL: e.target.value })} placeholder="점수" style={num} />
              <input type="checkbox" title="점수가 더 높은 쪽" checked={r.hi === 'L'} onChange={e => row(i, { hi: e.target.checked ? 'L' : '' })} />
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input type="checkbox" title="점수가 더 높은 쪽" checked={r.hi === 'R'} onChange={e => row(i, { hi: e.target.checked ? 'R' : '' })} />
              <KInput value={r.scoreR} onChange={e => row(i, { scoreR: e.target.value })} placeholder="점수" style={num} />
              <KInput list="lck-nicks" value={r.nickR} onChange={e => row(i, { nickR: e.target.value })} placeholder="선수" style={nick} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 6 }}>점수가 더 높은 쪽 체크박스를 켜면 그쪽이 빨강, 반대쪽이 파랑이 돼요.</div>
    </div>
  );
}
