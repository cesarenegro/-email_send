'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, LayoutDashboard, Send, Settings, LogOut } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/campaigns', label: 'Campaigns', icon: Send },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="bg-[#FFFFFF] border-b border-[#D8D2C8] sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2 text-[#1A1A1E] font-semibold tracking-wide text-lg">
              <Mail className="w-5 h-5 text-[#1A1A1E]" />
              <span>ARKITECNA MAILER</span>
            </Link>
            <nav className="hidden md:flex space-x-4">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#F7F5F0] text-[#1A1A1E] font-semibold'
                        : 'text-[#666666] hover:text-[#1A1A1E] hover:bg-[#F7F5F0]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-sm text-[#666666] hover:text-[#1A1A1E] px-3 py-1.5 rounded hover:bg-[#F7F5F0] transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
