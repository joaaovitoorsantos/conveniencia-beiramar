import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const router = useRouter();
  const { login, loading } = useAuth();
  const [credentials, setCredentials] = useState({
    usuario: "",
    senha: ""
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await login(credentials);
      
      if (result.success) {
        toast.success('Login realizado com sucesso');
        // Redirecionar para home - o middleware vai verificar o token
        window.location.href = '/';
      } else {
        toast.error(result.error || 'Erro ao realizar login');
      }
    } catch (error: any) {
      toast.error('Erro ao realizar login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-[400px]">
        <CardHeader className="space-y-4 flex flex-col items-center">
          <div className="w-32 h-32 rounded-full border-4 border-gray-200 shadow-lg overflow-hidden flex items-center justify-center bg-white">
            <img 
              src="https://i.imgur.com/oLO8FA3.png"
              alt="Logo Conveniência Beira Mar"
              className="w-[150%] h-[150%] object-cover scale-125"
            />
          </div>
          <CardTitle>Conveniência Beira Mar</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid w-full gap-4">
              <div className="grid gap-2">
                <Label htmlFor="usuario">Usuário</Label>
                <Input
                  id="usuario" 
                  type="text" 
                  placeholder="usuario@beiramar.com"
                  value={credentials.usuario}
                  onChange={(e) => setCredentials({ ...credentials, usuario: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="senha">Senha</Label>
                <Input 
                  id="senha" 
                  type="password"
                  placeholder="Digite sua senha"
                  value={credentials.senha}
                  onChange={(e) => setCredentials({ ...credentials, senha: e.target.value })}
                  required
                />
              </div>
              <Button 
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
