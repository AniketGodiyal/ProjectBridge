import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { timeAgo } from '@/lib/constants';
import type { Notification } from '@/lib/types';

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setNotifs((data as Notification[] | null) ?? []);
      setLoading(false);
    }
    load();
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifs((p) => p.map((n) => ({ ...n, is_read: true })));
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="eyebrow">Inbox</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">Notifications</h1>
          <p className="text-muted-foreground">Booking updates, reminders, and administrative messages.</p>
        </div>
        {notifs.some((n) => !n.is_read) && (
          <Button variant="outline" onClick={markAllRead} className="self-start sm:self-auto">
            <CheckCheck className="mr-1.5 h-4 w-4" />Mark all read
          </Button>
        )}
      </section>

      {notifs.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You'll see booking decisions, reminders, and messages here." />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border/70">
            {notifs.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-4 px-5 py-4 transition-colors duration-150 hover:bg-accent/[0.04] ${n.is_read ? '' : 'bg-accent/[0.03]'}`}
              >
                <span
                  className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-accent'}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className={`text-sm ${n.is_read ? 'font-medium text-foreground' : 'font-semibold text-primary'}`}>{n.title}</p>
                  {n.body && <p className="text-sm leading-relaxed text-muted-foreground">{n.body}</p>}
                  <p className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
