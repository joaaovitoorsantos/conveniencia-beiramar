// @ts-nocheck
import dynamic from 'next/dynamic';
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
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-hot-toast";
import axios from "axios";
import { Users, ArrowLeft, Search, Plus, DollarSign } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";

interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco: string;
  limite_credito: number;
  valor_devido: number;
  total_compras: number;
  ultima_compra: string;
}

function ClientesComponent() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    email: "",
    endereco: "",
    limite_credito: "0"
  });
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [clientDetails, setClientDetails] = useState<any>(null);
  const [generalPaymentDialog, setGeneralPaymentDialog] = useState<{
    open: boolean;
    valorTotal: number;
    valorPagamento: string;
    forma_pagamento: string;
  }>({
    open: false,
    valorTotal: 0,
    valorPagamento: '',
    forma_pagamento: 'dinheiro'
  });
  const [paymentDialog, setPaymentDialog] = useState({
    open: false,
    contaId: '',
    valorTotal: 0,
    valorPagamento: '',
    forma_pagamento: 'dinheiro'
  });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [totalPendente, setTotalPendente] = useState(0);

  useEffect(() => {
    if (!user) return;
    if (!hasPermission('vendas')) {
      toast.error('Você não tem permissão para acessar esta página');
      router.replace('/');
      return;
    }

    carregarClientes();
  }, [user]);

  const carregarClientes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/clientes');
      setClientes(response.data);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/clientes', {
        ...formData,
        limite_credito: Number(formData.limite_credito)
      });
      
      toast.success('Cliente cadastrado com sucesso');
      setIsDialogOpen(false);
      setFormData({
        nome: "",
        cpf: "",
        telefone: "",
        email: "",
        endereco: "",
        limite_credito: "0"
      });
      carregarClientes();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao cadastrar cliente');
    }
  };

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cliente.cpf && cliente.cpf.includes(searchTerm)) ||
    (cliente.telefone && cliente.telefone.includes(searchTerm))
  );

  const loadClientDetails = async (clientId: string) => {
    try {
      const response = await axios.get(`/api/clientes/${clientId}/detalhes`);
      setClientDetails(response.data);
    } catch (error) {
      toast.error('Erro ao carregar detalhes do cliente');
    }
  };

  const handlePayment = async (contaId: string, valor: number) => {
    try {
      await axios.post(`/api/clientes/contas-receber/${contaId}/pagar`, {
        valor: Number(paymentDialog.valorPagamento),
        forma_pagamento: paymentDialog.forma_pagamento
      });

      // Fechar o modal primeiro
      setPaymentDialog(prev => ({ ...prev, open: false }));
      
      // Atualizar os dados
      await loadClientDetails(selectedClient!.id);
      await carregarClientes();
      
      // Mostrar mensagem de sucesso por último
      toast.success('Pagamento registrado com sucesso');
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      toast.error('Erro ao registrar pagamento');
    }
  };

  const formatarFormaPagamento = (forma: string) => {
    const formatos: { [key: string]: string } = {
      dinheiro: 'Dinheiro',
      cartao_credito: 'Cartão de Crédito',
      cartao_debito: 'Cartão de Débito',
      pix: 'PIX',
      convenio: 'Convênio'
    };
    return formatos[forma] || forma;
  };

  const formatStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pendente': 'Pendente',
      'concluida': 'Concluída',
      'cancelada': 'Cancelada'
    };
    return statusMap[status] || status;
  };

  const calcularTotalPendente = (contas: any[]) => {
    if (!contas) return 0;
    
    return contas
      .filter(conta => conta.status === 'pendente' || conta.status === 'parcial')
      .reduce((acc, conta) => {
        const valorPendente = Number(conta.valor) - Number(conta.total_pago || 0);
        return acc + valorPendente;
      }, 0);
  };

  useEffect(() => {
    if (clientDetails?.contas) {
      const total = calcularTotalPendente(clientDetails.contas);
      setTotalPendente(total);
    }
  }, [clientDetails]);

  const handleOpenGeneralPayment = () => {
    setGeneralPaymentDialog({
      open: true,
      valorTotal: totalPendente,
      valorPagamento: totalPendente.toString(),
      forma_pagamento: 'dinheiro'
    });
  };

  const handleGeneralPayment = async () => {
    try {
      await axios.post(`/api/clientes/${clientDetails.id}/pagar-geral`, {
        valor: Number(generalPaymentDialog.valorPagamento),
        forma_pagamento: generalPaymentDialog.forma_pagamento
      });
      
      // Fechar o modal primeiro
      setGeneralPaymentDialog(prev => ({ ...prev, open: false }));
      
      // Atualizar os dados
      await loadClientDetails(selectedClient!.id);
      await carregarClientes();
      
      // Mostrar mensagem de sucesso por último
      toast.success('Pagamento registrado com sucesso');
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      toast.error('Erro ao registrar pagamento');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao PDV
              </Button>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <h1 className="text-2xl font-bold">Clientes</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 bg-white rounded-lg w-1/3">
                <Search className="h-4 w-4 ml-2 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, CPF ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-none focus-visible:ring-0"
                />
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cadastrar Cliente</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="nome">Nome</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endereco">Endereço</Label>
                      <Input
                        id="endereco"
                        value={formData.endereco}
                        onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="limite_credito">Limite de Crédito</Label>
                      <Input
                        id="limite_credito"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.limite_credito}
                        onChange={(e) => setFormData({ ...formData, limite_credito: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Cadastrar
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Total Compras</TableHead>
                    <TableHead>Última Compra</TableHead>
                    <TableHead>Limite Crédito</TableHead>
                    <TableHead>Valor Devido</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                          <span>Carregando...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredClientes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum cliente encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClientes.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell>{cliente.nome}</TableCell>
                        <TableCell>{cliente.cpf || '-'}</TableCell>
                        <TableCell>{cliente.telefone || '-'}</TableCell>
                        <TableCell>{cliente.total_compras}</TableCell>
                        <TableCell>
                          {cliente.ultima_compra 
                            ? new Date(cliente.ultima_compra).toLocaleDateString() 
                            : '-'}
                        </TableCell>
                        <TableCell>R$ {Number(cliente.limite_credito).toFixed(2)}</TableCell>
                        <TableCell className={cliente.valor_devido > 0 ? "text-red-600" : ""}>
                          R$ {Number(cliente.valor_devido).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedClient(cliente);
                                setIsDetailsOpen(true);
                                loadClientDetails(cliente.id);
                              }}
                            >
                              Detalhes
                            </Button>
                            <Button variant="ghost" size="sm">
                              Editar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </Card>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl h-[100dvh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b">
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>

          {selectedClient && clientDetails ? (
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Nome:</span> {selectedClient.nome}</p>
                    <p><span className="font-medium">CPF:</span> {selectedClient.cpf || '-'}</p>
                    <p><span className="font-medium">Contato:</span> {selectedClient.telefone || '-'} / {selectedClient.email || '-'}</p>
                    <p><span className="font-medium">Endereço:</span> {selectedClient.endereco || '-'}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Total Compras:</span> {selectedClient.total_compras}</p>
                    <p><span className="font-medium">Limite:</span> R$ {Number(selectedClient.limite_credito).toFixed(2)}</p>
                    <p>
                      <span className="font-medium">Valor Devido:</span>
                      <span className={selectedClient.valor_devido > 0 ? "text-red-600 ml-1" : "ml-1"}>
                        R$ {Number(selectedClient.valor_devido).toFixed(2)}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Histórico de Compras</h3>
                  <div className="border rounded-lg">
                    <div className="max-h-[300px] overflow-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white">
                          <TableRow>
                            <TableHead className="text-xs">Data</TableHead>
                            <TableHead className="text-xs">Valor</TableHead>
                            <TableHead className="text-xs">Pagamento</TableHead>
                            <TableHead className="text-xs">Itens</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientDetails?.compras?.map((compra: any) => (
                            <TableRow key={compra.id} className="text-xs">
                              <TableCell>{new Date(compra.data).toLocaleString()}</TableCell>
                              <TableCell>R$ {Number(compra.valor_final).toFixed(2)}</TableCell>
                              <TableCell className="max-w-[200px]">
                                {compra.pagamentos?.map((p: any) => (
                                  <div key={p.forma_pagamento} className="whitespace-nowrap">
                                    {formatarFormaPagamento(p.forma_pagamento)}: R$ {Number(p.valor).toFixed(2)}
                                  </div>
                                ))}
                              </TableCell>
                              <TableCell className="max-w-[250px]">
                                <div className="space-y-1">
                                  {compra.itens?.map((item: any, index: number) => (
                                    <div key={index} className="flex justify-between text-xs">
                                      <span className="truncate">{item.quantidade}x {item.produto_nome}</span>
                                      <span className="text-gray-600 ml-2 shrink-0">
                                        R$ {Number(item.valor_total).toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Contas a Receber</h3>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        Total Devido: R$ {Number(clientDetails?.valor_devido || 0).toFixed(2)}
                        <span className="text-xs text-gray-400 ml-2">
                          (Calculado: R$ {totalPendente.toFixed(2)})
                        </span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleOpenGeneralPayment}
                      className="flex items-center gap-2"
                    >
                      <DollarSign className="h-4 w-4" />
                      Pagar Todas
                    </Button>
                  </div>
                  <Tabs defaultValue="pendentes" className="w-full">
                    <TabsList className="mb-2">
                      <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
                      <TabsTrigger value="pagas">Pagas</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="pendentes">
                      <div className="border rounded-lg overflow-hidden">
                        <div className="max-h-[300px] overflow-auto">
                          <Table>
                            <TableHeader className="sticky top-0 bg-white">
                              <TableRow>
                                <TableHead className="text-xs">Vencimento</TableHead>
                                <TableHead className="text-xs">Valor</TableHead>
                                <TableHead className="text-xs">Dias</TableHead>
                                <TableHead className="text-xs">Venda</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clientDetails.contas
                                .filter(conta => conta.status === 'pendente')
                                .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
                                .map((conta: any) => {
                                  const vencimento = new Date(conta.data_vencimento);
                                  const hoje = new Date();
                                  const diffTime = vencimento.getTime() - hoje.getTime();
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  const isExpanded = expandedRow === conta.id;
                                  
                                  return (
                                    <>
                                      <TableRow 
                                        key={conta.id} 
                                        className={cn(
                                          "text-xs cursor-pointer hover:bg-gray-50",
                                          isExpanded && "bg-gray-50"
                                        )}
                                        onClick={() => setExpandedRow(isExpanded ? null : conta.id)}
                                      >
                                        <TableCell>{new Date(conta.data_vencimento).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">
                                          R$ {Number(conta.valor).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                          <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-medium",
                                            diffDays < 0 ? "bg-red-100 text-red-800" : 
                                            diffDays === 0 ? "bg-yellow-100 text-yellow-800" :
                                            "bg-green-100 text-green-800"
                                          )}>
                                            {diffDays < 0 ? `${Math.abs(diffDays)} dias atraso` : 
                                             diffDays === 0 ? "Vence hoje" :
                                             `${diffDays} dias restantes`}
                                          </span>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex flex-col">
                                            <span className="font-medium">#{conta.venda_id.substring(0, 8)}</span>
                                            <span className="text-muted-foreground">
                                              {new Date(conta.criado_em).toLocaleDateString()}
                                            </span>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                                            diffDays < 0 
                                              ? 'bg-red-100 text-red-800'
                                              : 'bg-yellow-100 text-yellow-800'
                                          }`}>
                                            {diffDays < 0 ? 'Vencida' : 'Pendente'}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Button
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPaymentDialog({
                                                open: true,
                                                contaId: conta.id,
                                                valorTotal: Number(conta.valor),
                                                valorPagamento: conta.valor.toString(),
                                                forma_pagamento: 'dinheiro'
                                              });
                                            }}
                                          >
                                            Pagar
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                      {isExpanded && (
                                        <TableRow className="bg-gray-50">
                                          <TableCell colSpan={6} className="p-4">
                                            <div className="space-y-4">
                                              <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                  <h4 className="text-sm font-medium mb-2">Detalhes da Venda</h4>
                                                  <div className="space-y-1 text-xs">
                                                    <p><span className="font-medium">Data da Venda:</span> {new Date(conta.criado_em).toLocaleString()}</p>
                                                    <p><span className="font-medium">Valor Total:</span> R$ {Number(conta.valor).toFixed(2)}</p>
                                                    <p><span className="font-medium">Vencimento:</span> {new Date(conta.data_vencimento).toLocaleDateString()}</p>
                                                  </div>
                                                </div>
                                                {conta.venda && (
                                                  <div>
                                                    <h4 className="text-sm font-medium mb-2">Itens da Venda</h4>
                                                    <div className="space-y-1">
                                                      {conta.venda.itens?.map((item: any, index: number) => (
                                                        <div key={index} className="flex justify-between text-xs">
                                                          <span>{item.quantidade}x {item.produto_nome}</span>
                                                          <span>R$ {Number(item.valor_total).toFixed(2)}</span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                              {conta.venda?.pagamentos && (
                                                <div>
                                                  <h4 className="text-sm font-medium mb-2">Pagamentos Realizados</h4>
                                                  <div className="space-y-1">
                                                    {conta.venda.pagamentos.map((pagamento: any, index: number) => (
                                                      <div key={index} className="flex justify-between text-xs">
                                                        <span>{formatarFormaPagamento(pagamento.forma_pagamento)}</span>
                                                        <span>R$ {Number(pagamento.valor).toFixed(2)}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </>
                                  );
                                })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="pagas">
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Vencimento</TableHead>
                              <TableHead className="text-xs">Pagamento</TableHead>
                              <TableHead className="text-xs">Valor</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {clientDetails.contas
                              .filter(conta => conta.status === 'pago')
                              .map((conta: any) => (
                                <TableRow key={conta.id} className="text-xs">
                                  <TableCell>{new Date(conta.data_vencimento).toLocaleDateString()}</TableCell>
                                  <TableCell>{new Date(conta.data_pagamento).toLocaleDateString()}</TableCell>
                                  <TableCell>R$ {Number(conta.valor).toFixed(2)}</TableCell>
                                  <TableCell>
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-green-100 text-green-800">
                                      Pago
                                    </span>
                                  </TableCell>
                                </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Carregando informações...</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog 
        open={generalPaymentDialog.open} 
        onOpenChange={(open) => setGeneralPaymentDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento Geral</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Valor Total Pendente</Label>
              <div className="text-2xl font-bold">
                R$ {generalPaymentDialog.valorTotal.toFixed(2)}
              </div>
            </div>
            <div>
              <Label htmlFor="valorPagamento">Valor do Pagamento</Label>
              <Input
                id="valorPagamento"
                type="number"
                step="0.01"
                value={generalPaymentDialog.valorPagamento}
                onChange={(e) => setGeneralPaymentDialog(prev => ({
                  ...prev,
                  valorPagamento: e.target.value
                }))}
              />
            </div>
            <div>
              <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
              <Select
                value={generalPaymentDialog.forma_pagamento}
                onValueChange={(value) => setGeneralPaymentDialog(prev => ({
                  ...prev,
                  forma_pagamento: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGeneralPaymentDialog(prev => ({ ...prev, open: false }))}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGeneralPayment}
              disabled={!generalPaymentDialog.valorPagamento || Number(generalPaymentDialog.valorPagamento) <= 0}
            >
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={paymentDialog.open} 
        onOpenChange={(open) => setPaymentDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Valor Total da Conta</Label>
              <div className="text-2xl font-bold">
                R$ {paymentDialog.valorTotal.toFixed(2)}
              </div>
            </div>
            <div>
              <Label htmlFor="valorPagamento">Valor do Pagamento</Label>
              <Input
                id="valorPagamento"
                type="number"
                step="0.01"
                value={paymentDialog.valorPagamento}
                onChange={(e) => setPaymentDialog(prev => ({
                  ...prev,
                  valorPagamento: e.target.value
                }))}
              />
            </div>
            <div>
              <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
              <Select
                value={paymentDialog.forma_pagamento}
                onValueChange={(value) => setPaymentDialog(prev => ({
                  ...prev,
                  forma_pagamento: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialog(prev => ({ ...prev, open: false }))}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handlePayment(paymentDialog.contaId, Number(paymentDialog.valorPagamento))}
              disabled={!paymentDialog.valorPagamento || Number(paymentDialog.valorPagamento) <= 0}
            >
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Clientes = dynamic(() => Promise.resolve(ClientesComponent), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Carregando...</div>
    </div>
  ),
});

export default Clientes; 