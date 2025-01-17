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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [selectedSale, setSelectedSale] = useState<Venda | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
      convenio: 'Convênio'
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
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Data/Hora</TableHead>
                    <TableHead className="font-semibold">Vendedor</TableHead>
                    <TableHead className="font-semibold w-1/4">Itens</TableHead>
                    <TableHead className="font-semibold text-right">Subtotal</TableHead>
                    <TableHead className="font-semibold text-right">Desconto</TableHead>
                    <TableHead className="font-semibold text-right">Total</TableHead>
                    <TableHead className="font-semibold w-1/5">Pagamento</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
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
                  ) : vendas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhuma venda encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendas.map((venda) => (
                      <TableRow key={venda.id} className="hover:bg-gray-50">
                        <TableCell className="whitespace-nowrap">
                          {new Date(venda.data).toLocaleString()}
                        </TableCell>
                        <TableCell>{venda.vendedor_nome}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-between">
                            <div className="max-h-20 overflow-hidden space-y-1">
                              {Object.values(
                                venda.itens.reduce((acc, item) => {
                                  const key = item.produto_id;
                                  if (!acc[key]) {
                                    acc[key] = { ...item, quantidade: 0 };
                                  }
                                  acc[key].quantidade += item.quantidade;
                                  return acc;
                                }, {} as { [key: string]: any })
                              ).slice(0, 2).map((item, index) => (
                                <div key={index} className="text-sm">
                                  {item.quantidade}x {item.produto_nome}
                                </div>
                              ))}
                            </div>
                            {venda.itens.length > 2 && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedSale(venda);
                                  setIsDetailsOpen(true);
                                }}
                              >
                                Ver mais ({venda.itens.length})
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {Number(venda.valor_total).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {Number(venda.desconto) > 0 ? `- R$ ${Number(venda.desconto).toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          R$ {Number(venda.valor_final).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {Object.entries(
                              venda.pagamentos.reduce((acc, pag) => {
                                const forma = pag.forma_pagamento;
                                acc[forma] = (acc[forma] || 0) + Number(pag.valor);
                                return acc;
                              }, {} as { [key: string]: number })
                            ).map(([forma, valor]) => (
                              <div key={forma} className="text-sm">
                                {formatarFormaPagamento(forma)}: R$ {valor.toFixed(2)}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            venda.status === 'concluida' ? 'bg-green-100 text-green-800' : 
                            'bg-red-100 text-red-800'
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

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Data/Hora</span>
                  <p className="font-medium">{new Date(selectedSale.data).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Vendedor</span>
                  <p className="font-medium">{selectedSale.vendedor_nome}</p>
                </div>
                <div>
                  <span className="text-gray-500">Status</span>
                  <p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedSale.status === 'concluida' ? 'bg-green-100 text-green-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {formatarStatus(selectedSale.status)}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Itens</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Valor Un.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.values(
                      selectedSale.itens.reduce((acc, item) => {
                        const key = item.produto_id;
                        if (!acc[key]) {
                          acc[key] = { ...item, quantidade: 0 };
                        }
                        acc[key].quantidade += item.quantidade;
                        return acc;
                      }, {} as { [key: string]: any })
                    ).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.produto_nome}</TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right">
                          R$ {Number(item.valor_unitario).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {(item.quantidade * Number(item.valor_unitario)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">Subtotal</TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {Number(selectedSale.valor_total).toFixed(2)}
                      </TableCell>
                    </TableRow>
                    {Number(selectedSale.desconto) > 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-medium">Desconto</TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          - R$ {Number(selectedSale.desconto).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                      <TableCell className="text-right font-bold">
                        R$ {Number(selectedSale.valor_final).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div>
                <h3 className="font-medium mb-2">Pagamentos</h3>
                <div className="space-y-2">
                  {Object.entries(
                    selectedSale.pagamentos.reduce((acc, pag) => {
                      const forma = pag.forma_pagamento;
                      acc[forma] = (acc[forma] || 0) + Number(pag.valor);
                      return acc;
                    }, {} as { [key: string]: number })
                  ).map(([forma, valor]) => (
                    <div key={forma} className="flex justify-between items-center text-sm">
                      <span>{formatarFormaPagamento(forma)}</span>
                      <span>R$ {valor.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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