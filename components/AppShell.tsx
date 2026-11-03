'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import AppSidebar from '@/components/AppSidebar';
import AppHeader from '@/components/AppHeader';

const STANDALONE = new Set(['/login', '/login/pro', '/login/reset', '/account/password', '/workspace', '/landing']);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalonePage = STANDALONE.has(pathname) || pathname.startsWith('/landing');

  if (isStandalonePage) {
    return <main className="min-h-screen bg-[#fbf9f6]">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-[#fbf9f6]">
      <AppSidebar />
      <AppHeader />
      <div className="pl-72">
        <main className="relative pt-16 bg-[#fbf9f6] min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
