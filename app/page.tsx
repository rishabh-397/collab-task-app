// app/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Users, Zap, Lock, LayoutDashboard } from "lucide-react";

const trustedCompanies = [
  { name: "Amazon", logo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" },
  { name: "Google", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" },
  { name: "Microsoft", logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" },
  { name: "IBM", logo: "https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg" },
  { name: "Atlassian", logo: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Atlassian-horizontal-blue.svg" },
  { name: "Slack", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_Logo.svg" },
];

const features = [
  {
    icon: Zap,
    title: "Real-time updates",
    description: "See changes instantly — perfect for distributed teams.",
  },
  {
    icon: Lock,
    title: "Secure & private",
    description: "Row Level Security ensures only your team sees your data.",
  },
  {
    icon: Users,
    title: "Team collaboration",
    description: "Invite teammates, assign cards, comment in real time.",
  },
  {
    icon: LayoutDashboard,
    title: "Powerful Kanban",
    description: "Drag & drop, custom lists, labels, due dates — all coming soon.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100/[0.04] dark:bg-grid-slate-900/[0.04]" />
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent animate-fade-in">
            Collab Task
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto mb-10 leading-relaxed animate-fade-in-up">
            The modern, collaborative Kanban board that teams love. Real-time, secure, and built for speed.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center animate-fade-in-up animation-delay-200">
            <Link href="/login">
              <Button size="lg" className="gap-2 text-lg px-10">
                Start for Free <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-10">
              See Demo
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground animate-fade-in-up animation-delay-400">
            No credit card required • Free forever for small teams
          </p>
        </div>
      </section>

      {/* Trusted by */}
      <section className="py-16 bg-muted/30 border-y">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm uppercase tracking-wider text-muted-foreground mb-8">
            Trusted by teams at
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 md:gap-12 items-center opacity-80">
            {trustedCompanies.map((company) => (
              <div key={company.name} className="flex justify-center">
                <img
                  src={company.logo}
                  alt={company.name}
                  className="h-8 md:h-10 object-contain grayscale hover:grayscale-0 transition-all duration-300 hover:scale-110"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            Everything your team needs
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="p-8 rounded-xl border bg-card/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mb-6 p-4 rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-center">{feature.title}</h3>
                <p className="text-muted-foreground text-center">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            Ready to organize your team?
          </h2>
          <p className="text-xl mb-12 max-w-3xl mx-auto opacity-90">
            Join thousands of teams using Collab Task to manage projects with clarity, speed and collaboration.
          </p>
          <Link href="/login">
            <Button size="lg" variant="secondary" className="text-lg px-12 py-7">
              Get Started Free
            </Button>
          </Link>
          <p className="mt-6 text-sm opacity-80">
            No credit card required • Free forever for small teams
          </p>
        </div>
      </section>
    </div>
  );
}