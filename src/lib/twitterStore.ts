// 트윗 게시판 데이터 타입 + 날짜/정렬 도우미
// 저장은 useLocalList(TWITTER_KEY) → Firestore 'twitter' 컬렉션 (이미 연결돼 있음)

export interface TweetData {
  avatar?: string;        // 프사 (이미지 참조)
  nick: string;
  verified: boolean;      // 인증 배지
  locked: boolean;        // 자물쇠
  handle: string;         // @ 없이 저장
  text: string;
  images: string[];       // 최대 4장
  date: string;           // 정렬 기준 날짜 YYYY-MM-DD
  time: string;           // 24시간 HH:MM (빈칸 가능)
  rel: string;            // 타임라인 상대 시간 (예: 2시간) — 빈칸이면 숨김
  replies: string;        // 숫자는 문자열 — "2.1천" 같은 표기도 가능
  rts: string;
  likes: string;
  marks: string;
  rtGray: boolean;        // 알티 아이콘 연한 회색
}

export interface Tweet extends TweetData {
  id: string;
  secId?: string;
  catId?: string;
  visibility: 'public' | 'member' | 'private';
  created: number;        // 입력 순서 (정렬 마지막 기준)
}

export const TWITTER_KEY = 'ohome.twitter.v1';

/** '9:03' → '09:03', 형식이 틀리면 '' */
export function normTime(v: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec((v ?? '').trim());
  if (!m || +m[1] > 23 || +m[2] > 59) return '';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/** 표시용: 오후 7:03 · 2026년 10월 13일 */
export function tweetWhen(date: string, time?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const d = m ? `${m[1]}년 ${+m[2]}월 ${+m[3]}일` : date;
  const t = normTime(time ?? '');
  if (!t) return d;
  const h = +t.slice(0, 2);
  return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${t.slice(3)} · ${d}`;
}

/** 최신이 위 — 날짜 → 시간 → 나중에 입력한 순 */
export function sortTweets(list: Tweet[]): Tweet[] {
  const key = (t: Tweet) => `${t.date} ${normTime(t.time) || '00:00'}`;
  return [...list].sort((a, b) => {
    const k = key(b).localeCompare(key(a));
    return k !== 0 ? k : (b.created ?? 0) - (a.created ?? 0);
  });
}
