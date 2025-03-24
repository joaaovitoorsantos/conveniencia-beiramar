//@ts-nocheck
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/router';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from "@/hooks/useAuth";
import { X, AlertCircle, ChevronsUpDown, Check, Receipt, DollarSign, Users, Package, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, CommandInput, CommandItem, CommandEmpty, CommandGroup, CommandPopover, CommandTrigger } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import moment from 'moment-timezone';

// Configurar timezone
moment.tz.setDefault('America/Sao_Paulo');

interface PaymentMethod {
  id: string;
  method: string;
  amount: number;
  clientId?: string;
}

interface Discount {
  type: 'percentage' | 'fixed';
  value: number;
}

interface Product {
  id: string;
  codigo: string;
  nome: string;
  preco_venda: number;
  estoque: number;
  categoria_id?: string;
  categoria_nome?: string;
  preco_custo?: number;
  data_validade?: string;
}

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

interface Sale {
  id: string;
  data: string;
  valor_total: number;
  valor_final: number;
  desconto: number;
  status: string;
  vendedor_nome: string;
  pagamentos: {
    id: string;
    forma_pagamento: string;
    valor: number;
  }[];
}

interface CartItem {
  productId: string;
  code: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  limite_credito: number;
  valor_devido: number;
}

// Adicione a função formatPaymentMethods
const formatPaymentMethods = (methods: { method: string; amount: number }[]) => {
  return methods.map(m => {
    const methodNames: { [key: string]: string } = {
      dinheiro: "Dinheiro",
      cartao_credito: "Crédito",
      cartao_debito: "Débito",
      pix: "PIX",
      fiado: "Fiado"
    };
    return `${methodNames[m.method]}: R$ ${m.amount.toFixed(2)}`;
  }).join(" + ");
};

// Funções de formatação
const formatPaymentMethod = (method: string) => {
  const methods: { [key: string]: string } = {
    dinheiro: "Dinheiro",
    cartao_credito: "Crédito",
    cartao_debito: "Débito",
    pix: "PIX",
    convenio: "Convênio"
  };
  return methods[method] || method;
};

const formatStatus = (status: string) => {
  const statuses: { [key: string]: string } = {
    concluida: "Concluída",
    cancelada: "Cancelada",
    pendente: "Pendente"
  };
  return statuses[status] || status;
};

// Adicione esta função junto com as outras funções do componente
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

// Componente PDV
function PDVComponent() {
  const router = useRouter();
  const { user, hasPermission, logout } = useAuth();

  // Todos os estados
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [discount, setDiscount] = useState<Discount>({ type: 'fixed', value: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activePaymentIndex, setActivePaymentIndex] = useState(0);
  const [isFinalizingOpen, setIsFinalizingOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [caixaAtual, setCaixaAtual] = useState<string | null>(null);
  const [isOpenCaixaDialog, setIsOpenCaixaDialog] = useState(false);
  const [ultimasVendas, setUltimasVendas] = useState<Sale[]>([]);
  const [isNoCaixaDialogOpen, setIsNoCaixaDialogOpen] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [currentSaleData, setCurrentSaleData] = useState<any>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  // Funções auxiliares
  const addPaymentMethod = () => {
    const newId = `payment-${paymentMethods.length + 1}`;
    setPaymentMethods([...paymentMethods, { id: newId, method: '', amount: 0 }]);
  };

  const removePaymentMethod = (id: string) => {
    setPaymentMethods(paymentMethods.filter(method => method.id !== id));
  };

  const updatePaymentMethod = (id: string, field: 'method' | 'amount' | 'clientId', value: string | number) => {
    setPaymentMethods(paymentMethods.map(method => {
      if (method.id === id) {
        if (field === 'method') {
          console.log('Atualizando método de pagamento:', value);
          if (value === 'convenio') {
            setOpenCombobox(true);
            return { ...method, method: 'convenio', clientId: undefined };
          }
          setSelectedClient(null);
          return { ...method, method: value as string, clientId: undefined };
        }
        return { ...method, [field]: value };
      }
      return method;
    }));
  };

  // useEffects
  useEffect(() => {
    if (user && !hasPermission('pdv')) {
      toast.error('Você não tem permissão para acessar o PDV');
      router.replace('/login');
    }
  }, [user, hasPermission, router]);

  useEffect(() => {
    if (isSearchOpen) {
      fetchProducts();
    }
  }, [isSearchOpen]);

  // Mover os cálculos para fora do return
  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + item.total, 0);
  };

  const discountAmount = discount.type === 'percentage'
    ? (calculateSubtotal() * discount.value) / 100
    : discount.value;

  const totalSale = calculateSubtotal() - discountAmount;
  const totalPaid = paymentMethods.reduce((sum, method) => sum + (method.amount || 0), 0);
  const remaining = totalSale - totalPaid;

  // Handler global de teclas
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();

        // Se o modal já estiver aberto
        if (isFinalizingOpen) {
          // Verifica se tem algum método de pagamento
          if (paymentMethods.length === 0) {
            addPaymentMethod();
            return;
          }
          // Verifica se os valores estão corretos antes de confirmar
          const currentTotalPaid = paymentMethods.reduce((sum, method) => sum + (method.amount || 0), 0);
          const currentTotalSale = calculateSubtotal() - discountAmount;

          if (currentTotalPaid < currentTotalSale) {
            toast.error('Valor pago é menor que o total da venda');
            return;
          }
          await confirmarVenda();
        } else {
          // Se o modal estiver fechado
          // Verificar carrinho primeiro
          if (cartItems.length === 0) {
            toast.error('Adicione produtos ao carrinho');
            return;
          }

          // Verificar caixa
          if (!caixaAtual) {
            setIsNoCaixaDialogOpen(true);
            return;
          }

          // Se chegou aqui, temos itens no carrinho e caixa aberto
          setIsFinalizingOpen(true); // Abre o modal
          addPaymentMethod(); // Adiciona o primeiro método de pagamento
        }
      }

      if (e.key === 'F4') {
        e.preventDefault();
        cancelarVenda();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFinalizingOpen, caixaAtual, cartItems, paymentMethods, discount]);

  // Verificar caixa ao montar o componente
  useEffect(() => {
    const verificarCaixa = async () => {
      try {
        const response = await axios.get('/api/caixas/atual');
        setCaixaAtual(response.data);
      } catch (error: any) {
        if (error.response?.status === 404) {
          setIsNoCaixaDialogOpen(true);
        }
      }
    };

    verificarCaixa();
  }, []);

  // Função para buscar últimas vendas
  const fetchUltimasVendas = async () => {
    try {
      const response = await axios.get('/api/vendas/ultimas');
      setUltimasVendas(response.data);
    } catch (error) {
      console.error('Erro ao buscar últimas vendas:', error);
    }
  };

  // Buscar últimas vendas ao montar o componente e após cada venda
  useEffect(() => {
    fetchUltimasVendas();
  }, []);

  // Se não houver usuário, não renderiza nada
  if (!user) return null;

  // Resto das funções e retorno do JSX
  // Função para buscar todos os produtos
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/produtos');
      setProducts(response.data);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar produto por código
  const findProductByBarcode = async (code: string) => {
    try {
      const response = await axios.get(`/api/produtos?codigo=${code}`);
      if (response.data && response.data.length > 0) {
        const productResponse = await axios.get(`/api/produtos/${response.data[0].id}`);
        const product = productResponse.data;

        // Adiciona o produto ao carrinho
        addToCart(product);
        setBarcodeInput(""); // Limpa o input
      } else {
        toast.error('Produto não encontrado');
      }
    } catch (error) {
      toast.error('Erro ao buscar produto');
    }
  };

  // Handler para input de código de barras
  const handleBarcodeSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcodeInput) {
      findProductByBarcode(barcodeInput);
    }
  };

  // Produtos filtrados para a busca
  const filteredProducts = products.filter(product =>
    product.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.codigo.includes(searchTerm) ||
    (product.categoria_nome?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Atalhos dentro do modal de finalização
  const handlePaymentKeyDown = (e: React.KeyboardEvent, paymentId: string, index: number) => {
    switch (e.key) {
      case 'Enter':
        if (!paymentMethods[index].method) {
          e.preventDefault();
          // Foca no select de forma de pagamento
          document.getElementById(`payment-method-${paymentId}`)?.click();
        }
        break;
      case 'Tab':
        if (!e.shiftKey && index === paymentMethods.length - 1) {
          e.preventDefault();
          addPaymentMethod();
          setActivePaymentIndex(index + 1);
        }
        break;
      case 'Delete':
        if (e.ctrlKey) {
          e.preventDefault();
          removePaymentMethod(paymentId);
          setActivePaymentIndex(Math.max(0, index - 1));
        }
        break;
    }
  };

  // Função para sugerir valor restante
  const suggestRemainingAmount = (paymentId: string) => {
    const currentPayment = paymentMethods.find(p => p.id === paymentId);
    if (currentPayment) {
      updatePaymentMethod(paymentId, 'amount', remaining + (currentPayment.amount || 0));
    }
  };

  // Função para adicionar produto ao carrinho
  const addToCart = (product: Product) => {
    const existingItem = cartItems.find(item => item.productId === product.id);

    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.productId === product.id
          ? {
            ...item,
            quantity: item.quantity + quantity,
            total: (item.quantity + quantity) * Number(product.preco_venda)
          }
          : item
      ));
    } else {
      setCartItems([...cartItems, {
        productId: product.id,
        code: product.codigo,
        name: product.nome,
        quantity: quantity,
        price: Number(product.preco_venda),
        total: quantity * Number(product.preco_venda)
      }]);
    }

    setQuantity(1);
    setIsSearchOpen(false);
    setSearchTerm("");
  };

  // Função para remover item do carrinho
  const removeFromCart = (productId: string) => {
    setCartItems(cartItems.filter(item => item.productId !== productId));
  };

  // Função para atualizar quantidade de um item
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    setCartItems(cartItems.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
        : item
    ));
  };

  // Adicione o useEffect para carregar os clientes
  useEffect(() => {
    const loadClientes = async () => {
      try {
        const response = await axios.get('/api/clientes');
        setClientes(response.data);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
      }
    };

    loadClientes();
  }, []);

  // Nova função para confirmar a venda dentro do modal
  const confirmarVenda = async () => {
    // Verificar se tem alguma forma de pagamento sem valor
    const hasEmptyPayment = paymentMethods.some(p => !p.amount || p.amount <= 0);
    if (hasEmptyPayment) {
      toast.error('Todas as formas de pagamento devem ter um valor');
      return;
    }

    if (totalPaid < totalSale) {
      toast.error('Valor pago é menor que o total da venda');
      return;
    }

    // Verifica se tem pagamento por convênio e se selecionou o cliente
    const convenioPayment = paymentMethods.find(p => p.method === 'convenio');
    if (convenioPayment && !selectedClient) {
      toast.error('Selecione um cliente para pagamento por convênio');
      return;
    }

    // Verifica limite de crédito do cliente
    if (convenioPayment && selectedClient) {
      const limiteDisponivel = Number(selectedClient.limite_credito) - Number(selectedClient.valor_devido);
      if (convenioPayment.amount > limiteDisponivel) {
        toast.error(`Cliente não possui limite de crédito suficiente. Limite disponível: R$ ${limiteDisponivel.toFixed(2)}`);
        return;
      }
    }

    try {
      setLoading(true);

      const saleData = {
        items: cartItems,
        total: calculateSubtotal(),
        discount: discountAmount,
        paymentMethods,
        seller_id: user?.id,
        client_id: paymentMethods.find(p => p.method === 'convenio')?.clientId,
        caixa_id: caixaAtual.id
      };

      // Adiciona a conta a receber se for pagamento por convênio
      if (convenioPayment && selectedClient) {
        saleData.conta_receber = {
          cliente_id: selectedClient.id,
          valor: convenioPayment.amount,
          data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
        };
      }

      const response = await axios.post('/api/vendas', saleData);
      
      // Guarda os dados da venda para impressão
      setCurrentSaleData({
        items: cartItems,
        total: calculateSubtotal(),
        discount: discountAmount,
        totalPaid: totalPaid,
        paymentMethods,
        date: new Date(),
        change: totalPaid - (calculateSubtotal() - discountAmount)
      });

      // Limpa o carrinho e fecha o modal de finalização
      setCartItems([]);
      setPaymentMethods([]);
      setDiscount({ type: 'fixed', value: 0 });
      setSelectedClient(null);
      setIsFinalizingOpen(false);
      
      // Abre o modal de impressão
      setIsPrintModalOpen(true);

      // Recarrega as últimas vendas
      fetchUltimasVendas();
      
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      toast.error('Erro ao finalizar venda');
    } finally {
      setLoading(false);
    }
  };

  // Função para cancelar venda
  const cancelarVenda = () => {
    if (cartItems.length === 0) {
      toast.error('Não há itens no carrinho');
      return;
    }

    setCartItems([]);
    setPaymentMethods([]);
    setDiscount({ type: 'fixed', value: 0 });
    toast.success('Venda cancelada');

    // Focar no input de código de barras
    setTimeout(() => {
      const barcodeInput = document.querySelector('input[placeholder="Código de barras..."]') as HTMLInputElement;
      if (barcodeInput) {
        barcodeInput.focus();
      }
    }, 100);
  };

  // Função para imprimir o cupom
  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Cupom de Venda</title>
          <style>
            body {
              font-family: monospace;
              margin: 0;
              padding: 10px;
              width: 300px;
            }
            .header {
              text-align: center;
              margin-bottom: 15px;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
            }
            .header h2 {
              margin: 0;
              font-size: 16px;
              text-transform: uppercase;
            }
            .header p {
              margin: 5px 0 0;
              font-size: 12px;
            }
            .items {
              margin: 10px 0;
            }
            .item {
              margin: 8px 0;
            }
            .item-name {
              text-transform: uppercase;
              font-weight: bold;
              font-size: 12px;
            }
            .item-details {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              color: #444;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            .total {
              font-size: 12px;
            }
            .total-final {
              font-size: 14px;
              font-weight: bold;
              margin-top: 5px;
            }
            .payments {
              margin: 10px 0;
              font-size: 12px;
            }
            .payment {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              font-size: 12px;
              border-top: 1px dashed #000;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Conveniência Beira Mar</h2>
            <p>${new Date(currentSaleData.date).toLocaleString()}</p>
          </div>
          
          <div class="items">
            ${currentSaleData.items.map((item: any) => `
              <div class="item">
                <div class="item-name">${item.name.toUpperCase()}</div>
                <div class="item-details">
                  <span>${item.quantity} UN x R$ ${item.price.toFixed(2)}</span>
                  <span>R$ ${item.total.toFixed(2)}</span>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="divider"></div>

          <div class="total">
            <div>Subtotal: R$ ${currentSaleData.total.toFixed(2)}</div>
            ${currentSaleData.discount > 0 ? 
              `<div>Desconto: R$ ${currentSaleData.discount.toFixed(2)}</div>` : 
              ''}
            <div class="total-final">Total: R$ ${(currentSaleData.total - currentSaleData.discount).toFixed(2)}</div>
          </div>

          <div class="divider"></div>

          <div class="payments">
            ${currentSaleData.paymentMethods.map((payment: any) => `
              <div class="payment">
                <span>${payment.method.toUpperCase()}</span>
                <span>R$ ${payment.amount.toFixed(2)}</span>
              </div>
            `).join('')}
            ${currentSaleData.change > 0 ? `
              <div class="payment">
                <span>TROCO</span>
                <span>R$ ${currentSaleData.change.toFixed(2)}</span>
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <p>Obrigado pela preferência!</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }, [currentSaleData]);

  // Adicionar o useEffect para escutar o Backspace
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Backspace' && printDialogOpen) {
        setPrintDialogOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [printDialogOpen]);

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
          <h1 className="text-2xl font-bold">PDV</h1>
        </div>

        <div className="flex gap-2">
          {hasPermission('estoque') && (
            <Button 
              variant="outline" 
              onClick={() => router.push('/estoque')}
              className="flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              Estoque
            </Button>
          )}

          {hasPermission('financeiro') && (
            <Button 
              variant="outline" 
              onClick={() => router.push('/caixas')}
              className="flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Caixas
            </Button>
          )}

          {hasPermission('vendas') && (
            <Button 
              variant="outline" 
              onClick={() => router.push('/vendas')}
              className="flex items-center gap-2"
            >
              <Receipt className="h-4 w-4" />
              Vendas
            </Button>
          )}

          {hasPermission('vendas') && (
            <Button 
              variant="outline" 
              onClick={() => router.push('/clientes')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Clientes
            </Button>
          )}


          {hasPermission('estoque') && (
            <Button 
              variant="outline" 
              onClick={() => router.push('/fornecedores')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Fornecedores
            </Button>
          )}

          {hasPermission('configuracoes') && (
            <Button 
              variant="outline" 
              onClick={() => router.push('/configuracoes')}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurações
            </Button>
          )}

          {/* Botão de Logout */}
          <Button
            variant="outline"
            onClick={() => {
              logout();
              router.replace('/login');
            }}
          >
            Sair
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_400px] gap-4">
        {/* Main Content */}
        <Card className="p-4">
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Código de barras..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeSubmit}
              className="flex-1"
              autoFocus
            />
            <Button onClick={() => setIsSearchOpen(true)}>
              Buscar Produtos
            </Button>
          </div>

          <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <DialogContent className="sm:max-w-[800px] h-[600px]">
              <DialogHeader>
                <DialogTitle>Buscar Produtos</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Digite o nome, código ou categoria do produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
                <ScrollArea className="h-[400px] rounded-md border p-4">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-lg">Carregando...</div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Preço</TableHead>
                          <TableHead>Estoque</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>{product.codigo}</TableCell>
                            <TableCell className="font-medium">{product.nome}</TableCell>
                            <TableCell>{product.categoria_nome || '-'}</TableCell>
                            <TableCell>R$ {Number(product.preco_venda).toFixed(2)}</TableCell>
                            <TableCell>{product.estoque}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                max={product.estoque}
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => {
                                  addToCart(product);
                                  setIsSearchOpen(false);
                                  setSearchTerm("");
                                }}
                                disabled={product.estoque < 1}
                              >
                                Adicionar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredProducts.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              Nenhum produto encontrado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Preço Un.</TableHead>
                <TableHead>Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cartItems.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>R$ {item.price.toFixed(2)}</TableCell>
                  <TableCell>R$ {item.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeFromCart(item.productId)}
                    >
                      Remover
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {cartItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum item no carrinho
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Sidebar */}
        <Card className="p-4">
          <div className="space-y-4">
            <div className="text-2xl font-bold">Total da Compra</div>
            <div className="text-4xl font-bold text-green-600">
              R$ {(calculateSubtotal() - discountAmount).toFixed(2)}
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>R$ {calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Desconto:</span>
                  <div className="flex gap-2 items-center">
                    <Select
                      value={discount.type}
                      onValueChange={(value: 'percentage' | 'fixed') =>
                        setDiscount(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">R$</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={discount.value || ''}
                      onChange={(e) => setDiscount(prev => ({
                        ...prev,
                        value: parseFloat(e.target.value) || 0
                      }))}
                      className="w-[100px]"
                      placeholder="0,00"
                      step={discount.type === 'percentage' ? '1' : '0.01'}
                      min="0"
                      max={discount.type === 'percentage' ? '100' : calculateSubtotal()}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Valor do Desconto:</span>
                  <span>R$ {discountAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Dialog open={isFinalizingOpen} onOpenChange={setIsFinalizingOpen}>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    // Verificar carrinho primeiro
                    if (cartItems.length === 0) {
                      toast.error('Adicione produtos ao carrinho');
                      return;
                    }

                    // Verificar caixa
                    if (!caixaAtual) {
                      setIsNoCaixaDialogOpen(true);
                      return;
                    }

                    // Se chegou aqui, temos itens no carrinho e caixa aberto
                    setIsFinalizingOpen(true);
                    addPaymentMethod();
                  }}
                  disabled={loading}
                >
                  {loading ? 'Finalizando...' : 'Finalizar Venda (F2)'}
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Finalizar Venda (F2)</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-4">
                      {paymentMethods.map((payment, index) => (
                        <div
                          key={payment.id}
                          className={`space-y-2 p-2 ${index === activePaymentIndex ? 'bg-gray-50 rounded-lg' : ''}`}
                        >
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Label>Forma de Pagamento ({index + 1})</Label>
                              <Select
                                id={`payment-method-${payment.id}`}
                                value={payment.method}
                                onValueChange={(value) => {
                                  updatePaymentMethod(payment.id, 'method', value);
                                  // Foca automaticamente no input de valor
                                  document.getElementById(`payment-amount-${payment.id}`)?.focus();
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Pressione Enter" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                  <SelectItem value="cartao_debito">Débito</SelectItem>
                                  <SelectItem value="cartao_credito">Crédito</SelectItem>
                                  <SelectItem value="pix">PIX</SelectItem>
                                  <SelectItem value="convenio">Convênio</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex-1">
                              <Label>Valor (Enter = Restante)</Label>
                              <Input
                                id={`payment-amount-${payment.id}`}
                                type="number"
                                step="0.01"
                                value={payment.amount || ''}
                                onChange={(e) => updatePaymentMethod(payment.id, 'amount', parseFloat(e.target.value) || 0)}
                                onFocus={() => setActivePaymentIndex(index)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    suggestRemainingAmount(payment.id);
                                  }
                                  handlePaymentKeyDown(e, payment.id, index);
                                }}
                                placeholder="0,00"
                              />
                            </div>
                            {index > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removePaymentMethod(payment.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          {payment.method === 'convenio' && (
                            <div className="ml-4">
                              <Label>Selecione o Cliente</Label>
                              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCombobox}
                                    className="w-full justify-between"
                                  >
                                    {selectedClient ? selectedClient.nome : "Selecionar cliente..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0">
                                  <Command>
                                    <CommandInput placeholder="Buscar cliente..." />
                                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                    <CommandGroup className="max-h-[300px] overflow-auto">
                                      {clientes.map((cliente) => (
                                        <CommandItem
                                          key={cliente.id}
                                          onSelect={() => {
                                            setSelectedClient(cliente);
                                            setOpenCombobox(false);
                                            // Atualiza o clientId no método de pagamento
                                            const convenioPayment = paymentMethods.find(p => p.method === 'convenio');
                                            if (convenioPayment) {
                                              updatePaymentMethod(convenioPayment.id, 'clientId', cliente.id);
                                            }
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              selectedClient?.id === cliente.id ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          <div className="flex flex-col">
                                            <span>{cliente.nome}</span>
                                            <span className="text-sm text-gray-500">
                                              {cliente.cpf && `CPF: ${cliente.cpf}`}
                                            </span>
                                          </div>
                                          <div className="ml-auto text-sm">
                                            <span className={Number(cliente.valor_devido) > 0 ? "text-red-600" : "text-green-600"}>
                                              {Number(cliente.valor_devido) > 0 
                                                ? `Deve: R$ ${Number(cliente.valor_devido).toFixed(2)}`
                                                : "Sem débitos"}
                                            </span>
                                            <br />
                                            <span className="text-gray-500">
                                              Limite: R$ {Number(cliente.limite_credito).toFixed(2)}
                                            </span>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <Label>Subtotal</Label>
                        <div className="text-xl font-bold">R$ {calculateSubtotal().toFixed(2)}</div>
                      </div>
                      <div>
                        <Label>Desconto</Label>
                        <div className="text-xl font-bold text-green-600">
                          {discount.type === 'percentage' ? `${discount.value}% ` : ''}
                          (R$ {discountAmount.toFixed(2)})
                        </div>
                      </div>
                      <div>
                        <Label>Total da Venda</Label>
                        <div className="text-2xl font-bold">R$ {totalSale.toFixed(2)}</div>
                      </div>
                      <div>
                        <Label>Total Pago</Label>
                        <div className="text-2xl font-bold">R$ {totalPaid.toFixed(2)}</div>
                      </div>
                      <div>
                        <Label>Restante</Label>
                        <div className={`text-2xl font-bold ${remaining > 0 ? 'text-red-600' :
                            remaining < 0 ? 'text-green-600' : ''
                          }`}>
                          R$ {remaining.toFixed(2)}
                        </div>
                      </div>
                      {remaining < 0 && (
    <div>
                          <Label>Troco</Label>
                          <div className="text-2xl font-bold text-green-600">
                            R$ {Math.abs(remaining).toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={addPaymentMethod}
                    >
                      + Adicionar Forma de Pagamento
                    </Button>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsFinalizingOpen(false)}>
                        Cancelar (Esc)
                      </Button>
                      <Button
                        onClick={confirmarVenda}
                        disabled={
                          loading ||
                          remaining > 0 ||
                          paymentMethods.some(p => !p.amount || p.amount <= 0) ||
                          paymentMethods.some(p => p.method === 'convenio' && !p.clientId)
                        }
                      >
                        {loading ? 'Finalizando...' : 'Confirmar (F2)'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                className="w-full"
                variant="destructive"
                onClick={cancelarVenda}
                disabled={cartItems.length === 0}
              >
                Cancelar Venda (F4)
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Seção de Últimas Vendas */}
      <Card className="mt-4 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Últimas Vendas</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ultimasVendas.map((venda) => (
              <TableRow key={venda.id}>
                <TableCell>
                  {moment(venda.data).format('DD/MM/YYYY HH:mm:ss')}
                </TableCell>
                <TableCell>{venda.vendedor_nome}</TableCell>
                <TableCell>R$ {Number(venda.valor_final).toFixed(2)}</TableCell>
                <TableCell>
                  {venda.pagamentos?.map(p => (
                    <div key={p.id}>
                      {formatPaymentMethod(p.forma_pagamento)}: R$ {Number(p.valor).toFixed(2)}
                    </div>
                  ))}
                </TableCell>
              
                <TableCell>
                  <div className="text-sm space-y-1">
                    {(venda.itens || []).map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>
                          {item.quantidade}x {item.produto_nome}
                        </span>
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    venda.status === 'concluida' ? 'bg-green-100 text-green-800' :
                    venda.status === 'cancelada' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {formatStatus(venda.status)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {ultimasVendas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma venda realizada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isNoCaixaDialogOpen} onOpenChange={setIsNoCaixaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <AlertCircle className="h-16 w-16 text-yellow-500" />
              <DialogTitle className="text-xl">Nenhum Caixa Aberto</DialogTitle>
              <DialogDescription className="text-center">
                É necessário abrir um caixa antes de realizar vendas.
                Deseja ir para a página de caixas para abrir um novo?
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push('/caixas')}
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              Ir para Caixas
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setIsNoCaixaDialogOpen(false)}
            >
              <X className="mr-2 h-4 w-4" />
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPrintModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Imprimir Cupom</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Deseja imprimir o cupom desta venda?</p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsPrintModalOpen(false)}
            >
              Não (Backspace)
            </Button>
            <Button 
              onClick={() => {
                handlePrint();
                setIsPrintModalOpen(false);
              }}
              autoFocus // Foca automaticamente no botão Sim
            >
              Sim (Enter)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente dinâmico sem SSR
const Home = dynamic(() => Promise.resolve(PDVComponent), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Carregando...</div>
    </div>
  ),
});

export default Home;