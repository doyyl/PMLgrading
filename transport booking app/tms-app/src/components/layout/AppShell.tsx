'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { useRole } from '@/context/role';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role } = useRole();
  const router = useRouter();

  // ถ้าไม่มี role และไม่ได้อยู่หน้า '/' ให้กลับหน้าหลัก
  useEffect(() => {
    if (!role && pathname !== '/') {
      router.replace('/');
    }
  }, [role, pathname, router]);

  // หน้า '/' = full-screen landing (ไม่มี sidebar)
  if (pathname === '/') {
    return <>{children}</>;
  }

  // ยังไม่มี role (กำลัง redirect) — render ว่างไว้ก่อน
  if (!role) return null;

  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        {children}
      </main>
    </>
  );
}
