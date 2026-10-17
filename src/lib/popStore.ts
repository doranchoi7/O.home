// 팝 백업 게시판 데이터 타입 (카톡 백업과 완전히 별개)
// 저장은 useLocalList(POP_KEY) → 방 하나 = 문서 하나
import { newId } from './postStore';
import { mkRoomBase, type RoomBase } from './chatBoard';

export const POP_KEY = 'ohome.pop.v1';
export const MAX_PHOTOS = 30;
export const POP_COLORS = { bg: '#1d2025', leftBg: '#ffffff', rightBg: '#7d8fbf' };
export const POP_RATIO = '9 / 16';   // 채팅창 화면 비율 (가로 / 세로)

/** 대화 흐름의 한 항목 — 날짜 구분선 / 채팅 / 사진 묶음 */
export interface PopItem {
  id: string;
  type: 'date' | 'chat' | 'photos';
  date: string;              // date: YYYY-MM-DD
  side: 'left' | 'right';    // left = 상대, right = 나
  name: string;              // 상대 이름 (right는 안 씀)
  time: string;              // 오후 7:02 처럼 직접 입력
  text: string;
  images: string[];
}

export interface PopRoom extends RoomBase {
  leftBg: string;            // 상대 말풍선색
  rightBg: string;           // 내 말풍선색
  title: string;             // 상단 고정 헤더의 이름 (예: 최현준임)
  ddayLabel: string;         // 헤더 부제 문구 (예: 다시 또 만나)
  ddayDate: string;          // 디데이 기준 날짜 YYYY-MM-DD
  bgImage: string;           // 배경 이미지 참조 — 없으면 ''
  bgFocus: { x: number; y: number };   // 배경 크롭 위치 (0~100)
  ink: 'white' | 'black';    // 이름·체크마크·시간 글씨색
  items: PopItem[];
}

export function mkPopRoom(): PopRoom {
  return {
    ...mkRoomBase('새 채팅방', POP_COLORS.bg),
    leftBg: POP_COLORS.leftBg,
    rightBg: POP_COLORS.rightBg,
    title: '',
    ddayLabel: '다시 또 만나',
    ddayDate: '',
    bgImage: '',
    bgFocus: { x: 50, y: 50 },
    ink: 'white',
    items: [],
  };
}

/** 새 항목 — 직전 채팅의 보낸 쪽·이름·시각을 이어받아 연속 입력이 빠르다 */
export function mkPopItem(type: PopItem['type'], prev?: PopItem): PopItem {
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
