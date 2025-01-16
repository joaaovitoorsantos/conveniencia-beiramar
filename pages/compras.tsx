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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface ItemCompra {
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  valor_unitario: number; // preço de custo
  valor_total: number;
}

interface Compra {
  id: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  nota_fiscal: string;
  valor_total: number;
  criado_por: string;
  usuario_nome: string;
  data: string;
  status: 'pendente' | 'concluida' | 'cancelada';
  observacoes?: string;
  itens: ItemCompra[];
}

interface Produto {
  id: string;
  codigo: string;
  nome: string;
  preco_custo: number;
  estoque: number;
}

interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
}

interface CompraItem {
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export default function ComprasPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [quantidade, setQuantidade] = useState(1);
  const [precoCusto, setPrecoCusto] = useState(0);
  const [itensCompra, setItensCompra] = useState<ItemCompra[]>([]);
  const [fornecedorId, setFornecedorId] = useState("");
  const [notaFiscal, setNotaFiscal] = useState("");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [total, setTotal] = useState(0);

  // Buscar produto por código de barras
  const findProductByBarcode = async (code: string) => {
    if (!code) return;
    
    try {
      const response = await axios.get(`/api/produtos?codigo=${code}`);
      console.log('Resposta da API:', response.data);

      if (response.data && response.data.length > 0) {
        const produto = response.data[0];
        console.log('Produto encontrado:', produto);
        
        if (!produto.nome || !produto.id) {
          toast.error('Dados do produto incompletos');
          return;
        }

        // Verificar se o produto já existe no carrinho
        const itemExistente = itensCompra.find(item => item.produto_id === produto.id);
        
        if (itemExistente) {
          // Atualizar quantidade do item existente
          const novosItens = itensCompra.map(item => {
            if (item.produto_id === produto.id) {
              const novaQuantidade = item.quantidade + quantidade;
              return {
                ...item,
                quantidade: novaQuantidade,
                valor_total: novaQuantidade * Number(item.valor_unitario)
              };
            }
            return item;
          });
          
          setItensCompra(novosItens);
          toast.success('Quantidade atualizada no carrinho');
        } else {
          // Adicionar novo item
          const novoItem: ItemCompra = {
            produto_id: produto.id,
            produto_nome: produto.nome,
            quantidade: quantidade,
            valor_unitario: Number(produto.preco_custo) || 0,
            valor_total: quantidade * (Number(produto.preco_custo) || 0)
          };

          setItensCompra([...itensCompra, novoItem]);
          toast.success('Produto adicionado ao carrinho');
        }
        
        setBarcodeInput("");
        setQuantidade(1);
      } else {
        toast.error('Produto não encontrado');
        setBarcodeInput("");
      }
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      toast.error('Erro ao buscar produto');
      setBarcodeInput("");
    }
  };

  // Adicionar produto através da busca
  const handleAddProduct = (produto: Produto) => {
    // Verificar se o produto já existe no carrinho
    const itemExistente = itensCompra.find(item => item.produto_id === produto.id);
    
    if (itemExistente) {
      // Atualizar quantidade do item existente
      const novosItens = itensCompra.map(item => {
        if (item.produto_id === produto.id) {
          const novaQuantidade = item.quantidade + 1; // Incrementa 1 unidade
          return {
            ...item,
            quantidade: novaQuantidade,
            valor_total: novaQuantidade * Number(item.valor_unitario)
          };
        }
        return item;
      });
      
      setItensCompra(novosItens);
      toast.success(`Quantidade de ${produto.nome} atualizada no carrinho`);
    } else {
      // Adicionar novo item
      const novoItem: ItemCompra = {
        produto_id: produto.id,
        produto_nome: produto.nome,
        quantidade: 1,
        valor_unitario: Number(produto.preco_custo) || 0,
        valor_total: 1 * (Number(produto.preco_custo) || 0)
      };

      setItensCompra([...itensCompra, novoItem]);
      toast.success(`${produto.nome} adicionado ao carrinho`);
    }

    setIsSearchOpen(false);
    setSearchTerm("");
  };

  // Remover item da entrada
  const removeItem = (index: number) => {
    setItensCompra(itensCompra.filter((_, i) => i !== index));
  };

  // Finalizar entrada
  const finalizarEntrada = async () => {
    if (!fornecedorId) {
      toast.error('Selecione um fornecedor');
      return;
    }

    if (itensCompra.length === 0) {
      toast.error('Adicione produtos à entrada');
      return;
    }

    try {
      await axios.post('/api/compras', {
        fornecedor_id: fornecedorId,
        itens: itensCompra,
        criado_por: user?.id
      });

      toast.success('Entrada registrada com sucesso');
      setItensCompra([]);
      setFornecedorId("");
      fetchCompras();
    } catch (error) {
      toast.error('Erro ao registrar entrada');
    }
  };

  // Buscar produtos
  const fetchProdutos = async () => {
    try {
      const response = await axios.get('/api/produtos');
      setProdutos(response.data);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao carregar produtos');
    }
  };

  // Buscar compras
  const fetchCompras = async () => {
    try {
      const response = await axios.get('/api/compras');
      setCompras(response.data);
    } catch (error) {
      console.error('Erro ao buscar compras:', error);
      toast.error('Erro ao carregar compras');
    }
  };

  // Adicionar função para atualizar quantidade
  const updateQuantidade = (index: number, novaQuantidade: number) => {
    setItensCompra(itensCompra.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          quantidade: novaQuantidade,
          valor_total: novaQuantidade * Number(item.valor_unitario)
        };
      }
      return item;
    }));
  };

  // Adicionar função para atualizar preço de custo
  const updatePrecoCusto = (index: number, novoPreco: number) => {
    setItensCompra(itensCompra.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          valor_unitario: novoPreco,
          valor_total: item.quantidade * novoPreco
        };
      }
      return item;
    }));
  };

  // Adicionar função para buscar fornecedores
  const fetchFornecedores = async () => {
    try {
      const response = await axios.get('/api/fornecedores');
      setFornecedores(response.data);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      toast.error('Erro ao carregar fornecedores');
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchProdutos(),
          fetchCompras(),
          fetchFornecedores()
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Atualiza o total sempre que os itens mudarem
  useEffect(() => {
    const novoTotal = itensCompra.reduce((sum, item) => sum + item.valor_total, 0);
    setTotal(novoTotal);
  }, [itensCompra]);

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
          <h1 className="text-2xl font-bold">Entrada de Mercadorias</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/estoque')}>
            Estoque
          </Button>
          <Button variant="outline" onClick={() => router.push('/')}>
            PDV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_400px] gap-4">
        <Card className="p-4">
          <div className="flex gap-2 mb-4">
            <Input 
              placeholder="Código de barras..." 
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && barcodeInput) {
                  findProductByBarcode(barcodeInput);
                }
              }}
              className="flex-1"
            />
            <Button onClick={() => setIsSearchOpen(true)}>
              Buscar Produtos
            </Button>
          </div>

          {/* Modal de Busca de Produtos */}
          <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <DialogContent className="sm:max-w-[800px]">
              <DialogHeader>
                <DialogTitle>Buscar Produtos</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Buscar produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Estoque Atual</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Preço Custo</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {produtos
                        .filter(p => 
                          p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.codigo.includes(searchTerm)
                        )
                        .map(produto => (
                          <TableRow key={produto.id}>
                            <TableCell>{produto.codigo}</TableCell>
                            <TableCell>{produto.nome}</TableCell>
                            <TableCell>{produto.estoque}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={quantidade}
                                onChange={(e) => setQuantidade(Number(e.target.value))}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={precoCusto}
                                onChange={(e) => setPrecoCusto(Number(e.target.value))}
                                className="w-24"
                                placeholder={produto.preco_custo?.toString()}
                              />
                            </TableCell>
                            <TableCell>
                              <Button onClick={() => handleAddProduct(produto)}>
                                Adicionar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Lista de Itens da Entrada */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Preço Custo</TableHead>
                <TableHead>Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itensCompra.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.produto_nome}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantidade}
                      onChange={(e) => updateQuantidade(index, Number(e.target.value))}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.valor_unitario}
                      onChange={(e) => updatePrecoCusto(index, Number(e.target.value))}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    R$ {Number(item.valor_total).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      Remover
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Sidebar */}
        <Card className="p-4">
          <div className="space-y-4">
            <div className="text-2xl font-bold">Total da Entrada</div>
            <div className="text-4xl font-bold text-blue-600">
              R$ {total.toFixed(2)}
            </div>
            <div className="space-y-4">
              <div>
                <Label>Fornecedor</Label>
                <Select value={fornecedorId} onValueChange={setFornecedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.map(fornecedor => (
                      <SelectItem key={fornecedor.id} value={fornecedor.id}>
                        {fornecedor.nome} - {fornecedor.cnpj}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full"
                onClick={finalizarEntrada}
                disabled={itensCompra.length === 0 || !fornecedorId}
              >
                Finalizar Entrada
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Últimas Compras */}
      <Card className="mt-4 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Últimas Entradas</h2>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Usuário</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : compras.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Nenhuma entrada registrada
                </TableCell>
              </TableRow>
            ) : (
              compras.slice(0, 10).map((compra) => (
                <TableRow key={compra.id}>
                  <TableCell>
                    {new Date(compra.data).toLocaleString()}
                  </TableCell>
                  <TableCell>{compra.fornecedor_nome}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="link">
                          Ver Itens ({compra.itens?.length || 0})
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Itens da Entrada</DialogTitle>
                        </DialogHeader>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produto</TableHead>
                              <TableHead>Quantidade</TableHead>
                              <TableHead>Preço Custo</TableHead>
                              <TableHead>Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {compra.itens?.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.produto_nome}</TableCell>
                                <TableCell>{item.quantidade}</TableCell>
                                <TableCell>
                                  R$ {Number(item.valor_unitario).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  R$ {Number(item.valor_total).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                  <TableCell>
                    R$ {Number(compra.valor_total).toFixed(2)}
                  </TableCell>
                  <TableCell>{compra.usuario_nome}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
} 