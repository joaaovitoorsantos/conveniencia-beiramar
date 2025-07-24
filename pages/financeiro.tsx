import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useState, useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Calendar, DollarSign, User, Clock, CreditCard, Wallet } from "lucide-react";

interface CashRegister {
  id: string;
  data_abertura: string;
  data_fechamento?: string;
  valor_inicial: number;
  valor_final?: number;
  diferenca?: number;
  status: 'aberto' | 'fechado';
  operador_id: string;
  operador_nome: string;
  operador_email: string;
  observacoes?: string;
  criado_em: string;
  formas_pagamento?: {
    forma_pagamento: string;
    quantidade_pagamentos: number;
    valor_total: number;
  }[];
}

interface Usuario {
  id: string;
  nome: string;
  usuario: string;
  email: string;
  ativo: boolean;
  perfil_nome: string;
  perfil_id: string;
}

interface FormaPagamento {
  forma_pagamento: string;
  quantidade_pagamentos: number;
  valor_total: number;
}

interface EstatisticasCaixa {
  totalVendas: number;
  mediaVendas: number;
  totalCaixas: number;
  saldoTotal: number;
  lucroBruto: number;
}

export default function Financeiro() {
  const router = useRouter();
  const [caixas, setCaixas] = useState<CashRegister[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Não usamos mais formasPagamento global, pois agora vem por caixa
  const [estatisticas, setEstatisticas] = useState<EstatisticasCaixa>({
    totalVendas: 0,
    mediaVendas: 0,
    totalCaixas: 0,
    saldoTotal: 0,
    lucroBruto: 0
  });
  const [loadingEstatisticas, setLoadingEstatisticas] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState<string>(new Date().toISOString().split('T')[0]);

  // Estados para filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [operadorFilter, setOperadorFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<string>('data_abertura');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Buscar caixas da API
  useEffect(() => {
    const fetchCaixas = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/caixas');
        if (response.ok) {
          const data = await response.json();
          setCaixas(data);
        } else {
          setError('Erro ao carregar caixas');
        }
      } catch (error) {
        console.error('Erro ao buscar caixas:', error);
        setError('Erro ao carregar caixas');
      } finally {
        setLoading(false);
      }
    };

    fetchCaixas();
  }, []);

  // Buscar usuários para seleção de operador
  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const response = await fetch('/api/usuarios');
        if (response.ok) {
          const data = await response.json();
          setUsuarios(data.filter((user: Usuario) => user.ativo));
        }
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
      }
    };

    fetchUsuarios();
  }, []);

  // Buscar estatísticas do caixa atual
  const fetchEstatisticas = async (data?: string) => {
    try {
      setLoadingEstatisticas(true);
      const dataParaBuscar = data || dataSelecionada;
      const response = await fetch(`/api/caixas/historico?data=${dataParaBuscar}`);
      if (response.ok) {
        const data = await response.json();
        // Atualiza caixas do dia (cada um com formas_pagamento)
        setCaixas(data.caixas || []);
        setEstatisticas(data.estatisticas || {
          totalVendas: 0,
          mediaVendas: 0,
          totalCaixas: 0,
          saldoTotal: 0,
          lucroBruto: 0
        });
      } else {
        console.error('Erro na resposta da API:', response.status);
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoadingEstatisticas(false);
    }
  };

  // Buscar estatísticas ao montar o componente
  useEffect(() => {
    fetchEstatisticas();
  }, []);

  // Filtrar e ordenar caixas
  const filteredAndSortedCaixas = useMemo(() => {
    let filtered = caixas.filter(caixa => {
      const matchesSearch = 
        caixa.operador_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caixa.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (caixa.observacoes && caixa.observacoes.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const isOpen = !caixa.data_fechamento;
      const currentStatus = isOpen ? 'aberto' : 'fechado';
      const matchesStatus = statusFilter === 'todos' || currentStatus === statusFilter;
      const matchesOperador = operadorFilter === 'todos' || caixa.operador_id === operadorFilter;
      
      return matchesSearch && matchesStatus && matchesOperador;
    });

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof CashRegister];
      let bValue: any = b[sortBy as keyof CashRegister];
      
      if (sortBy === 'data_abertura' || sortBy === 'data_fechamento' || sortBy === 'criado_em') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [caixas, searchTerm, statusFilter, operadorFilter, sortBy, sortOrder]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (caixa: CashRegister) => {
    const isOpen = !caixa.data_fechamento;
    return (
      <Badge variant={isOpen ? 'default' : 'secondary'} className={
        isOpen 
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
      }>
        {isOpen ? 'Aberto' : 'Fechado'}
      </Badge>
    );
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('todos');
    setOperadorFilter('todos');
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

  const getFormaPagamentoIcon = (forma: string) => {
    switch (forma) {
      case 'dinheiro':
        return <Wallet className="w-4 h-4" />;
      case 'cartao_credito':
      case 'cartao_debito':
        return <CreditCard className="w-4 h-4" />;
      case 'pix':
        return <DollarSign className="w-4 h-4" />;
      case 'convenio':
        return <User className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando caixas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

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

      <div className="space-y-4">
        {/* Estatísticas dos Caixas */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 bg-blue-50">
            <div className="text-sm text-gray-500">Total de Caixas</div>
            <div className="text-2xl font-bold text-blue-600">{caixas.length}</div>
          </Card>
          <Card className="p-4 bg-green-50">
            <div className="text-sm text-gray-500">Caixas Abertos</div>
            <div className="text-2xl font-bold text-green-600">
              {caixas.filter(c => !c.data_fechamento).length}
            </div>
          </Card>
          <Card className="p-4 bg-red-50">
            <div className="text-sm text-gray-500">Caixas Fechados</div>
            <div className="text-2xl font-bold text-red-600">
              {caixas.filter(c => c.data_fechamento).length}
            </div>
          </Card>
          <Card className="p-4 bg-yellow-50">
            <div className="text-sm text-gray-500">Total em Caixa</div>
            <div className="text-2xl font-bold text-yellow-600">
              {(() => {
                const total = caixas.reduce((total, c) => {
                  // Converter para número e validar
                  const valorFinal = parseFloat(c.valor_final as any) || 0;
                  const valorInicial = parseFloat(c.valor_inicial as any) || 0;
                  
                  // Usar valor final se for maior que 0, senão usar valor inicial
                  const valor = valorFinal > 0 ? valorFinal : valorInicial;
                  
                  console.log(`Caixa ${c.id}: Final=${c.valor_final}, Inicial=${c.valor_inicial}, Usado=${valor}`);
                  
                  return total + valor;
                }, 0);
                
                console.log('Total final:', total);
                return formatCurrency(total);
              })()}
            </div>
          </Card>
        </div>

                {/* Estatísticas do Caixa */}
        <Card className="p-6">
          {/* Header com controles */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Estatísticas do Caixa</h2>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(dataSelecionada).toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const ontem = new Date();
                  ontem.setDate(ontem.getDate() - 1);
                  const dataOntem = ontem.toISOString().split('T')[0];
                  setDataSelecionada(dataOntem);
                  fetchEstatisticas(dataOntem);
                }}
              >
                Ontem
              </Button>
              <Input
                type="date"
                value={dataSelecionada}
                onChange={(e) => {
                  setDataSelecionada(e.target.value);
                  fetchEstatisticas(e.target.value);
                }}
                className="w-36"
                max={new Date().toISOString().split('T')[0]}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const hoje = new Date().toISOString().split('T')[0];
                  setDataSelecionada(hoje);
                  fetchEstatisticas(hoje);
                }}
              >
                Hoje
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchEstatisticas()}
                disabled={loadingEstatisticas}
              >
                {loadingEstatisticas ? '⏳' : '🔄'}
              </Button>
            </div>
          </div>

          {/* Cards de estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Vendas</p>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(estatisticas.totalVendas)}</p>
                </div>
                <div className="text-blue-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Média</p>
                  <p className="text-lg font-bold text-green-900">{formatCurrency(estatisticas.mediaVendas)}</p>
                </div>
                <div className="text-green-400">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Caixas</p>
                  <p className="text-lg font-bold text-purple-900">{estatisticas.totalCaixas}</p>
                </div>
                <div className="text-purple-400">
                  <User className="w-6 h-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">Saldo</p>
                  <p className="text-lg font-bold text-orange-900">{formatCurrency(estatisticas.saldoTotal)}</p>
                </div>
                <div className="text-orange-400">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-lg border border-teal-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-teal-700 uppercase tracking-wide">Lucro</p>
                  <p className="text-lg font-bold text-teal-900">{formatCurrency(estatisticas.lucroBruto)}</p>
                </div>
                <div className="text-teal-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Formas de Pagamento por Caixa */}
          <div>
            <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Formas de Pagamento por Caixa</h3>
            </div>
            {caixas.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">Nenhum pagamento registrado</p>
                <p className="text-sm text-gray-400 mt-1">
                  em {new Date(dataSelecionada).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {caixas.map((caixa, idx) => (
                  <div key={caixa.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-700">Caixa {idx + 1}</span>
                        <span className="text-gray-500 text-sm">ID: {caixa.id.substring(0, 8)}...</span>
                        <span className="text-gray-500 text-sm">Operador: {caixa.operador_nome}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Abertura: {formatDateShort(caixa.data_abertura)} {formatTime(caixa.data_abertura)}</span>
                        {caixa.data_fechamento && (
                          <span>Fechamento: {formatDateShort(caixa.data_fechamento)} {formatTime(caixa.data_fechamento)}</span>
                        )}
                      </div>
                    </div>
                    {(caixa.formas_pagamento && caixa.formas_pagamento.length > 0) ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Forma de Pagamento
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantidade
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor Total
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Média
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                            {caixa.formas_pagamento.map((forma: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                {getFormaPagamentoIcon(forma.forma_pagamento)}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {formatarFormaPagamento(forma.forma_pagamento)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {forma.quantidade_pagamentos || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-semibold text-green-600">
                              {formatCurrency(parseFloat(forma.valor_total as any) || 0)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm text-gray-600">
                              {(() => {
                                const valor = parseFloat(forma.valor_total as any) || 0;
                                const quantidade = forma.quantidade_pagamentos || 0;
                                const media = quantidade > 0 ? valor / quantidade : 0;
                                return formatCurrency(media);
                              })()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">
                          Total Geral
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {caixa.formas_pagamento.reduce((total: number, forma: any) => total + (forma.quantidade_pagamentos || 0), 0)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="text-sm font-bold text-green-600">
                                  {formatCurrency(caixa.formas_pagamento.reduce((total: number, forma: any) => total + (parseFloat(forma.valor_total as any) || 0), 0))}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="text-sm font-medium text-gray-600">
                            {(() => {
                                    const totalValor = caixa.formas_pagamento.reduce((total: number, forma: any) => total + (parseFloat(forma.valor_total as any) || 0), 0);
                                    const totalQuantidade = caixa.formas_pagamento.reduce((total: number, forma: any) => total + (forma.quantidade_pagamentos || 0), 0);
                              const media = totalQuantidade > 0 ? totalValor / totalQuantidade : 0;
                              return formatCurrency(media);
                            })()}
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">Nenhum pagamento registrado neste caixa</div>
                    )}
              </div>
                ))}
              </div>
            )}
          </div>
        </Card>


      </div>
    </div>
  );
} 