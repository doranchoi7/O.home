// 푸슝 백업 게시판 데이터 타입
// 저장은 useLocalList(PUSHOONG_KEY) → Firestore 'pushoong' 컬렉션 (방 하나 = 문서 하나)
import { newId } from './postStore';
import { mkRoomBase, type RoomBase } from './chatBoard';

export const PUSHOONG_KEY = 'ohome.pushoong.v1';
export const PUSHOONG_COLORS = { bg: '#f1f2f4' };

/** 말풍선 하나 — 방 주인(왼쪽, 프사 있음) / 익명 질문(오른쪽, 프사 없음)
 *  사진은 하나씩 올리고, 같은 말풍선 안 사진 아래에 글을 함께 쓸 수 있다 */
export interface PushoongItem {
  id: string;
  side: 'owner' | 'anon';
  text: string;
  image: string;             // 이미지 참조 — 없으면 ''
}

export interface PushoongRoom extends RoomBase {
  items: PushoongItem[];
}

export function mkPushoongRoom(): PushoongRoom {
  return { ...mkRoomBase('새 질문함', PUSHOONG_COLORS.bg), items: [] };
}

export function mkPushoongItem(side: PushoongItem['side']): PushoongItem {
  return { id: newId(), side, text: '', image: '' };
}
