'use client';
import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { TWITTER_KEY, type Tweet } from '@/lib/twitterStore';
import { useSectionTitle } from '@/lib/sectionStore';
import { PageTitle } from '@/components/ui/PageText';
import { TweetForm } from '@/components/twitter/TweetForm';

export default function TweetEditPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const [all, , loaded] = useLocalList<Tweet>(TWITTER_KEY, []);
  const t = all.find(x => x.id === id);
  const tt = useSectionTitle('twitter', t?.secId, '트위터');

  if (!loaded) return <section className="page" />;
  if (!isAdmin || !t) {
    return (
      <section className="page">
        <div className="page-head"><PageTitle href={tt.href}>{tt.title}</PageTitle><p>관리자 전용이거나 없는 트윗입니다</p></div>
      </section>
    );
  }
  return (
    <section className="page">
      <div className="page-head"><PageTitle href={tt.href}>{tt.title}</PageTitle></div>
      <Suspense fallback={null}><TweetForm tweet={t} /></Suspense>
    </section>
  );
}
