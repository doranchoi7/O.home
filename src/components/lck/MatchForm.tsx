'use client';
// LCK 경기 글쓰기·수정 — match가 있으면 수정
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalList, newId } from '@/lib/postStore';
import {
  LCK_KEY, DRAGONS, col, emptySet, fillPrev,
  type LckMatch, type SetData, type TeamData, type Player, type Side,
} from '@/lib/lckStore';
import { hashPw, todayStr } from '@/lib/lckStore';
import { MAIN_SEC, secStamp, sectionHref, useSectionParam } from '@/lib/sectionStore';
import { useTypeCats } from '@/lib/boardTypeStore';
import { KInput, KSelect, KLabel, KCheck, KDate } from '@/components/ui/Kit';
import { RichEditor } from '@/components/ui/RichEditor';
import { useToast } from '@/components/ui/Toast';
import { ChampSelect } from './ChampUi';
import { DragonIcon } from './LckIcons';
import { SetView } from './SetView';

const sel: React.CSSProperties = { border: '1px solid var(--line)', borderRadius: 6, padding: '5px 6px', fontSize: 12.5, background: 'transparent', color: 'inherit' };
const panel: React.CSSProperties = { padding: 20, marginBottom: 16 };
const H = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontWeight: 800, fontSize: 12.5, margin: '18px 0 8px', letterSpacing: 0.4 }}>{children}</div>
);
function Num({ v, on, w = 44, ph }: { v: string; on: (s: string) => void; w?: number; ph?: string }) {
  return <KInput value={v} onChange={e => on(e.target.value)} placeholder={ph} style={{ width: w, padding: '5px 6px', textAlign: 'center' }} />;
}
const Chk = ({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) => (
  <label style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
    <input type="checkbox" checked={on} onChange={e => set(e.target.checked)} />{label}
  </label>
);
const HEAD_OPTS = ['', '선픽', '후픽', '진영'];

function SetEditor({ s, idx, sets, fearless, onChange }: {
  s: SetData; idx: number; sets: SetData[]; fearless: boolean; onChange: (fn: (x: SetData) => SetData) => void;
}) {
  const team = (side: Side, patch: Partial<TeamData>) => onChange(x => ({ ...x, [side]: { ...x[side], ...patch } }));
  const player = (side: Side, i: number, patch: Partial<Player>) =>
    onChange(x => ({ ...x, [side]: { ...x[side], players: x[side].players.map((p, j) => (j === i ? { ...p, ...patch } : p)) } }));
  const arr = (side: Side, key: 'bans' | 'dragons', i: number, v: string) =>
    team(side, { [key]: s[side][key].map((a, j) => (j === i ? v : a)) } as Partial<TeamData>);
  const flip = (g: number) => (g < 0 ? -1 : (g + 5) % 10);
  const swap = () => onChange(x => ({
    ...x, blue: x.red, red: x.blue, hBlue: x.hRed, hRed: x.hBlue,
    winner: x.winner === 'blue' ? 'red' : x.winner === 'red' ? 'blue' : '',
    herald: x.herald === 'blue' ? 'red' : x.herald === 'red' ? 'blue' : '',
    mvp: flip(x.mvp), mine: flip(x.mine),
    picks: x.picks.map(p => ({ ...p, team: p.team === 'blue' ? 'red' : p.team === 'red' ? 'blue' : '' })),
  }));
  const getPrev = () => {
    const f = fillPrev(sets, idx);
    onChange(x => ({ ...x, blue: { ...x.blue, prev: f.blue }, red: { ...x.red, prev: f.red } }));
  };
  const sides = ['blue', 'red'] as const;
  const two: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(310px,1fr))', gap: 16 };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select style={sel} value={s.hBlue} onChange={e => onChange(x => ({ ...x, hBlue: e.target.value }))}>{HEAD_OPTS.map(o => <option key={o} value={o}>{o || '(빈칸)'}</option>)}</select>
        <span style={{ fontSize: 12, color: 'var(--faint)' }}>← 블루 박스 · 레드 박스 →</span>
        <select style={sel} value={s.hRed} onChange={e => onChange(x => ({ ...x, hRed: e.target.value }))}>{HEAD_OPTS.map(o => <option key={o} value={o}>{o || '(빈칸)'}</option>)}</select>
        <button type="button" className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11, marginLeft: 'auto' }} onClick={swap}>↔ 좌우 바꾸기</button>
      </div>

      <H>팀명 · 세트 스코어</H>
      <div style={two}>
        {sides.map(side => (
          <div key={side} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ width: 8, alignSelf: 'stretch', background: col(side), borderRadius: 3 }} />
            <KInput list="lck-teams" value={s[side].name} onChange={e => team(side, { name: e.target.value })} placeholder={side === 'blue' ? '블루팀' : '레드팀'} />
            <Num v={s[side].score} on={v => team(side, { score: v })} ph="스코어" w={60} />
          </div>
        ))}
      </div>

      {fearless && idx > 0 && (
        <>
          <H>앞 세트 챔프 (피어리스) <button type="button" className="btn btn-ghost" style={{ padding: '2px 9px', fontSize: 11, marginLeft: 8 }} onClick={getPrev}>앞 세트에서 가져오기</button></H>
          <div style={two}>
            {sides.map(side => (
              <div key={side} style={{ display: 'grid', gap: 4 }}>
                {s[side].prev.map((row, r) => (
                  <div key={r} style={{ display: 'flex', gap: 3 }}>
                    {row.map((c, k) => (
                      <ChampSelect key={k} size={30} value={c}
                        onChange={v => team(side, { prev: s[side].prev.map((rw, ri) => (ri === r ? rw.map((cc, ci) => (ci === k ? v : cc)) : rw)) })} />
                    ))}
                  </div>
                ))}
                {s[side].prev.length === 0 && <span style={{ fontSize: 12, color: 'var(--faint)' }}>비어 있어요</span>}
              </div>
            ))}
          </div>
        </>
      )}

      <H>밴 (입력한 순서 그대로)</H>
      <div style={two}>
        {sides.map(side => (
          <div key={side} style={{ display: 'flex', gap: 4 }}>
            {s[side].bans.map((c, i) => <ChampSelect key={i} size={34} value={c} onChange={v => arr(side, 'bans', i, v)} />)}
          </div>
        ))}
      </div>

      <H>팀 합계</H>
      <div style={two}>
        {sides.map(side => (
          <div key={side} style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Num v={s[side].kills} on={v => team(side, { kills: v })} ph="K" /> /
            <Num v={s[side].deaths} on={v => team(side, { deaths: v })} ph="D" /> /
            <Num v={s[side].assists} on={v => team(side, { assists: v })} ph="A" />
            <Num v={s[side].gold} on={v => team(side, { gold: v })} ph="골드" w={70} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
        <KInput value={s.time} onChange={e => onChange(x => ({ ...x, time: e.target.value }))} placeholder="30:57" style={{ width: 90 }} />
        <select style={sel} value={s.winner} onChange={e => onChange(x => ({ ...x, winner: e.target.value as SetData['winner'], mvp: -1 }))}>
          <option value="">승패 미정</option><option value="blue">블루 승</option><option value="red">레드 승</option>
        </select>
      </div>

      <H>선수 (탑 · 정글 · 미드 · 원딜 · 서폿)</H>
      <div style={two}>
        {sides.map(side => (
          <div key={side} style={{ display: 'grid', gap: 8 }}>
            {s[side].players.map((p, i) => {
              const g = side === 'blue' ? i : 5 + i;
              return (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', borderLeft: `4px solid ${col(side)}`, paddingLeft: 6 }}>
                  <ChampSelect size={40} value={p.champ} onChange={v => player(side, i, { champ: v })} />
                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <KInput list="lck-nicks" value={p.nick} onChange={e => player(side, i, { nick: e.target.value })} placeholder="닉네임" style={{ width: 96, padding: '5px 7px' }} />
                      <Num v={p.k} on={v => player(side, i, { k: v })} w={34} ph="K" />
                      <Num v={p.d} on={v => player(side, i, { d: v })} w={34} ph="D" />
                      <Num v={p.a} on={v => player(side, i, { a: v })} w={34} ph="A" />
                      <Num v={p.dmg} on={v => player(side, i, { dmg: v })} w={62} ph="딜량" />
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Chk label="베스트 딜" on={s[side].bestDmg === i} set={v => team(side, { bestDmg: v ? i : -1 })} />
                      <Chk label="베스트 KDA" on={s[side].bestKda === i} set={v => team(side, { bestKda: v ? i : -1 })} />
                      <Chk label="MVP" on={s.mvp === g} set={v => v && s.winner && s.winner !== side ? undefined : onChange(x => ({ ...x, mvp: v ? g : -1 }))} />
                      <Chk label="내 챔프" on={s.mine === g} set={v => onChange(x => ({ ...x, mine: v ? g : -1 }))} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 6 }}>MVP는 승리팀 선수 1명만, 승패를 정하면 그 팀에서만 체크돼요. 「내 챔프」는 목록 카드에 올라가요.</div>

      <H>오브젝트</H>
      <div style={two}>
        {sides.map(side => (
          <div key={side} style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {s[side].dragons.map((d, i) => (
                <div key={i} style={{ display: 'grid', gap: 3, justifyItems: 'center' }}>
                  <DragonIcon k={d} size={30} />
                  <select style={{ ...sel, width: 66, padding: '3px 2px', fontSize: 11 }} value={d} onChange={e => arr(side, 'dragons', i, e.target.value)}>
                    <option value="">-</option>{DRAGONS.map(o => <option key={o.k} value={o.k}>{o.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 11 }}>
              타워<Num v={s[side].towers} on={v => team(side, { towers: v })} />
              유충<Num v={s[side].grubs} on={v => team(side, { grubs: v })} />
              장로<Num v={s[side].elders} on={v => team(side, { elders: v })} />
              바론<Num v={s[side].barons} on={v => team(side, { barons: v })} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 }}>
        영혼
        <select style={sel} value={s.soul} onChange={e => onChange(x => ({ ...x, soul: e.target.value }))}>
          <option value="">없음 (아무도 못 얻음)</option>{DRAGONS.map(o => <option key={o.k} value={o.k}>{o.name}</option>)}
        </select>
        <button type="button" className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11 }}
          onClick={() => onChange(x => ({ ...x, soul: x.blue.dragons[2] || x.red.dragons[2] || '' }))}>3용 종류로 채우기</button>
        전령
        <select style={sel} value={s.herald} onChange={e => onChange(x => ({ ...x, herald: e.target.value as SetData['herald'] }))}>
          <option value="">없음</option><option value="blue">블루 ◀</option><option value="red">레드 ▶</option>
        </select>
      </div>

      <H>밴픽 순서 (위 3쌍 · 아래 2쌍)</H>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 8 }}>
        {s.picks.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ width: 16, fontSize: 11, color: 'var(--faint)' }}>{i + 1}</span>
            <ChampSelect size={36} value={p.champ} onChange={v => onChange(x => ({ ...x, picks: x.picks.map((q, j) => (j === i ? { ...q, champ: v } : q)) }))} />
            <KInput list="lck-nicks" value={p.nick} placeholder="선수명" style={{ width: 90, padding: '5px 7px', fontWeight: 800 }}
              onChange={e => onChange(x => ({ ...x, picks: x.picks.map((q, j) => (j === i ? { ...q, nick: e.target.value } : q)) }))} />
            {(['blue', 'red'] as const).map(side => (
              <button key={side} type="button"
                onClick={() => onChange(x => ({ ...x, picks: x.picks.map((q, j) => (j === i ? { ...q, team: q.team === side ? '' : side } : q)) }))}
                style={{ fontSize: 11, padding: '3px 7px', borderRadius: 5, border: `1px solid ${col(side)}`, fontWeight: 800,
                  background: p.team === side ? col(side) : 'transparent', color: p.team === side ? '#fff' : col(side) }}>
                {side === 'blue' ? '블루' : '레드'}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MatchForm({ match }: { match?: LckMatch }) {
  const router = useRouter();
  const toast = useToast();
  const [all, setAll] = useLocalList<LckMatch>(LCK_KEY, []);
  const sec = useSectionParam('lck');
  const secId = match ? (match.secId ?? MAIN_SEC) : sec.id;
  const { catsOf } = useTypeCats();
  const cats = catsOf('lck', secId);

  const [tournament, setTournament] = useState(match?.tournament ?? '');
  const [season, setSeason] = useState(match?.season ?? String(new Date().getFullYear()));
  const [round, setRound] = useState(match?.round ?? '');
  const [gameNo, setGameNo] = useState(match?.gameNo ?? '');
  const [date, setDate] = useState(match?.date ?? todayStr());
  const [bo, setBo] = useState(match?.bo ?? 3);
  const [fearless, setFearless] = useState(match?.fearless ?? true);
  const [player, setPlayer] = useState(match?.player ?? 'Doran');
  const [award, setAward] = useState<LckMatch['award']>(match?.award ?? '');
  const [bestKda, setBestKda] = useState(match?.bestKda ?? '');
  const [bestDmg, setBestDmg] = useState(match?.bestDmg ?? '');
  const [result, setResult] = useState<LckMatch['result']>(match?.result ?? '');
  const [catId, setCatId] = useState(match?.catId ?? '');
  const [vis, setVis] = useState<LckMatch['vis']>(match?.vis ?? 'public');
  const [pw, setPw] = useState('');
  const [sets, setSets] = useState<SetData[]>(match?.sets?.length ? match.sets : [emptySet()]);
  const [si, setSi] = useState(0);
  const [review, setReview] = useState(match?.review ?? '');
  const [rating, setRating] = useState(match?.rating ?? '');
  const [ratingNote, setRatingNote] = useState(match?.ratingNote ?? '');
  const [busy, setBusy] = useState(false);

  const patchSet = (fn: (x: SetData) => SetData) => setSets(p => p.map((s, j) => (j === si ? fn(s) : s)));
  const addSet = () => {
    const base = emptySet();
    const last = sets[sets.length - 1];
    base.blue.name = last.blue.name; base.red.name = last.red.name;
    const next = [...sets, base];
    const f = fillPrev(next, next.length - 1);
    base.blue.prev = f.blue; base.red.prev = f.red;
    setSets(next); setSi(next.length - 1);
  };
  const delSet = () => {
    if (sets.length <= 1) return;
    setSets(sets.filter((_, j) => j !== si)); setSi(Math.max(0, si - 1));
  };

  // 자동완성 후보 — 이전에 쓴 팀명·닉네임
  const teamOpts = new Set<string>(), nickOpts = new Set<string>();
  const scan = (m: { sets: SetData[] }) => m.sets.forEach(s => {
    [s.blue, s.red].forEach(t => { if (t.name.trim()) teamOpts.add(t.name.trim()); t.players.forEach(p => p.nick.trim() && nickOpts.add(p.nick.trim())); });
    s.picks.forEach(p => p.nick.trim() && nickOpts.add(p.nick.trim()));
  });
  all.forEach(scan); scan({ sets });

  const back = match ? `/lck/${match.id}` : sectionHref('lck', secId);

  const save = async () => {
    if (busy) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast('경기 날짜를 입력해 주세요'); return; }
    if (vis === 'password' && !pw.trim() && !match?.pwHash) { toast('공개용 비밀번호를 입력해 주세요'); return; }
    setBusy(true);
    try {
      const pwHash = vis === 'password' ? (pw.trim() ? await hashPw(pw.trim()) : match?.pwHash) : undefined;
      const data = {
        tournament: tournament.trim(), season, round: round.trim(), gameNo: gameNo.trim(), date, bo, fearless,
        player: player.trim(), award, bestKda: bestKda.trim(), bestDmg: bestDmg.trim(), result,
        sets, review, rating: rating.trim(), ratingNote,
        vis, visibility: (vis === 'password' ? 'public' : vis) as LckMatch['visibility'],
        pwHash, catId: catId || undefined,
      };
      if (match) setAll(all.map(x => (x.id === match.id ? { ...x, ...data } : x)));
      else setAll([{ id: newId(), ...secStamp(secId), ...data, created: Date.now() }, ...all]);
      toast(match ? '저장되었습니다' : '등록되었습니다');
      router.push(back);
    } catch {
      toast('저장하지 못했습니다. 다시 시도해 주세요');
      setBusy(false);
    }
  };

  const years = Array.from({ length: 11 }, (_, i) => String(2018 + i));
  const cur = sets[si];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <datalist id="lck-teams">{Array.from(teamOpts).map(t => <option key={t} value={t} />)}</datalist>
      <datalist id="lck-nicks">{Array.from(nickOpts).map(t => <option key={t} value={t} />)}</datalist>

      <div className="panel" style={panel}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          <div><KLabel>대회 이름</KLabel><KInput value={tournament} onChange={e => setTournament(e.target.value)} placeholder="LCK 플레이오프" /></div>
          <div><KLabel>시즌</KLabel><KSelect minWidth={100} value={season} onChange={setSeason} options={years.map(y => ({ value: y, label: y }))} /></div>
          <div><KLabel>라운드</KLabel><KInput value={round} onChange={e => setRound(e.target.value)} placeholder="4강" /></div>
          <div><KLabel>몇 경기</KLabel><KInput value={gameNo} onChange={e => setGameNo(e.target.value)} placeholder="1" /></div>
          <div><KLabel>경기 날짜</KLabel><KDate value={date} onChange={setDate} /></div>
          <div><KLabel>방식</KLabel><KSelect minWidth={100} value={String(bo)} onChange={v => setBo(+v)} options={[{ value: '1', label: 'Bo1' }, { value: '3', label: 'Bo3' }, { value: '5', label: 'Bo5' }]} /></div>
          <div><KLabel>선수명</KLabel><KInput list="lck-nicks" value={player} onChange={e => setPlayer(e.target.value)} /></div>
          <div><KLabel>수상</KLabel><KSelect minWidth={100} value={award} onChange={v => setAward(v as LckMatch['award'])} options={[{ value: '', label: '없음' }, { value: 'POG', label: 'POG' }, { value: 'POM', label: 'POM' }, { value: 'MVP', label: 'MVP' }]} /></div>
          <div><KLabel>베스트 KDA</KLabel><KInput value={bestKda} onChange={e => setBestKda(e.target.value)} placeholder="14/1/4" /></div>
          <div><KLabel>베스트 딜량</KLabel><KInput value={bestDmg} onChange={e => setBestDmg(e.target.value)} placeholder="45.2K" /></div>
          <div><KLabel>결과</KLabel><KSelect minWidth={100} value={result} onChange={v => setResult(v as LckMatch['result'])} options={[{ value: '', label: '미정' }, { value: 'win', label: '승리' }, { value: 'lose', label: '패배' }]} /></div>
          {cats.length > 0 && (
            <div><KLabel>탭</KLabel><KSelect minWidth={120} value={catId} onChange={setCatId} options={[{ value: '', label: '분류 없음' }, ...cats.map(c => ({ value: c.id, label: c.label }))]} /></div>
          )}
          <div><KLabel>공개 범위</KLabel>
            <KSelect minWidth={130} value={vis} onChange={v => setVis(v as LckMatch['vis'])}
              options={[{ value: 'public', label: '전체 공개' }, { value: 'member', label: '멤버 공개' }, { value: 'password', label: '비밀번호 공개' }, { value: 'private', label: '비공개' }]} /></div>
          {vis === 'password' && (
            <div><KLabel>공개 비밀번호</KLabel><KInput type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder={match?.pwHash ? '비우면 그대로' : '비밀번호'} /></div>
          )}
        </div>
        <div style={{ marginTop: 12 }}><KCheck label="피어리스 경기 (앞 세트 챔프 줄 사용)" checked={fearless} onChange={setFearless} /></div>
      </div>

      <div className="panel" style={panel}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <button type="button" className="btn btn-ghost" style={{ padding: '3px 12px' }} disabled={si === 0} onClick={() => setSi(si - 1)}>‹</button>
          <b style={{ fontSize: 14 }}>세트 {si + 1} / {sets.length}</b>
          <button type="button" className="btn btn-ghost" style={{ padding: '3px 12px' }} disabled={si >= sets.length - 1} onClick={() => setSi(si + 1)}>›</button>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn btn-ghost" style={{ padding: '3px 11px', fontSize: 11 }} disabled={sets.length >= bo} onClick={addSet}>＋ 세트 추가 (최대 {bo})</button>
          <button type="button" className="btn btn-ghost" style={{ padding: '3px 11px', fontSize: 11 }} disabled={sets.length <= 1} onClick={delSet}>이 세트 삭제</button>
        </div>
        <SetEditor key={si} s={cur} idx={si} sets={sets} fearless={fearless} onChange={patchSet} />
      </div>

      <div className="panel" style={{ ...panel, padding: 0, background: '#fafafa' }}>
        <div style={{ padding: '12px 16px 0', fontSize: 11, color: 'var(--faint)' }}>미리보기 (세트 {si + 1})</div>
        <div style={{ padding: 16 }}><SetView set={cur} match={{ round, gameNo, date, fearless }} idx={si} /></div>
      </div>

      <div className="panel" style={panel}>
        <KLabel>후기</KLabel>
        <RichEditor value={review} onChange={setReview} placeholder="후기" />
        <div style={{ display: 'flex', gap: 12, marginTop: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ width: 120 }}><KLabel>개인 평점 (10점 만점)</KLabel><KInput value={rating} onChange={e => setRating(e.target.value)} placeholder="8.5" /></div>
          <div style={{ flex: 1, minWidth: 220 }}><KLabel>평점 이유</KLabel><KInput value={ratingNote} onChange={e => setRatingNote(e.target.value)} /></div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-ghost" onClick={() => router.push(back)}>CANCEL</button>
        <button className="btn btn-dark" disabled={busy} onClick={() => void save()}>{match ? 'SAVE' : 'POST'}</button>
      </div>
    </div>
  );
}
