'use client';
// 자캐 목록 설정 — 직업 탭 / 직업별 입력칸 / 선택지(순서·이미지) / 탭별 표에 보일 항목
// 모든 수정은 draft(임시본)에서 하고, 맨 아래 SAVE 를 눌러야 반영된다.
import React, { useRef, useState } from 'react';
import { OcChar, OcConfig, OcOption, FieldDef, FieldType, JobDef, allCols, defaultKeys, uid } from '@/lib/ocStore';
import { KInput, KSelect } from '@/components/ui/Kit';
import { putBlob, useBlobUrl } from '@/lib/blobStore';
import { useToast } from '@/components/ui/Toast';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
function swap<T>(arr: T[], i: number, d: number) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

const TYPE_OPTS = [
  { value: 'text', label: '글자' },
  { value: 'number', label: '숫자' },
  { value: 'date', label: '날짜 (n월 n일)' },
  { value: 'select', label: '선택형 (드롭다운)' },
  { value: 'tier', label: '티어형 (큰 단계 + 세부 단계)' },
];

/* ---------- 선택지 이미지 ---------- */
function Thumb({ img, onPick, onClear }: { img?: string; onPick: (f: File) => void; onClear: () => void }) {
  const url = useBlobUrl(img);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <span className="set-thumb">
      <button type="button" className="th" title="이미지 올리기" onClick={() => ref.current?.click()}>
        {url ? <img src={url} alt="" /> : '＋'}
      </button>
      <input ref={ref} type="file" accept="image/*" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }} />
      {url && <button type="button" className="x" title="이미지 지우기" onClick={onClear}>×</button>}
    </span>
  );
}

/* ---------- 선택지 목록 (순서 = 정렬 순서) ---------- */
function OptionList({ title, items, onChange, ordered = true, addHint }: {
  title: string; items: OcOption[]; onChange: (v: OcOption[]) => void; ordered?: boolean; addHint?: string;
}) {
  const toast = useToast();
  const [quick, setQuick] = useState('');
  const set = (i: number, p: Partial<OcOption>) => onChange(items.map((o, k) => (k === i ? { ...o, ...p } : o)));
  const move = (i: number, d: number) => { const n = [...items]; swap(n, i, d); onChange(n); };
  const addQuick = () => {
    const names = quick.split(',').map(s => s.trim()).filter(Boolean);
    if (!names.length) return;
    onChange([...items, ...names.map(n => ({ id: uid(), label: n }))]);
    setQuick('');
  };
  const upload = async (i: number, f: File) => {
    try { set(i, { img: await putBlob(f) }); } catch { toast('이미지를 올리지 못했어요'); }
  };
  return (
    <div className="set-opts">
      <div className="set-opts-h">{title}{ordered && <small>위 → 아래 순서가 정렬 순서예요</small>}</div>
      {items.map((o, i) => (
        <div className="set-opt" key={o.id}>
          <Thumb img={o.img} onPick={f => upload(i, f)} onClear={() => set(i, { img: undefined })} />
          <KInput value={o.label} onChange={e => set(i, { label: e.target.value })} />
          {ordered && <button type="button" className="mv" onClick={() => move(i, -1)}>▲</button>}
          {ordered && <button type="button" className="mv" onClick={() => move(i, 1)}>▼</button>}
          <button type="button" className="mv del" onClick={() => onChange(items.filter((_, k) => k !== i))}>✕</button>
        </div>
      ))}
      <div className="set-quick">
        <KInput value={quick} placeholder={addHint ?? '추가할 이름 (여러 개는 쉼표로: 탑, 정글, 미드)'}
          onChange={e => setQuick(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addQuick(); } }} />
        <button type="button" className="btn btn-ghost" onClick={addQuick}>＋ 추가</button>
      </div>
    </div>
  );
}

/* ---------- 입력칸 하나 ---------- */
function FieldEditor({ f, onChange, onMove, onDel }: {
  f: FieldDef; onChange: (f: FieldDef) => void; onMove: (d: number) => void; onDel: () => void;
}) {
  const p = (patch: Partial<FieldDef>) => onChange({ ...f, ...patch });
  const isPick = f.type === 'select' || f.type === 'tier';
  const isText = f.type === 'text';
  return (
    <div className="set-field">
      <div className="set-row">
        <KInput value={f.label} onChange={e => p({ label: e.target.value })} placeholder="입력칸 이름" />
        <div style={{ minWidth: 190 }}>
          <KSelect value={f.type} options={TYPE_OPTS}
            onChange={v => {
              const type = v as FieldType;
              p({
                type,
                options: type === 'select' || type === 'tier' ? f.options ?? [] : f.options,
                sub: type === 'tier' ? f.sub ?? [] : f.sub,
              });
            }} />
        </div>
        <button type="button" className="mv" onClick={() => onMove(-1)}>▲</button>
        <button type="button" className="mv" onClick={() => onMove(1)}>▼</button>
        <button type="button" className="mv del" onClick={onDel}>✕</button>
      </div>
      {f.type === 'number' && (
        <div className="set-row"><span className="set-l">단위</span>
          <KInput value={f.unit ?? ''} placeholder="예: 학년, cm (없으면 비워두기)" onChange={e => p({ unit: e.target.value })} />
        </div>
      )}
      {isText && (
        <>
          <OptionList ordered={false} title="값별 이미지 (선택) — 같은 글자를 입력하면 표에서 왼쪽에 이미지가 떠요"
            addHint="이미지를 달 글자 (예: T1, 젠지 — 여러 개는 쉼표로)"
            items={f.options ?? []} onChange={v => p({ options: v })} />
          <label className="set-chk"><input type="checkbox" checked={f.showImg !== false}
            onChange={e => p({ showImg: e.target.checked })} /> 표에서 값 왼쪽에 이미지 보이기</label>
        </>
      )}
      {isPick && (
        <>
          <OptionList title={f.type === 'tier' ? '큰 단계 (예: 아이언 … 챌린저)' : '선택지'}
            items={f.options ?? []} onChange={v => p({ options: v })} />
          {f.type === 'tier' && (
            <OptionList title="세부 단계 (예: 4 · 3 · 2 · 1)" items={f.sub ?? []} onChange={v => p({ sub: v })} />
          )}
          <label className="set-chk"><input type="checkbox" checked={f.showImg !== false}
            onChange={e => p({ showImg: e.target.checked })} /> 표에서 값 왼쪽에 이미지 보이기</label>
          <label className="set-chk"><input type="checkbox" checked={!!f.firstDesc}
            onChange={e => p({ firstDesc: e.target.checked })} /> 처음 눌렀을 때 목록 <b>아래쪽</b>부터 보이기 (예: 챌린저부터)</label>
        </>
      )}
    </div>
  );
}

/* ---------- 탭별 표에 보일 항목 ---------- */
function ColsEditor({ d, tab, label, upd }: {
  d: OcConfig; tab: string; label: string; upd: (fn: (n: OcConfig) => void) => void;
}) {
  const all = allCols(d, tab);
  const saved = d.cols[tab];
  const keys = (saved && saved.length ? saved : defaultKeys(d, tab)).filter(k => k !== 'name' && all.some(c => c.key === k));
  const hidden = all.filter(c => c.key !== 'name' && !keys.includes(c.key));
  const labelOf = (k: string) => all.find(c => c.key === k)?.label ?? k;
  const setKeys = (arr: string[]) => upd(n => { n.cols[tab] = arr.length ? arr : ['name']; });
  const move = (i: number, dlt: number) => { const n = [...keys]; swap(n, i, dlt); setKeys(n); };
  return (
    <div className="set-card">
      <div className="set-card-h">
        <b>{label}</b>
        <button type="button" className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 11 }}
          onClick={() => upd(n => { delete n.cols[tab]; })}>기본값으로</button>
      </div>
      <div className="set-col"><input type="checkbox" checked disabled /><span>이름 <small>(항상 맨 앞)</small></span></div>
      {keys.map((k, i) => (
        <div className="set-col" key={k}>
          <input type="checkbox" checked onChange={() => setKeys(keys.filter(x => x !== k))} />
          <span>{labelOf(k)}</span>
          <button type="button" className="mv" onClick={() => move(i, -1)}>▲</button>
          <button type="button" className="mv" onClick={() => move(i, 1)}>▼</button>
        </div>
      ))}
      {hidden.map(c => (
        <div className="set-col off" key={c.key}>
          <input type="checkbox" checked={false} onChange={() => setKeys([...keys, c.key])} />
          <span>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- 직업(탭) 하나 ---------- */
function JobEditor({ d, j, ji, open, onToggle, upd, chars }: {
  d: OcConfig; j: JobDef; ji: number; open: boolean; onToggle: () => void;
  upd: (fn: (n: OcConfig) => void) => void; chars: OcChar[];
}) {
  const toast = useToast();
  const sortOpts = [{ value: '', label: '등록순' }, ...allCols(d, j.id).map(c => ({ value: c.key, label: c.label }))];
  return (
    <div className="set-card">
      <div className="set-card-h">
        <button type="button" className="set-fold" onClick={onToggle}>{open ? '▾' : '▸'}</button>
        <KInput value={j.label} onChange={e => upd(n => { n.jobs[ji].label = e.target.value; })} placeholder="탭 이름" />
        <small className="set-n">{chars.filter(c => c.job === j.id).length}명</small>
        <button type="button" className="mv" onClick={() => upd(n => swap(n.jobs, ji, -1))}>▲</button>
        <button type="button" className="mv" onClick={() => upd(n => swap(n.jobs, ji, 1))}>▼</button>
        <button type="button" className="mv del" onClick={() => {
          const used = chars.filter(c => c.job === j.id).length;
          if (used) { toast(`이 직업의 캐릭터 ${used}명이 있어요. 먼저 다른 직업으로 바꿔주세요`); return; }
          upd(n => { n.jobs.splice(ji, 1); delete n.cols[j.id]; });
        }}>✕</button>
      </div>
      {open && (
        <div className="set-body">
          <div className="set-sub">입력칸 <small>(이 직업을 고르면 글 쓸 때 나타나는 칸)</small></div>
          {j.fields.map((f, fi) => (
            <FieldEditor key={f.key} f={f}
              onChange={nf => upd(n => { n.jobs[ji].fields[fi] = nf; })}
              onMove={dlt => upd(n => swap(n.jobs[ji].fields, fi, dlt))}
              onDel={() => upd(n => { n.jobs[ji].fields.splice(fi, 1); })} />
          ))}
          <button type="button" className="btn btn-ghost" style={{ justifySelf: 'start' }}
            onClick={() => upd(n => {
              const key = uid('f');
              n.jobs[ji].fields.push({ key, label: '새 입력칸', type: 'text' });
              if (n.cols[j.id]) n.cols[j.id].push('x:' + key);   // 이 탭의 표에도 바로 보이게
            })}>＋ 입력칸 추가</button>

          <div className="set-sub" style={{ marginTop: 6 }}>이 탭의 기본 정렬</div>
          <div className="set-row">
            <div style={{ minWidth: 170 }}>
              <KSelect value={j.defaultSort?.key ?? ''} options={sortOpts}
                onChange={v => upd(n => {
                  if (!v) delete n.jobs[ji].defaultSort;
                  else n.jobs[ji].defaultSort = { key: v, dir: n.jobs[ji].defaultSort?.dir ?? 'asc' };
                })} />
            </div>
            {j.defaultSort && (
              <div style={{ minWidth: 220 }}>
                <KSelect value={j.defaultSort.dir}
                  options={[{ value: 'asc', label: '앞에서부터 (▲)' }, { value: 'desc', label: '뒤에서부터 · 높은 순 (▼)' }]}
                  onChange={v => upd(n => { n.jobs[ji].defaultSort!.dir = v as 'asc' | 'desc'; })} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 공통 항목 (모든 직업에 들어가는 칸) ---------- */
function CommonEditor({ d, upd }: { d: OcConfig; upd: (fn: (n: OcConfig) => void) => void }) {
  return (
    <div className="set-card">
      <div className="set-card-h"><b>공통 항목</b><small className="set-n">이름은 항상 있고, 나머지는 자유롭게 지우고 만들 수 있어요</small></div>
      <div className="set-body">
        {d.common.map((f, fi) => (
          <FieldEditor key={f.key} f={f}
            onChange={nf => upd(n => { n.common[fi] = nf; })}
            onMove={dlt => upd(n => swap(n.common, fi, dlt))}
            onDel={() => upd(n => { n.common.splice(fi, 1); })} />
        ))}
        <button type="button" className="btn btn-ghost" style={{ justifySelf: 'start' }}
          onClick={() => upd(n => {
            const key = uid('f');
            n.common.push({ key, label: '새 항목', type: 'text' });
            Object.keys(n.cols).forEach(t => n.cols[t].push('x:' + key));   // 저장해 둔 표 설정에도 바로 보이게
          })}>＋ 공통 항목 추가</button>
      </div>
    </div>
  );
}

/* ---------- 설정 화면 전체 ---------- */
export function OcSettings({ cfg, chars, onSave, onCancel }: {
  cfg: OcConfig; chars: OcChar[]; onSave: (c: OcConfig) => void; onCancel: () => void;
}) {
  const toast = useToast();
  const [d, setD] = useState<OcConfig>(() => clone(cfg));
  const [openJobs, setOpenJobs] = useState<string[]>(() => (cfg.jobs[0] ? [cfg.jobs[0].id] : []));
  const upd = (fn: (n: OcConfig) => void) => setD(s => { const n = clone(s); fn(n); return n; });
  const toggle = (id: string) => setOpenJobs(o => (o.includes(id) ? o.filter(x => x !== id) : [...o, id]));

  const save = () => {
    if (d.jobs.some(j => !j.label.trim())) { toast('탭 이름이 비어 있는 직업이 있어요'); return; }
    // 이름이 비어 있는 항목/선택지는 정리
    const clean = clone(d);
    const tidy = (fs: FieldDef[]) => {
      fs.forEach(f => {
        if (f.options) f.options = f.options.filter(o => o.label.trim());
        if (f.sub) f.sub = f.sub.filter(o => o.label.trim());
      });
      return fs.filter(f => f.label.trim());
    };
    clean.common = tidy(clean.common);
    clean.jobs.forEach(j => { j.fields = tidy(j.fields); });
    onSave(clean);
  };

  return (
    <div className="oc-set">
      <p className="set-note">
        <b>이름을 뺀 모든 항목</b>을 지우고, 이름을 바꾸고, 새로 만들 수 있어요. 선택지 이름을 바꿔도 이미 등록한 캐릭터는 그대로 따라가고,
        선택지를 <b>지우면</b> 그 값을 쓰던 캐릭터는 값이 비어요. 이미지는 선택지·값 옆의 <b>＋ 네모</b>를 눌러 올려요.
      </p>

      <h3 className="set-h">① 공통 항목</h3>
      <CommonEditor d={d} upd={upd} />

      <h3 className="set-h" style={{ marginTop: 18 }}>② 직업 탭과 직업별 입력칸</h3>
      <p className="set-note">직업 이름 왼쪽의 ▸ 를 누르면 펼쳐져요.</p>
      {d.jobs.map((j, ji) => (
        <JobEditor key={j.id} d={d} j={j} ji={ji} chars={chars} upd={upd}
          open={openJobs.includes(j.id)} onToggle={() => toggle(j.id)} />
      ))}
      <button type="button" className="btn btn-ghost" style={{ justifySelf: 'start' }}
        onClick={() => { const id = uid('j'); upd(n => { n.jobs.push({ id, label: '새 직업', fields: [] }); }); setOpenJobs(o => [...o, id]); }}>
        ＋ 직업(탭) 추가
      </button>

      <h3 className="set-h" style={{ marginTop: 18 }}>③ 탭마다 표에 보일 항목</h3>
      <p className="set-note">체크한 항목만 표에 보이고, ▲▼로 순서를 바꿔요. (캐릭터를 눌러서 펼치면 항목이 전부 보여요)</p>
      <ColsEditor d={d} tab="all" label="전체" upd={upd} />
      {d.jobs.map(j => <ColsEditor key={j.id} d={d} tab={j.id} label={j.label || '(이름 없음)'} upd={upd} />)}

      <div className="set-save">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>CANCEL</button>
        <button type="button" className="btn btn-dark" onClick={save}>SAVE</button>
      </div>
    </div>
  );
}
