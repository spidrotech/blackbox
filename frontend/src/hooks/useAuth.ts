import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const useAuth = (requireAuth: boolean = false) => {
  const router = useRouter();

  useEffect(() => {
    if (requireAuth) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      
      if (!token) {
        router.push('/login');
      }
    }
  }, [requireAuth, router]);
};

export const useRequireAuth = () => {
  useAuth(true);
};
