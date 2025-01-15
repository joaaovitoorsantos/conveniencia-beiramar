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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Client {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  address: string;
  totalDebt: number;
}

interface DebtItem {
  id: string;
  clientId: string;
  date: Date;
  dueDate: Date;
  items: {
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  total: number;
  paid: number;
  remaining: number;
  status: 'pending' | 'partial' | 'paid';
}

export default function Clientes() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({});
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  // Simulação de clientes com dívidas
  const [clients] = useState<Client[]>([
    {
      id: "1",
      name: "João da Silva",
      cpf: "123.456.789-00",
      phone: "(11) 98765-4321",
      email: "joao@email.com",
      address: "Rua A, 123",
      totalDebt: 150.00
    },
    {
      id: "2",
      name: "Maria Oliveira",
      cpf: "987.654.321-00",
      phone: "(11) 91234-5678",
      email: "maria@email.com",
      address: "Rua B, 456",
      totalDebt: 75.50
    }
  ]);

  // Simulação de dívidas
  const [debts] = useState<DebtItem[]>([
    {
      id: "1",
      clientId: "1",
      date: new Date("2024-01-15"),
      dueDate: new Date("2024-02-15"),
      items: [
        { productName: "Coca-Cola 2L", quantity: 2, price: 12.00, total: 24.00 },
        { productName: "Pão de Forma", quantity: 1, price: 8.00, total: 8.00 }
      ],
      total: 32.00,
      paid: 0,
      remaining: 32.00,
      status: 'pending'
    },
    {
      id: "2",
      clientId: "1",
      date: new Date("2024-01-20"),
      dueDate: new Date("2024-02-20"),
      items: [
        { productName: "Cerveja Lata", quantity: 12, price: 5.00, total: 60.00 },
        { productName: "Carvão", quantity: 1, price: 25.00, total: 25.00 }
      ],
      total: 85.00,
      paid: 35.00,
      remaining: 50.00,
      status: 'partial'
    }
  ]);

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.cpf.includes(searchTerm)
  );

  const clientDebts = (clientId: string) => 
    debts.filter(debt => debt.clientId === clientId);

  const handleAddClient = () => {
    if (newClient.name && newClient.cpf) {
      // Implementar adição de cliente
      setNewClient({});
      setIsAddClientOpen(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
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
          <h1 className="text-2xl font-bold">Clientes</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/')}>
            PDV
          </Button>
          <Button variant="outline" onClick={() => router.push('/vendas')}>
            Vendas
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <Card className="p-4">
          <div className="flex gap-2 mb-4">
            <Input 
              placeholder="Buscar por nome ou CPF..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
              <DialogTrigger asChild>
                <Button>Adicionar Cliente</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Cliente</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label>Nome Completo</Label>
                    <Input
                      value={newClient.name || ''}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      placeholder="Nome do cliente"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>CPF</Label>
                      <Input
                        value={newClient.cpf || ''}
                        onChange={(e) => setNewClient({ ...newClient, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={newClient.phone || ''}
                        onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newClient.email || ''}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label>Endereço</Label>
                    <Input
                      value={newClient.address || ''}
                      onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                      placeholder="Endereço completo"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddClientOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddClient}>
                    Salvar Cliente
                  </Button>
                </div>
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
                  <TableHead>Total em Aberto</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow 
                    key={client.id} 
                    className={selectedClient === client.id ? 'bg-gray-100' : ''}
                  >
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.cpf}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell className="font-bold text-red-600">
                      R$ {client.totalDebt.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedClient(
                          selectedClient === client.id ? null : client.id
                        )}
                      >
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>

        {/* Painel de Detalhes */}
        <Card className="p-4">
          <h2 className="text-xl font-bold mb-4">Detalhes das Dívidas</h2>
          {selectedClient ? (
            <ScrollArea className="h-[600px]">
              <Accordion type="single" collapsible>
                {clientDebts(selectedClient).map((debt) => (
                  <AccordionItem key={debt.id} value={debt.id}>
                    <AccordionTrigger className="hover:bg-gray-50 px-4">
                      <div className="flex justify-between items-center w-full">
                        <span>{formatDate(debt.date)}</span>
                        <span className="font-bold text-red-600">
                          R$ {debt.remaining.toFixed(2)}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4">
                      <div className="space-y-4">
                        <div className="text-sm text-gray-500">
                          Vencimento: {formatDate(debt.dueDate)}
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produto</TableHead>
                              <TableHead>Qtd</TableHead>
                              <TableHead>Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {debt.items.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.productName}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>R$ {item.total.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="flex justify-between text-sm">
                          <span>Total:</span>
                          <span>R$ {debt.total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Pago:</span>
                          <span>R$ {debt.paid.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Restante:</span>
                          <span className="text-red-600">
                            R$ {debt.remaining.toFixed(2)}
                          </span>
                        </div>
                        <Button className="w-full">
                          Registrar Pagamento
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          ) : (
            <div className="text-center text-gray-500">
              Selecione um cliente para ver os detalhes
            </div>
          )}
        </Card>
      </div>
    </div>
  );
} 