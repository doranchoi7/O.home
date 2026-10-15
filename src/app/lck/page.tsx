'use client';
import React, { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { LCK_KEY, LCK_PINK, B, R, sortMatches, setChamp, fmtBig, dateKo, type LckMatch } from '@/lib/lckStore';
import { useSectionParam, useSectionTitle, filterSection, secQuery } from '@/lib/sectionStore';
import { useTypeCats } from '@/lib/boardTypeStore';
import { EditableDesc, PageTitle } from '@/components/ui/PageText';
import { ChampImg, ChampLibrary } from '@/components/lck/ChampUi';

const pill = (bg: string, color = '#fff'): React.CSSProperties => ({
  background: bg, color, fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap',
});

function Card({ m, locked, onOpen }: { m: LckMatch; locked: boolean; onOpen: () => void }) {
  return (
    <div className="panel" onClick={onOpen} style={{ padding: 14, cursor: 'pointer', display: 'grid', gap: 6, alignContent: 'start' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <b style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.tournament || '(대회 이름 없음)'}</b>
        {!locked && m.result && <span style={pill(m.result === 'win' ? B : R)}>{m.result === 'win' ? '승리' : '패배'}</span>}
      </div>
      {locked ? (
        <div style={{ padding: '22px 0', textAlign: 'center', fontSize: 13, color: 'var(--faint)' }}>🔒 비밀번호 공개<br /><span style={{ fontSize: 11 }}>{dateKo(m.date)}</span></div>
      ) : (
        <>
          <div style={{ fontSize: 13 }}>{m.player}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 20 }}>
            <span>{m.award && <span style={pill(LCK_PINK)}>{m.award}</span>}</span>
            {m.season && <span style={pill('#e9ebef', '#555')}>{m.season}</span>}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--sub)', display: 'grid', gap: 1 }}>
            <span>베스트 KDA {m.bestKda || '-'}</span>
            <span>베스트 딜량 {fmtBig(m.bestDmg) || '-'}</span>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            {m.sets.map((s, i) => <ChampImg key={i} id={setChamp(s, s.mine)} size={40} />)}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--faint)' }}>{dateKo(m.date)}</div>
        </>
      )}
    </div>
  );
}

function LckPageInner() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [all, , loaded] = useLocalList<LckMatch>(LCK_KEY, []);
  const sec = useSectionParam('lck');
  const { title } = useSectionTitle('lck', sec.id, 'LCK 경기 기록');
  const { catsOf } = useTypeCats();
  const cats = catsOf('lck', sec.id);
  const [cat, setCat] = useState('all');
  const [lib, setLib] = useState(false);

  if (!loaded) return <section className="page" />;

  const list = sortMatches(
    filterSection(all, sec.id)
      .filter(m => isAdmin || m.vis !== 'private')
      .filter(m => isAdmin || m.vis !== 'member' || !!user)
      .filter(m => cat === 'all' || m.catId === cat),
  );

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle>{title}</PageTitle>
        <EditableDesc k="lck-desc" def="LCK 경기를 기록해요" />
      </div>
      <div className="toolrow">
        {cats.length > 0 ? (
          <div className="seg">
            <button className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>전체</button>
            {cats.map(c => <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>{c.label}</button>)}
          </div>
        ) : <div />}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost" style={{ whiteSpace: 'nowrap' }} onClick={() => setLib(true)}>챔프 보관함</button>
            <button className="btn btn-dark" style={{ whiteSpace: 'nowrap' }} onClick={() => router.push('/lck/new' + secQuery('lck', sec.id))}>＋ NEW MATCH</button>
          </div>
        )}
      </div>
      {list.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: 48, fontSize: 13, color: 'var(--faint)' }}>기록이 없습니다</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14, maxWidth: 900, margin: '0 auto' }}>
          {list.map(m => (
            <Card key={m.id} m={m} locked={m.vis === 'password' && !isAdmin} onOpen={() => router.push(`/lck/${m.id}`)} />
          ))}
        </div>
      )}
      {lib && <ChampLibrary onClose={() => setLib(false)} />}
    </section>
  );
}

export default function LckPage() {
  return <Suspense fallback={<section className="page" />}><LckPageInner /></Suspense>;
}
