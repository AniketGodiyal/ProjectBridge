import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, BookOpen, CalendarClock, CheckCircle2, ClipboardList, Cpu, FileCheck,
  FlaskConical, GraduationCap, LayoutDashboard, Lightbulb, PackageCheck, QrCode,
  ScanLine, ShieldCheck, Users, Wrench, Zap,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Logo } from '@/components/logo';
import { useAuth } from '@/lib/auth-context';

const workflow = [
  {
    icon: Lightbulb,
    step: '01',
    title: 'Plan with AI',
    description: 'A student describes their project idea. The AI planner analyses requirements and suggests the exact equipment, materials, and lab spaces needed.',
    role: 'Student',
  },
  {
    icon: ScanLine,
    step: '02',
    title: 'Find & Request',
    description: 'Students browse available resources, scan QR codes for instant access, and submit booking requests with purpose and time slot.',
    role: 'Student',
  },
  {
    icon: ClipboardList,
    step: '03',
    title: 'Review & Approve',
    description: 'Resource managers review requests, verify student eligibility, and approve or reject with notes. Verification status is checked before approval.',
    role: 'Resource Manager',
  },
  {
    icon: QrCode,
    step: '04',
    title: 'Check In',
    description: 'On arrival, the student scans the resource QR code to check in. The system records the initial condition and starts the usage timer.',
    role: 'Student',
  },
  {
    icon: PackageCheck,
    step: '05',
    title: 'Submit Return',
    description: 'After use, the student submits a return with photos of the equipment condition. The booking moves to return-pending for inspection.',
    role: 'Student',
  },
  {
    icon: FileCheck,
    step: '06',
    title: 'Inspect & Complete',
    description: 'The manager inspects returned photos, confirms the condition, and closes out the booking. Any damage is logged as an incident.',
    role: 'Resource Manager',
  },
];

const roles = [
  {
    icon: GraduationCap,
    title: 'Student',
    summary: 'Plan projects, find resources, request bookings, check in via QR, and submit returns.',
    features: ['AI project planner', 'Resource finder & search', 'Booking lifecycle tracking', 'QR code check-in', 'Return submission with photos'],
  },
  {
    icon: Wrench,
    title: 'Resource Manager',
    summary: 'Manage the resource inventory, approve bookings, inspect returns, and handle incidents.',
    features: ['Resource CRUD & publishing', 'Booking approval workflow', 'Return inspection & confirmation', 'Incident reporting & resolution', 'Availability scheduling'],
  },
  {
    icon: FlaskConical,
    title: 'Faculty / Lab Manager',
    summary: 'Oversee lab operations, manage equipment, and supervise safe usage across departments.',
    features: ['Lab & department oversight', 'Equipment condition tracking', 'Student training verification', 'Supervision scheduling'],
  },
  {
    icon: Users,
    title: 'Institute Administrator',
    summary: 'Govern the institution — manage staff, departments, labs, and review analytics.',
    features: ['Staff & role management', 'Department & lab administration', 'Operational analytics', 'Audit trail review'],
  },
  {
    icon: ShieldCheck,
    title: 'Platform Administrator',
    summary: 'Oversee the entire platform — onboard institutions and ensure system-wide health.',
    features: ['Institution onboarding & verification', 'Platform-wide oversight', 'Cross-institution analytics'],
  },
];

const capabilities = [
  { icon: Cpu, title: 'AI-Powered Planning', description: 'Describe your project, get a complete resource plan with matched equipment and labs.' },
  { icon: QrCode, title: 'QR Code Access', description: 'Scan to check in, scan to return. Every resource has a unique QR code for instant interaction.' },
  { icon: CalendarClock, title: 'Smart Booking', description: 'Request, approve, check in, and return — a full lifecycle with status tracking at every step.' },
  { icon: FileCheck, title: 'Verification System', description: 'Students upload ID and training certificates. Managers verify before approving bookings.' },
  { icon: PackageCheck, title: 'Return Inspection', description: 'Photo-based return submission with condition assessment. Damages logged as incidents.' },
  { icon: ShieldCheck, title: 'Incident Management', description: 'Report, track, and resolve incidents. Full audit trail for accountability.' },
  { icon: LayoutDashboard, title: 'Role-Based Dashboards', description: 'Each role sees a tailored dashboard with relevant actions and metrics.' },
  { icon: Zap, title: 'Real-Time Notifications', description: 'Stay informed on booking status changes, approvals, and incident updates.' },
];

export function LandingPage() {
  const { activePersona } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav bar */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <Logo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {activePersona ? (
              <button
                onClick={() => navigate(activePersona.role === 'student' ? '/dashboard' : activePersona.role === 'manager' ? '/manage' : activePersona.role === 'platform_admin' ? '/platform' : '/admin')}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-95"
              >
                Enter Dashboard <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => window.location.reload()}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
              >
                Enter <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="eyebrow">Resource Sharing Platform</span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl">
              Turn idle resources into
              <span className="bg-gradient-to-r from-accent to-cyan-500 bg-clip-text text-transparent"> real opportunities</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              ProjectBridge connects students, lab managers, and institutions so that underused equipment,
              spaces, and technical resources are discovered, booked, tracked, and returned — safely and efficiently.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={() => {
                  if (activePersona) navigate(activePersona.role === 'student' ? '/dashboard' : activePersona.role === 'manager' ? '/manage' : activePersona.role === 'platform_admin' ? '/platform' : '/admin');
                  else window.location.reload();
                }}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-8 text-base font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl active:scale-95"
              >
                Get Started <ArrowRight className="h-5 w-5" />
              </button>
              <a
                href="#workflow"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-border bg-card px-8 text-base font-medium text-foreground shadow-sm transition-all hover:border-accent/50 hover:shadow-md active:scale-95"
              >
                See How It Works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* What / Why / How */}
      <section className="border-y border-border/70 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground">What it is</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                A resource booking and management system for educational institutions. Students discover and
                request equipment; managers approve, track, and inspect returns. The entire lifecycle — from
                planning to return — is handled in one platform.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Zap className="h-6 w-6 text-accent" />
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground">Why it exists</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Labs sit full of idle equipment while students buy their own or go without. Institutions lack
                visibility into what is used, who has it, and what condition it is in. ProjectBridge closes
                that gap — making underused resources accessible, trackable, and accountable.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
                <ScanLine className="h-6 w-6 text-cyan-600" />
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground">How it works</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                An AI planner helps students identify what they need. They request a booking; a manager
                approves it. The student scans a QR code to check in, uses the resource, submits a return
                with photos, and the manager inspects and closes the loop.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <span className="eyebrow">Step by Step</span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">The Booking Lifecycle</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            From idea to returned equipment — every step is tracked, accounted for, and visible.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workflow.map((w) => (
            <div
              key={w.step}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:border-accent/40 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent/15 to-primary/10 ring-1 ring-inset ring-accent/20 transition-transform duration-300 group-hover:scale-110">
                  <w.icon className="h-6 w-6 text-accent" />
                </div>
                <span className="font-display text-3xl font-bold text-muted/40">{w.step}</span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-semibold text-foreground">{w.title}</h3>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {w.role}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{w.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="border-y border-border/70 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12 text-center">
            <span className="eyebrow">Built for Every Role</span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">Who uses ProjectBridge</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Each role gets a tailored dashboard with the tools and views they need.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((r) => (
              <div key={r.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <r.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{r.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{r.summary}</p>
                <ul className="mt-4 space-y-2">
                  {r.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <span className="eyebrow">Full Feature Set</span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">Everything the platform does</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            A complete resource management toolkit — from AI planning to incident resolution.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((c) => (
            <div key={c.title} className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:border-accent/40 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 transition-transform duration-300 group-hover:scale-110">
                <c.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">{c.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border bg-primary">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-accent blur-3xl" />
          <div className="absolute right-1/4 bottom-0 h-72 w-72 rounded-full bg-cyan-400 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to explore?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-primary-foreground/80">
            Explore the sample workspace — switch between student, manager, and admin roles to see the full system in action.
          </p>
          <button
            onClick={() => {
              if (activePersona) navigate(activePersona.role === 'student' ? '/dashboard' : activePersona.role === 'manager' ? '/manage' : activePersona.role === 'platform_admin' ? '/platform' : '/admin');
              else window.location.reload();
            }}
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-8 text-base font-medium text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:bg-accent/90 hover:shadow-xl active:scale-95"
          >
            Enter the Platform <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/70 bg-card py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <Logo />
          <p className="text-sm text-muted-foreground">ProjectBridge. Resource booking for institutions.</p>
        </div>
      </footer>
    </div>
  );
}
