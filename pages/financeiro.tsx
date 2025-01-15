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
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CashRegister {
  id: string;
  openingDate: Date;
  closingDate?: Date;
  initialAmount: number;
  currentAmount: number;
  status: 'open' | 'closed';
  operator: string;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  date: Date;
  type: 'sale' | 'expense' | 'withdrawal' | 'deposit';
  amount: number;
  description: string;
  paymentMethod?: string;
}

interface TopProduct {
  id: string;
  name: string;
  quantity: number;
  total: number;
}

interface CriticalStock {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  lastPurchase?: Date;
}

export default function Financeiro() {
  const router = useRouter();
  const [isOpenRegisterOpen, setIsOpenRegisterOpen] = useState(false);
  const [isCloseRegisterOpen, setIsCloseRegisterOpen] = useState(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("");
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({});
  const [selectedRegister, setSelectedRegister] = useState<string | null>(null);

  // Simulação de dados
  const [registers] = useState<CashRegister[]>([
    {
      id: "1",
      openingDate: new Date("2024-01-20 08:00"),
      initialAmount: 200.00,
      currentAmount: 1500.50,
      status: 'open',
      operator: "João Silva",
      transactions: [
        {
          id: "1",
          date: new Date("2024-01-20 09:15"),
          type: 'sale',
          amount: 150.00,
          description: "Venda #1234",
          paymentMethod: "dinheiro"
        },
        {
          id: "2",
          date: new Date("2024-01-20 10:30"),
          type: 'expense',
          amount: -50.00,
          description: "Troco fornecido"
        }
      ]
    }
  ]);

  const topProducts: TopProduct[] = [
    { id: "1", name: "Coca-Cola 350ml", quantity: 150, total: 675.00 },
    { id: "2", name: "Cerveja Heineken", quantity: 120, total: 948.00 },
    { id: "3", name: "Salgadinho Doritos", quantity: 85, total: 756.50 },
  ];

  const criticalStock: CriticalStock[] = [
    { 
      id: "1", 
      name: "Água Mineral 500ml", 
      currentStock: 5, 
      minStock: 20, 
      lastPurchase: new Date("2024-01-15") 
    },
    { 
      id: "2", 
      name: "Refrigerante Guaraná", 
      currentStock: 3, 
      minStock: 15, 
      lastPurchase: new Date("2024-01-10") 
    }
  ];

  const handleOpenRegister = (initialAmount: number) => {
    // Implementar abertura de caixa
    setIsOpenRegisterOpen(false);
  };

  const handleCloseRegister = () => {
    // Implementar fechamento de caixa
    setIsCloseRegisterOpen(false);
  };

  const handleAddTransaction = () => {
    // Implementar adição de transação
    setIsAddTransactionOpen(false);
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
          <h1 className="text-2xl font-bold">Financeiro</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/')}>
            PDV
          </Button>
          <Button variant="outline" onClick={() => router.push('/estoque')}>
            Estoque
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <div className="space-y-4">
          {/* Caixa Atual */}
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Caixa Atual</h2>
              <div className="flex gap-2">
                <Dialog open={isOpenRegisterOpen} onOpenChange={setIsOpenRegisterOpen}>
                  <DialogTrigger asChild>
                    <Button>Abrir Caixa</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Abrir Caixa</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label>Valor Inicial</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <Label>Observações</Label>
                        <Input placeholder="Observações sobre a abertura" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsOpenRegisterOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={() => handleOpenRegister(0)}>
                        Confirmar Abertura
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isCloseRegisterOpen} onOpenChange={setIsCloseRegisterOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">Fechar Caixa</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Fechar Caixa</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Dinheiro em Caixa</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                          />
                        </div>
                        <div>
                          <Label>Diferença</Label>
                          <div className="text-2xl font-bold text-red-600">
                            R$ 0,00
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label>Observações</Label>
                        <Input placeholder="Observações sobre o fechamento" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCloseRegisterOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCloseRegister}>
                        Confirmar Fechamento
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <Card className="p-4 bg-green-50">
                <div className="text-sm text-gray-500">Saldo Atual</div>
                <div className="text-2xl font-bold text-green-600">R$ 1.500,50</div>
              </Card>
              <Card className="p-4 bg-blue-50">
                <div className="text-sm text-gray-500">Vendas Hoje</div>
                <div className="text-2xl font-bold text-blue-600">R$ 1.350,50</div>
              </Card>
              <Card className="p-4 bg-yellow-50">
                <div className="text-sm text-gray-500">Despesas Hoje</div>
                <div className="text-2xl font-bold text-yellow-600">R$ 50,00</div>
              </Card>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Últimas Transações</h3>
              <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Nova Transação</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Transação</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div>
                      <Label>Tipo</Label>
                      <Select
                        value={newTransaction.type}
                        onValueChange={(value: 'sale' | 'expense' | 'withdrawal' | 'deposit') => 
                          setNewTransaction({ ...newTransaction, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deposit">Entrada</SelectItem>
                          <SelectItem value="withdrawal">Retirada</SelectItem>
                          <SelectItem value="expense">Despesa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Valor</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={newTransaction.amount || ''}
                        onChange={(e) => setNewTransaction({ 
                          ...newTransaction, 
                          amount: parseFloat(e.target.value) 
                        })}
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        placeholder="Descrição da transação"
                        value={newTransaction.description || ''}
                        onChange={(e) => setNewTransaction({ 
                          ...newTransaction, 
                          description: e.target.value 
                        })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddTransactionOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddTransaction}>
                      Adicionar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registers[0].transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {transaction.date.toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        transaction.type === 'sale' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type === 'sale' ? 'Venda' : 'Despesa'}
                      </span>
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell className={
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }>
                      R$ {Math.abs(transaction.amount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Relatórios */}
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Relatórios</h2>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-24">
                Relatório de Vendas
              </Button>
              <Button variant="outline" className="h-24">
                Relatório de Caixa
              </Button>
              <Button variant="outline" className="h-24">
                Relatório de Produtos
              </Button>
              <Button variant="outline" className="h-24">
                Relatório de Despesas
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Produtos Mais Vendidos */}
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Produtos Mais Vendidos</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>R$ {product.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Estoque Crítico */}
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Estoque Crítico</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Atual</TableHead>
                  <TableHead>Mínimo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criticalStock.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className="text-red-600 font-bold">
                      {product.currentStock}
                    </TableCell>
                    <TableCell>{product.minStock}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
} 