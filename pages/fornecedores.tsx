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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  total_compras: number;
  total_pendente: number;
}

export default function FornecedoresPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState<Partial<Fornecedor>>({});
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<Fornecedor | null>(null);

  const filteredFornecedores = fornecedores.filter(fornecedor => 
    fornecedor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fornecedor.cnpj.includes(searchTerm) ||
    fornecedor.telefone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSupplier = async () => {
    if (!newSupplier.nome || !newSupplier.cnpj) {
      toast.error('Nome e CNPJ são obrigatórios');
      return;
    }

    try {
      await axios.post('/api/fornecedores', {
        nome: newSupplier.nome,
        cnpj: newSupplier.cnpj,
        telefone: newSupplier.telefone || "",
        email: newSupplier.email || "",
        endereco: newSupplier.endereco || ""
      });

      toast.success('Fornecedor cadastrado com sucesso');
      setIsAddSupplierOpen(false);
      setNewSupplier({});
      fetchFornecedores(); // Recarregar a lista
    } catch (error: any) {
      console.error('Erro ao cadastrar fornecedor:', error);
      toast.error(error.response?.data?.error || 'Erro ao cadastrar fornecedor');
    }
  };

  const handleDeleteSupplier = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este fornecedor?")) {
      setFornecedores(fornecedores.filter(s => s.id !== id));
    }
  };

  // Buscar fornecedores
  const fetchFornecedores = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/fornecedores');
      setFornecedores(response.data);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  // Carregar fornecedores ao montar o componente
  useEffect(() => {
    fetchFornecedores();
  }, []);

  // Adicionar fornecedor
  const handleSubmit = async () => {
    try {
      await axios.post('/api/fornecedores', {
        nome: newSupplier.nome,
        cnpj: newSupplier.cnpj,
        telefone: newSupplier.telefone || "",
        email: newSupplier.email || "",
        endereco: newSupplier.endereco || ""
      });

      toast.success('Fornecedor cadastrado com sucesso');
      setIsAddSupplierOpen(false);
      setNewSupplier({});
      fetchFornecedores(); // Recarregar a lista
    } catch (error) {
      console.error('Erro ao cadastrar fornecedor:', error);
      toast.error('Erro ao cadastrar fornecedor');
    }
  };

  // Atualizar fornecedor
  const handleUpdate = async (id: string, data: Omit<Fornecedor, 'id' | 'total_compras' | 'total_pendente'>) => {
    try {
      await axios.put(`/api/fornecedores/${id}`, data);
      toast.success('Fornecedor atualizado com sucesso');
      fetchFornecedores();
      setFornecedorSelecionado(null);
      // Fechar modal se existir
    } catch (error) {
      console.error('Erro ao atualizar fornecedor:', error);
      toast.error('Erro ao atualizar fornecedor');
    }
  };

  // Excluir fornecedor
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return;

    try {
      await axios.delete(`/api/fornecedores/${id}`);
      toast.success('Fornecedor excluído com sucesso');
      fetchFornecedores();
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error);
      toast.error('Erro ao excluir fornecedor');
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
          <h1 className="text-2xl font-bold">Fornecedores</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/')}>
            PDV
          </Button>
          <Button variant="outline" onClick={() => router.push('/estoque')}>
            Estoque
          </Button>
          <Button variant="outline" onClick={() => router.push('/compras')}>
            Compras
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex gap-2 mb-4">
          <Input 
            placeholder="Buscar por nome, CNPJ ou contato..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
            <DialogTrigger asChild>
              <Button>Adicionar Fornecedor</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Fornecedor</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="name">Nome da Empresa</Label>
                  <Input
                    id="name"
                    value={newSupplier.nome || ''}
                    onChange={(e) => setNewSupplier({ ...newSupplier, nome: e.target.value })}
                    placeholder="Nome do fornecedor"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={newSupplier.cnpj || ''}
                      onChange={(e) => setNewSupplier({ ...newSupplier, cnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={newSupplier.telefone || ''}
                      onChange={(e) => setNewSupplier({ ...newSupplier, telefone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newSupplier.email || ''}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={newSupplier.endereco || ''}
                    onChange={(e) => setNewSupplier({ ...newSupplier, endereco: e.target.value })}
                    placeholder="Endereço completo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact">Pessoa de Contato</Label>
                    <Input
                      id="contact"
                      value={newSupplier.nome || ''}
                      onChange={(e) => setNewSupplier({ ...newSupplier, nome: e.target.value })}
                      placeholder="Nome do contato"
                    />
                  </div>
                  <div>
                    <Label htmlFor="paymentTerm">Prazo de Pagamento</Label>
                    <Input
                      id="paymentTerm"
                      value={newSupplier.total_pendente || ''}
                      onChange={(e) => setNewSupplier({ ...newSupplier, total_pendente: e.target.value })}
                      placeholder="Ex: 30 dias"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Input
                    id="notes"
                    value={newSupplier.total_compras || ''}
                    onChange={(e) => setNewSupplier({ ...newSupplier, total_compras: e.target.value })}
                    placeholder="Observações adicionais"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddSupplierOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddSupplier} 
                  disabled={!newSupplier.nome || !newSupplier.cnpj}
                >
                  Salvar Fornecedor
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : fornecedores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Nenhum fornecedor cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredFornecedores.map((fornecedor) => (
                  <TableRow key={fornecedor.id}>
                    <TableCell>{fornecedor.nome}</TableCell>
                    <TableCell>{fornecedor.cnpj}</TableCell>
                    <TableCell>{fornecedor.nome}</TableCell>
                    <TableCell>{fornecedor.telefone}</TableCell>
                    <TableCell>{fornecedor.email}</TableCell>
                    <TableCell>{fornecedor.total_pendente}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setFornecedorSelecionado(fornecedor)}
                      >
                        Editar
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDelete(fornecedor.id)}
                      >
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
} 