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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Legend
} from 'recharts';

// Componente principal
function CaixasComponent() {
  const router = useRouter();
  const { user } = useAuth();
  const [valorInicial, setValorInicial] = useState("");
  const [loading, setLoading] = useState(false);
  const [caixaAtual, setCaixaAtual] = useState<any>(null);
  const [historicoCaixas, setHistoricoCaixas] = useState<any[]>([]);
  const [periodoSelecionado, setPeriodoSelecionado] = useState('hoje');
  const [estatisticas, setEstatisticas] = useState({
    totalVendas: 0,
    mediaVendas: 0,
    totalCaixas: 0,
    saldoTotal: 0
  });

  useEffect(() => {
    verificarCaixa();
    carregarHistorico();
  }, [periodoSelecionado]);

  const verificarCaixa = async () => {
    try {
      const response = await axios.get('/api/caixas/atual');
      if (response.data) {
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
      const response = await axios.get(`/api/caixas/historico?periodo=${periodoSelecionado}`);
      setHistoricoCaixas(response.data.caixas);
      setEstatisticas(response.data.estatisticas);
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
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500">Total de Vendas</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              R$ {estatisticas.totalVendas.toFixed(2)}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500">Média por Venda</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              R$ {estatisticas.mediaVendas.toFixed(2)}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500">Total de Caixas</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {estatisticas.totalCaixas}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500">Saldo Total</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              R$ {estatisticas.saldoTotal.toFixed(2)}
            </p>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Movimentação do Caixa</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicoCaixas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="valor_final" stroke="#8884d8" name="Valor Final" />
                  <Line type="monotone" dataKey="valor_inicial" stroke="#82ca9d" name="Valor Inicial" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Vendas por Período</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historicoCaixas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total_vendas" fill="#8884d8" name="Total de Vendas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

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
                      {new Date(caixaAtual.data_abertura).toLocaleString('pt-BR', { hour12: false })}
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

        {/* Histórico de Caixas */}
        <Card>
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
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
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
        </Card>
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