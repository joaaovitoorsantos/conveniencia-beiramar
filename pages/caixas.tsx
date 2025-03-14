import dynamic from 'next/dynamic';
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from 'next/router';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from "@/hooks/useAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { Package, Wallet } from "lucide-react";

// Função para formatar data
const formatarData = (data: string) => {
  const dataObj = new Date(data);
  return dataObj.toLocaleString('pt-BR', { 
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

// Função para formatar data curta
const formatarDataCurta = (data: string) => {
  const dataObj = new Date(data);
  return dataObj.toLocaleString('pt-BR', { 
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Componente principal
function CaixasComponent() {
  const router = useRouter();
  const { user } = useAuth();
  const [valorInicial, setValorInicial] = useState("");
  const [loading, setLoading] = useState(false);
  const [caixaAtual, setCaixaAtual] = useState<any>(null);
  const [historicoCaixas, setHistoricoCaixas] = useState<any[]>([]);
  const [estatisticas, setEstatisticas] = useState({
    totalVendas: 0,
    mediaVendas: 0,
    totalCaixas: 0,
    saldoTotal: 0
  });
  const [produtosMaisVendidos, setProdutosMaisVendidos] = useState<any[]>([]);
  const [totaisPorFormaPagamento, setTotaisPorFormaPagamento] = useState<any[]>([]);

  useEffect(() => {
    verificarCaixa();
    carregarHistorico();
  }, []);

  const verificarCaixa = async () => {
    try {
      const response = await axios.get('/api/caixas/atual');
      if (response.data) {
        console.log('Data do caixa recebida da API:', response.data.data_abertura);
        setCaixaAtual({
          ...response.data,
          valor_inicial: Number(response.data.valor_inicial)
        });
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status !== 404) {
        toast.error('Erro ao verificar caixa');
      }
    }
  };

  const carregarHistorico = async () => {
    try {
      const response = await axios.get(`/api/caixas/historico?periodo=hoje`);
      setHistoricoCaixas(response.data.caixas);
      setEstatisticas(response.data.estatisticas);
      setProdutosMaisVendidos(response.data.produtosMaisVendidos);
      setTotaisPorFormaPagamento(response.data.totaisPorFormaPagamento);
    } catch (error) {
      toast.error('Erro ao carregar histórico');
    }
  };

  const abrirCaixa = async () => {
    if (!user?.id) {
      toast.error('Usuário não identificado');
      return;
    }

    try {
      setLoading(true);
      await axios.post('/api/caixas', {
        valor_inicial: parseFloat(valorInicial),
        operador_id: user.id
      });
      toast.success('Caixa aberto com sucesso');
      verificarCaixa();
      carregarHistorico();
    } catch (error) {
      toast.error('Erro ao abrir caixa');
    } finally {
      setLoading(false);
    }
  };

  const fecharCaixa = async () => {
    try {
      setLoading(true);
      await axios.put(`/api/caixas/${caixaAtual.id}/fechar`);
      toast.success('Caixa fechado com sucesso');
      setCaixaAtual(null);
      carregarHistorico();
    } catch (error) {
      toast.error('Erro ao fechar caixa');
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

  // Cores para o PieChart
  const COLORS = ['#22c55e', '#f59e0b'];

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
                <h1 className="text-2xl font-bold text-gray-900">Gestão de Caixa</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards de Estatísticas do Caixa Atual */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500">Total de Vendas (Caixa Atual)</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              R$ {estatisticas.totalVendas.toFixed(2)}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500">Média por Venda (Caixa Atual)</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              R$ {estatisticas.mediaVendas.toFixed(2)}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500">Caixas Exibidos</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {estatisticas.totalCaixas}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500">Saldo Total (Caixa Atual)</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              R$ {(Number(caixaAtual?.valor_inicial || 0) + Number(estatisticas.totalVendas)).toFixed(2)}
            </p>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Gráfico de Movimentação do Caixa */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Movimentação do Caixa Atual</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicoCaixas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="data_abertura"
                    tickFormatter={(value) => formatarDataCurta(value)}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => formatarDataCurta(value)}
                    formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, '']}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="valor_inicial" 
                    stackId="1"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    name="Valor Inicial" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey={(data) => Number(data.total_vendas)} 
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    name="Vendas" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Gráfico de Vendas */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Vendas do Caixa Atual</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historicoCaixas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="data_abertura"
                    tickFormatter={(value) => formatarDataCurta(value)}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => formatarDataCurta(value)}
                    formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, '']}
                  />
                  <Legend />
                  <Bar 
                    dataKey="total_vendas" 
                    fill="#4f46e5" 
                    name="Total de Vendas"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Gráfico de Faturamento */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Faturamento do Caixa Atual</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historicoCaixas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="data_abertura"
                    tickFormatter={(value) => formatarDataCurta(value)}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => formatarDataCurta(value)}
                    formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, '']}
                  />
                  <Legend />
                  <Bar 
                    dataKey="total_vendas" 
                    fill="#22c55e" 
                    name="Faturamento Bruto"
                  />
                  <Bar 
                    dataKey={(data) => data.total_vendas - data.custo_total} 
                    fill="#f59e0b" 
                    name="Faturamento Líquido"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

                {/* Formas de Pagamento */}
        <Card className="mb-8">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Wallet className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Formas de Pagamento</h2>
            </div>
            {/* Debug info */}
            <div className="text-xs text-gray-500 mb-4">
              Total de formas de pagamento: {totaisPorFormaPagamento?.length || 0}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Média por Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totaisPorFormaPagamento?.map((pagamento) => {
                  return (
                    <TableRow key={pagamento.forma_pagamento}>
                      <TableCell>{formatarFormaPagamento(pagamento.forma_pagamento)}</TableCell>
                      <TableCell className="text-right">{pagamento.quantidade_pagamentos}</TableCell>
                      <TableCell className="text-right">
                        R$ {Number(pagamento.valor_total).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {(Number(pagamento.valor_total) / pagamento.quantidade_pagamentos).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!totaisPorFormaPagamento || totaisPorFormaPagamento.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum pagamento no período
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>


        {/* Caixa Atual */}
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">Caixa Atual</h2>
            {caixaAtual ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Aberto em</p>
                    <p className="text-lg font-medium">
                      {formatarData(caixaAtual.data_abertura)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Valor Inicial</p>
                    <p className="text-lg font-medium">
                      R$ {caixaAtual.valor_inicial.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Operador</p>
                    <p className="text-lg font-medium">{caixaAtual.operador_nome}</p>
                  </div>
                </div>
                <Button 
                  onClick={fecharCaixa} 
                  disabled={loading}
                  variant="destructive"
                >
                  {loading ? 'Fechando...' : 'Fechar Caixa'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Inicial
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valorInicial}
                    onChange={(e) => setValorInicial(e.target.value)}
                    placeholder="0.00"
                    className="max-w-xs"
                  />
                </div>
                <Button 
                  onClick={abrirCaixa} 
                  disabled={loading || !valorInicial}
                >
                  {loading ? 'Abrindo...' : 'Abrir Caixa'}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Produtos Mais Vendidos */}
        <Card className="mb-8">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Package className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Produtos Mais Vendidos</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd. Vendida</TableHead>
                  <TableHead className="text-right">Total Vendas</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosMaisVendidos?.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell>{produto.codigo}</TableCell>
                    <TableCell>{produto.nome}</TableCell>
                    <TableCell className="text-right">{produto.total_quantidade}</TableCell>
                    <TableCell className="text-right">
                      R$ {Number(produto.total_vendas).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {(Number(produto.total_vendas) / produto.total_vendas_distintas).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                {(!produtosMaisVendidos || produtosMaisVendidos.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum produto vendido no período
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Histórico de Caixas */}
        {/* <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">Histórico de Caixas</h2>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Operador</TableHead>
                    <TableHead>Valor Inicial</TableHead>
                    <TableHead>Valor Final</TableHead>
                    <TableHead>Total Vendas</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicoCaixas.map((caixa) => (
                    <TableRow key={caixa.id}>
                      <TableCell>
                        {new Date(caixa.data_abertura).toLocaleString('pt-BR', { hour12: false })}
                      </TableCell>
                      <TableCell>{caixa.operador_nome}</TableCell>
                      <TableCell>R$ {Number(caixa.valor_inicial).toFixed(2)}</TableCell>
                      <TableCell>R$ {Number(caixa.valor_final || 0).toFixed(2)}</TableCell>
                      <TableCell>R$ {Number(caixa.total_vendas || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          caixa.data_fechamento 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {caixa.data_fechamento ? 'Fechado' : 'Aberto'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </Card> */}
      </div>
    </div>
  );
}

// Componente dinâmico sem SSR
const Caixas = dynamic(() => Promise.resolve(CaixasComponent), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Carregando...</div>
    </div>
  ),
});

export default Caixas; 