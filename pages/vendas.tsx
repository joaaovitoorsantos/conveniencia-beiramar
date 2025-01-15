import dynamic from 'next/dynamic';
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-hot-toast";
import axios from "axios";

interface Venda {
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
  itens: {
    produto_id: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    produto_nome: string;
  }[];
}

function VendasComponent() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(false);
  const [periodoSelecionado, setPeriodoSelecionado] = useState('hoje');

  useEffect(() => {
    if (!hasPermission('vendas')) {
      toast.error('Você não tem permissão para acessar esta página');
      router.replace('/');
      return;
    }

    carregarVendas();
  }, [periodoSelecionado]);

  const carregarVendas = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/vendas?periodo=${periodoSelecionado}`);
      setVendas(response.data);
    } catch (error) {
      toast.error('Erro ao carregar vendas');
    } finally {
      setLoading(false);
    }
  };

  const formatarFormaPagamento = (forma: string) => {
    const formatos: { [key: string]: string } = {
      dinheiro: 'Dinheiro',
      cartao_credito: 'Cartão de Crédito',
      cartao_debito: 'Cartão de Débito',
      pix: 'PIX',
      fiado: 'Fiado'
    };
    return formatos[forma] || forma;
  };

  const formatarStatus = (status: string) => {
    const statusFormatos: { [key: string]: string } = {
      pendente: 'Pendente',
      concluida: 'Concluída',
      cancelada: 'Cancelada'
    };
    return statusFormatos[status] || status;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* TopBar */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
                className="flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Voltar ao PDV
              </Button>
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
              </div>
            </div>
            <div className="flex items-center">
              <Select
                value={periodoSelecionado}
                onValueChange={setPeriodoSelecionado}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana">Última Semana</SelectItem>
                  <SelectItem value="mes">Último Mês</SelectItem>
                  <SelectItem value="ano">Último Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <div className="p-6">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : vendas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhuma venda encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendas.map((venda) => (
                      <TableRow key={venda.id}>
                        <TableCell>
                          {new Date(venda.data).toLocaleString()}
                        </TableCell>
                        <TableCell>{venda.vendedor_nome}</TableCell>
                        <TableCell>
                          <div className="max-h-20 overflow-y-auto">
                            {venda.itens.map((item, index) => (
                              <div key={index} className="text-sm">
                                {item.quantidade}x {item.produto_nome}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>R$ {Number(venda.valor_total).toFixed(2)}</TableCell>
                        <TableCell>R$ {Number(venda.desconto).toFixed(2)}</TableCell>
                        <TableCell>R$ {Number(venda.valor_final).toFixed(2)}</TableCell>
                        <TableCell>
                          {venda.pagamentos.map((pag, index) => (
                            <div key={index} className="text-sm">
                              {formatarFormaPagamento(pag.forma_pagamento)}: R$ {Number(pag.valor).toFixed(2)}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            venda.status === 'concluida' ? 'bg-green-100 text-green-800' : 
                            venda.status === 'cancelada' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {formatarStatus(venda.status)}
                          </span>
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
    </div>
  );
}

// Componente dinâmico sem SSR
const Vendas = dynamic(() => Promise.resolve(VendasComponent), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Carregando...</div>
    </div>
  ),
});

export default Vendas; 