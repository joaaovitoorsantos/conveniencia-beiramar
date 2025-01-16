//@ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  switch (req.method) {
    case 'GET':
      try {
        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT 
            p.*,
            p.data_validade,
            c.nome as categoria_nome
           FROM produtos p
           LEFT JOIN categorias c ON p.categoria_id = c.id
           WHERE p.id = ? AND p.ativo = true`,
          [id]
        );
        
        if (Array.isArray(rows) && rows.length > 0) {
          res.status(200).json(rows[0]);
        } else {
          res.status(404).json({ error: 'Produto não encontrado' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar produto' });
      }
      break;

    case 'PUT':
      try {
        const {
          codigo,
          nome,
          descricao,
          preco_venda,
          preco_custo,
          estoque,
          estoque_minimo,
          categoria_id,
          data_validade
        } = req.body;

        const [result] = await pool.query(
          `UPDATE produtos SET
            codigo = ?,
            nome = ?,
            descricao = ?,
            preco_venda = ?,
            preco_custo = ?,
            estoque = ?,
            estoque_minimo = ?,
            categoria_id = ?,
            data_validade = ?,
            atualizado_em = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [
            codigo,
            nome,
            descricao,
            preco_venda,
            preco_custo,
            estoque,
            estoque_minimo,
            categoria_id,
            data_validade,
            id
          ]
        );

        res.status(200).json({ message: 'Produto atualizado com sucesso' });
      } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar produto' });
      }
      break;

    case 'DELETE':
      try {
        // Verificar se o produto existe
        const [product] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM produtos WHERE id = ?',
          [id]
        );

        if (!product || !Array.isArray(product) || product.length === 0) {
          return res.status(404).json({ error: 'Produto não encontrado' });
        }

        // Hard delete - remove realmente do banco
        await pool.query('DELETE FROM produtos WHERE id = ?', [id]);

        res.status(200).json({ message: 'Produto removido com sucesso' });
      } catch (error) {
        console.error('Erro ao deletar produto:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED') {
          res.status(400).json({ 
            error: 'Este produto não pode ser excluído pois está vinculado a vendas ou compras' 
          });
        } else {
          res.status(500).json({ error: 'Erro ao remover produto' });
        }
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 