// Placement: artifacts/minions-market/src/components/layout.tsx
import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import {
  Home, Search, PlusCircle, MessageCircle, User, Menu, X,
  Radio, Settings, Shield, FileText, Handshake, Wallet,
  Heart, LogOut, ChevronRight, Bell, Star,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import { BannedScreen } from "@/components/banned-screen";
import { useListDeals } from "@workspace/api-client-react";
import type { ReactNode } from "react";
import { MinionBuddy } from "@/components/minion-buddy";

const PAGE_TITLE_MAP: Record<string, string> = {
  "/": "home", "/catalog": "catalog", "/sell": "sell",
  "/messages": "messages", "/profile": "profile", "/wallet": "wallet",
  "/deals": "deals", "/settings": "settings", "/favorites": "favorites",
  "/admin": "admin", "/radio": "radio", "/legal": "legal",
};

function getPageTitleKey(location: string): string {
  if (location === "/") return "home";
  for (const [path, key] of Object.entries(PAGE_TITLE_MAP)) {
    if (path !== "/" && location.startsWith(path)) return key;
  }
  return "home";
}

// Desktop Sidebar
function DesktopSidebar({
  navItems, extraItems, user, isAuthenticated, t, logout,
}: {
  navItems: any[];
  extraItems: any[];
  user: any;
  isAuthenticated: boolean;
  t: (k: any) => string;
  logout: () => void;
}) {
  const [location, setLocation] = useLocation();
  const isActive = (path: string, exact = false) =>
    exact ? location === path : (location === path || location.startsWith(path + "/"));

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 h-screen sticky top-0 border-r border-border/40 bg-card/50 backdrop-blur-sm">
      <div className="px-5 py-5 border-b border-border/30">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <span className="text-black font-black text-lg leading-none">M</span>
          </div>
          <div>
            <p className="font-bold text-base leading-none">Minions Market</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-widest">Gaming Exchange</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        {navItems.map((item: any) => {
          const active = isActive(item.path, item.exact ?? false);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group ${
                active ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                active ? "bg-primary/15 text-primary" : "group-hover:bg-accent/60"
              }`}>
                <item.icon className="w-4 h-4" />
              </div>
              <span className="text-sm">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="ml-auto w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : active ? (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              ) : null}
            </Link>
          );
        })}

        <div className="my-2 border-t border-border/30" />

        {extraItems.map((item: any) => {
          const active = isActive(item.path, item.exact ?? false);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                active ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                active ? "bg-primary/15 text-primary" : "group-hover:bg-accent/60"
              }`}>
                <item.icon className="w-4 h-4" />
              </div>
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-border/30 pt-3">
        {isAuthenticated && user ? (
          <div className="rounded-xl bg-accent/30 p-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-primary/20">
                {user.avatar
                  ? <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                  : <User className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user.username}</p>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-[11px] text-muted-foreground">{Number(user.rating || 5).toFixed(1)}</span>
                  {user.isVerified && <span className="text-[10px] text-primary ml-1">✓ Верифицирован</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLocation("/profile")}
                className="flex-1 text-xs py-1.5 px-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition text-center"
              >
                Профиль
              </button>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition"
                title="Выйти"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <Link
            href="/auth"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-primary text-black font-semibold text-sm hover:opacity-90 transition"
          >
            Войти
          </Link>
        )}
      </div>
    </aside>
  );
}

// Desktop Right Panel
function DesktopRightPanel({ user, isAuthenticated }: { user: any; isAuthenticated: boolean }) {
  return (
    <aside className="hidden xl:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-l border-border/30 px-4 py-5 gap-4 overflow-y-auto">
      {isAuthenticated && user && (
        <Link href="/wallet" className="block rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-4 hover:border-primary/40 transition group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Баланс</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition" />
          </div>
          <p className="text-2xl font-black text-primary">{Number(user.balance || 0).toLocaleString()} ₽</p>
          <p className="text-xs text-muted-foreground mt-1">Нажмите чтобы пополнить</p>
        </Link>
      )}

      {isAuthenticated && user && (
        <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Статистика</p>
          <div className="flex flex-col gap-2.5">
            {[
              { label: "Продаж", value: user.totalSales || 0, icon: "📦" },
              { label: "Покупок", value: user.totalPurchases || 0, icon: "🛒" },
              { label: "Рейтинг", value: `${Number(user.rating || 5).toFixed(1)} ★`, icon: "⭐" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span>{stat.icon}</span>{stat.label}
                </span>
                <span className="text-sm font-semibold">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Быстрый доступ</p>
        <div className="flex flex-col gap-1">
          {[
            { href: "/catalog?sort=popular", label: "🔥 Популярные" },
            { href: "/catalog?subcategory=accounts", label: "👤 Аккаунты" },
            { href: "/catalog?subcategory=currency", label: "💰 Валюта" },
            { href: "/catalog?subcategory=items", label: "⚔️ Предметы" },
            { href: "/catalog?subcategory=boosting", label: "🚀 Бустинг" },
            { href: "/catalog?subcategory=keys", label: "🔑 Ключи" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm py-1.5 px-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-auto text-center">
        <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">© Minions Market 2025</p>
      </div>
    </aside>
  );
}

// Main Layout
export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const autoLogoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const { data: activeDealsData } = useListDeals(
    { role: "all", page: 1, limit: 50 },
    { query: { enabled: isAuthenticated && !user?.isBanned } }
  );
  const activeDealsCount = (activeDealsData?.deals || []).filter(
    (d: any) => ["paid", "delivered", "disputed"].includes(d.status)
  ).length;

  useEffect(() => {
    if (!isAuthenticated || user?.isBanned) return;
    const token = localStorage.getItem("mm_token");
    if (!token) return;
    fetch("/api/messages/unread-count", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.count) setUnreadTotal(data.count); })
      .catch(() => {});
  }, [isAuthenticated, user?.isBanned]);

  useEffect(() => {
    if (isAuthenticated && user?.isBanned) {
      autoLogoutRef.current = setTimeout(() => logout(), 4000);
    }
    return () => { if (autoLogoutRef.current) clearTimeout(autoLogoutRef.current); };
  }, [isAuthenticated, user?.isBanned, logout]);

  if (isAuthenticated && user?.isBanned) return <BannedScreen user={user} />;

  const isActive = (path: string, exact = false) =>
    exact ? location === path : (location === path || location.startsWith(path + "/"));

  const mainNavItems = [
    { path: "/", icon: Home, label: t("home"), exact: true },
    { path: "/catalog", icon: Search, label: t("catalog") },
    { path: "/sell", icon: PlusCircle, label: t("sell") },
    { path: "/messages", icon: MessageCircle, label: t("messages"), badge: unreadTotal },
    { path: "/deals", icon: Handshake, label: t("deals"), badge: activeDealsCount },
  ];

  const extraNavItems = [
    { path: "/wallet", icon: Wallet, label: t("wallet") },
    { path: "/favorites", icon: Heart, label: t("favorites") },
    { path: "/radio", icon: Radio, label: t("radio") },
    { path: "/settings", icon: Settings, label: t("settings") },
    { path: "/legal", icon: FileText, label: t("legal") },
    ...(user?.isAdmin ? [{ path: "/admin", icon: Shield, label: t("admin") }] : []),
  ];

  const hideNav = location === "/auth";
  const titleKey = getPageTitleKey(location);

  return (
    <div className="min-h-screen bg-background flex">

      {!hideNav && (
        <DesktopSidebar
          navItems={mainNavItems}
          extraItems={extraNavItems}
          user={user}
          isAuthenticated={isAuthenticated}
          t={t}
          logout={logout}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top header */}
        {!hideNav && (
          <header className="lg:hidden sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 text-primary p-2">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Minions</p>
                  <h1 className="text-sm font-semibold">{t(titleKey as any)}</h1>
                </div>
              </div>
              <button
                type="button"
                className="p-2 rounded-xl bg-card border border-border/60 text-foreground hover:border-primary/70 transition"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </header>
        )}

        {/* Desktop top header */}
        {!hideNav && (
          <header className="hidden lg:flex sticky top-0 z-40 items-center justify-between px-6 py-3 border-b border-border/30 bg-background/90 backdrop-blur">
            <h1 className="text-lg font-bold">{t(titleKey as any)}</h1>
            <div className="flex items-center gap-3">
              {isAuthenticated && (
                <button className="relative p-2 rounded-xl bg-card border border-border/40 hover:border-primary/40 transition text-muted-foreground hover:text-foreground">
                  <Bell className="w-4 h-4" />
                  {(unreadTotal > 0 || activeDealsCount > 0) && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
                  )}
                </button>
              )}
              {isAuthenticated && user ? (
                <Link href="/profile" className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-card border border-border/40 hover:border-primary/40 transition">
                  <div className="w-6 h-6 rounded-full bg-secondary overflow-hidden flex items-center justify-center">
                    {user.avatar
                      ? <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                      : <User className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                  <span className="text-sm font-medium">{user.username}</span>
                </Link>
              ) : (
                <Link href="/auth" className="py-1.5 px-4 rounded-xl bg-primary text-black font-semibold text-sm hover:opacity-90 transition">
                  Войти
                </Link>
              )}
            </div>
          </header>
        )}

        {/* Mobile slide-down menu */}
        {!hideNav && menuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMenuOpen(false)}>
            <div
              className="absolute top-0 left-0 right-0 border-b border-border/50 bg-background/98 px-4 pb-5 animate-in slide-in-from-top-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between py-3 mb-2">
                <span className="text-sm font-semibold">{t("menu")}</span>
                <button type="button" onClick={() => setMenuOpen(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[...mainNavItems, ...extraNavItems].map((item) => {
                  const active = isActive(item.path, (item as any).exact ?? false);
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => { setLocation(item.path); setMenuOpen(false); }}
                      className={`rounded-2xl border p-3 text-left flex items-center gap-2.5 transition ${
                        active ? "border-primary bg-primary/10" : "border-border/30 bg-card hover:border-primary/30"
                      }`}
                    >
                      <item.icon className={`w-4 h-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm">{item.label}</span>
                      {(item as any).badge && (item as any).badge > 0 ? (
                        <span className="ml-auto w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-bold">
                          {(item as any).badge > 9 ? "9+" : (item as any).badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {isAuthenticated && user && (
                <div className="mt-3 rounded-2xl border border-border/40 bg-card p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                    {user.avatar
                      ? <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                      : <User className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{user.username}</p>
                    <p className="text-xs text-muted-foreground">{Number(user.balance || 0).toLocaleString()} ₽</p>
                  </div>
                  <button onClick={logout} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <main className="flex-1 pb-16 lg:pb-0 w-full">
          {children}
        </main>

        {/* Mobile bottom nav */}
        {!hideNav && (
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50" data-testid="bottom-nav">
            <div className="flex items-center justify-around h-14 px-2">
              {mainNavItems.map((item) => {
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
                    {(item as any).badge && (item as any).badge > 0 ? (
                      <span className="absolute -top-0.5 right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-bold">
                        {(item as any).badge > 9 ? "9+" : (item as any).badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>

      {!hideNav && (
        <DesktopRightPanel user={user} isAuthenticated={isAuthenticated} />
      )}

      {!hideNav && (
        <div className="lg:hidden">
          <MinionBuddy />
        </div>
      )}
    </div>
  );
}
