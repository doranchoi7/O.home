export interface Mon { id: string; name: string; imgs: string[]; weight: number }

/** 이로치 한 마리당 확률 — 0.007 = 0.7% */
const SHINY_RATE = 0.007;

// [파일명(.gif 뺀 것), 한글 이름] — 줄 순서는 마음대로 바꿔도 돼요
// 파일 위치: public/gacha/mons/{파일명}.gif
// 파일명이 -shiny로 끝나면 이로치로 취급해서 확률을 낮춰요
const LIST: [string, string][] = [
  ['flareon', '부스터'],
  ['jolteon', '쥬피썬더'],
  ['leafeon', '리피아'],
  ['glaceon', '글레이시아'],
  ['pachirisu-1', '파치리스'],
  ['pachirisu-2', '파치리스'],
  ['emolga-1', '에몽가'],
  ['emolga-2', '에몽가'],
  ['skitty', '에나비'],
  ['litten', '냐오불'],
  ['incineroar', '어흥염'],
  ['scorbunny', '염버니'],
  ['leavanny', '모아머'],
  ['oshawott', '수댕이'],
  ['eevee', '이브이'],
  ['vaporeon', '샤미드'],
  ['umbreon', '블래키'],
  ['espeon', '에브이'],
  ['sylveon', '님피아'],
  ['alcremie-1', '마휘핑'],
  ['alcremie-2', '마휘핑'],
  ['alcremie-3', '마휘핑'],
  ['alcremie-4', '마휘핑'],
  ['alcremie-5', '마휘핑'],
  ['piplup', '팽도리'],
  ['pachirisu-1-shiny', '이로치 파치리스'],
  ['pachirisu-2-shiny', '이로치 파치리스'],
];

const isShiny = (id: string) => id.endsWith('-shiny');
const shinyCount = LIST.filter(([id]) => isShiny(id)).length;
const normalCount = LIST.length - shinyCount;
// 일반 한 마리의 가중치를 1로 두고, 이로치 한 마리가 정확히 SHINY_RATE 확률이 되도록 계산
const SHINY_WEIGHT = (SHINY_RATE * normalCount) / (1 - SHINY_RATE * shinyCount);

export const MONS: Mon[] = LIST.map(([id, name]) => ({
  id,
  name,
  imgs: [`/gacha/mons/${id}.gif`],
  weight: isShiny(id) ? SHINY_WEIGHT : 1,
}));
