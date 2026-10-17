// 앨범 게시판 데이터 — 좋아하는 그림을 이미지만 작은 카드로 모아 두는 곳
// 저장: useLocalList(ALBUM_KEY) → backend/types.ts의 COLLECTION_OF에서 Firestore 'album' 컬렉션으로 연결
import type { Visibility } from './charStore';

export interface AlbumItem {
  /** 소속 섹션 — 여러 개로 만들었을 때. 기본 섹션이면 없음 */
  secId?: string;
  id: string;
  /** 이미지 파일 id (blobStore) */
  imgId: string;
  /** 카드에 보일 부분 — 0~100(%). 50/50이면 가운데 */
  focus: { x: number; y: number };
  /** 탭(분류) id — 환경설정 > 앨범 탭에서 만든 것. 없으면 '' */
  catId: string;
  date: string;          // ISO
  authorId: string;
  visibility: Visibility;
}

export const ALBUM_KEY = 'ohome.album.v1';
export const ALBUM_SEED: AlbumItem[] = [];

/* ---- 카드 모양은 여기 세 값만 바꾸면 된다 ---- */
/** 카드 비율 — 정사각형 '1 / 1', 세로형 '3 / 4', 가로형 '4 / 3' */
export const ALBUM_RATIO = '1 / 1';
/** 카드 최소 너비(px) — 작을수록 한 줄에 많이 들어간다 */
export const ALBUM_CARD_MIN = 132;
/** 한 페이지에 보일 카드 수 */
export const ALBUM_PER = 36;
