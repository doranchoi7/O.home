'use client';
import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { LCK_KEY, LCK_PINK, type LckMatch } from '@/lib/lckStore';
import { hashPw } from '@/lib/coupleStore';
import { PageTitle } from '@/components/ui/PageText';
import { useSectionTitle } from '@/lib/sectionStore';
import { useConfirmDelete } from '@/components/ui/Modal';
import { HtmlBody } from '@/components/ui/HtmlBody';
import { SetView } from '@/components/lck/SetView';

export default function LckViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const del = useConfirmDelete();
  const [all, setAll, loaded] = useLocalList<LckMatch>(LCK_KEY, []);
  const m = all.find(x => x.id === id);
  const tt = useSectionTitle('lck', m?.secId, 'LCK 경기 기록');
  const [si, setSi] = useState(0);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(() => { try { return sessionStorage.getItem(`lck-ok-${id}`) === '1'; } catch { return false; } });

  if (!loaded) return <section className="page" />;
  const visible = m && (isAdmin || m.vis === 'public' || m.vis === 'password' || (m.vis === 'member' && user));
  if (!m || !visible) {
    return <section className="page"><div className="page-head"><PageTitle href={tt.href}>{tt.title}</PageTitle><p>기록을 찾을 수 없습니다</p></div></section>;
  }

  if (m.vis === 'password' && !isAdmin && !ok) {
    const tryOpen = async () => {
      if (m.pwHash && (await hashPw(pw.trim())) === m.pwHash) {
        try { sessionStorage.setItem(`lck-ok-${id}`, '1'); } catch { /* 무시 */ }
        setOk(true);
      } else setErr('비밀번호가 맞지 않아요');
    };
    return (
      <section className="page">
        <div className="page-head"><PageTitle href={tt.href}>{tt.title}</PageTitle></div>
        <div className="panel" style={{ maxWidth: 420, margin: '0 auto', padding: 40, textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>🔒 비밀번호 공개</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="비밀번호" onKeyDown={e => { if (e.key === 'Enter') void tryOpen(); }}
              style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', background: 'transparent', color: 'inherit' }} />
            <button className="btn btn-dark" onClick={() => void tryOpen()}>열기</button>
          </div>
          {err && <div style={{ marginTop: 10, fontSize: 12 }}>{err}</div>}
        </div>
      </section>
    );
  }

  const idx = Math.min(si, m.sets.length - 1);
  const sm = { padding: '3px 10px', fontSize: 10.5 };
  const remove = () => del.ask('이 기록을 삭제하시겠습니까?', () => { setAll(all.filter(x => x.id !== m.id)); router.push(tt.href); });

  return (
    <section className="page">
      <div className="page-head"><PageTitle href={tt.href}>{tt.title}</PageTitle></div>
      <div style={{ maxWidth: 600, margin: '0 auto 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
        <b style={{ fontSize: 15 }}>{m.tournament}</b>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost" style={sm} onClick={() => router.push(tt.href)}>LIST</button>
          {isAdmin && <>
            <button className="btn btn-ghost" style={sm} onClick={() => router.push(`/lck/${m.id}/edit`)}>EDIT</button>
            <button className="btn btn-ghost" style={sm} onClick={remove}>DELETE</button>
          </>}
        </div>
      </div>

      {m.sets.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button className="btn btn-ghost" style={{ padding: '3px 12px' }} disabled={idx === 0} onClick={() => setSi(idx - 1)}>‹</button>
          <b style={{ fontSize: 13 }}>{idx + 1}세트 / {m.sets.length}</b>
          <button className="btn btn-ghost" style={{ padding: '3px 12px' }} disabled={idx >= m.sets.length - 1} onClick={() => setSi(idx + 1)}>›</button>
        </div>
      )}
      <SetView set={m.sets[idx]} match={m} idx={idx} />

      {(m.review || m.rating) && (
        <div className="panel" style={{ maxWidth: 600, margin: '16px auto 0', padding: 20 }}>
          {m.review && <HtmlBody html={m.review} />}
          {m.rating && (
            <div style={{ marginTop: m.review ? 18 : 0, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--faint)' }}>개인 평점</span>
              <b style={{ fontSize: 22, color: LCK_PINK }}>{m.rating}</b><span style={{ fontSize: 12, color: 'var(--faint)' }}>/ 10</span>
              {m.ratingNote && <span style={{ fontSize: 13, color: 'var(--sub)', flexBasis: '100%' }}>{m.ratingNote}</span>}
            </div>
          )}
        </div>
      )}
      {del.element}
    </section>
  );
}
