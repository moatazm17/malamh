import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, LayoutGrid } from "lucide-react";
import { useAuth } from "@clerk/react";

const NAV_ITEMS: Array<{ href: string; label: string }> = [
  { href: "/playground", label: "Playground" },
  { href: "/ai-studio", label: "AI Studio" },
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
];

export function PublicLayout({ children, transparentHeader = false }: { children: React.ReactNode; transparentHeader?: boolean }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isSignedIn } = useAuth();

  useEffect(() => { setMobileOpen(false); }, [location]);

  const navLink = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className="text-sm font-medium transition-colors"
      style={{
        color: location === href ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <header
        className="sticky top-0 z-50 w-full transition-colors"
        style={{
          background: transparentHeader && !mobileOpen ? "rgba(10,10,15,0.55)" : "rgba(10,10,15,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <MalamhMark size={28} />
            <span className="font-semibold tracking-tight text-base" style={{ fontFamily: "var(--app-font-display)" }}>
              Malamh
            </span>
          </Link>

          <nav className="hidden md:flex gap-8">
            {NAV_ITEMS.map((item) => navLink(item.href, item.label))}
          </nav>

          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <Link href="/dashboard/overview" className="btn-mh btn-mh-primary hidden sm:inline-flex">
                <LayoutGrid className="w-4 h-4" /> Dashboard
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className="text-sm font-medium transition-colors hidden sm:inline" style={{ color: "var(--text-secondary)" }}>
                  Log in
                </Link>
                <Link href="/sign-up" className="btn-mh btn-mh-primary hidden sm:inline-flex">
                  Get Started
                </Link>
              </>
            )}
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
              style={{ border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div
            className="md:hidden border-t"
            style={{ background: "rgba(10,10,15,0.95)", borderColor: "var(--border-subtle)" }}
          >
            <nav className="flex flex-col px-6 py-4 gap-1">
              {NAV_ITEMS.map((item) => {
                const active = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-base font-medium py-3 px-3 rounded-lg transition-colors"
                    style={{
                      color: active ? "var(--text-primary)" : "var(--text-secondary)",
                      background: active ? "rgba(77,124,255,0.10)" : "transparent",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <div className="h-px my-3" style={{ background: "var(--border-subtle)" }} />
              {isSignedIn ? (
                <Link
                  href="/dashboard/overview"
                  className="btn-mh btn-mh-primary justify-center mt-2"
                  style={{ padding: "12px 20px" }}
                >
                  <LayoutGrid className="w-4 h-4" /> Open Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="text-base font-medium py-3 px-3 rounded-lg transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/sign-up"
                    className="btn-mh btn-mh-primary justify-center mt-2"
                    style={{ padding: "12px 20px" }}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">{children}</main>

      <footer className="surface-void mt-auto" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <MalamhMark size={20} />
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                Built with conviction that your face belongs to you.
              </span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm" style={{ color: "var(--text-muted)" }}>
              <Link href="/" className="hover:text-white transition-colors">About</Link>
              <Link href="/docs" className="hover:text-white transition-colors">API Docs</Link>
              <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Made by Moataz</span>
          </div>
          <div
            className="text-xs leading-relaxed text-center md:text-left max-w-3xl"
            style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "1.5rem" }}
          >
            <span style={{ color: "var(--text-secondary)" }}>Malamh</span> comes from the Arabic word{" "}
            <span className="brand-arabic" style={{ color: "var(--text-secondary)" }}>ملامح</span>{" "}
            — meaning <em>features</em>: the small, irreplaceable details that make a face
            uniquely yours. The same details AI tools steal in seconds. We built Malamh to give
            them back.
          </div>
        </div>
      </footer>
    </div>
  );
}

export function MalamhMark({ size = 24 }: { size?: number }) {
  return (
    <img
      src="/malamh-logo.png"
      alt="Malamh"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain", display: "block" }}
      draggable={false}
    />
  );
}
