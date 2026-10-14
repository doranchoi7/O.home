'use client';
// 커플 다이어리 — 비번 잠금 · 달력 · 공지 · 만남 N일째 · 글 목록(최신이 위) · 전체보기/닉네임별 보기
// 글 쓰기·수정·삭제·읽음 표시·설정·사진은 관리자만. 기존 다이어리(/diary)와는 데이터가 완전히 별개.
import React, { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocalList, newId } from '@/lib/postStore';
import { useSectionParam, useSectionTitle, filterSection, sectionSetter } from '@/lib/sectionStore';
import { putBlob, useBlobUrl } from '@/lib/blobStore';
import { CropEditor, CroppedBlobImg, type CropValue } from '@/components/ui/CropEditor';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { PageTitle } from '@/components/ui/PageText';
import {
  COUPLE_KEY, NICKS, type CouplePost, type CoupleSettings, type Who,
  useCoupleSettings, daysTogether, pad, todayStr, sortPosts, sha256Hex,
} from '@/lib/coupleStore';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WHO: Who[] = ['a', 'b'];

/* 색은 여기 두 값만 바꾸면 전체가 바뀐다 */
const CSS = `
.cp-wrap{--cp:#f7adc2;--cp-deep:#ec86a8;--cp-hover:#ffedf2;color:#444;font-size:12.5px}
.cp-frame{position:relative;background:var(--cp);border:3px solid #fff;border-radius:18px;padding:16px;box-shadow:0 1px 5px rgba(0,0,0,.08)}
.cp-frame::before{content:'';position:absolute;inset:6px;border:2px dashed rgba(255,255,255,.95);border-radius:14px;pointer-events:none}
.cp-grid{position:relative;display:grid;grid-template-columns:230px 1fr;gap:14px;align-items:stretch}
.cp-panel{background:#fff;border-radius:12px;padding:14px}
.cp-side{display:flex;flex-direction:column;min-height:420px}
.cp-count{font-size:10.5px;color:#888;margin-bottom:8px;letter-spacing:.02em}
.cp-count b{color:var(--cp-deep)}
.cp-photo-box{border:1px solid var(--cp);padding:3px;background:#fff}
.cp-photo{position:relative;aspect-ratio:4/3;overflow:hidden;background:#fde9ef}
.cp-mini{display:flex;gap:10px;margin-top:6px;font-size:11px}
.cp-link{color:#999;cursor:pointer;background:none;border:0;padding:0;font-size:11px}
.cp-link:hover{color:var(--cp-deep)}
.cp-title{font-size:16px;font-weight:800;color:var(--cp-deep);margin:14px 0 8px;letter-spacing:.04em}
.cp-item{display:flex;align-items:center;gap:6px;width:100%;text-align:left;background:none;border:0;border-radius:6px;padding:6px 6px;font-size:12.5px;color:#444;cursor:pointer}
.cp-item:hover,.cp-item.on{background:var(--cp-hover)}
.cp-item.on{font-weight:700}
.cp-sep{border:0;border-top:1px solid var(--cp);margin:12px 0}
.cp-sub{font-weight:800;font-size:12.5px;margin:0 0 6px 2px;color:#444}
.cp-n{font-style:normal;font-size:9px;font-weight:800;color:#fff;background:var(--cp-deep);border-radius:3px;padding:1px 4px;line-height:1.3}
.cp-lock{margin-top:auto;width:100%;border:1px solid var(--cp);background:#fff;border-radius:18px;padding:7px 0;font-size:12px;cursor:pointer;color:#555}
.cp-lock:hover{background:var(--cp-hover)}
.cp-cal{display:flex;gap:14px;align-items:center;border:1px solid var(--cp);border-radius:10px;padding:10px 14px}
.cp-date{text-align:center;padding-right:14px;border-right:1px dotted #ddd;min-width:84px}
.cp-date b{display:block;font-size:26px;line-height:1.1;color:var(--cp-deep)}
.cp-date span{font-size:12px;font-weight:700;color:#999}
.cp-days{display:flex;flex-wrap:wrap;align-items:center;gap:2px 4px;flex:1}
.cp-nav{display:flex;align-items:center;gap:3px;margin-right:8px}
.cp-nav b{font-size:13px;margin:0 4px;color:#555}
.cp-nav button{width:17px;height:17px;border:1px solid #cfcfcf;border-radius:3px;background:#fff;font-size:10px;line-height:1;cursor:pointer;color:#777;padding:0}
.cp-nav button:hover{background:var(--cp-hover);border-color:var(--cp)}
.cp-day{width:25px;height:25px;border-radius:50%;border:0;background:none;font-size:12px;color:#aaa;cursor:pointer;padding:0}
.cp-day:hover,.cp-day.sel{background:var(--cp-hover)}
.cp-day.sun{color:#e57373}
.cp-day.has{color:var(--cp-deep);font-weight:800}
.cp-day.today{color:#111;font-weight:800}
.cp-notice{display:flex;justify-content:space-between;align-items:center;padding:12px 4px 8px;border-bottom:2px solid var(--cp);margin-bottom:2px}
.cp-notice b.k{margin-right:8px}
.cp-notice .dd b{color:var(--cp-deep)}
.cp-admin{display:flex;justify-content:flex-end;gap:6px;padding:8px 0 2px}
.cp-btn{border:1px solid var(--cp);background:#fff;border-radius:14px;padding:3px 12px;font-size:11.5px;cursor:pointer;color:#555}
.cp-btn:hover{background:var(--cp-hover)}
.cp-btn.fill{background:var(--cp);border-color:var(--cp);color:#fff;font-weight:700}
.cp-btn.fill:hover{background:var(--cp-deep);border-color:var(--cp-deep)}
.cp-head,.cp-row{display:grid;grid-template-columns:96px 1fr 150px 56px;align-items:center;gap:6px;padding:0 8px}
.cp-head{font-weight:700;color:#555;height:34px;border-bottom:1px solid #ddd}
.cp-row{min-height:34px;border-bottom:1px dotted #e5e5e5;cursor:pointer}
.cp-row:hover{background:var(--cp-hover)}
.cp-row .d{font-size:11px;color:#999}
.cp-row .w,.cp-head span:nth-child(3),.cp-head span:nth-child(4),.cp-row .r{text-align:center}
.cp-row .r{color:#aaa;font-size:14px}
.cp-body{padding:10px 14px 14px;background:#fffafb;border-bottom:1px dotted #e5e5e5}
.cp-body p{margin:0 0 10px;white-space:pre-wrap;line-height:1.7}
.cp-empty{padding:34px;text-align:center;color:#aaa}
.cp-lockbox{position:relative;background:#fff;border-radius:14px;border:2px dashed var(--cp);padding:64px 16px;text-align:center}
.cp-lockbox h2{margin:0 0 6px;font-size:20px;font-weight:600;color:var(--cp-deep)}
.cp-lockbox p{margin:0 0 14px;font-size:12px;color:#888}
.cp-lockrow{display:flex;gap:8px;justify-content:center}
.cp-in{border:1px solid #e3e3e3;border-radius:8px;padding:8px 12px;font-size:13px;outline:0;background:#fff;width:100%;box-sizing:border-box}
.cp-in:focus{border-color:var(--cp)}
.cp-lockrow .cp-in{width:240px}
.cp-open{border:0;border-radius:8px;background:var(--cp);color:#fff;font-weight:700;padding:0 18px;cursor:pointer}
.cp-open:hover{background:var(--cp-deep)}
.cp-err{color:#e57373;font-size:12px;margin-top:10px}
.cp-form{display:grid;gap:10px}
.cp-form label{display:grid;gap:4px;font-size:12px;color:#666}
.cp-form textarea{min-height:170px;resize:vertical;font-family:inherit}
.cp-chk{display:flex!important;grid-template-columns:none!important;align-items:center;gap:6px}
.cp-chk input{width:auto}
@media (max-width:760px){
  .cp-grid{grid-template-columns:1fr}
  .cp-side{min-height:0}
  .cp-cal{flex-direction:column;align-items:flex-start}
  .cp-date{border-right:0;padding-right:0}
  .cp-head,.cp-row{grid-template-columns:78px 1fr 92px 40px}
}
`;

function Heart({ who }: { who: Who }) {
  return <span style={{ color: NICKS[who].color }}>♥</span>;
}

function CouplePageInner() {
  const { isAdmin } = useAuth();
  const sec = useSectionParam('couple');
  const { title } = useSectionTitle('couple', sec.id, '커플 다이어리');
  const [postsAll, setPostsAll, loaded] = useLocalList<CouplePost>(COUPLE_KEY, []);
  const posts = filterSection(postsAll, sec.id);
  // 이 게시판 자리만 교체 — 다른 섹션 글은 그대로 둔다
  const setPosts = sectionSetter(postsAll, sec.id, setPostsAll);
  const [st, patchSt] = useCoupleSettings(sec.id);
  const photoUrl = useBlobUrl(st.photo || undefined);

  /* 잠금 */
  const okKey = `ohome.couple.ok.${sec.id}`;
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState(false);
  useEffect(() => {
    try { setUnlocked(sessionStorage.getItem(okKey) === '1'); } catch { /* 무시 */ }
    setReady(true);
  }, [okKey]);

  /* 보기 상태 */
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [mode, setMode] = useState<'month' | 'all'>('month');
  const [fWho, setFWho] = useState<Who | null>(null);
  const [fDay, setFDay] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  /* 편집 */
  const [editing, setEditing] = useState<CouplePost | 'new' | null>(null);
  const [draft, setDraft] = useState({ title: '', body: '', date: todayStr(), who: 'a' as Who, read: false });
  const [delFor, setDelFor] = useState<CouplePost | null>(null);
  const [showSet, setShowSet] = useState(false);
  const [sDraft, setSDraft] = useState({ start: '', notice: '', today: '', total: '', pw: '', clearPw: false });

  /* 사진 */
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pending, setPending] = useState<File | null>(null);

  if (!loaded || !ready) return <section className="page" />;

  const locked = st.pwHash !== '' && !unlocked;

  const tryOpen = async () => {
    try {
      const h = await sha256Hex(pw.trim());
      if (h === st.pwHash) {
        try { sessionStorage.setItem(okKey, '1'); } catch { /* 무시 */ }
        setUnlocked(true); setPwErr(false); setPw('');
      } else setPwErr(true);
    } catch { setPwErr(true); }
  };
  const adminEnter = () => {
    try { sessionStorage.setItem(okKey, '1'); } catch { /* 무시 */ }
    setUnlocked(true);
  };
  const lockNow = () => {
    try { sessionStorage.removeItem(okKey); } catch { /* 무시 */ }
    setUnlocked(false); setPw(''); setPwErr(false);
  };

  if (locked) {
    return (
      <section className="page">
        <style>{CSS}</style>
        <div className="page-head"><PageTitle>{title}</PageTitle></div>
        <div className="cp-wrap">
          <div className="cp-frame">
            <div className="cp-lockbox">
              <h2>🔒 {title}</h2>
              <p>비밀번호를 입력해야 볼 수 있어요</p>
              <div className="cp-lockrow">
                <input className="cp-in" type="password" placeholder="비밀번호" value={pw}
                  onChange={e => { setPw(e.target.value); setPwErr(false); }}
                  onKeyDown={e => { if (e.key === 'Enter') void tryOpen(); }} />
                <button className="cp-open" onClick={() => void tryOpen()}>열기</button>
              </div>
              {pwErr && <div className="cp-err">비밀번호가 맞지 않아요</div>}
              {isAdmin && (
                <div style={{ marginTop: 18 }}>
                  <button className="cp-link" onClick={adminEnter}>관리자 입장</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ---------- 달력·목록 계산 ---------- */
  const monthKey = `${view.y}-${pad(view.m + 1)}`;
  const dim = new Date(view.y, view.m + 1, 0).getDate();
  const hasPost = new Set<number>();
  posts.filter(p => p.date.startsWith(monthKey)).forEach(p => hasPost.add(parseInt(p.date.slice(8, 10), 10)));
  const isThisMonth = view.y === now.getFullYear() && view.m === now.getMonth();

  const visible = sortPosts(
    posts
      .filter(p => mode === 'all' || p.date.startsWith(monthKey))
      .filter(p => !fWho || p.who === fWho)
      .filter(p => fDay == null || parseInt(p.date.slice(8, 10), 10) === fDay),
  );
  const hasNew = (w: Who) => posts.some(p => p.who === w && !p.read);
  const dtogether = daysTogether(st.start);

  const mv = (delta: number) => {
    setView(v => { const nm = v.m + delta; return { y: v.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 }; });
    setMode('month'); setFDay(null);
  };
  const showAll = () => { setMode('all'); setFWho(null); setFDay(null); };
  const pickWho = (w: Who) => { setFWho(f => (f === w ? null : w)); setMode('month'); setFDay(null); };
  const pickDay = (d: number) => { setMode('month'); setFDay(f => (f === d ? null : d)); };

  /* ---------- 글 ---------- */
  const startEdit = (p: CouplePost | 'new') => {
    setDraft(p === 'new'
      ? { title: '', body: '', date: todayStr(), who: 'a', read: false }
      : { title: p.title, body: p.body, date: p.date, who: p.who, read: p.read });
    setEditing(p);
  };
  const saveDraft = () => {
    const t = draft.title.trim();
    if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) return;
    if (editing === 'new') {
      setPosts([{
        id: newId(), title: t, body: draft.body, date: draft.date, who: draft.who,
        read: draft.read, created: Date.now(), visibility: 'public',
      }, ...posts]);
    } else if (editing) {
      const id = editing.id;
      setPosts(posts.map(x => (x.id === id ? { ...x, ...draft, title: t } : x)));
    }
    setEditing(null);
  };
  const toggleRead = (p: CouplePost) => {
    if (!isAdmin) return;
    setPosts(posts.map(x => (x.id === p.id ? { ...x, read: !x.read } : x)));
  };

  /* ---------- 설정 ---------- */
  const startSettings = () => {
    setSDraft({ start: st.start, notice: st.notice, today: st.today, total: st.total, pw: '', clearPw: false });
    setShowSet(true);
  };
  const saveSettings = async () => {
    const p: Partial<CoupleSettings> = {
      start: sDraft.start, notice: sDraft.notice, today: sDraft.today, total: sDraft.total,
    };
    if (sDraft.clearPw) p.pwHash = '';
    else if (sDraft.pw.trim()) p.pwHash = await sha256Hex(sDraft.pw.trim());
    patchSt(p);
    setShowSet(false);
  };

  /* ---------- 사진 ---------- */
  const pickPhoto = (f: File | undefined) => {
    if (!f) return;
    setPending(f);
    setCropSrc(URL.createObjectURL(f));
  };
  const reCrop = () => { if (photoUrl) { setPending(null); setCropSrc(photoUrl); } };
  const closeCrop = () => {
    if (cropSrc && pending) URL.revokeObjectURL(cropSrc);
    setCropSrc(null); setPending(null);
  };
  const applyCrop = async (c: CropValue) => {
    try {
      if (pending) {
        const ref = await putBlob(pending);
        patchSt({ photo: ref, photoCrop: c });
      } else patchSt({ photoCrop: c });
    } catch {
      alert('사진을 올리지 못했어요. 관리자 로그인과 저장소 연결을 확인해 주세요.');
    }
    closeCrop();
  };

  return (
    <section className="page">
      <style>{CSS}</style>
      <div className="page-head"><PageTitle>{title}</PageTitle></div>

      <div className="cp-wrap">
        <div className="cp-frame">
          <div className="cp-grid">

            {/* ---------- 왼쪽 ---------- */}
            <div className="cp-panel cp-side">
              <div className="cp-count">TODAY <b>{st.today}</b> | TOTAL <b>{st.total}</b></div>
              <div className="cp-photo-box">
                <div className="cp-photo">
                  <CroppedBlobImg fileRef={st.photo || undefined} crop={st.photoCrop} ph="" />
                </div>
              </div>
              {isAdmin && (
                <div className="cp-mini">
                  <label className="cp-link">
                    사진 변경
                    <input type="file" accept="image/*" hidden
                      onChange={e => { pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                  {st.photo && <button className="cp-link" onClick={reCrop}>영역 조정</button>}
                </div>
              )}
              <div className="cp-title">DIARY</div>
              <button className={`cp-item ${mode === 'all' && !fWho ? 'on' : ''}`} onClick={showAll}>
                <span>📒</span> 전체보기
              </button>
              <hr className="cp-sep" />
              <div className="cp-sub">우리다이어리</div>
              {WHO.map(w => (
                <button key={w} className={`cp-item ${fWho === w ? 'on' : ''}`} onClick={() => pickWho(w)}>
                  <Heart who={w} /> {NICKS[w].name} {hasNew(w) && <i className="cp-n">N</i>}
                </button>
              ))}
              {st.pwHash !== '' && (
                <button className="cp-lock" onClick={lockNow}>🔒 잠그기</button>
              )}
            </div>

            {/* ---------- 오른쪽 ---------- */}
            <div className="cp-panel">
              <div className="cp-cal">
                <div className="cp-date">
                  <b>{pad(now.getMonth() + 1)}.{pad(now.getDate())}</b>
                  <span>{WD[now.getDay()]}</span>
                </div>
                <div className="cp-days">
                  <div className="cp-nav">
                    <button type="button" data-tip="작년" onClick={() => mv(-12)}>«</button>
                    <button type="button" onClick={() => mv(-1)}>‹</button>
                    <b>{view.y}.{pad(view.m + 1)}</b>
                    <button type="button" onClick={() => mv(1)}>›</button>
                    <button type="button" data-tip="내년" onClick={() => mv(12)}>»</button>
                  </div>
                  {Array.from({ length: dim }, (_, i) => {
                    const d = i + 1;
                    const dow = new Date(view.y, view.m, d).getDay();
                    const cls = isThisMonth && d === now.getDate() ? 'today'
                      : hasPost.has(d) ? 'has'
                      : dow === 0 ? 'sun' : '';
                    return (
                      <button type="button" key={d}
                        className={`cp-day ${cls} ${fDay === d ? 'sel' : ''}`}
                        onClick={() => pickDay(d)}>{d}</button>
                    );
                  })}
                </div>
              </div>

              <div className="cp-notice">
                <span><b className="k">공지사항</b>{st.notice}</span>
                {dtogether != null && <span className="dd">만남 <b>{dtogether}</b>일째</span>}
              </div>

              {isAdmin && (
                <div className="cp-admin">
                  <button className="cp-btn" onClick={startSettings}>설정</button>
                  <button className="cp-btn fill" onClick={() => startEdit('new')}>＋ 글쓰기</button>
                </div>
              )}

              <div className="cp-head">
                <span>작성일</span><span>제목</span><span>작성자</span><span>읽음</span>
              </div>
              {visible.map(p => (
                <div key={p.id}>
                  <div className="cp-row" onClick={() => setOpen(o => (o === p.id ? null : p.id))}>
                    <span className="d">{p.date.replace(/-/g, '.')}</span>
                    <span>{p.title}</span>
                    <span className="w">{NICKS[p.who].name} <Heart who={p.who} /></span>
                    <span className="r" onClick={e => { e.stopPropagation(); toggleRead(p); }}
                      data-tip={isAdmin ? '눌러서 읽음 표시 바꾸기' : undefined}>
                      {p.read ? '○' : '✕'}
                    </span>
                  </div>
                  {open === p.id && (
                    <div className="cp-body">
                      <p>{p.body || '(내용 없음)'}</p>
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="cp-btn" onClick={() => startEdit(p)}>수정</button>
                          <button className="cp-btn" onClick={() => setDelFor(p)}>삭제</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {visible.length === 0 && <div className="cp-empty">글이 없습니다</div>}
            </div>
          </div>
        </div>
      </div>

      {/* 글쓰기·수정 */}
      <Modal open={editing !== null} onClose={() => setEditing(null)}
        title={editing === 'new' ? '글쓰기' : '글 수정'} desc="날짜와 읽음 여부를 직접 정할 수 있어요"
        actions={<>
          <button className="btn btn-ghost" onClick={() => setEditing(null)}>CANCEL</button>
          <button className="btn btn-dark" onClick={saveDraft}>SAVE</button>
        </>}>
        <div className="cp-wrap cp-form">
          <label>작성일
            <input className="cp-in" type="date" value={draft.date}
              onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} />
          </label>
          <label>작성자
            <select className="cp-in" value={draft.who}
              onChange={e => setDraft(d => ({ ...d, who: e.target.value as Who }))}>
              {WHO.map(w => <option key={w} value={w}>{NICKS[w].name}</option>)}
            </select>
          </label>
          <label>제목
            <input className="cp-in" value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
          </label>
          <label>내용
            <textarea className="cp-in" value={draft.body}
              onChange={e => setDraft(d => ({ ...d, body: e.target.value }))} />
          </label>
          <label className="cp-chk">
            <input type="checkbox" checked={draft.read}
              onChange={e => setDraft(d => ({ ...d, read: e.target.checked }))} />
            읽음으로 표시
          </label>
        </div>
      </Modal>

      {/* 설정 */}
      <Modal open={showSet} onClose={() => setShowSet(false)}
        title="커플 다이어리 설정" desc="비밀번호·만남 시작일·공지·방문 수"
        actions={<>
          <button className="btn btn-ghost" onClick={() => setShowSet(false)}>CANCEL</button>
          <button className="btn btn-dark" onClick={() => void saveSettings()}>SAVE</button>
        </>}>
        <div className="cp-wrap cp-form">
          <label>만남 시작일 (이 날이 1일째)
            <input className="cp-in" type="date" value={sDraft.start}
              onChange={e => setSDraft(d => ({ ...d, start: e.target.value }))} />
          </label>
          <label>공지사항
            <input className="cp-in" value={sDraft.notice}
              onChange={e => setSDraft(d => ({ ...d, notice: e.target.value }))} />
          </label>
          <label>TODAY
            <input className="cp-in" value={sDraft.today}
              onChange={e => setSDraft(d => ({ ...d, today: e.target.value }))} />
          </label>
          <label>TOTAL
            <input className="cp-in" value={sDraft.total}
              onChange={e => setSDraft(d => ({ ...d, total: e.target.value }))} />
          </label>
          <label>비밀번호 {st.pwHash ? '(설정됨 — 바꾸려면 새로 입력)' : '(아직 없음)'}
            <input className="cp-in" type="password" value={sDraft.pw} placeholder="새 비밀번호"
              onChange={e => setSDraft(d => ({ ...d, pw: e.target.value }))} />
          </label>
          {st.pwHash !== '' && (
            <label className="cp-chk">
              <input type="checkbox" checked={sDraft.clearPw}
                onChange={e => setSDraft(d => ({ ...d, clearPw: e.target.checked }))} />
              비밀번호 없애기
            </label>
          )}
        </div>
      </Modal>

      {/* 삭제 확인 */}
      <ConfirmModal open={delFor !== null} title="글을 삭제하시겠습니까?"
        body={`"${delFor?.title ?? ''}" — 삭제하면 복구할 수 없습니다.`}
        onClose={() => setDelFor(null)}
        buttons={[
          { label: 'DELETE', kind: 'accent', onClick: () => { if (delFor) setPosts(posts.filter(x => x.id !== delFor.id)); setDelFor(null); } },
          { label: 'CANCEL', kind: 'ghost', onClick: () => setDelFor(null) },
        ]} />

      {/* 사진 크롭 — 4:3 */}
      <CropEditor open={cropSrc !== null} src={cropSrc ?? ''} aspect="4:3"
        initial={pending ? undefined : st.photoCrop}
        onClose={closeCrop} onApply={c => void applyCrop(c)} />
    </section>
  );
}

export default function CouplePage() {
  return <Suspense fallback={<section className="page" />}><CouplePageInner /></Suspense>;
}
