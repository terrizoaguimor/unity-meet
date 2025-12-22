'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (sidebarRef.current && status === 'authenticated') {
      gsap.fromTo(sidebarRef.current,
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
      );
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null;
  }

  const navItems = [
    {
      href: '/admin',
      label: 'Dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      color: 'purple'
    },
    {
      href: '/admin/users',
      label: 'Usuarios',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      color: 'blue'
    },
    {
      href: '/admin/meetings',
      label: 'Reuniones',
      icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      color: 'emerald'
    },
    {
      href: '/admin/recordings',
      label: 'Grabaciones',
      icon: 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z',
      color: 'orange'
    },
  ];

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors: Record<string, { active: string; hover: string; icon: string }> = {
      purple: {
        active: 'bg-purple-500/20 text-purple-400 border-r-2 border-purple-500',
        hover: 'hover:bg-purple-500/10 hover:text-purple-400',
        icon: 'text-purple-400'
      },
      blue: {
        active: 'bg-blue-500/20 text-blue-400 border-r-2 border-blue-500',
        hover: 'hover:bg-blue-500/10 hover:text-blue-400',
        icon: 'text-blue-400'
      },
      emerald: {
        active: 'bg-emerald-500/20 text-emerald-400 border-r-2 border-emerald-500',
        hover: 'hover:bg-emerald-500/10 hover:text-emerald-400',
        icon: 'text-emerald-400'
      },
      orange: {
        active: 'bg-orange-500/20 text-orange-400 border-r-2 border-orange-500',
        hover: 'hover:bg-orange-500/10 hover:text-orange-400',
        icon: 'text-orange-400'
      }
    };
    return colors[color] || colors.purple;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <aside ref={sidebarRef} className="relative w-72 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-all">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold text-white block">Admin Panel</span>
              <span className="text-xs text-white/40">Unity Meet</span>
            </div>
          </Link>
        </div>

        {/* User Info */}
        <div className="p-4 mx-4 mt-4 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center text-white font-bold">
              {session.user.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{session.user.name}</p>
              <p className="text-xs text-white/40 truncate">{session.user.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-6 px-3">
          <p className="px-3 mb-2 text-xs font-semibold text-white/30 uppercase tracking-wider">Menu Principal</p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const colorClasses = getColorClasses(item.color, isActive);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? colorClasses.active
                      : `text-white/60 ${colorClasses.hover}`
                  }`}
                >
                  <svg className={`w-5 h-5 ${isActive ? '' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {item.label}
                  {isActive && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-current animate-pulse" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Volver al Dashboard
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="relative flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
