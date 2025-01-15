//@ts-nocheck
import { useEffect, useState } from 'react'; 

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
  const [user, setUser] = useState<User | null>(() => {
    // Inicializar o estado com o valor do localStorage
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  });

  const login = (userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const hasPermission = (permission: string) => {
    return user?.permissoes?.includes(permission) || false;
  };

  return {
    user,
    login,
    logout,
    hasPermission
  };
} 