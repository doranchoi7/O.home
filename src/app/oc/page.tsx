'use client';
// 자캐 목록 — 직업 탭 + 항목(열) 클릭 정렬
//  · 탭·입력칸·선택지·표에 보일 항목은 /oc/settings (관리자 전용) 에서 정한다
//  · 기본은 등록순 (탭마다 기본 정렬을 따로 정할 수 있음)
//  · 항목 이름을 누르면 정렬 → 다시 누르면 반대 방향
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { renderBody } from '@/lib/sanitize';
import { useBlobUrl } from '@/lib/blobStore';
import { CroppedBlobImg } from '@/components/ui/CropEditor';
import { ConfirmModal } from '@/components/ui/Modal';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';
import {
  OC_KEY, OC_SEED, OcChar, OcConfig, CellVal, Sort,
  useOcConfig, jobOf, allCols, visibleCols, cell, firstDir, sortChars, defaultSortOf,
} from '@/lib/ocStore';

/** 선택지 이미지 (표에서 값 왼쪽에 붙는 작은 아이콘) */
function Ico({ id }: { id: string }) {
  const url = useBlobUrl(id);
  return url ? <img className="oc-ico" src={url} alt="" /> : null;
}
function Val({ v }: { v: CellVal }) {
  return <span className="oc-val">{v.imgs.map((id, i) => <Ico key={id + i} id={id} />)}{v.text}</span>;
}

function Detail({ c, cfg, isAdmin, onEdit, onDelete }: {
  c: OcChar; cfg: OcConfig; isAdmin: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const html = useMemo(() => renderBody('md', c.memo || ''), [c.memo]);
  // 상세에는 그 캐릭터 직업의 항목을 전부 보여준다 (표에서 숨긴 항목도)
  const cols = allCols(cfg, c.job).filter(cl => cl.key !== 'name');
  return (
    <div className="oc-detail-in">
      {c.img && <div className="pic"><CroppedBlobImg fileRef={c.img} crop={c.crop} /></div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <dl>
          <dt>직업</dt><dd>{jobOf(cfg, c.job)?.label ?? '-'}</dd>
          {cols.map(cl => {
            const v = cell(c, cl, cfg);
            return v.text ? <React.Fragment key={cl.key}><dt>{cl.label}</dt><dd><Val v={v} /></dd></React.Fragment> : null;
          })}
        </dl>
        {c.memo && <div className="memo post-body" dangerouslySetInnerHTML={{ __html: html }} />}
        {isAdmin && (
          <div className="act">
            <button className="btn btn-ghost" style={{ padding: '4px 11px', fontSize: 10.5 }} onClick={onEdit}>EDIT</button>
            <button className="btn btn-ghost" style={{ padding: '4px 11px', fontSize: 10.5 }} onClick={onDelete}>DELETE</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OcPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [cfg] = useOcConfig();
  const [chars, setChars, loaded] = useLocalList<OcChar>(OC_KEY, OC_SEED);
  const [tabSel, setTab] = useState<string>('all');
  const [sort, setSort] = useState<Sort | null>(null);   // null = 이 탭의 기본 정렬
  const [openId, setOpenId] = useState<string | null>(null);
  const [delFor, setDelFor] = useState<OcChar | null>(null);

  const tab = tabSel === 'all' || jobOf(cfg, tabSel) ? tabSel : 'all';   // 지워진 직업 탭이면 전체로
  const cols = visibleCols(cfg, tab);
  const lookup = allCols(cfg, tab);
  const eff = sort ?? defaultSortOf(cfg, tab);
  const inTab = chars.filter(c => tab === 'all' || c.job === tab);
  const rows = sortChars(inTab, lookup, eff, cfg);
  const count = (id: string) => chars.filter(c => id === 'all' || c.job === id).length;

  const pickTab = (id: string) => { setTab(id); setSort(null); setOpenId(null); };
  const clickCol = (key: string) => {
    const col = lookup.find(c => c.key === key);
    if (eff.key === key && sort) setSort({ key, dir: eff.dir === 'asc' ? 'desc' : 'asc' });   // 같은 항목을 또 누르면 반대로
    else setSort({ key, dir: col ? firstDir(col) : 'asc' });
  };
  const arrow = (key: string) => (eff.key === key && (sort || key !== 'reg') ? (eff.dir === 'asc' ? '▲' : '▼') : '');

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle>OC LIST</PageTitle>
        <EditableDesc k="oc-desc" def="자캐 목록 — 항목 이름을 누르면 정렬돼요" />
      </div>

      <div className="oc-toolrow">
        <div className="tag-row">
          {[{ id: 'all', label: '전체' }, ...cfg.jobs].map(j => (
            <div key={j.id} className={`tag ${tab === j.id ? 'on' : ''}`} onClick={() => pickTab(j.id)}>
              {j.label} <small>{count(j.id)}</small>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {sort && <div className="oc-sortinfo"><button onClick={() => setSort(null)}>↺ 기본순</button></div>}
          {isAdmin && <button className="btn btn-ghost" onClick={() => router.push('/oc/settings')}>⚙ 설정</button>}
          {isAdmin && <button className="btn btn-dark" onClick={() => router.push('/oc/write')}>＋ WRITE</button>}
        </div>
      </div>

      <div className="panel" style={{ padding: '6px 10px' }}>
        <div className="oc-scroll">
          <table className="oc-table">
            <thead>
              <tr>
                <th className={eff.key === 'reg' && sort ? 'on' : ''} onClick={() => clickCol('reg')} title="등록순">
                  No<span className="ar">{arrow('reg')}</span>
                </th>
                {cols.map(cl => (
                  <th key={cl.key} className={eff.key === cl.key ? 'on' : ''} onClick={() => clickCol(cl.key)}>
                    {cl.label}<span className="ar">{arrow(cl.key)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(c => {
                const opened = openId === c.id;
                return (
                  <React.Fragment key={c.id}>
                    <tr className={`row ${opened ? 'open' : ''}`} onClick={() => setOpenId(opened ? null : c.id)}>
                      <td className="no">{chars.indexOf(c) + 1}</td>
                      {cols.map(cl => {
                        if (cl.key === 'name') {
                          return (
                            <td key={cl.key}>
                              <div className="oc-name">
                                <span className="oc-av">{c.img && <CroppedBlobImg fileRef={c.img} crop={c.crop} />}</span>
                                {c.name}
                              </div>
                            </td>
                          );
                        }
                        const v = cell(c, cl, cfg);
                        return <td key={cl.key} className={v.text ? '' : 'empty'}>{v.text ? <Val v={v} /> : '-'}</td>;
                      })}
                    </tr>
                    {opened && (
                      <tr className="oc-detail">
                        <td colSpan={cols.length + 1}>
                          <Detail c={c} cfg={cfg} isAdmin={isAdmin}
                            onEdit={() => router.push(`/oc/${c.id}/edit`)} onDelete={() => setDelFor(c)} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {loaded && rows.length === 0 && <div className="oc-empty">등록된 캐릭터가 없어요</div>}
      </div>

      <ConfirmModal open={delFor !== null} title="캐릭터를 삭제하시겠습니까?"
        body={`"${delFor?.name}" — 삭제하면 복구할 수 없습니다.`}
        onClose={() => setDelFor(null)}
        buttons={[
          { label: 'DELETE', kind: 'accent', onClick: () => { setChars(chars.filter(x => x.id !== delFor!.id)); setDelFor(null); setOpenId(null); } },
          { label: 'CANCEL', kind: 'ghost', onClick: () => setDelFor(null) },
        ]} />
    </section>
  );
}
