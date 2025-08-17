import { useState, useCallback, useEffect } from 'react';

// Interface do usuário
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

// Função para decodificar JWT no cliente (sem verificação de assinatura)
function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Erro ao decodificar JWT:', error);
    return null;
  }
}

// Função para obter cookie por nome
function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Função para obter usuário do cookie
  const getUserFromCookie = useCallback((): User | null => {
    const token = getCookie('auth_token');
    
    if (!token) {
      return null;
    }

    const decoded = decodeJWT(token);
    
    if (!decoded) {
      return null;
    }

    // Não precisamos verificar expiração aqui, o middleware já faz isso

    const userData = {
      id: decoded.id,
      usuario: decoded.usuario,
      email: decoded.email,
      nome: decoded.nome || decoded.usuario,
      perfil_id: decoded.perfilId || decoded.perfil_id,
      perfil_nome: decoded.perfilNome || decoded.perfil_nome || 'Usuário',
      permissoes: Array.isArray(decoded.permissoes) ? decoded.permissoes : [],
      ativo: true
    };

    return userData;
  }, []);

  // Verificar autenticação do cookie
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const userFromCookie = getUserFromCookie();
      
      if (userFromCookie) {
        setUser(userFromCookie);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [getUserFromCookie]);

  // Verificar autenticação ao montar o hook
  useEffect(() => {
    // Pequeno delay para garantir que o cookie esteja disponível
    const timer = setTimeout(() => {
      checkAuth();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [checkAuth]);

  const login = useCallback(async (credentials: { usuario: string; senha: string }) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials)
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        return { success: true, data };
      } else {
        const error = await response.json();
        return { success: false, error: error.error };
      }
    } catch (error) {
      return { success: false, error: 'Erro de conexão' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      // Erro silencioso
    } finally {
      setUser(null);
    }
  }, []);

  const hasPermission = useCallback((permission: string) => {
    return user?.permissoes?.includes(permission) || false;
  }, [user?.permissoes]);

  return {
    user,
    loading,
    login,
    logout,
    hasPermission,
    setUser,
    checkAuth,
    getUserFromCookie
  };
}
