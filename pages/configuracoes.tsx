//@ts-nocheck
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface User {
  id: string;
  nome: string;
  usuario: string;
  email: string;
  perfil_id: string;
  perfil_nome: string;
  ativo: boolean;
}

interface Profile {
  id: string;
  nome: string;
  descricao: string;
  permissoes: string[];
}

interface Permission {
  id: string;
  nome: string;
  descricao: string;
}

export default function Configuracoes() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddProfileOpen, setIsAddProfileOpen] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({});
  const [newProfile, setNewProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(false);
  const [permissions] = useState<Permission[]>([
    { id: 'pdv', nome: 'PDV', descricao: 'Acesso ao PDV e vendas' },
    { id: 'financeiro', nome: 'Financeiro', descricao: 'Acesso ao módulo financeiro' },
    { id: 'configuracoes', nome: 'Configurações', descricao: 'Acesso às configurações do sistema' },
    { id: 'estoque', nome: 'Estoque', descricao: 'Gerenciamento de estoque e produtos' },
    { id: 'compras', nome: 'Compras', descricao: 'Gerenciamento de compras' },
    { id: 'fornecedores', nome: 'Fornecedores', descricao: 'Gerenciamento de fornecedores' },
    { id: 'vendas', nome: 'Vendas', descricao: 'Relatórios e histórico de vendas' }
  ]);

  useEffect(() => {
    fetchUsers();
    fetchProfiles();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/usuarios');
      setUsers(response.data);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    }
  };

  const fetchProfiles = async () => {
    try {
      const response = await axios.get('/api/perfis');
      setProfiles(response.data);
    } catch (error) {
      toast.error('Erro ao carregar perfis');
    }
  };

  const handleAddUser = async () => {
    try {
      setLoading(true);
      await axios.post('/api/usuarios', newUser);
      toast.success('Usuário cadastrado com sucesso');
      setIsAddUserOpen(false);
      setNewUser({});
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao cadastrar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProfile = async () => {
    if (!newProfile.nome) {
      toast.error('Nome do perfil é obrigatório');
      return;
    }

    try {
      setLoading(true);
      await axios.post('/api/perfis', {
        ...newProfile,
        permissoes: newProfile.permissoes || []
      });
      toast.success('Perfil cadastrado com sucesso');
      setIsAddProfileOpen(false);
      setNewProfile({});
      fetchProfiles();
    } catch (error) {
      toast.error('Erro ao cadastrar perfil');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await axios.put(`/api/usuarios/${userId}`, {
        ...users.find(u => u.id === userId),
        ativo: !currentStatus
      });
      toast.success(`Usuário ${currentStatus ? 'desativado' : 'ativado'} com sucesso`);
      fetchUsers();
    } catch (error) {
      toast.error('Erro ao alterar status do usuário');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow mb-4">
        <div className="flex items-center gap-4">
          <img 
            src="https://i.imgur.com/oLO8FA3.png"
            alt="Logo"
            className="w-12 h-12 rounded-full object-cover"
          />
          <h1 className="text-2xl font-bold">Configurações</h1>
        </div>
        <Button variant="outline" onClick={() => router.push('/')}>
          Voltar para PDV
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="profiles">Perfis</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Usuários</h2>
              <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogTrigger asChild>
                  <Button>Novo Usuário</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Usuário</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div>
                      <Label>Nome</Label>
                      <Input
                        value={newUser.nome || ''}
                        onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Usuário</Label>
                      <Input
                        value={newUser.usuario || ''}
                        onChange={(e) => setNewUser({ ...newUser, usuario: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newUser.email || ''}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Senha</Label>
                      <Input
                        type="password"
                        onChange={(e) => setNewUser({ ...newUser, senha: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Perfil</Label>
                      <Select
                        value={newUser.perfil_id}
                        onValueChange={(value) => setNewUser({ ...newUser, perfil_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um perfil" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddUser} disabled={loading}>
                      {loading ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.nome}</TableCell>
                    <TableCell>{user.usuario}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.perfil_nome}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={user.ativo ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => toggleUserStatus(user.id, user.ativo)}
                      >
                        {user.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="profiles">
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Perfis</h2>
              <Dialog open={isAddProfileOpen} onOpenChange={setIsAddProfileOpen}>
                <DialogTrigger asChild>
                  <Button>Novo Perfil</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Perfil</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div>
                      <Label>Nome</Label>
                      <Input
                        value={newProfile.nome || ''}
                        onChange={(e) => setNewProfile({ ...newProfile, nome: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={newProfile.descricao || ''}
                        onChange={(e) => setNewProfile({ ...newProfile, descricao: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block">Permissões</Label>
                      <div className="grid grid-cols-2 gap-4">
                        {permissions.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={permission.id}
                              checked={(newProfile.permissoes || []).includes(permission.id)}
                              onCheckedChange={(checked) => {
                                const currentPermissions = newProfile.permissoes || [];
                                setNewProfile({
                                  ...newProfile,
                                  permissoes: checked
                                    ? [...currentPermissions, permission.id]
                                    : currentPermissions.filter(p => p !== permission.id)
                                });
                              }}
                            />
                            <Label
                              htmlFor={permission.id}
                              className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {permission.nome}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddProfileOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddProfile} disabled={loading}>
                      {loading ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Permissões</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>{profile.nome}</TableCell>
                    <TableCell>{profile.descricao}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {profile.permissoes?.map(permId => {
                          const perm = permissions.find(p => p.id === permId);
                          return perm ? (
                            <span
                              key={perm.id}
                              className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs cursor-help"
                              title={perm.descricao}
                            >
                              {perm.nome}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 