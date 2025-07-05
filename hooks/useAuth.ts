//@ts-nocheck
import { useEffect, useState } from 'react'; 
import { useRouter } from 'next/router';

interface User {
  id: string;
  nome: string;
  usuario: string;
  email: string;
  perfil_id: string;
  perfil_nome: string;
  permissoes: string[];
  ativo: boolean;
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar autenticação ao montar o componente
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar se existe o token no localStorage ou cookie
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('auth_token');
        
        if (userData && token) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        } else {
          // Se não tem dados locais, verificar se tem cookie válido
          const response = await fetch('/api/auth/verify', {
            credentials: 'include'
          });
          
          if (response.ok) {
            const userData = await response.json();
            localStorage.setItem('user', JSON.stringify(userData.user));
            localStorage.setItem('auth_token', userData.token);
            setUser(userData.user);
          } else {
            // Limpar dados locais se não há autenticação válida
            localStorage.removeItem('user');
            localStorage.removeItem('auth_token');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData: User, token: string) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('auth_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    setUser(null);
    
    // Fazer logout no servidor também
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    }).catch(console.error);
  };

  const hasPermission = (permission: string) => {
    return user?.permissoes?.includes(permission) || false;
  };

  return {
    user,
    login,
    logout,
    hasPermission,
    loading
  };
} 