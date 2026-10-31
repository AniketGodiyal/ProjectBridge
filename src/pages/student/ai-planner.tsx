import { useState } from 'react';
import { Brain, Loader2, Sparkles, Save, AlertCircle, CheckCircle2, Package, Lightbulb, HelpCircle, ShieldAlert, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { validatePlan, type ValidatedProjectPlan } from '@/lib/ai-schema';
import type { ProjectPlannerInput, MatchResult, Resource, MatchStatus } from '@/lib/types';

const IMPORTANCE_COLORS = {
  essential: 'bg-red-100 text-red-800 border-red-200',
  optional: 'bg-sky-100 text-sky-800 border-sky-200',
};

const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  MATCH_FOUND: 'Match Found',
  MATCH_FOUND_REQUIRES_APPROVAL: 'Match — Requires Approval',
  MATCH_FOUND_AVAILABILITY_UNVERIFIED: 'Match — Availability Unverified',
  MATCH_FOUND_BUT_UNAVAILABLE: 'Match — Currently Unavailable',
  PARTIAL_MATCH: 'Partial Match',
  NO_MATCH_FOUND: 'No Match in Your Institution',
  MANUAL_REVIEW_REQUIRED: 'Manual Review Required',
};

const MATCH_STATUS_COLORS: Record<MatchStatus, string> = {
  MATCH_FOUND: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  MATCH_FOUND_REQUIRES_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-200',
  MATCH_FOUND_AVAILABILITY_UNVERIFIED: 'bg-sky-100 text-sky-800 border-sky-200',
  MATCH_FOUND_BUT_UNAVAILABLE: 'bg-orange-100 text-orange-800 border-orange-200',
  PARTIAL_MATCH: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  NO_MATCH_FOUND: 'bg-red-100 text-red-800 border-red-200',
  MANUAL_REVIEW_REQUIRED: 'bg-gray-100 text-gray-800 border-gray-200',
};

function ListBlock({ title, items, icon: Icon, tone }: { title: string; items: string[]; icon: LucideIcon; tone: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AIPlannerPage() {
  const { user, activeOrgId } = useAuth();
  const { toast } = useToast();
  const [input, setInput] = useState<ProjectPlannerInput>({
    title: '', description: '', budget: undefined, experienceLevel: '', complexity: '',
    deadline: '', existingEquipment: '', desiredCapabilities: '', constraints: '',
  });
  const [plan, setPlan] = useState<ValidatedProjectPlan | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (k: keyof ProjectPlannerInput, v: string | number | undefined) =>
    setInput((p) => ({ ...p, [k]: v === '' ? undefined : v }));

  const generatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.description?.trim()) {
      toast({ title: 'Description required', description: 'Please describe your project idea.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setError(null);
    setPlan(null);
    setMatches([]);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      let resourcePrices: { name: string; price_per_hour: number }[] = [];
      if (activeOrgId) {
        const { data: pricedResources } = await supabase
          .from('resources')
          .select('name, price_per_hour')
          .eq('organization_id', activeOrgId)
          .eq('is_published', true)
          .gt('price_per_hour', 0);
        resourcePrices = (pricedResources as { name: string; price_per_hour: number }[] | null) ?? [];
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/generate-project-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ ...input, resourcePrices }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || body.message || `Request failed (${res.status})`);
      }
      if (body.demo) {
        setError(body.message || 'AI service not configured. Showing a sample plan.');
      }
      const validated = validatePlan(body.plan);
      if (!validated) {
        setError('The AI returned an invalid response. Please try again with more details.');
        return;
      }
      setPlan(validated);

      // Match against institutional inventory
      if (activeOrgId) {
        const { data: resources } = await supabase
          .from('resources')
          .select('*, lab:labs(*)')
          .eq('organization_id', activeOrgId)
          .eq('is_published', true);
        const orgResources = (resources as Resource[] | null) ?? [];
        const matchResults = matchRequirements(validated, orgResources);
        setMatches(matchResults);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !plan) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('saved_projects').insert({
        user_id: user.id,
        organization_id: activeOrgId,
        title: plan.project_title,
        description: plan.project_summary,
        input_data: input,
        plan_data: plan,
        matches_data: matches,
      });
      if (error) throw error;
      toast({ title: 'Project saved', description: 'You can revisit it in My Projects.' });
    } catch (err) {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!activeOrgId) {
    return <EmptyState icon={Brain} title="No institution selected" description="Join an institution to use the AI planner and match against its inventory." />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-1">
        <p className="eyebrow">AI-powered planning</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">AI Project Resource Engine</h1>
        <p className="text-muted-foreground">Describe your project idea. AI recommends what you might need, and we match it against your institution's verified inventory.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input form */}
        <Card>
          <CardHeader className="px-6 pb-2 pt-6">
            <CardTitle className="text-base font-semibold text-primary">Project details</CardTitle>
            <CardDescription>Only the description is required. Everything else helps refine the plan.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <form onSubmit={generatePlan} className="space-y-8">
              <div className="space-y-4">
                <p className="eyebrow">The idea</p>
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">Project title</Label>
                  <Input id="title" className="h-10" placeholder="e.g. Line Follower Robot" value={input.title} onChange={(e) => update('title', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc" className="text-sm font-medium">Project description *</Label>
                  <Textarea id="desc" required rows={4} placeholder="Describe what you want to build..." value={input.description} onChange={(e) => update('description', e.target.value)} />
                </div>
              </div>

              <div className="space-y-4">
                <p className="eyebrow">Scope</p>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="budget" className="text-sm font-medium">Budget (INR)</Label>
                    <Input id="budget" className="h-10" type="number" placeholder="e.g. 2000" value={input.budget ?? ''} onChange={(e) => update('budget', e.target.value ? Number(e.target.value) : undefined)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline" className="text-sm font-medium">Deadline / duration</Label>
                    <Input id="deadline" className="h-10" placeholder="e.g. 2 weeks" value={input.deadline} onChange={(e) => update('deadline', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="level" className="text-sm font-medium">Experience level</Label>
                    <Select value={input.experienceLevel} onValueChange={(v) => update('experienceLevel', v)}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="complexity" className="text-sm font-medium">Complexity</Label>
                    <Select value={input.complexity} onValueChange={(v) => update('complexity', v)}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="eyebrow">Resources</p>
                <div className="space-y-2">
                  <Label htmlFor="existing" className="text-sm font-medium">Existing equipment</Label>
                  <Textarea id="existing" rows={2} placeholder="What do you already have?" value={input.existingEquipment} onChange={(e) => update('existingEquipment', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capabilities" className="text-sm font-medium">Desired capabilities</Label>
                  <Textarea id="capabilities" rows={2} placeholder="What should the project be able to do?" value={input.desiredCapabilities} onChange={(e) => update('desiredCapabilities', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="constraints" className="text-sm font-medium">Additional constraints</Label>
                  <Textarea id="constraints" rows={2} placeholder="Any constraints or requirements..." value={input.constraints} onChange={(e) => update('constraints', e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end border-t border-border/70 pt-6">
                <Button type="submit" className="h-10 w-full sm:w-auto" disabled={loading}>
                  {loading ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Generating plan…</> : <><Sparkles className="mr-1.5 h-4 w-4" />Generate resource plan</>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="min-w-0 space-y-4">
          {error && (
            <Card className="border-amber-200 bg-amber-50/70">
              <CardContent className="flex items-start gap-3 p-5">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-900">{error}</p>
                  <p className="mt-1 text-xs text-amber-700">AI results are estimates. Always verify against verified institutional data.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {!plan && !error && !loading && (
            <EmptyState icon={Brain} title="No plan yet" description="Fill in your project details and generate a resource plan." />
          )}

          {plan && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4 px-6 pb-2 pt-6">
                  <div className="min-w-0 space-y-1.5">
                    <CardTitle className="font-display text-xl text-primary">{plan.project_title}</CardTitle>
                    <CardDescription className="leading-relaxed">{plan.project_summary}</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleSave} disabled={saving} className="shrink-0">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-1.5 h-3.5 w-3.5" />Save</>}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6 px-6 pb-6 pt-4">
                  {plan.assumptions.length > 0 && (
                    <ListBlock title="Assumptions" items={plan.assumptions} icon={Lightbulb} tone="text-amber-500" />
                  )}
                  {plan.clarification_questions.length > 0 && (
                    <ListBlock title="Clarification questions" items={plan.clarification_questions} icon={HelpCircle} tone="text-sky-500" />
                  )}
                  {plan.estimated_total_budget_inr && (
                    <div className="rounded-xl bg-muted/60 p-4">
                      <p className="text-sm font-medium">Estimated budget</p>
                      <p className="font-display text-xl font-semibold text-primary">₹{plan.estimated_total_budget_inr.min} – ₹{plan.estimated_total_budget_inr.max}</p>
                      <p className="mt-1 text-xs text-muted-foreground">AI estimate, not a verified price.</p>
                    </div>
                  )}
                  {matches.some((m) => m.resource?.price_per_hour != null && (m.resource.price_per_hour as number) > 0) && (() => {
                    const pricedMatches = matches.filter((m) => m.resource && m.resource.price_per_hour != null && (m.resource.price_per_hour as number) > 0);
                    const totalPerHour = pricedMatches.reduce((sum, m) => sum + (m.resource!.price_per_hour as number), 0);
                    return (
                      <div className="rounded-xl bg-accent/10 p-4">
                        <p className="text-sm font-medium">Estimated booking cost (institution rates)</p>
                        <p className="font-display text-xl font-semibold text-accent">₹{totalPerHour}/hour total</p>
                        <p className="mt-1 text-xs text-muted-foreground">Based on matched resources' hourly rates. Final cost depends on booking duration.</p>
                      </div>
                    );
                  })()}
                  {plan.software_requirements.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Software & tools</p>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.software_requirements.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                      </div>
                    </div>
                  )}
                  {plan.skills_and_training.length > 0 && (
                    <ListBlock title="Skills & training" items={plan.skills_and_training} icon={CheckCircle2} tone="text-accent" />
                  )}
                  {plan.limitations.length > 0 && (
                    <ListBlock title="Limitations" items={plan.limitations} icon={ShieldAlert} tone="text-orange-500" />
                  )}
                </CardContent>
              </Card>

              {/* Requirements with matches */}
              <Card>
                <CardHeader className="px-6 pb-2 pt-6">
                  <CardTitle className="text-base font-semibold text-primary">Requirements & inventory matches</CardTitle>
                  <CardDescription>Each requirement matched against your institution's verified inventory.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-6 pb-6 pt-4">
                  {plan.requirements.map((req, i) => {
                    const match = matches[i];
                    return (
                      <div key={i} className="rounded-xl border border-border/70 p-4 transition-colors hover:border-accent/40 hover:bg-accent/[0.03]">
                        <div className="flex flex-wrap items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium text-foreground">{req.name}</p>
                          <Badge className={IMPORTANCE_COLORS[req.importance]} variant="outline">{req.importance}</Badge>
                          <Badge variant="secondary" className="text-xs">Qty: {req.quantity}</Badge>
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{req.purpose}</p>

                        {req.specifications.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {req.specifications.map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                          </div>
                        )}
                        {req.estimated_cost_inr && (
                          <p className="mt-2 text-xs text-muted-foreground">Est. cost: ₹{req.estimated_cost_inr.min}–₹{req.estimated_cost_inr.max} (AI estimate)</p>
                        )}
                        {match && (
                          <div className="mt-3 space-y-1.5 rounded-lg bg-muted/60 p-3">
                            <Badge className={MATCH_STATUS_COLORS[match.status]} variant="outline">
                              {MATCH_STATUS_LABELS[match.status]}
                            </Badge>
                            <p className="text-xs leading-relaxed text-muted-foreground">{match.reason}</p>
                            {match.resource && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium">Matched: {match.resource.name} ({match.resource.lab?.name || 'No lab'})</p>
                                {match.resource.price_per_hour != null && match.resource.price_per_hour > 0 && (
                                  <p className="text-xs text-accent font-medium">Booking cost: ₹{match.resource.price_per_hour}/hour</p>
                                )}
                              </div>
                            )}
                            {match.matchingSpecs.length > 0 && (
                              <p className="text-xs text-emerald-600">Verified specs: {match.matchingSpecs.join(', ')}</p>
                            )}
                            {match.unverifiedSpecs.length > 0 && (
                              <p className="text-xs text-amber-600">Unverified: {match.unverifiedSpecs.join(', ')}</p>
                            )}
                          </div>
                        )}
                        {req.safety_notes.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {req.safety_notes.map((s, j) => <p key={j} className="flex gap-1 text-xs text-orange-600"><ShieldAlert className="h-3 w-3 shrink-0" />{s}</p>)}
                          </div>
                        )}
                        {req.alternatives.length > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">Alternatives: {req.alternatives.join(', ')}</p>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function matchRequirements(plan: ValidatedProjectPlan, resources: Resource[]): MatchResult[] {
  return plan.requirements.map((req) => {
    const reqNameLower = req.name.toLowerCase();
    const reqCat = req.category.toLowerCase();

    // Extract meaningful keywords from the requirement name (skip generic words)
    const stopWords = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'with', 'board', 'module', 'kit', 'pack', 'set', 'unit', 'piece']);
    const reqKeywords = reqNameLower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !stopWords.has(w));

    // Category synonyms — AI categories map to our DB categories
    const categorySynonyms: Record<string, string[]> = {
      electronics: ['equipment'],
      robotics: ['equipment'],
      'hand tools': ['equipment'],
      materials: ['equipment', 'space'],
      computing: ['equipment'],
      software: ['equipment'],
      space: ['space'],
    };
    const allowedCategories = categorySynonyms[reqCat] ?? [reqCat, 'equipment', 'space'];

    // Score each resource by how many requirement keywords appear in its name/description
    const scored = resources.map((r) => {
      const resourceNameLower = r.name.toLowerCase();
      const resourceDescLower = r.description?.toLowerCase() ?? '';
      const resourceCat = r.category.toLowerCase();

      let score = 0;
      for (const kw of reqKeywords) {
        if (resourceNameLower.includes(kw)) score += 2;
        if (resourceDescLower.includes(kw)) score += 1;
      }

      // Bonus for category compatibility
      if (allowedCategories.includes(resourceCat)) score += 1;

      return { resource: r, score };
    });

    const matches = scored.filter((s) => s.score >= 2).sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
      return {
        requirementName: req.name,
        status: 'NO_MATCH_FOUND' as MatchStatus,
        reason: 'No matching resource found in your institution\'s inventory. This doesn\'t mean it doesn\'t exist elsewhere — only that no suitable resource was found in your registered institution.',
        matchingSpecs: [],
        unverifiedSpecs: req.specifications,
      };
    }

    const best = matches[0].resource;
    const verifiedSpecs = req.specifications.filter((s) =>
      Object.values(best.specifications).some((v) => v.toLowerCase().includes(s.toLowerCase()))
    );
    const unverifiedSpecs = req.specifications.filter((s) => !verifiedSpecs.includes(s));

    let status: MatchStatus = 'MATCH_FOUND';
    let reason = `Found "${best.name}" in your institution's inventory.`;

    if (best.operational_status === 'maintenance') {
      status = 'MATCH_FOUND_BUT_UNAVAILABLE';
      reason = `"${best.name}" matches but is currently under maintenance.`;
    } else if (best.operational_status === 'restricted' || best.supervision_required) {
      status = 'MATCH_FOUND_REQUIRES_APPROVAL';
      reason = `"${best.name}" matches but requires supervisor approval${best.supervision_required ? ' and supervision' : ''}.`;
    } else if (unverifiedSpecs.length > 0 && verifiedSpecs.length === 0) {
      status = 'PARTIAL_MATCH';
      reason = `"${best.name}" may be related but key specifications could not be verified. Check with the resource manager.`;
    } else {
      status = 'MATCH_FOUND_AVAILABILITY_UNVERIFIED';
      reason = `"${best.name}" is available. Check the resource details page for current availability.`;
    }

    return {
      requirementName: req.name,
      status,
      reason,
      resource: best,
      matchingSpecs: verifiedSpecs,
      unverifiedSpecs,
    };
  });
}
