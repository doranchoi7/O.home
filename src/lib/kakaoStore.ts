// 카톡 백업 게시판 데이터 타입
// 저장은 useLocalList(KAKAO_KEY) → Firestore 'kakaotalk' 컬렉션 (방 하나 = 문서 하나)
import { newId } from './postStore';
import { mkRoomBase, type RoomBase } from './chatBoard';

export const KAKAO_KEY = 'ohome.kakaotalk.v1';
export const MAX_PHOTOS = 30;                       // 사진 묶음 한 번에 최대 30장
export const KAKAO_COLORS = { bg: '#b2c7d9', leftBg: '#ffffff', rightBg: '#fee500' };

/** 대화 흐름의 한 항목 — 날짜 구분선 / 채팅 / 사진 묶음
 *  (Firestore는 undefined 값을 못 받아서 안 쓰는 칸도 빈 값으로 채워 둔다) */
export interface KakaoItem {
  id: string;
  type: 'date' | 'chat' | 'photos';
  date: string;              // date: YYYY-MM-DD
  side: 'left' | 'right';    // left = 상대, right = 나
  name: string;              // 상대 이름 (right는 안 씀)
  time: string;              // 오후 12:23 처럼 직접 입력
  text: string;              // chat
  images: string[];          // photos (최대 30)
}

export interface KakaoRoom extends RoomBase {
  leftBg: string;            // 상대 말풍선색
  rightBg: string;           // 내 말풍선색
  items: KakaoItem[];
}

export function mkKakaoRoom(): KakaoRoom {
  return {
    ...mkRoomBase('새 채팅방', KAKAO_COLORS.bg),
    leftBg: KAKAO_COLORS.leftBg,
    rightBg: KAKAO_COLORS.rightBg,
    items: [],
  };
}

/** 새 항목 — prev(직전 채팅)가 있으면 보낸 쪽·이름·시각을 이어받아 연속 입력이 빠르다 */
export function mkKakaoItem(type: KakaoItem['type'], prev?: KakaoItem): KakaoItem {
  return {
    id: newId(),
    type,
    date: '',
    side: prev?.side ?? 'left',
    name: prev?.name ?? '',
    time: prev?.time ?? '',
    text: '',
    images: [],
  };
}
