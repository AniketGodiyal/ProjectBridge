import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Brain, Clock, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { useToast } from '@/hooks/use-toast';
import { timeAgo } from '@/lib/constants';
import type { SavedProject } from '@/lib/types';

export function MyProjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data } = await supabase.from('saved_projects').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
      setProjects((data as SavedProject[] | null) ?? []);
      setLoading(false);
    }
    load();
  }, [user]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('saved_projects').delete().eq('id', id).eq('user_id', user!.id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      setProjects((p) => p.filter((proj) => proj.id !== id));
      toast({ title: 'Project deleted' });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="eyebrow">Saved plans</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">My Projects</h1>
          <p className="text-muted-foreground">Saved AI-generated resource plans.</p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link to="/dashboard/planner"><Brain className="mr-1.5 h-4 w-4" />New Plan</Link>
        </Button>
      </section>

      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No saved projects" description="Use the AI Project Planner to generate and save resource plans for your ideas." action={<Button asChild><Link to="/dashboard/planner">Plan a project</Link></Button>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="flex flex-col transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg">
              <CardContent className="flex flex-1 flex-col gap-4 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <h3 className="font-display text-lg font-semibold leading-snug text-primary">{p.title}</h3>
                    {p.description && <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{p.description}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(p.id)} aria-label="Delete project">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-border/70 pt-4 text-xs text-muted-foreground">
                  <Badge variant="secondary">{p.plan_data?.requirements?.length ?? 0} requirements</Badge>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Updated {timeAgo(p.updated_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
