'use client';
// 자캐 등록/수정 공용 폼 — 이름 · 직업 · 공통 항목 · (직업별 항목) · 소개
// 공통 항목과 직업별 항목은 모두 /oc/settings 에서 정한 대로 나타난다.
import React, { useState } from 'react';
import { OcChar, OcConfig, FieldDef, LEGACY_PROPS, SUB, jobOf, parseMD, rawVal } from '@/lib/ocStore';
import { KInput, KTextarea, KSelect } from '@/components/ui/Kit';
import { CropEditor, CropImg, CropValue } from '@/components/ui/CropEditor';
import { putBlob, useBlobUrl } from '@/lib/blobStore';
import { useToast } from '@/components/ui/Toast';

export type OcFormValue = Omit<OcChar, 'id'>;
type Setter = (key: string, v: string) => void;

function FieldInput({ f, x, set }: { f: FieldDef; x: Record<string, string>; set: Setter }) {
  const pick = (opts: { id: string; label: string }[] | undefined, value: string, onChange: (v: string) => void) => (
    <KSelect value={value} onChange={onChange}
      options={[{ value: '', label: '선택 안 함' }, ...(opts ?? []).map(o => ({ value: o.id, label: o.label }))]} />
  );
  if (f.type === 'select') {
    return <div><label className="k-label">{f.label}</label>{pick(f.options, x[f.key] ?? '', v => set(f.key, v))}</div>;
  }
  if (f.type === 'tier') {
    return (
      <div>
        <label className="k-label">{f.label}</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {pick(f.options, x[f.key] ?? '', v => set(f.key, v))}
          {pick(f.sub, x[f.key + SUB] ?? '', v => set(f.key + SUB, v))}
        </div>
      </div>
    );
  }
  if (f.type === 'date') {
    const raw = (x[f.key] ?? '').split('-');
    const ms = raw[0] ?? '', ds = raw[1] ?? '';
    const put = (nm: string, nd: string) => set(f.key, nm || nd ? `${nm}-${nd}` : '');
    const digits = (s: string) => s.replace(/\D/g, '').slice(0, 2);
    return (
      <div>
        <label className="k-label">{f.label}</label>
        <div className="inline">
          <KInput value={ms} inputMode="numeric" style={{ width: 60 }} onChange={e => put(digits(e.target.value), ds)} /><span>월</span>
          <KInput value={ds} inputMode="numeric" style={{ width: 60 }} onChange={e => put(ms, digits(e.target.value))} /><span>일</span>
        </div>
      </div>
    );
  }
  return (
    <div>
      <label className="k-label">{f.label}{f.type === 'number' && f.unit ? ` (${f.unit})` : ''}</label>
      <KInput value={x[f.key] ?? ''} inputMode={f.type === 'number' ? 'numeric' : undefined}
        onChange={e => set(f.key, f.type === 'number' ? e.target.value.replace(/[^\d.]/g, '') : e.target.value)} />
    </div>
  );
}

export function OcForm({ initial, cfg, onSave, onCancel }: {
  initial: OcChar | null;
  cfg: OcConfig;
  onSave: (v: OcFormValue) => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(initial?.name ?? '');
  const [job, setJob] = useState(initial && jobOf(cfg, initial.job) ? initial.job : cfg.jobs[0]?.id ?? '');
  // 예전 형식으로 저장된 공통 값도 폼에는 채워서 보여준다
  const [x, setX] = useState<Record<string, string>>(() => {
    const base = { ...(initial?.x ?? {}) };
    if (initial) cfg.common.forEach(f => { const v = rawVal(initial, f.key); if (v) base[f.key] = v; });
    return base;
  });
  const [memo, setMemo] = useState(initial?.memo ?? '');

  // 사진 — 새로 고른 파일이 있으면 그것, 없으면 저장돼 있던 것
  const [file, setFile] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState<string | undefined>();
  const savedUrl = useBlobUrl(initial?.img);
  const previewUrl = localUrl ?? savedUrl;
  const [crop, setCrop] = useState<CropValue | undefined>(initial?.crop);
  const [cropOpen, setCropOpen] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const def = jobOf(cfg, job);
  const jobFields = (def?.fields ?? []).filter(f => !cfg.common.some(c => c.key === f.key));
  const set: Setter = (k, v) => setX(s => ({ ...s, [k]: v }));

  const save = async () => {
    if (!name.trim()) { toast('이름을 입력해 주세요'); return; }
    const all = [...cfg.common, ...jobFields];
    for (const f of all) {
      if (f.type !== 'date') continue;
      const { m, d } = parseMD(x[f.key] ?? '');
      if (m && (m < 1 || m > 12)) { toast(`${f.label}의 월은 1~12 사이로 입력해 주세요`); return; }
      if (d && (d < 1 || d > 31)) { toast(`${f.label}의 일은 1~31 사이로 입력해 주세요`); return; }
    }
    // 공통 항목 + 선택한 직업의 항목 값만 저장 (직업을 바꾸며 남은 값은 버린다)
    const keep: Record<string, string> = {};
    all.forEach(f => {
      if (x[f.key]) keep[f.key] = x[f.key];
      if (f.type === 'tier' && x[f.key + SUB]) keep[f.key + SUB] = x[f.key + SUB];
    });
    // 예전 형식으로 저장돼 있던 값은 x 로 옮겨졌으니 지운다 (지금 설정에 있는 항목만)
    const legacyClear: Partial<OcChar> = {};
    cfg.common.forEach(f => (LEGACY_PROPS[f.key] ?? []).forEach(p => { (legacyClear as Record<string, undefined>)[p] = undefined; }));
    const img = file ? await putBlob(file) : initial?.img;
    onSave({ ...(initial ?? {}), ...legacyClear, name: name.trim(), job, x: keep, memo, img, crop: img ? crop : undefined } as OcFormValue);
  };

  return (
    <div className="oc-form">
      <div className="panel" style={{ padding: 24, display: 'grid', gap: 16 }}>
        <div className="picrow">
          <div className="pic" onClick={() => fileRef.current?.click()}>
            {previewUrl && <CropImg src={previewUrl} crop={crop} />}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) { setFile(f); setLocalUrl(URL.createObjectURL(f)); setCrop(undefined); setCropOpen(true); }
              e.target.value = '';
            }} />
          <div style={{ display: 'grid', gap: 6 }}>
            <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => fileRef.current?.click()}>
              ＋ 사진 {previewUrl ? '바꾸기' : '올리기'}
            </button>
            {previewUrl && (
              <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => setCropOpen(true)}>
                ✂ 위치·확대 조정
              </button>
            )}
          </div>
        </div>

        <div className="grid2">
          <div>
            <label className="k-label">이름</label>
            <KInput value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="k-label">직업 (하나만)</label>
            <KSelect value={job} onChange={setJob} options={cfg.jobs.map(j => ({ value: j.id, label: j.label }))} />
          </div>
        </div>

        {cfg.common.length > 0 && (
          <div className="grid3">
            {cfg.common.map(f => <FieldInput key={f.key} f={f} x={x} set={set} />)}
          </div>
        )}

        {def && jobFields.length > 0 && (
          <div className="jobbox">
            <b>{def.label} 정보</b>
            <div className="grid2">
              {jobFields.map(f => <FieldInput key={f.key} f={f} x={x} set={set} />)}
            </div>
          </div>
        )}

        <div>
          <label className="k-label">소개 — 마크다운 지원</label>
          <KTextarea value={memo} onChange={e => setMemo(e.target.value)} style={{ minHeight: 140 }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onCancel}>CANCEL</button>
          <button className="btn btn-dark" onClick={save}>{initial ? 'SAVE' : 'POST'}</button>
        </div>
      </div>

      {previewUrl && (
        <CropEditor open={cropOpen} src={previewUrl} aspect="1:1" initial={crop}
          onClose={() => setCropOpen(false)}
          onApply={c => { setCrop(c); setCropOpen(false); }} />
      )}
    </div>
  );
}
