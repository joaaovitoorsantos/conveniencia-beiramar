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
import { Check, ChevronsUpDown } from "lucide-react"
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
  const [isEditing, setIsEditing] = useState(false);

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
      const total = formattedProducts.reduce((acc: number, produto: any) => {
        return acc + (Number(produto.preco_custo) * Number(produto.estoque));
      }, 0);
      setTotalMercadorias(total);
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

      // Formatar dados do produto
      const productData = {
        ...newProduct,
        categoria_id: selectedCategory || null,
        preco_venda: parseFloat(newProduct.preco_venda as string || '0'),
        preco_custo: newProduct.preco_custo ? parseFloat(newProduct.preco_custo as string) : null,
        estoque: parseInt(newProduct.estoque as string || '0'),
        estoque_minimo: newProduct.estoque_minimo ? parseInt(newProduct.estoque_minimo as string) : null,
        categoria_nome: categories.find(c => c.id === selectedCategory)?.nome
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

  const filteredProducts = products.filter(product =>
    product.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.codigo.includes(searchTerm) ||
    product.categoria_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    setNewProduct(product);
    setSelectedCategory(product.categoria_id || "");
    setIsEditing(true);
    setIsAddProductOpen(true);
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
            <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
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
                        disabled={isEditing}
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
                          <CommandInput placeholder="Buscar categoria..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                            <CommandGroup>
                              {categories.map((category) => (
                                <CommandItem
                                  key={category.id}
                                  value={category.nome}
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
                                    }
                                    setOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedCategory === category.id ? "opacity-100" : "opacity-0"
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

        <div className="grid grid-cols-[1fr_300px] gap-4">
          <Card className="p-4">
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Buscar por nome, código ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>

            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Estoque Mín.</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow
                      key={product.id}
                      className={
                        product.estoque <= (product.estoque_minimo || 0) ? 'bg-red-50' :
                          (product.data_validade && new Date(product.data_validade) < new Date()) ? 'bg-yellow-50' : ''
                      }
                    >
                      <TableCell>{product.codigo}</TableCell>
                      <TableCell className="font-medium">{product.nome}</TableCell>
                      <TableCell>{product.categoria_nome || '-'}</TableCell>
                      <TableCell>R$ {product.preco_venda.toFixed(2)}</TableCell>
                      <TableCell>R$ {product.preco_custo?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className={product.estoque <= (product.estoque_minimo || 0) ? 'text-red-600 font-bold' : ''}>
                        {product.estoque}
                      </TableCell>
                      <TableCell>{product.estoque_minimo}</TableCell>
                      <TableCell className={
                        product.data_validade && new Date(product.data_validade) < new Date()
                          ? 'text-yellow-600 font-bold'
                          : ''
                      }>
                        {product.data_validade
                          ? new Date(product.data_validade).toLocaleDateString('pt-BR')
                          : '-'
                        }
                      </TableCell>
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
            </ScrollArea>
          </Card>

          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Categorias</h2>
                <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">Nova Categoria</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Categoria</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label htmlFor="categoryName">Nome da Categoria</Label>
                        <Input
                          id="categoryName"
                          value={newCategory.nome || ''}
                          onChange={(e) => setNewCategory({ ...newCategory, nome: e.target.value })}
                          placeholder="Nome da categoria"
                        />
                      </div>
                      <div>
                        <Label htmlFor="categoryDescription">Descrição</Label>
                        <Input
                          id="categoryDescription"
                          value={newCategory.descricao || ''}
                          onChange={(e) => setNewCategory({ ...newCategory, descricao: e.target.value })}
                          placeholder="Descrição da categoria"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddCategory}>
                        Salvar Categoria
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {categories.map((category) => (
                    <Card key={category.id} className="p-3">
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
                          onClick={() => setDeleteCategoryId(category.id)}
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
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            <Card className="p-4">
              <h2 className="text-xl font-bold mb-4">Estatísticas</h2>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Total de Produtos</div>
                  <div className="text-2xl font-bold">{products.length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Produtos com Estoque Baixo</div>
                  <div className="text-2xl font-bold text-red-600">
                    {products.filter(p => p.estoque <= (p.estoque_minimo || 0)).length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Produtos Vencidos</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {products.filter(p => p.data_validade && new Date(p.data_validade) < new Date()).length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total em Mercadorias</div>
                  <div className="text-2xl font-bold text-blue-600">
                    R$ {totalMercadorias.toFixed(2)}
                  </div>
                </div>
              </div>
            </Card>
          </div>
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
    </>
  );
} 