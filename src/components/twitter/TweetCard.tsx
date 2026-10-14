'use client';
// 트윗 카드 — 상세(TweetCard) / 타임라인 한 줄(TweetRow) 공용 부품
import React, { useEffect, useRef, useState } from 'react';
import { useBlobUrl } from '@/lib/blobStore';
import { Lightbox } from '@/components/ui/Lightbox';
import { tweetWhen, type TweetData } from '@/lib/twitterStore';

const GRAY = 'var(--sub)';

export function TweetCss() {
  return (
    <style>{`
      .tw-row:hover{background:rgba(0,0,0,.03)}
      .tw-scroll{scrollbar-width:none}
      .tw-scroll::-webkit-scrollbar{display:none}
    `}</style>
  );
}

/* ---------- 아이콘 ---------- */
const I = ({ children, size = 18, fill = 'none' }: { children: React.ReactNode; size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>{children}</svg>
);
const IcReply = () => <I><path d="M20 12c0 4.4-3.6 8-8 8-1.2 0-2.3-.3-3.3-.7L4 20l1.2-4.1C4.4 14.6 4 13.3 4 12c0-4.4 3.6-8 8-8s8 3.6 8 8z" /></I>;
const IcRt = () => <I><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></I>;
const IcHeart = () => <I><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></I>;
const IcMark = () => <I><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></I>;
const IcShare = () => <I><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></I>;

function Lock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" style={{ flex: 'none', color: 'var(--ink)' }}>
      <path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <rect x="4.5" y="10" width="15" height="11.5" rx="2.5" fill="currentColor" />
    </svg>
  );
}
function Verified() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" style={{ flex: 'none' }}>
      <circle cx="12" cy="12" r="10.5" fill="#1d9bf0" />
      <path d="M7.4 12.6l3 3 6.2-6.6" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- 프사 ---------- */
export function Avatar({ src, size }: { src?: string; size: number }) {
  const url = useBlobUrl(src);
  const base: React.CSSProperties = { width: size, height: size, borderRadius: '50%', flex: 'none', display: 'block' };
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt="" draggable={false} style={{ ...base, objectFit: 'cover' }} />;
  return <div style={{ ...base, background: '#d9dce1' }} />;
}

/* ---------- 이미지 ---------- */
function TweetImg({ src, style, onLoad, onClick }: {
  src: string; style: React.CSSProperties; onLoad?: () => void; onClick?: () => void;
}) {
  const live = src.startsWith('blob:');   // 글쓰기 화면에서 방금 고른 파일
  const loaded = useBlobUrl(live ? undefined : src);
  const url = live ? src : loaded;
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt="" draggable={false} onLoad={onLoad} onClick={onClick} style={style} />;
  return <div style={{ ...style, width: style.width === 'auto' ? 200 : style.width, background: '#eceef1' }} />;
}

/** 1장: 가로 고정·세로는 사진 비율 / 2~4장: 세로 고정·가로는 제각각, 넘치면 화살표로 넘김 */
function TweetImages({ images, onOpen }: { images: string[]; onOpen: (i: number) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: false });

  const check = () => {
    const el = wrap.current;
    if (!el) return;
    setEdge({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(() => {
    check();
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [images.length]);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <TweetImg src={images[0]} onClick={() => onOpen(0)}
        style={{ width: '100%', height: 'auto', maxHeight: 560, objectFit: 'cover', display: 'block',
          borderRadius: 16, border: '1px solid var(--line)', cursor: 'pointer' }} />
    );
  }

  const go = (dir: number) => {
    const el = wrap.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };
  const arrow = (side: 'l' | 'r'): React.CSSProperties => ({
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', [side === 'l' ? 'left' : 'right']: 10,
    width: 36, height: 36, borderRadius: '50%', background: 'rgba(15,20,25,.75)', color: '#fff',
    display: 'grid', placeItems: 'center', fontSize: 18, lineHeight: 1,
  });

  return (
    <div style={{ position: 'relative' }}>
      <div ref={wrap} className="tw-scroll" onScroll={check}
        style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
        {images.map((s, i) => (
          <TweetImg key={i} src={s} onLoad={check} onClick={() => onOpen(i)}
            style={{ height: 280, width: 'auto', maxWidth: 'none', flex: 'none', display: 'block',
              borderRadius: 16, cursor: 'pointer' }} />
        ))}
      </div>
      {edge.l && <button type="button" style={arrow('l')} onClick={e => { e.stopPropagation(); go(-1); }}>‹</button>}
      {edge.r && <button type="button" style={arrow('r')} onClick={e => { e.stopPropagation(); go(1); }}>›</button>}
    </div>
  );
}

/* ---------- 하단 버튼 줄 (눌러도 반응 없음) ---------- */
function Actions({ d }: { d: TweetData }) {
  const item = (icon: React.ReactNode, n: string, color = GRAY) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color, fontSize: 13 }}>
      {icon}{n ? <span>{n}</span> : null}
    </span>
  );
  return (
    <div onClick={e => e.stopPropagation()}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'default' }}>
      {item(<IcReply />, d.replies)}
      {item(<IcRt />, d.rts, d.rtGray ? '#c5c8ce' : GRAY)}
      {item(<IcHeart />, d.likes)}
      {item(<IcMark />, d.marks)}
      {item(<IcShare />, '')}
    </div>
  );
}

const nickStyle: React.CSSProperties = { fontWeight: 800, color: 'var(--ink)' };

/* ---------- 트윗 하나 보기 카드 ---------- */
export function TweetCard({ d }: { d: TweetData }) {
  const [lb, setLb] = useState<number | null>(null);
  return (
    <div style={{ padding: '16px 18px 6px' }}>
      <TweetCss />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar src={d.avatar} size={48} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ ...nickStyle, fontSize: 15.5 }}>{d.nick}</span>
            {d.verified && <Verified />}
            {d.locked && <Lock />}
          </div>
          <div style={{ fontSize: 14, color: 'var(--faint)' }}>{d.handle && `@${d.handle}`}</div>
        </div>
      </div>
      {d.text && (
        <div style={{ marginTop: 12, fontSize: 17, lineHeight: 1.45, whiteSpace: 'pre-wrap',
          wordBreak: 'break-word', color: 'var(--ink)' }}>{d.text}</div>
      )}
      {d.images.length > 0 && <div style={{ marginTop: 12 }}><TweetImages images={d.images} onOpen={setLb} /></div>}
      <div style={{ marginTop: 12, fontSize: 14, color: 'var(--faint)' }}>{tweetWhen(d.date, d.time)}</div>
      <div style={{ borderTop: '1px solid var(--line)', margin: '12px 0 0', padding: '12px 0' }}>
        <Actions d={d} />
      </div>
      {lb !== null && <Lightbox srcs={d.images} index={lb} onClose={() => setLb(null)} />}
    </div>
  );
}

/* ---------- 타임라인 한 줄 ---------- */
export function TweetRow({ d, onOpen }: { d: TweetData; onOpen: () => void }) {
  const [lb, setLb] = useState<number | null>(null);
  return (
    <div className="tw-row" onClick={onOpen}
      style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
      <Avatar src={d.avatar} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, fontSize: 14.5 }}>
          <span style={{ ...nickStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '0 1 auto' }}>{d.nick}</span>
          {d.verified && <Verified />}
          {d.locked && <Lock />}
          <span style={{ color: 'var(--faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '0 1 auto' }}>
            {d.handle && `@${d.handle}`}
          </span>
          {d.rel && <span style={{ color: 'var(--faint)', flex: 'none' }}>· {d.rel}</span>}
        </div>
        {d.text && (
          <div style={{ marginTop: 2, fontSize: 15, lineHeight: 1.4, whiteSpace: 'pre-wrap',
            wordBreak: 'break-word', color: 'var(--ink)' }}>{d.text}</div>
        )}
        {d.images.length > 0 && <div style={{ marginTop: 12 }}><TweetImages images={d.images} onOpen={setLb} /></div>}
        <div style={{ marginTop: 10 }}><Actions d={d} /></div>
      </div>
      {lb !== null && (
        <div onClick={e => e.stopPropagation()}>
          <Lightbox srcs={d.images} index={lb} onClose={() => setLb(null)} />
        </div>
      )}
    </div>
  );
}
