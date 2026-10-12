import type { ThreadWork } from '@/lib/threadStore';

export type SeriesPost = {
  id: string;
  title: string;
  text: string;
  images: string[];
  date: string; // 직접 입력한 날짜 (YYYY-MM-DD)
};

export type SeriesWork = {
  id: string;
  title: string;
  author?: string;
  posterId?: string;
  posterCrop?: ThreadWork['posterCrop'];
  ph?: ThreadWork['ph'];
  visibility: 'public' | 'member' | 'private';
  created: string;
  posts: SeriesPost[];
};

export const SERIES_KEY = 'ohome.series.v1';
