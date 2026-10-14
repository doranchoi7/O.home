'use client';
// 트윗 글쓰기·수정 공용 폼 — tweet이 있으면 수정, 없으면 새 글
import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalList, newId } from '@/lib/postStore';
import { TWITTER_KEY, normTime, type Tweet, type TweetData } from '@/lib/twitterStore';
import { MAIN_SEC, secStamp, sectionHref, useSectionParam } from '@/lib/sectionStore';
import { useTypeCats } from '@/lib/boardTypeStore';
import { putBlob } from '@/lib/blobStore';
import { KInput, KTextarea, KSelect, KLabel, KCheck, KDate } from '@/components/ui/Kit';
import { useToast } from '@/components/ui/Toast';
import { TweetCard, TweetCss } from '@/components/twitter/TweetCard';

type Img = { ref?: string; file?: File; preview?: string };
const srcOf = (i: Img) => i.ref ?? i.preview ?? '';
const today = () => new Date().toISOString().slice(0, 10);

export function TweetForm({ tweet }: { tweet?: Tweet }) {
  const router = useRouter();
  const toast = useToast();
  const [all, setAll] = useLocalList<Tweet>(TWITTER_KEY, []);
  const sec = useSectionParam('twitter');
  const secId = tweet ? (tweet.secId ?? MAIN_SEC) : sec.id;
  const { catsOf } = useTypeCats();
  const cats = catsOf('twitter', secId);

  const [avatar, setAvatar] = useState<Img | null>(tweet?.avatar ? { ref: tweet.avatar } : null);
  const [nick, setNick] = useState(tweet?.nick ?? '');
  const [verified, setVerified] = useState(tweet?.verified ?? false);
  const [locked, setLocked] = useState(tweet?.locked ?? false);
  const [handle, setHandle] = useState(tweet?.handle ?? '');
  const [text, setText] = useState(tweet?.text ?? '');
  const [images, setImages] = useState<Img[]>((tweet?.images ?? []).map(r => ({ ref: r })));
  const [date, setDate] = useState(tweet?.date ?? today());
  const [time, setTime] = useState(tweet?.time ?? '');
  const [rel, setRel] = useState(tweet?.rel ?? '');
  const [replies, setReplies] = useState(tweet?.replies ?? '');
  const [rts, setRts] = useState(tweet?.rts ?? '');
  const [likes, setLikes] = useState(tweet?.likes ?? '');
  const [marks, setMarks] = useState(tweet?.marks ?? '');
  const [rtGray, setRtGray] = useState(tweet?.rtGray ?? false);
  const [catId, setCatId] = useState(tweet?.catId ?? '');
  const [vis, setVis] = useState<Tweet['visibility']>(tweet?.visibility ?? 'public');
  const [busy, setBusy] = useState(false);
  const avRef = useRef<HTMLInputElement>(null);
  const imRef = useRef<HTMLInputElement>(null);

  const cleanHandle = handle.trim().replace(/^@+/, '');

  const pickAvatar = (f?: File) => {
    if (f && f.type.startsWith('image/')) setAvatar({ file: f, preview: URL.createObjectURL(f) });
  };
  const addImages = (list: FileList | null) => {
    if (!list) return;
    const add = Array.from(list).filter(f => f.type.startsWith('image/'))
      .map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setImages(cur => [...cur, ...add].slice(0, 4));
  };

  const back = tweet ? `/twitter/${tweet.id}` : sectionHref('twitter', secId);

  const save = async () => {
    if (busy) return;
    if (!nick.trim()) { toast('닉네임을 입력해 주세요'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast('날짜를 입력해 주세요'); return; }
    if (time.trim() && !normTime(time)) { toast('시간은 19:03 처럼 입력해 주세요'); return; }
    setBusy(true);
    try {
      const avatarRef = avatar ? (avatar.file ? await putBlob(avatar.file) : avatar.ref) : undefined;
      const imgRefs: string[] = [];
      for (const im of images) imgRefs.push(im.file ? await putBlob(im.file) : (im.ref as string));
      const data: TweetData = {
        avatar: avatarRef, nick: nick.trim(), verified, locked, handle: cleanHandle, text, images: imgRefs,
        date, time: normTime(time), rel: rel.trim(),
        replies: replies.trim(), rts: rts.trim(), likes: likes.trim(), marks: marks.trim(), rtGray,
      };
      if (tweet) {
        setAll(all.map(x => x.id === tweet.id ? { ...x, ...data, catId: catId || undefined, visibility: vis } : x));
        toast('저장되었습니다');
      } else {
        setAll([{ id: newId(), ...secStamp(secId), ...data, catId: catId || undefined, visibility: vis, created: Date.now() }, ...all]);
        toast('등록되었습니다');
      }
      router.push(back);
    } catch {
      toast('저장하지 못했습니다. 다시 시도해 주세요');
      setBusy(false);
    }
  };

  const preview: TweetData = {
    avatar: avatar ? srcOf(avatar) : undefined,
    nick: nick || '닉네임', verified, locked, handle: cleanHandle || '아이디', text,
    images: images.map(srcOf), date, time: normTime(time), rel,
    replies, rts, likes, marks, rtGray,
  };

  const num = (v: string, set: (s: string) => void, label: string) => (
    <div style={{ flex: 1, minWidth: 70 }}>
      <KLabel>{label}</KLabel>
      <KInput value={v} onChange={e => set(e.target.value)} />
    </div>
  );

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <TweetCss />
      <div className="panel" style={{ padding: 26 }}>
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <KLabel>Profile</KLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button type="button" onClick={() => avRef.current?.click()}
                style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: '#d9dce1', padding: 0, flex: 'none' }}>
                {avatar && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar.preview ?? avatar.ref} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                )}
              </button>
              <button type="button" className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 10.5 }}
                onClick={() => avRef.current?.click()}>UPLOAD</button>
              {avatar && (
                <button type="button" className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 10.5 }}
                  onClick={() => setAvatar(null)}>REMOVE</button>
              )}
              <input ref={avRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { pickAvatar(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
          </div>

          <div>
            <KLabel>Nickname</KLabel>
            <KInput value={nick} onChange={e => setNick(e.target.value)} />
            <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
              <KCheck label="인증 배지" checked={verified} onChange={setVerified} />
              <KCheck label="자물쇠" checked={locked} onChange={setLocked} />
            </div>
          </div>

          <div>
            <KLabel>ID (@ 없이)</KLabel>
            <KInput value={handle} onChange={e => setHandle(e.target.value)} />
          </div>

          <div>
            <KLabel>Text</KLabel>
            <KTextarea rows={4} value={text} onChange={e => setText(e.target.value)} placeholder="본문" />
          </div>

          <div>
            <KLabel>Images (최대 4장)</KLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {images.map((im, i) => (
                <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.preview ?? im.ref} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, display: 'block' }} />
                  <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                      background: '#1d2025', color: '#fff', fontSize: 11, display: 'grid', placeItems: 'center' }}>✕</button>
                </div>
              ))}
              {images.length < 4 && (
                <button type="button" onClick={() => imRef.current?.click()}
                  style={{ width: 72, height: 72, borderRadius: 10, border: '1px dashed #a9adb6', color: 'var(--faint)', fontSize: 22 }}>＋</button>
              )}
              <input ref={imRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={e => { addImages(e.target.files); e.target.value = ''; }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ width: 160 }}>
              <KLabel>Date</KLabel>
              <KDate value={date} onChange={setDate} />
            </div>
            <div style={{ width: 110 }}>
              <KLabel>Time (24h)</KLabel>
              <KInput value={time} onChange={e => setTime(e.target.value)} placeholder="19:03" />
            </div>
            <div style={{ width: 130 }}>
              <KLabel>상대 시간</KLabel>
              <KInput value={rel} onChange={e => setRel(e.target.value)} placeholder="2시간" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {num(replies, setReplies, '답글')}
            {num(rts, setRts, '알티')}
            {num(likes, setLikes, '마음')}
            {num(marks, setMarks, '북마크')}
          </div>
          <KCheck label="알티 아이콘 연한 회색" checked={rtGray} onChange={setRtGray} />

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {cats.length > 0 && (
              <div>
                <KLabel>Category</KLabel>
                <KSelect minWidth={130} value={catId} onChange={setCatId}
                  options={[{ value: '', label: '분류 없음' }, ...cats.map(c => ({ value: c.id, label: c.label }))]} />
              </div>
            )}
            <div>
              <KLabel>Visibility</KLabel>
              <KSelect minWidth={130} value={vis} onChange={v => setVis(v as Tweet['visibility'])}
                options={[
                  { value: 'public', label: '전체공개' },
                  { value: 'member', label: '멤버공개' },
                  { value: 'private', label: '비공개' },
                ]} />
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ padding: 0, marginTop: 16 }}>
        <TweetCard d={preview} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={() => router.push(back)}>CANCEL</button>
        <button className="btn btn-dark" disabled={busy} onClick={save}>{tweet ? 'SAVE' : 'POST'}</button>
      </div>
    </div>
  );
}
