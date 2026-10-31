import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, ShieldCheck, Package, User, Loader2, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/empty-state';
import { useToast } from '@/hooks/use-toast';
import { OPERATIONAL_STATUS_LABELS, OPERATIONAL_STATUS_COLORS, STUDENT_VERIFICATION_STATUS_COLORS, STUDENT_VERIFICATION_STATUS_LABELS, formatDateTime } from '@/lib/constants';
import { fetchVerificationState } from '@/lib/student-verification';
import type { Resource, AvailabilityRule, Booking, StudentVerificationState } from '@/lib/types';

export function ResourceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user, activeOrgId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resource, setResource] = useState<Resource | null>(null);
  const [availability, setAvailability] = useState<AvailabilityRule[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingForm, setBookingForm] = useState({ date: '', startTime: '', endTime: '', purpose: '' });
  const [verification, setVerification] = useState<StudentVerificationState | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchVerificationState(user.id, user.id)
      .then(setVerification)
      .catch(() => setVerification(null));
  }, [user]);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const [res, avail, books] = await Promise.all([
        supabase.from('resources').select('*, organization:organizations(*), lab:labs(*), department:departments(*)').eq('id', id).maybeSingle(),
        supabase.from('availability_rules').select('*').eq('resource_id', id).order('day_of_week'),
        supabase.from('bookings').select('*').eq('resource_id', id).in('status', ['approved', 'checked_in']).order('start_time'),
      ]);
      setResource((res.data as Resource | null) ?? null);
      setAvailability((avail.data as AvailabilityRule[] | null) ?? []);
      setBookings((books.data as Booking[] | null) ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeOrgId || !resource) return;
    const start = new Date(`${bookingForm.date}T${bookingForm.startTime}`);
    const end = new Date(`${bookingForm.date}T${bookingForm.endTime}`);
    if (end <= start) {
      toast({ title: 'Invalid time', description: 'End time must be after start time.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('demo_create_booking', {
        p_user_id: user.id,
        p_resource_id: resource.id,
        p_start_time: start.toISOString(),
        p_end_time: end.toISOString(),
        p_purpose: bookingForm.purpose,
      });
      if (error) throw error;
      toast({ title: 'Booking requested', description: 'Your request has been submitted for approval.' });
      setBookingOpen(false);
      setBookingForm({ date: '', startTime: '', endTime: '', purpose: '' });
      navigate('/dashboard/bookings');
    } catch (err) {
      toast({ title: 'Booking failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!resource) return <EmptyState icon={AlertCircle} title="Resource not found" description="This resource may have been removed or you don't have access." action={<Button asChild><Link to="/dashboard/resources">Back to resources</Link></Button>} />;

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const specRows = (obj: Record<string, string>) => (
    <dl className="divide-y divide-border/70">
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-sm capitalize text-muted-foreground">{k.replace(/_/g, ' ')}</dt>
          <dd className="text-right text-sm font-medium text-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <Button variant="ghost" size="sm" asChild className="-ml-3">
        <Link to="/dashboard/resources"><ArrowLeft className="mr-1 h-4 w-4" />Back to resources</Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card className="overflow-hidden">
            {resource.image_url && (
              <div className="aspect-video w-full overflow-hidden bg-muted">
                <img src={resource.image_url} alt={resource.name} className="h-full w-full object-cover" />
              </div>
            )}
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <p className="eyebrow capitalize">{resource.category}</p>
                  <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">{resource.name}</h1>
                </div>
                <Badge className={`self-start ${OPERATIONAL_STATUS_COLORS[resource.operational_status]}`} variant="outline">
                  {OPERATIONAL_STATUS_LABELS[resource.operational_status]}
                </Badge>
              </div>
              {resource.description && <p className="leading-relaxed text-muted-foreground">{resource.description}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 text-sm">
                  <Package className="h-4 w-4 text-accent" />
                  <span className="text-muted-foreground">Quantity:</span> <span className="font-medium">{resource.quantity}</span>
                </div>
                {resource.lab && (
                  <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 text-sm">
                    <User className="h-4 w-4 text-accent" />
                    <span className="text-muted-foreground">Location:</span> <span className="font-medium">{resource.lab.name}</span>
                  </div>
                )}
                {resource.booking_duration_minutes && (
                  <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 text-sm">
                    <Calendar className="h-4 w-4 text-accent" />
                    <span className="text-muted-foreground">Max duration:</span> <span className="font-medium">{resource.booking_duration_minutes} min</span>
                  </div>
                )}
                {resource.price_per_hour != null && resource.price_per_hour > 0 && (
                  <div className="flex items-center gap-3 rounded-xl bg-accent/10 p-3 text-sm">
                    <span className="text-muted-foreground">Price:</span> <span className="font-semibold text-accent">₹{resource.price_per_hour}/hour</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {Object.keys(resource.specifications).length > 0 && (
            <Card>
              <CardHeader className="px-6 pb-2 pt-6"><CardTitle className="text-base font-semibold text-primary">Specifications</CardTitle></CardHeader>
              <CardContent className="px-6 pb-6">{specRows(resource.specifications)}</CardContent>
            </Card>
          )}

          {(Object.keys(resource.access_rules).length > 0 || resource.required_training.length > 0 || resource.supervision_required) && (
            <Card>
              <CardHeader className="px-6 pb-2 pt-6"><CardTitle className="text-base font-semibold text-primary">Access & eligibility</CardTitle></CardHeader>
              <CardContent className="space-y-4 px-6 pb-6">
                {resource.supervision_required && (
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4 text-accent" /> Supervision required
                  </div>
                )}
                {resource.required_training.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Required training</p>
                    <div className="flex flex-wrap gap-2">
                      {resource.required_training.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                    </div>
                  </div>
                )}
                {Object.entries(resource.access_rules).length > 0 && specRows(resource.access_rules)}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="px-6 pb-2 pt-6"><CardTitle className="text-base font-semibold text-primary">Weekly availability</CardTitle></CardHeader>
            <CardContent className="px-6 pb-6">
              {availability.length === 0 ? (
                <p className="text-sm text-muted-foreground">No published availability schedule. Contact the resource manager for details.</p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {availability.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                      <span className="w-12 text-sm font-medium">{dayNames[a.day_of_week]}</span>
                      <span className="flex-1 text-sm text-muted-foreground">{a.start_time} – {a.end_time}</span>
                      <Badge variant="outline" className={a.is_available ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}>
                        {a.is_available ? 'Available' : 'Blocked'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {bookings.length > 0 && (
            <Card>
              <CardHeader className="px-6 pb-2 pt-6"><CardTitle className="text-base font-semibold text-primary">Upcoming reservations</CardTitle></CardHeader>
              <CardContent className="px-6 pb-6">
                <ul className="divide-y divide-border/70">
                  {bookings.slice(0, 5).map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                      <span className="flex items-center gap-2 text-sm"><Clock className="h-3.5 w-3.5 text-muted-foreground" />{formatDateTime(b.start_time)} – {formatDateTime(b.end_time)}</span>
                      <Badge variant="secondary">Booked</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24 shadow-lg">
            <CardHeader className="px-6 pb-2 pt-6">
              <CardTitle className="text-base font-semibold text-primary">Request a booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-6 pt-4">
              {verification && verification.status !== 'verified' && (
                <div className="space-y-2 rounded-xl border border-border/70 bg-muted/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Verification</p>
                    <Badge variant="outline" className={STUDENT_VERIFICATION_STATUS_COLORS[verification.status]}>
                      {STUDENT_VERIFICATION_STATUS_LABELS[verification.status]}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {verification.status === 'pending'
                      ? 'Your documents are under review. Requests are approved once a resource owner verifies you.'
                      : verification.status === 'rejected'
                        ? 'Your verification was not approved, so this request cannot be approved yet.'
                        : 'Verify your eligibility on your profile before requests can be approved.'}
                  </p>
                  {verification.status === 'rejected' && verification.rejection_reason && (
                    <p className="text-xs text-red-600">Reason: {verification.rejection_reason}</p>
                  )}
                </div>
              )}
              {resource.operational_status !== 'operational' ? (
                <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                  This resource is currently {OPERATIONAL_STATUS_LABELS[resource.operational_status].toLowerCase()}. Booking is unavailable.
                </div>
              ) : !bookingOpen ? (
                <Button className="h-10 w-full" onClick={() => setBookingOpen(true)}>Request booking</Button>
              ) : (
                <form onSubmit={handleBook} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-sm font-medium">Date</Label>
                    <Input id="date" className="h-10" type="date" required value={bookingForm.date} onChange={(e) => setBookingForm((p) => ({ ...p, date: e.target.value }))} min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="start" className="text-sm font-medium">Start</Label>
                      <Input id="start" className="h-10" type="time" required value={bookingForm.startTime} onChange={(e) => setBookingForm((p) => ({ ...p, startTime: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end" className="text-sm font-medium">End</Label>
                      <Input id="end" className="h-10" type="time" required value={bookingForm.endTime} onChange={(e) => setBookingForm((p) => ({ ...p, endTime: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purpose" className="text-sm font-medium">Purpose</Label>
                    <Textarea id="purpose" required rows={3} placeholder="Briefly describe what you'll use this resource for." value={bookingForm.purpose} onChange={(e) => setBookingForm((p) => ({ ...p, purpose: e.target.value }))} />
                  </div>
                  <div className="flex justify-end gap-2 border-t border-border/70 pt-5">
                    <Button type="button" variant="outline" className="h-10" onClick={() => setBookingOpen(false)}>Cancel</Button>
                    <Button type="submit" className="h-10 flex-1 sm:flex-none" disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit request'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
