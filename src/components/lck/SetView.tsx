'use client';
// 세트 결과 화면 (뷰어) — 위에서 아래로: 헤더 · 팀명 · 앞 세트 챔프 · 밴 · 합계 · 10인 표 · 오브젝트 · 밴픽 순서
import React from 'react';
import { ChampImg } from './ChampUi';
import { DragonIcon, SoulIcon, ObjIcon } from './LckIcons';
import { B, R, col, fmtBig, dateKo, type SetData, type LckMatch, type Side } from '@/lib/lckStore';

const LINE = '#e3e5e9';   // 일반 구분선
const SOFT = '#eef0f3';   // 오브젝트 줄 구분선 (일반보다 옅게)
const WHITE = '1px solid #fff';
const cell: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' };
const line: React.CSSProperties = { border: `1px solid ${LINE}` };

function Colored({ bg, children, style }: { bg: string; children?: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...cell, background: bg, color: '#fff', fontWeight: 800, ...style }}>{children}</div>;
}
const star = (t: string) => (t === '선픽' || t === '후픽' ? `${t}*` : t);
const Bars = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 5 }}>
    <div style={{ background: B }} /><div style={{ background: R }} />
  </div>
);

function Count({ icon, n, dash }: { icon: React.ReactNode; n: string; dash?: boolean }) {
  return (
    <div style={{ ...cell, flexDirection: 'column', gap: 2, width: 46 }}>
      {icon}
      <span style={{ fontSize: 11, color: '#555' }}>{n.trim() || (dash ? '-' : '0')}</span>
    </div>
  );
}

export function SetView({ set: s, match: m, idx }: {
  set: SetData; match: Pick<LckMatch, 'round' | 'gameNo' | 'date' | 'fearless'>; idx: number;
}) {
  const title = [m.round, m.gameNo ? `${m.gameNo}경기` : '', `${idx + 1}세트`].filter(Boolean).join(' ');
  const res = (side: Side) => (!s.winner ? '' : s.winner === side ? 'WIN' : 'LOSS');
  const tot = (side: Side) => `${s[side].kills || 0} / ${s[side].deaths || 0} / ${s[side].assists || 0}`;
  const showPrev = m.fearless && (s.blue.prev.length > 0 || s.red.prev.length > 0);
  const hasScore = s.blue.score.trim() || s.red.score.trim();

  // 밴: 3개 + 2개 사이에 세로 구분선
  const banGroup = (side: Side) => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch' }}>
      {[[0, 1, 2], [3, 4]].map((g, gi) => (
        <div key={gi} style={{ display: 'flex', gap: 3, alignItems: 'center', padding: '8px 10px', borderLeft: gi === 1 ? `1px solid ${LINE}` : 'none' }}>
          {g.map(i => <ChampImg key={i} id={s[side].bans[i]} size={34} />)}
        </div>
      ))}
    </div>
  );

  const playerBlock = (side: Side, i: number) => {
    const t = s[side], p = t.players[i];
    const gi = side === 'blue' ? i : 5 + i;
    const dmgOn = t.bestDmg === i, kdaOn = t.bestKda === i;
    const dmg = <span key="d" style={{ color: dmgOn ? col(side) : '#555', fontWeight: dmgOn ? 800 : 500 }}>{fmtBig(p.dmg)}</span>;
    const kda = <span key="k" style={{ color: kdaOn ? col(side) : '#555', fontWeight: kdaOn ? 800 : 500 }}>({p.k || 0}/{p.d || 0}/{p.a || 0})</span>;
    const badge = s.mvp === gi && (
      <span style={{ background: col(side), color: '#fff', fontSize: 9.5, fontWeight: 800, borderRadius: 4, padding: '1px 5px' }}>MVP</span>
    );
    const blue = side === 'blue';
    return (
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: blue ? 'right' : 'left' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: blue ? 'flex-end' : 'flex-start', fontSize: 15, fontWeight: 800, color: '#111' }}>
          {blue && badge}{p.nick}{!blue && badge}
        </div>
        <div style={{ fontSize: 11.5, marginTop: 2 }}>{blue ? [dmg, ' ', kda] : [kda, ' ', dmg]}</div>
      </div>
    );
  };

  const pickSlot = (i: number) => {
    const pk = s.picks[i];
    return (
      <div key={i} style={{ width: 54, textAlign: 'center' }}>
        <div style={{ border: `3px solid ${col(pk.team)}`, borderRadius: 7, lineHeight: 0, display: 'inline-block' }}><ChampImg id={pk.champ} size={44} /></div>
        <div style={{ fontSize: 11, fontWeight: 800, marginTop: 3, color: col(pk.team), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pk.nick}</div>
      </div>
    );
  };
  const pair = (a: number, b: number) => (
    <div key={a} style={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      {pickSlot(a)}<div style={{ width: 14, height: 3, background: '#222', marginTop: 24 }} />{pickSlot(b)}
    </div>
  );
  const showPicks = s.picks.some(p => p.champ || p.nick);

  // 오브젝트 줄: 흰 배경 · 줄마다 구분선 · 상하 중앙 · 아이콘은 양옆으로 넓게
  const objRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 80px 1fr', alignItems: 'center', minHeight: 54, borderBottom: `1px solid ${SOFT}` };
  const objSide: React.CSSProperties = { display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0 14px' };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', background: '#fff', color: '#111', border: `1px solid ${LINE}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* 헤더 — 가운데만 검은 배경, 양옆 색칸과는 흰 선으로 구분 */}
      <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr 84px', minHeight: 54 }}>
        <Colored bg={B} style={{ borderRight: WHITE }}>{star(s.hBlue)}</Colored>
        <div style={{ ...cell, flexDirection: 'column', background: '#111', color: '#fff', fontWeight: 800, fontSize: 14, lineHeight: 1.35, padding: 4 }}>
          <span>{title}</span><span>({dateKo(m.date)})</span>
        </div>
        <Colored bg={R} style={{ borderLeft: WHITE }}>{star(s.hRed)}</Colored>
      </div>
      {/* 팀명 */}
      <div style={{ display: 'grid', gridTemplateColumns: hasScore ? '1fr 64px 1fr' : '1fr 1fr', height: 32 }}>
        <Colored bg={B} style={hasScore ? undefined : { borderRight: WHITE }}>{s.blue.name}</Colored>
        {hasScore && <div style={{ ...cell, fontWeight: 800, fontSize: 15 }}>{s.blue.score || 0} : {s.red.score || 0}</div>}
        <Colored bg={R}>{s.red.name}</Colored>
      </div>
      {/* 앞 세트 챔프 (피어리스) */}
      {showPrev && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#f3f4f6', padding: '6px 0', gap: 2 }}>
          {(['blue', 'red'] as const).map(side => (
            <div key={side} style={{ display: 'grid', gap: 3, justifyContent: 'center' }}>
              {s[side].prev.map((row, r) => (
                <div key={r} style={{ display: 'flex', gap: 2 }}>{row.map((c, k) => <ChampImg key={k} id={c} size={28} />)}</div>
              ))}
            </div>
          ))}
        </div>
      )}
      {/* 밴 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 34px 1fr' }}>
        {banGroup('blue')}
        <div style={{ ...cell, fontWeight: 800, fontSize: 12, borderLeft: `1px solid ${LINE}`, borderRight: `1px solid ${LINE}` }}>밴</div>
        {banGroup('red')}
      </div>
      <Bars />
      {/* 합계 — 가운데 칸을 넓게(42%), 승패 색칸도 같은 너비 */}
      <div style={{ display: 'grid', gridTemplateColumns: '29% 42% 29%', fontSize: 14 }}>
        <div style={{ ...cell, ...line, height: 34 }}>{tot('blue')}</div>
        <div style={{ ...cell, ...line, fontWeight: 800 }}>{s.time}</div>
        <div style={{ ...cell, ...line }}>{tot('red')}</div>
        <div style={{ ...cell, ...line, height: 34 }}>{fmtBig(s.blue.gold)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <Colored bg={B} style={{ fontSize: 12.5, borderRight: WHITE }}>{res('blue')}</Colored>
          <Colored bg={R} style={{ fontSize: 12.5 }}>{res('red')}</Colored>
        </div>
        <div style={{ ...cell, ...line }}>{fmtBig(s.red.gold)}</div>
      </div>
      {/* 10인 표 */}
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 58px 58px 1fr', minHeight: 58, borderBottom: `1px solid ${LINE}` }}>
          {playerBlock('blue', i)}
          <div style={{ ...cell, padding: 6, borderLeft: `1px solid ${LINE}`, borderRight: `1px solid ${LINE}` }}>
            <ChampImg id={s.blue.players[i].champ} size={44} />
          </div>
          <div style={{ ...cell, padding: 6, borderRight: `1px solid ${LINE}` }}>
            <ChampImg id={s.red.players[i].champ} size={44} />
          </div>
          {playerBlock('red', i)}
        </div>
      ))}
      <Bars />
      {/* 오브젝트 — 3줄 */}
      <div>
        <div style={objRow}>
          <div style={objSide}>{s.blue.dragons.map((d, i) => <DragonIcon key={i} k={d} />)}</div>
          <div style={cell}><SoulIcon k={s.soul} /></div>
          <div style={objSide}>{s.red.dragons.map((d, i) => <DragonIcon key={i} k={d} />)}</div>
        </div>
        <div style={objRow}>
          <div style={objSide}>
            <Count icon={<ObjIcon t="tower" />} n={s.blue.towers} />
            <Count icon={<ObjIcon t="grub" />} n={s.blue.grubs} />
          </div>
          <div style={{ ...cell, gap: 4 }}>
            {s.herald === 'blue' && <span style={{ color: B, fontSize: 13 }}>◀</span>}
            <ObjIcon t="herald" size={30} dim={!s.herald} />
            {s.herald === 'red' && <span style={{ color: R, fontSize: 13 }}>▶</span>}
          </div>
          <div style={objSide}>
            <Count icon={<ObjIcon t="grub" />} n={s.red.grubs} />
            <Count icon={<ObjIcon t="tower" />} n={s.red.towers} />
          </div>
        </div>
        <div style={objRow}>
          <div style={objSide}>
            <Count icon={<ObjIcon t="elder" />} n={s.blue.elders} dash />
            <Count icon={<ObjIcon t="baron" />} n={s.blue.barons} />
          </div>
          <div />
          <div style={objSide}>
            <Count icon={<ObjIcon t="baron" />} n={s.red.barons} />
            <Count icon={<ObjIcon t="elder" />} n={s.red.elders} dash />
          </div>
        </div>
      </div>
      {/* 밴픽 순서 */}
      {showPicks && (
        <div>
          <div style={{ padding: '14px 8px', display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${LINE}` }}>
            {[0, 2, 4].map(a => pair(a, a + 1))}
          </div>
          <div style={{ padding: '14px 8px', display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[6, 8].map(a => pair(a, a + 1))}
          </div>
        </div>
      )}
    </div>
  );
}
