// 포토카드 게시판 데이터 — 좋아하는 포토카드를 이미지만 세로 카드로 모아 두는 곳
// 저장: useLocalList(PHOTOCARD_KEY) → backend/types.ts의 COLLECTION_OF에서 Firestore 'photocard' 컬렉션으로 연결
import type { Visibility } from './charStore';

export interface PhotocardItem {
  /** 소속 섹션 — 여러 개로 만들었을 때. 기본 섹션이면 없음 */
  secId?: string;
  id: string;
  /** 이미지 파일 id (blobStore) */
  imgId: string;
  /** 카드에 보일 부분 — 0~100(%). 50/50이면 가운데 */
  focus: { x: number; y: number };
  /** 탭(분류) id — 환경설정 > 포토카드 탭에서 만든 것. 없으면 '' */
  catId: string;
  date: string;          // ISO
  authorId: string;
  visibility: Visibility;
}

export const PHOTOCARD_KEY = 'ohome.photocard.v1';
export const PHOTOCARD_SEED: PhotocardItem[] = [];

/* ---- 카드 모양은 여기 값만 바꾸면 된다 ---- */
/** 카드 비율 — 포토카드 표준(55×85mm)은 11:17 */
export const PHOTOCARD_RATIO = '11 / 17';
/** 카드 최소 너비(px) — 앨범과 같은 너비 */
export const PHOTOCARD_CARD_MIN = 132;
/** 한 페이지에 보일 카드 수 */
export const PHOTOCARD_PER = 36;
/** 카드 모서리 — 11:17에서 네 모서리가 같은 둥글기로 보이게 */
export const PHOTOCARD_RADIUS = '5% / 3.24%';
