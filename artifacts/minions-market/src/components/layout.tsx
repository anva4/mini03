import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Home, Search, PlusCircle, MessageCircle, User, Menu, X, Radio, Settings, Shield, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import { BannedScreen } from "@/components/banned-screen";
import type { ReactNode } from "react";
import { MinionBuddy } from "@/components/minion-buddy";

const PAGE_TITLE_MAP: Record<string, string> = {
  "/": "home",
  "/catalog": "catalog",
  "/sell": "sell",
  "/messages": "messages",
  "/profile": "profile",
  "/wallet": "wallet",
  "/deals": "deals",
  "/settings": "settings",
  "/favorites": "favorites",
  "/admin": "admin",
  "/radio": "radio",
  "/legal": "legal",
};

function getPageTitleKey(location: string): string {
  if (location === "/") return "home";
  for (const [path, key] of Object.entries(PAGE_TITLE_MAP)) {
    if (path !== "/" && location.startsWith(path)) return key;
  }
  return "home";
}


export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const autoLogoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || user?.isBanned) return;
    const token = localStorage.getItem("mm_token");
    if (!token) return;
    fetch("/api/messages/unread-count", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.count) setUnreadTotal(data.count); })
      .catch(() => {});
  }, [isAuthenticated, user?.isBanned]);

  // Автоматический кик через 4 секунды после обнаружения бана
  useEffect(() => {
    if (isAuthenticated && user?.isBanned) {
      autoLogoutRef.current = setTimeout(() => {
        logout();
      }, 4000);
    }
    return () => {
      if (autoLogoutRef.current) clearTimeout(autoLogoutRef.current);
    };
  }, [isAuthenticated, user?.isBanned, logout]);

  // Если пользователь заблокирован — показываем экран бана вместо всего остального
  if (isAuthenticated && user?.isBanned) {
    return <BannedScreen user={user} />;
  }

  const isActive = (path: string, exact = false) =>
    exact ? location === path : (location === path || location.startsWith(path + "/"));

  const navItems = [
    { path: "/", icon: Home, label: t("home"), exact: true },
    { path: "/catalog", icon: Search, label: t("catalog") },
    { path: "/sell", icon: PlusCircle, label: t("sell") },
    { path: "/messages", icon: MessageCircle, label: t("messages"), badge: unreadTotal },
    { path: "/profile", icon: User, label: t("profile") },
  ];

  const menuItems = [
    { path: "/", icon: Home, label: t("home"), exact: true },
    { path: "/catalog", icon: Search, label: t("catalog") },
    { path: "/radio", icon: Radio, label: t("radio") },
    { path: "/profile", icon: User, label: t("profile") },
    { path: "/settings", icon: Settings, label: t("settings") },
    { path: "/legal", icon: FileText, label: t("legal") },
    ...(user?.isAdmin ? [{ path: "/admin", icon: Shield, label: t("admin"), exact: false }] : []),
  ];

  const hideNav = location === "/auth";
  const titleKey = getPageTitleKey(location);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!hideNav && (
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur">
          <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 text-primary p-2 shadow-sm">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Minions</p>
                <h1 className="text-base font-semibold">{t(titleKey as any)}</h1>
              </div>
            </div>
            <button
              type="button"
              className="p-2 rounded-2xl bg-card border border-border/60 text-foreground transition hover:border-primary/70"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? t("close") : t("menu")}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          {menuOpen && (
            <div className="border-t border-border/50 bg-background/95 px-4 pb-4 animate-in slide-in-from-top-2">
              <div className="max-w-lg mx-auto space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{t("menu")}</span>
                  <button type="button" className="text-sm text-muted-foreground" onClick={() => setMenuOpen(false)}>
                    {t("close")}
                  </button>
                </div>
                <div className="grid gap-2">
                  {menuItems.map((item) => {
                    const active = isActive(item.path, item.exact ?? false);
                    return (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => { setLocation(item.path); setMenuOpen(false); }}
                        className={`w-full rounded-3xl border p-3 text-left flex items-center gap-3 transition ${
                          active ? "border-primary bg-primary/10" : "border-border/30 bg-card hover:border-primary/30"
                        }`}
                      >
                        <IconWrapper active={active} size="md">
                          <item.icon />
                        </IconWrapper>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-3xl border border-border/40 bg-card p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                      {user?.avatar
                        ? <img src={user.avatar} alt={user.username || "avatar"} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        : <User className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <div className="font-medium">{user?.username || t("login")}</div>
                      <div className="text-xs text-muted-foreground">{isAuthenticated ? t("online") : t("login")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </header>
      )}

      <main className="flex-1 pb-16 max-w-lg mx-auto w-full">
        {children}
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50" data-testid="bottom-nav">
          <div className="max-w-lg mx-auto flex items-center justify-around h-14 px-2">
            {navItems.map((item) => {
              const active = isActive(item.path, item.exact ?? false);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors relative ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`nav-${item.path.replace("/", "") || "home"}`}
                >
                  <IconWrapper active={active} size="md">
                    <item.icon />
                  </IconWrapper>
                  <span className="text-[10px] font-medium">{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-0.5 right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-bold">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Animated minion helper — always on top */}
      {!hideNav && <MinionBuddy />}
    </div>
  );
}
