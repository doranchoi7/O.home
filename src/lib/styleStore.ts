// 게임 코디 게시판 데이터 (Style)
// 저장: useLocalList(STYLE_KEY) → backend/types.ts의 COLLECTION_OF에서 Firestore 'style' 컬렉션으로 연결
// 코디 글(look)과 게임별 항목 틀(tpl)을 같은 컬렉션에 종류(kind)만 달리해서 저장한다 — 틀도 서버에 남는다.
import type { Visibility } from './charStore';

/** 코디템 한 칸 — 항목명(헤어·얼굴…) + 코디템 이름 + 사진(선택) */
export interface StyleItem {
  id: string;
  label: string;
  name: string;
  /** 사진 파일 id — 없으면 '' */
  imgId: string;
}

/** 코디 글 하나 */
export interface StyleLook {
  kind: 'look';
  /** 소속 섹션 — 여러 개로 만들었을 때. 기본 섹션이면 없음 */
  secId?: string;
  id: string;
  /** 게임 탭 id — 환경설정 > 게임 코디 탭에서 만든 것 */
  catId: string;
  title: string;
  /** 캐릭터 전신 이미지 파일 id */
  bodyImgId: string;
  items: StyleItem[];
  date: string;          // ISO
  authorId: string;
  visibility: Visibility;
}

/** 게임별 항목 틀 — 새 코디를 만들면 이 항목이 자동으로 깔린다 */
export interface StyleTpl {
  kind: 'tpl';
  secId?: string;
  id: string;
  catId: string;
  slots: { id: string; label: string }[];
  date: string;
  authorId: string;
  visibility: Visibility;
}

export type StyleDoc = StyleLook | StyleTpl;

export const STYLE_KEY = 'ohome.style.v1';
export const STYLE_SEED: StyleDoc[] = [];

/** 한 페이지에 보일 카드 수 */
export const STYLE_PER = 24;
/** 카드 최소 너비(px) */
export const STYLE_CARD_MIN = 170;
/** 카드의 전신 이미지 비율 */
export const STYLE_RATIO = '3 / 4';
