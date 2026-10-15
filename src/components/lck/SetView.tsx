'use client';
// 세트 결과 화면 (뷰어) — 위에서 아래로: 헤더 · 팀명 · 앞 세트 챔프 · 밴 · 합계 · 10인 표 · 오브젝트 · 밴픽 순서
import React from 'react';
import { ChampImg } from './ChampUi';
import { DragonIcon, SoulIcon, ObjIcon } from './LckIcons';
import { B, R, col, fmtBig, dateKo, type SetData, type LckMatch, type Side } from '@/lib/lckStore';

const cell: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' };
function Colored({ bg, children, style }: { bg: string; children?: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...cell, background: bg, color: '#fff', fontWeight: 800, ...style }}>{children}</div>;
}
const star = (t: string) => (t === '선픽' || t === '후픽' ? `${t}*` : t);
const line: React.CSSProperties = { border: '1px solid #e3e5e9' };
const Bars = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 5 }}>
    <div style={{ background: B }} /><div style={{ background: R }} />
  </div>
);

function Count({ icon, n, dash }: { icon: React.ReactNode; n: string; dash?: boolean }) {
  return (
    <div style={{ ...cell, flexDirection: 'column', gap: 2, width: 46 }}>
      {icon}
      <span style={{ fontSize: 11, color: '#cfd8e3' }}>{n.trim() || (dash ? '-' : '0')}</span>
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

  const banGroup = (side: Side) => (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {[[0, 1, 2], [3, 4]].map((g, gi) => (
        <div key={gi} style={{ display: 'flex', gap: 3 }}>
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
      <div style={{ padding: '6px 10px', textAlign: blue ? 'right' : 'left' }}>
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

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', background: '#fff', color: '#111', ...line }}>
      {/* 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr 84px', minHeight: 54 }}>
        <Colored bg={B}>{star(s.hBlue)}</Colored>
        <div style={{ ...cell, flexDirection: 'column', fontWeight: 800, fontSize: 14, lineHeight: 1.35, padding: 4 }}>
          <span>{title}</span><span>({dateKo(m.date)})</span>
        </div>
        <Colored bg={R}>{star(s.hRed)}</Colored>
      </div>
      {/* 팀명 */}
      <div style={{ display: 'grid', gridTemplateColumns: hasScore ? '1fr 64px 1fr' : '1fr 1fr', height: 32 }}>
        <Colored bg={B}>{s.blue.name}</Colored>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 34px 1fr', alignItems: 'center', padding: '8px 0' }}>
        {banGroup('blue')}<div style={{ ...cell, fontWeight: 800, fontSize: 12 }}>밴</div>{banGroup('red')}
      </div>
      <Bars />
      {/* 합계 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 96px 1fr', fontSize: 14 }}>
        <div style={{ ...cell, ...line, height: 34 }}>{tot('blue')}</div>
        <div style={{ ...cell, ...line, fontWeight: 800 }}>{s.time}</div>
        <div style={{ ...cell, ...line }}>{tot('red')}</div>
        <div style={{ ...cell, ...line, height: 34 }}>{fmtBig(s.blue.gold)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <Colored bg={B} style={{ fontSize: 12.5 }}>{res('blue')}</Colored><Colored bg={R} style={{ fontSize: 12.5 }}>{res('red')}</Colored>
        </div>
        <div style={{ ...cell, ...line }}>{fmtBig(s.red.gold)}</div>
      </div>
      {/* 10인 표 */}
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 44px 44px 1fr', alignItems: 'center', borderBottom: '1px solid #e3e5e9' }}>
          {playerBlock('blue', i)}
          <ChampImg id={s.blue.players[i].champ} size={44} />
          <ChampImg id={s.red.players[i].champ} size={44} />
          {playerBlock('red', i)}
        </div>
      ))}
      <Bars />
      {/* 오브젝트 */}
      <div style={{ background: '#0e1822', padding: '14px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 5 }}>{s.blue.dragons.map((d, i) => <DragonIcon key={i} k={d} />)}</div>
          <SoulIcon k={s.soul} />
          <div style={{ display: 'flex', gap: 5 }}>{s.red.dragons.map((d, i) => <DragonIcon key={i} k={d} />)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 8, marginTop: 12 }}>
          <Count icon={<ObjIcon t="tower" />} n={s.blue.towers} />
          <Count icon={<ObjIcon t="grub" />} n={s.blue.grubs} />
          <div style={{ ...cell, gap: 4, width: 70, height: 40 }}>
            {s.herald === 'blue' && <span style={{ color: B, fontSize: 13 }}>◀</span>}
            <ObjIcon t="herald" size={30} dim={!s.herald} />
            {s.herald === 'red' && <span style={{ color: R, fontSize: 13 }}>▶</span>}
          </div>
          <Count icon={<ObjIcon t="grub" />} n={s.red.grubs} />
          <Count icon={<ObjIcon t="tower" />} n={s.red.towers} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 22, marginTop: 10 }}>
          <Count icon={<ObjIcon t="elder" />} n={s.blue.elders} dash />
          <Count icon={<ObjIcon t="baron" />} n={s.blue.barons} />
          <Count icon={<ObjIcon t="baron" />} n={s.red.barons} />
          <Count icon={<ObjIcon t="elder" />} n={s.red.elders} dash />
        </div>
      </div>
      {/* 밴픽 순서 */}
      {showPicks && (
        <div style={{ padding: '14px 8px', display: 'grid', gap: 12, justifyContent: 'center' }}>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>{[0, 2, 4].map(a => pair(a, a + 1))}</div>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>{[6, 8].map(a => pair(a, a + 1))}</div>
        </div>
      )}
    </div>
  );
}
