'use client';
// 자캐 등록/수정 공용 폼 — 직업을 고르면 그 직업의 입력칸(JOBS)이 나타난다
import React, { useState } from 'react';
import { OcChar, OcConfig, BLOODS, FieldDef, SUB, jobOf } from '@/lib/ocStore';
import { KInput, KTextarea, KSelect } from '@/components/ui/Kit';
import { CropEditor, CropImg, CropValue } from '@/components/ui/CropEditor';
import { putBlob, useBlobUrl } from '@/lib/blobStore';
import { useToast } from '@/components/ui/Toast';

export type OcFormValue = Omit<OcChar, 'id'>;

const toNum = (s: string): number | undefined => {
  if (s.trim() === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

type Setter = (key: string, v: string) => void;

function JobField({ f, x, set }: { f: FieldDef; x: Record<string, string>; set: Setter }) {
  const pick = (opts: { id: string; label: string }[] | undefined, value: string, onChange: (v: string) => void) => (
    <KSelect value={value} onChange={onChange}
      options={[{ value: '', label: '선택 안 함' }, ...(opts ?? []).map(o => ({ value: o.id, label: o.label }))]} />
  );
  if (f.type === 'select') {
    return (
      <div>
        <label className="k-label">{f.label}</label>
        {pick(f.options, x[f.key] ?? '', v => set(f.key, v))}
      </div>
    );
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
  return (
    <div>
      <label className="k-label">{f.label}{f.unit ? ` (${f.unit})` : ''}</label>
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
  const [age, setAge] = useState(initial?.age?.toString() ?? '');
  const [bm, setBm] = useState(initial?.birthM?.toString() ?? '');
  const [bd, setBd] = useState(initial?.birthD?.toString() ?? '');
  const [height, setHeight] = useState(initial?.height?.toString() ?? '');
  const [weight, setWeight] = useState(initial?.weight?.toString() ?? '');
  const [blood, setBlood] = useState(initial?.blood ?? '');
  const [x, setX] = useState<Record<string, string>>(initial?.x ?? {});
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

  const save = async () => {
    if (!name.trim()) { toast('이름을 입력해 주세요'); return; }
    const m = toNum(bm), d = toNum(bd);
    if (m !== undefined && (m < 1 || m > 12)) { toast('생일의 월은 1~12 사이로 입력해 주세요'); return; }
    if (d !== undefined && (d < 1 || d > 31)) { toast('생일의 일은 1~31 사이로 입력해 주세요'); return; }
    // 선택한 직업의 항목 값만 저장 (직업을 바꾸며 남은 값은 버린다)
    const keep: Record<string, string> = {};
    (def?.fields ?? []).forEach(f => {
      if (x[f.key]) keep[f.key] = x[f.key];
      if (f.type === 'tier' && x[f.key + SUB]) keep[f.key + SUB] = x[f.key + SUB];
    });
    const img = file ? await putBlob(file) : initial?.img;
    onSave({
      name: name.trim(), job,
      age: toNum(age), birthM: m, birthD: d, height: toNum(height), weight: toNum(weight),
      blood: blood || undefined, x: keep, memo, img, crop: img ? crop : undefined,
    });
  };

  const num = (setter: (s: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => setter(e.target.value.replace(/[^\d.]/g, ''));

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

        <div className="grid3">
          <div>
            <label className="k-label">나이</label>
            <KInput value={age} inputMode="numeric" onChange={num(setAge)} />
          </div>
          <div>
            <label className="k-label">생일</label>
            <div className="inline">
              <KInput value={bm} inputMode="numeric" onChange={num(setBm)} style={{ width: 60 }} /><span>월</span>
              <KInput value={bd} inputMode="numeric" onChange={num(setBd)} style={{ width: 60 }} /><span>일</span>
            </div>
          </div>
          <div>
            <label className="k-label">혈액형</label>
            <KSelect value={blood} onChange={setBlood}
              options={[{ value: '', label: '선택 안 함' }, ...BLOODS.map(b => ({ value: b, label: b + '형' }))]} />
          </div>
          <div>
            <label className="k-label">키 (cm)</label>
            <KInput value={height} inputMode="numeric" onChange={num(setHeight)} />
          </div>
          <div>
            <label className="k-label">체중 (kg)</label>
            <KInput value={weight} inputMode="numeric" onChange={num(setWeight)} />
          </div>
        </div>

        {def && def.fields.length > 0 && (
          <div className="jobbox">
            <b>{def.label} 정보</b>
            <div className="grid2">
              {def.fields.map(f => (
                <JobField key={f.key} f={f} x={x} set={(k, v) => setX(s => ({ ...s, [k]: v }))} />
              ))}
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
