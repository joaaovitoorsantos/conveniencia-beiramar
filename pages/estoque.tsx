//@ts-nocheck
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Product {
  id: string;
  codigo: string;
  nome: string;
  preco_venda: string | number;
  estoque: number;
  estoque_minimo?: number;
  categoria_id?: string;
  categoria_nome?: string;
  preco_custo?: string | number;
  data_validade?: string;
}

interface Category {
  id: string;
  nome: string;
  descricao?: string;
  total_produtos?: number;
}

export default function Estoque() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({});
  const [newCategory, setNewCategory] = useState<Partial<Category>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchCategory, setSearchCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState("");
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [totalMercadorias, setTotalMercadorias] = useState(0);
  const [totalVendas, setTotalVendas] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [columnSorts, setColumnSorts] = useState<{
    [key: string]: 'asc' | 'desc' | null;
  }>({
    codigo: null,
    nome: null,
    categoria_nome: null,
    estoque: null,
    preco_venda: null
  });
  const [showLowStock, setShowLowStock] = useState(false);
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [showNearExpiry, setShowNearExpiry] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  // Carregar produtos e categorias
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/produtos');
      const formattedProducts = response.data.map(product => ({
        ...product,
        preco_venda: parseFloat(product.preco_venda),
        preco_custo: product.preco_custo ? parseFloat(product.preco_custo) : null,
        estoque: parseInt(product.estoque),
        estoque_minimo: product.estoque_minimo ? parseInt(product.estoque_minimo) : null
      }));
      setProducts(formattedProducts);

      // Calcular total em mercadorias (baseado no preço de custo)
      const totalCusto = formattedProducts.reduce((acc: number, produto: any) => {
        return acc + (Number(produto.preco_custo || 0) * Number(produto.estoque));
      }, 0);
      setTotalMercadorias(totalCusto);

      // Calcular total potencial em vendas
      const totalPotencial = formattedProducts.reduce((acc: number, produto: any) => {
        return acc + (Number(produto.preco_venda || 0) * Number(produto.estoque));
      }, 0);
      setTotalVendas(totalPotencial);

    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categorias');
      // Usar diretamente o total_produtos que vem da query SQL
      setCategories(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias');
      setCategories([]);
    }
  };

  const handleAddProduct = async () => {
    try {
      setLoading(true);

      // Encontrar a categoria completa
      const selectedCategoryData = categories.find(c => c.id === selectedCategory);

      // Formatar dados do produto
      const productData = {
        ...newProduct,
        categoria_id: selectedCategory || null,
        preco_venda: parseFloat(newProduct.preco_venda as string || '0'),
        preco_custo: newProduct.preco_custo ? parseFloat(newProduct.preco_custo as string) : null,
        estoque: parseInt(newProduct.estoque as string || '0'),
        estoque_minimo: newProduct.estoque_minimo ? parseInt(newProduct.estoque_minimo as string) : null,
        categoria_nome: selectedCategoryData?.nome || null
      };

      if (isEditing) {
        await axios.put(`/api/produtos/${newProduct.id}`, productData);
        toast.success('Produto atualizado com sucesso');
      } else {
        // Verificar se já existe um produto com o mesmo código
        if (!isEditing) {
          const response = await axios.get(`/api/produtos?codigo=${newProduct.codigo}`);
          if (response.data.length > 0) {
            toast.error('Já existe um produto com este código');
            return;
          }
        }
        await axios.post('/api/produtos', productData);
        toast.success('Produto cadastrado com sucesso');
      }

      setIsAddProductOpen(false);
      setNewProduct({});
      setSelectedCategory("");
      setIsEditing(false);
      setSearchCategory('');
      fetchProducts();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data.error || 'Erro ao salvar produto');
      } else {
        toast.error(isEditing ? 'Erro ao atualizar produto' : 'Erro ao cadastrar produto');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    try {
      await axios.post('/api/categorias', newCategory);
      toast.success('Categoria cadastrada com sucesso');
      setIsAddCategoryOpen(false);
      setNewCategory({});
      fetchCategories();
    } catch (error) {
      toast.error('Erro ao cadastrar categoria');
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductId) return;

    try {
      const response = await axios.delete(`/api/produtos/${deleteProductId}`);
      toast.success(response.data.message);
      fetchProducts();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data.error || 'Erro ao remover produto');
      } else {
        toast.error('Erro ao remover produto');
      }
      console.error('Erro ao deletar produto:', error);
    } finally {
      setDeleteProductId(null);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;

    try {
      const response = await axios.delete(`/api/categorias/${deleteCategoryId}`);
      toast.success(response.data.message);
      fetchCategories();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data.error || 'Erro ao remover categoria');
      } else {
        toast.error('Erro ao remover categoria');
      }
      console.error('Erro ao deletar categoria:', error);
    } finally {
      setDeleteCategoryId(null);
    }
  };

  const getFilteredProducts = () => {
    let filtered = [...products];
    
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.codigo.includes(searchTerm) ||
        product.categoria_nome?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (showLowStock) {
      filtered = filtered.filter(p => 
        p.estoque > 0 && p.estoque <= (p.estoque_minimo || 0)
      );
    }

    if (showOutOfStock) {
      filtered = filtered.filter(p => p.estoque === 0);
    }

    if (showExpired) {
      filtered = filtered.filter(p => 
        p.data_validade && new Date(p.data_validade) < new Date()
      );
    }

    if (showNearExpiry) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      filtered = filtered.filter(p => 
        p.data_validade && 
        new Date(p.data_validade) > new Date() &&
        new Date(p.data_validade) <= thirtyDaysFromNow
      );
    }

    return filtered;
  };

  const getProductsByCategory = (categoryId: string) => {
    return products.filter(product => product.categoria_id === categoryId).length;
  };

  // Função para filtrar categorias baseado na busca
  const filterCategories = (value: string) => {
    return categories.filter((category) =>
      category.nome.toLowerCase().includes(value.toLowerCase())
    );
  };

  // Função para abrir modal de edição
  const handleEdit = (product: Product) => {
    console.log('Editing product:', product);
    
    // Encontrar a categoria pelo nome quando não temos o ID
    let categoryId = product.categoria_id;
    if (!categoryId && product.categoria_nome) {
      const category = categories.find(c => c.nome === product.categoria_nome);
      categoryId = category?.id;
    }
    
    // Formatar a data de validade mantendo o resto do produto inalterado
    const formattedProduct = {
      ...product,
      data_validade: product.data_validade 
        ? new Date(product.data_validade).toISOString().split('T')[0]
        : undefined
    };
    
    setNewProduct(formattedProduct);
    setSelectedCategory(categoryId || "");
    setIsEditing(true);
    setIsAddProductOpen(true);
    
    // Usar o nome da categoria que já temos
    if (product.categoria_nome) {
      setSearchCategory(product.categoria_nome);
    }
  };

  // Função para exportar relatório em PDF
  const exportarRelatorio = () => {
    const doc = new jsPDF('landscape');

    // Função para adicionar cabeçalho em cada página
    const addHeader = () => {
      // Adicionar logo
      const logoUrl = "https://i.imgur.com/oLO8FA3.png";
      const img = new Image();
      img.src = logoUrl;
      doc.addImage(img, 'PNG', 14, 10, 20, 20);

      // Adicionar cabeçalho
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text('Conveniência Beira Mar', 40, 20);
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('Relatório de Estoque', 40, 28);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 40);
    };

    // Configurar colunas
    const columns = [
      { header: 'Código', dataKey: 'codigo' },
      { header: 'Produto', dataKey: 'nome' },
      { header: 'Preço Venda', dataKey: 'preco_venda' },
      { header: 'Preço Custo', dataKey: 'preco_custo' },
      { header: 'Estoque', dataKey: 'estoque' },
      { header: 'Est. Mín', dataKey: 'estoque_min' },
      { header: 'Validade', dataKey: 'validade' },
      { header: 'Total', dataKey: 'total' },
      { header: 'Estoque Real', dataKey: 'estoque_real' },
      { header: 'Custo Real', dataKey: 'custo_real' },
      { header: 'Validade Real', dataKey: 'validade_real' }
    ];

    // Agrupar produtos por categoria
    const produtosPorCategoria = products.reduce((acc: any, product) => {
      const categoria = product.categoria_nome || 'Sem Categoria';
      if (!acc[categoria]) {
        acc[categoria] = [];
      }
      acc[categoria].push(product);
      return acc;
    }, {});

    // Adicionar primeira página
    addHeader();
    let isFirstCategory = true;

    Object.entries(produtosPorCategoria).forEach(([categoria, produtos]: [string, any[]]) => {
      if (!isFirstCategory) {
        doc.addPage();
        addHeader();
      }
      isFirstCategory = false;

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(categoria, 14, 50);
      
      const data = produtos.map(product => {
        const valorTotalEstoque = (Number(product.preco_custo) || 0) * Number(product.estoque);
        return {
          codigo: product.codigo,
          nome: product.nome,
          preco_venda: `R$ ${Number(product.preco_venda).toFixed(2)}`,
          preco_custo: `R$ ${Number(product.preco_custo || 0).toFixed(2)}`,
          estoque: product.estoque,
          estoque_min: product.estoque_minimo || '-',
          validade: product.data_validade 
            ? new Date(product.data_validade).toLocaleDateString('pt-BR')
            : '-',
          total: `R$ ${valorTotalEstoque.toFixed(2)}`,
          estoque_real: '',
          custo_real: '',
          validade_real: ''
        };
      });

      // Adicionar tabela da categoria
      (doc as any).autoTable({
        columns,
        body: data,
        startY: 55,
        styles: { 
          fontSize: 8,
          textColor: [50, 50, 50],
          cellPadding: 2
        },
        headStyles: { 
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontSize: 8,
          fontStyle: 'bold'
        },
        alternateRowStyles: { 
          fillColor: [250, 250, 250]
        },
        margin: { top: 50 },
        didDrawPage: function(data: any) {
          addHeader();
        }
      });
    });

    // Salvar o PDF
    doc.save(`relatorio-estoque-${new Date().toLocaleDateString('pt-BR')}.pdf`);
  };

  // Função para alternar a ordenação de uma coluna
  const toggleSort = (key: string) => {
    setColumnSorts(prev => {
      const currentSort = prev[key];
      const newSort = currentSort === null ? 'asc' : 
                     currentSort === 'asc' ? 'desc' : null;
      
      // Resetar outras colunas
      const resetSorts = Object.keys(prev).reduce((acc, k) => ({
        ...acc,
        [k]: null
      }), {});

      return {
        ...resetSorts,
        [key]: newSort
      };
    });
  };

  // Função para ordenar produtos
  const sortProducts = (products: any[]) => {
    const activeSort = Object.entries(columnSorts).find(([_, value]) => value !== null);
    if (!activeSort) return products;

    const [key, direction] = activeSort;

    return [...products].sort((a, b) => {
      let valueA = a[key];
      let valueB = b[key];

      // Converter para números se necessário
      if (key === 'preco_venda' || key === 'estoque') {
        valueA = Number(valueA);
        valueB = Number(valueB);
      } else {
        valueA = String(valueA || '').toLowerCase();
        valueB = String(valueB || '').toLowerCase();
      }

      if (valueA < valueB) return direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-100 p-4">
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow mb-4">
          <div className="flex items-center gap-4">
            <img
              src="https://i.imgur.com/oLO8FA3.png"
              alt="Logo"
              className="w-12 h-12 rounded-full object-cover"
            />
            <h1 className="text-2xl font-bold">Controle de Estoque</h1>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={exportarRelatorio}
              className="flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Exportar Relatório
            </Button>
            <Button variant="outline" onClick={() => router.push('/')}>
              PDV
            </Button>
            <Button variant="outline" onClick={() => router.push('/compras')}>
              Compras
            </Button>
            <Dialog open={isAddProductOpen} onOpenChange={(open) => {
              setIsAddProductOpen(open);
              if (!open) {
                setNewProduct({});
                setSelectedCategory("");
                setIsEditing(false);
                setSearchCategory('');
              }
            }}>
              <DialogTrigger asChild>
                <Button>Adicionar Produto</Button>
              </DialogTrigger>
              <DialogContent className="max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{isEditing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="codigo">Código de Barras</Label>
                      <Input
                        id="codigo"
                        value={newProduct.codigo || ''}
                        onChange={(e) => setNewProduct({ ...newProduct, codigo: e.target.value })}
                        placeholder="Código de barras"
                        disabled={isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="nome">Nome do Produto</Label>
                      <Input
                        id="nome"
                        value={newProduct.nome || ''}
                        onChange={(e) => setNewProduct({ ...newProduct, nome: e.target.value })}
                        placeholder="Nome do produto"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-full justify-between"
                        >
                          {selectedCategory
                            ? categories.find((category) => category.id === selectedCategory)?.nome
                            : "Selecione uma categoria..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Buscar categoria..."
                            value={searchCategory}
                            onValueChange={setSearchCategory}
                          />
                          <CommandList>
                            <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                            <CommandGroup>
                              {categories.map((category) => (
                                <CommandItem
                                  key={category.id}
                                  value={category.nome}
                                  selected={category.id === selectedCategory}
                                  onSelect={(currentValue) => {
                                    const selected = categories.find(cat =>
                                      cat.nome.toLowerCase() === currentValue.toLowerCase()
                                    );
                                    if (selected) {
                                      setSelectedCategory(selected.id);
                                      setNewProduct({
                                        ...newProduct,
                                        categoria_id: selected.id,
                                        categoria_nome: selected.nome
                                      });
                                      setSearchCategory(selected.nome);
                                    }
                                    setOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      category.id === selectedCategory ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {category.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Preço de Venda</Label>
                      <Input
                        id="price"
                        type="number"
                        value={newProduct.preco_venda || ''}
                        onChange={(e) => setNewProduct({ ...newProduct, preco_venda: e.target.value })}
                        placeholder="0,00"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label htmlFor="costPrice">Preço de Custo</Label>
                      <Input
                        id="costPrice"
                        type="number"
                        value={newProduct.preco_custo || ''}
                        onChange={(e) => setNewProduct({ ...newProduct, preco_custo: e.target.value })}
                        placeholder="0,00"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stock">Estoque Atual</Label>
                      <Input
                        id="stock"
                        type="number"
                        value={newProduct.estoque || ''}
                        onChange={(e) => setNewProduct({ ...newProduct, estoque: Number(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="minStock">Estoque Mínimo</Label>
                      <Input
                        id="minStock"
                        type="number"
                        value={newProduct.estoque_minimo || ''}
                        onChange={(e) => setNewProduct({ ...newProduct, estoque_minimo: Number(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="expiryDate">Data de Validade</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={newProduct.data_validade || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, data_validade: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddProductOpen(false);
                      setNewProduct({});
                      setSelectedCategory("");
                      setIsEditing(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleAddProduct}>
                    {isEditing ? 'Salvar Alterações' : 'Cadastrar Produto'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="space-y-4">
          {/* Estatísticas */}
          <div className="grid grid-cols-6 gap-4">
            {/* Total de Produtos */}
            <Card className="p-4">
              <div className="text-sm text-gray-500">Total de Produtos</div>
              <div className="text-2xl font-bold">{products.length}</div>
            </Card>

            {/* Estoque Baixo */}
            <Card 
              className={cn(
                "p-4 cursor-pointer transition-colors",
                showLowStock ? "bg-yellow-50" : "hover:bg-gray-50"
              )}
              onClick={() => {
                setShowLowStock(!showLowStock);
                setShowOutOfStock(false);
                setShowExpired(false);
                setShowNearExpiry(false);
                setSearchTerm('');
              }}
            >
              <div className="text-sm text-gray-500">Estoque Baixo</div>
              <div className="text-2xl font-bold text-yellow-600">
                {products.filter(p => p.estoque > 0 && p.estoque <= (p.estoque_minimo || 0)).length}
              </div>
            </Card>

            {/* Sem Estoque */}
            <Card 
              className={cn(
                "p-4 cursor-pointer transition-colors",
                showOutOfStock ? "bg-red-50" : "hover:bg-gray-50"
              )}
              onClick={() => {
                setShowOutOfStock(!showOutOfStock);
                setShowLowStock(false);
                setShowExpired(false);
                setShowNearExpiry(false);
                setSearchTerm('');
              }}
            >
              <div className="text-sm text-gray-500">Sem Estoque</div>
              <div className="text-2xl font-bold text-red-600">
                {products.filter(p => p.estoque === 0).length}
              </div>
            </Card>

            {/* Produtos Vencidos */}
            <Card 
              className={cn(
                "p-4 cursor-pointer transition-colors",
                showExpired ? "bg-purple-50" : "hover:bg-gray-50"
              )}
              onClick={() => {
                setShowExpired(!showExpired);
                setShowNearExpiry(false);
                setShowLowStock(false);
                setShowOutOfStock(false);
                setSearchTerm('');
              }}
            >
              <div className="text-sm text-gray-500">Vencidos</div>
              <div className="text-2xl font-bold text-purple-600">
                {products.filter(p => p.data_validade && new Date(p.data_validade) < new Date()).length}
              </div>
            </Card>

            {/* A Vencer */}
            <Card 
              className={cn(
                "p-4 cursor-pointer transition-colors",
                showNearExpiry ? "bg-orange-50" : "hover:bg-gray-50"
              )}
              onClick={() => {
                setShowNearExpiry(!showNearExpiry);
                setShowExpired(false);
                setShowLowStock(false);
                setShowOutOfStock(false);
                setSearchTerm('');
              }}
            >
              <div className="text-sm text-gray-500">A Vencer (30d)</div>
              <div className="text-2xl font-bold text-orange-600">
                {products.filter(p => 
                  p.data_validade && 
                  new Date(p.data_validade) > new Date() &&
                  new Date(p.data_validade) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                ).length}
              </div>
            </Card>

            {/* Total em Mercadorias */}
            <Card className="p-4">
              <div className="text-sm text-gray-500">Total em Mercadorias</div>
              <div className="text-2xl font-bold text-blue-600">
                R$ {totalMercadorias.toFixed(2)}
              </div>
            </Card>
          </div>

          {/* Tabela Principal */}
          <Card className="flex flex-col h-[calc(100vh-16rem)]">
            <div className="p-4">
              <div className="flex gap-4 items-center">
                <Input
                  placeholder="Buscar por nome, código ou categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsCategoriesModalOpen(true)}
                >
                  Categorias
                </Button>
                {(showLowStock || showOutOfStock || showExpired || showNearExpiry) && (
                  <Button variant="outline" onClick={() => {
                    setShowLowStock(false);
                    setShowOutOfStock(false);
                    setShowExpired(false);
                    setShowNearExpiry(false);
                    setSearchTerm('');
                  }}>
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleSort('codigo')}
                      >
                        <div className="flex items-center gap-1">
                          Código
                          {columnSorts.codigo === 'asc' && <span>↑</span>}
                          {columnSorts.codigo === 'desc' && <span>↓</span>}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleSort('nome')}
                      >
                        <div className="flex items-center gap-1">
                          Nome
                          {columnSorts.nome === 'asc' && <span>↑</span>}
                          {columnSorts.nome === 'desc' && <span>↓</span>}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleSort('categoria_nome')}
                      >
                        <div className="flex items-center gap-1">
                          Categoria
                          {columnSorts.categoria_nome === 'asc' && <span>↑</span>}
                          {columnSorts.categoria_nome === 'desc' && <span>↓</span>}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-100 text-right"
                        onClick={() => toggleSort('estoque')}
                      >
                        <div className="flex items-center gap-1 justify-end">
                          Estoque
                          {columnSorts.estoque === 'asc' && <span>↑</span>}
                          {columnSorts.estoque === 'desc' && <span>↓</span>}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-100 text-right"
                        onClick={() => toggleSort('preco_venda')}
                      >
                        <div className="flex items-center gap-1 justify-end">
                          Preço
                          {columnSorts.preco_venda === 'asc' && <span>↑</span>}
                          {columnSorts.preco_venda === 'desc' && <span>↓</span>}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortProducts(getFilteredProducts()).map((product) => (
                      <TableRow
                        key={product.id}
                        className={cn(
                          'hover:bg-gray-50',
                          product.estoque === 0 && 'bg-red-50 hover:bg-red-100',
                          product.estoque > 0 && product.estoque <= (product.estoque_minimo || 0) && 'bg-yellow-50 hover:bg-yellow-100',
                          product.data_validade && new Date(product.data_validade) < new Date() && 'bg-purple-50 hover:bg-purple-100',
                          product.data_validade && 
                          new Date(product.data_validade) > new Date() &&
                          new Date(product.data_validade) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && 'bg-orange-50 hover:bg-orange-100'
                        )}
                      >
                        <TableCell>{product.codigo}</TableCell>
                        <TableCell className="font-medium">{product.nome}</TableCell>
                        <TableCell>{product.categoria_nome || '-'}</TableCell>
                        <TableCell>
                          <div className={cn(
                            "flex items-center gap-2",
                            product.estoque === 0 
                              ? "text-red-600 font-bold"
                              : product.estoque <= (product.estoque_minimo || 0)
                                ? "text-yellow-600 font-bold"
                                : ""
                          )}>
                            {product.estoque}
                            {product.estoque === 0 && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                                Sem Estoque
                              </span>
                            )}
                            {product.estoque > 0 && product.estoque <= (product.estoque_minimo || 0) && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                Estoque Baixo
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>R$ {product.preco_venda.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(product)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                              </svg>
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteProductId(product.id)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>

      {/* Modal de confirmação para deletar produto */}
      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso removerá permanentemente o produto do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 hover:bg-red-700">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de confirmação para deletar categoria */}
      <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso removerá permanentemente a categoria do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-red-600 hover:bg-red-700">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Categorias */}
      <Dialog open={isCategoriesModalOpen} onOpenChange={setIsCategoriesModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>Categorias</DialogTitle>
              <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Nova Categoria</Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            {categories.map((category) => (
              <Card 
                key={category.id} 
                className={cn(
                  "p-3 cursor-pointer transition-colors",
                  searchTerm && category.nome.toLowerCase().includes(searchTerm.toLowerCase()) && "bg-blue-50"
                )}
                onClick={() => {
                  setSearchTerm(category.nome);
                  setIsCategoriesModalOpen(false);
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{category.nome}</div>
                    {category.descricao && (
                      <div className="text-sm text-gray-500">{category.descricao}</div>
                    )}
                    <div className="text-sm text-blue-600 font-medium">
                      {category.total_produtos || 0} produtos
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteCategoryId(category.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 