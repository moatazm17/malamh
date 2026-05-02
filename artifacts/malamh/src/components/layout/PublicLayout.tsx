import { Link, useLocation } from "wouter";
import { Shield } from "lucide-react";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary/30">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-semibold tracking-tight">Malamh</span>
          </Link>
          
          <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/playground" className={`hover:text-foreground transition-colors ${location === '/playground' ? 'text-foreground' : ''}`}>Playground</Link>
            <Link href="/ai-studio" className={`hover:text-foreground transition-colors ${location === '/ai-studio' ? 'text-foreground' : ''}`}>AI Studio</Link>
            <Link href="/docs" className={`hover:text-foreground transition-colors ${location === '/docs' ? 'text-foreground' : ''}`}>Docs</Link>
            <Link href="/pricing" className={`hover:text-foreground transition-colors ${location === '/pricing' ? 'text-foreground' : ''}`}>Pricing</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Link href="/register" className="btn btn-primary h-9 px-4">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border/40 py-12 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>&copy; {new Date().getFullYear()} Malamh. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/docs" className="hover:text-foreground">API Reference</Link>
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <a href="#" className="hover:text-foreground">Privacy Policy</a>
            <a href="#" className="hover:text-foreground">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
