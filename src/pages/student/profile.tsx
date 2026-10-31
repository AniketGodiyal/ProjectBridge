import { useEffect, useState } from 'react';
import { Loader2, Save, Building2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StudentVerificationCard } from '@/components/student-verification-card';
import type { Membership } from '@/lib/types';

export function ProfilePage() {
  const { user, profile, memberships, refreshProfile, isPlatformAdmin } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [orgMemberships, setOrgMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setPhone(profile?.phone || '');
    setBio(profile?.bio || '');
  }, [profile]);

  useEffect(() => {
    setOrgMemberships(memberships);
  }, [memberships]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName,
        phone: phone || null,
        bio: bio || null,
      });
      if (error) throw error;
      await refreshProfile();
      toast({ title: 'Profile updated' });
    } catch (err) {
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : 'Try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const initials = (fullName || user?.email || 'U').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-1">
        <p className="eyebrow">Account</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">Profile</h1>
        <p className="text-muted-foreground">Your account details and institution memberships.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="px-6 pb-2 pt-6">
            <CardTitle className="text-base font-semibold text-primary">Account information</CardTitle>
            <CardDescription>Update your personal details.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSave} className="space-y-8">
              <div className="flex items-center gap-4 rounded-xl bg-muted/50 p-4">
                <Avatar className="h-14 w-14 ring-2 ring-card">
                  <AvatarFallback className="bg-primary text-base text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-semibold text-primary">{fullName || user?.email}</p>
                  <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="eyebrow">Personal details</p>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Full name</Label>
                    <Input id="name" className="h-10" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                    <Input id="phone" className="h-10" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                  <Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Brief about yourself..." />
                </div>
              </div>

              <div className="flex justify-end border-t border-border/70 pt-6">
                <Button type="submit" disabled={saving} className="h-10">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-1.5 h-4 w-4" />Save changes</>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-6 pb-2 pt-6">
            <CardTitle className="text-base font-semibold text-primary">Memberships & roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-6 pt-4">
            {isPlatformAdmin && <Badge variant="default">Platform Administrator</Badge>}
            {orgMemberships.length === 0 && !isPlatformAdmin ? (
              <p className="text-sm text-muted-foreground">You haven't joined any institutions yet.</p>
            ) : (
              <div className="space-y-3">
                {orgMemberships.map((m) => (
                  <div key={m.id} className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-4 transition-colors hover:border-accent/40">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <Building2 className="h-4 w-4 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary">{m.organization?.name}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="capitalize">{m.role.replace('_', ' ')}</Badge>
                        <Badge variant="outline" className="capitalize">{m.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {user && <StudentVerificationCard studentId={user.id} />}
    </div>
  );
}
