import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface Categoria extends RowDataPacket {
  id: string;
  nome: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      try {
        const { codigo } = req.query;

        let query = `
          SELECT 
            p.id,
            p.codigo,
            p.nome,
            p.descricao,
            p.preco_venda,
            p.preco_custo,
            p.estoque,
            p.estoque_minimo,
            p.data_validade,
            c.nome as categoria_nome
          FROM produtos p
          LEFT JOIN categorias c ON p.categoria_id = c.id
        `;

        const params: any[] = [];

        if (codigo) {
          query += ` WHERE p.codigo = ? AND p.ativo = true`;
          params.push(codigo);
        } else {
          query += ` WHERE p.ativo = true`;
        }

        query += ` ORDER BY p.nome ASC`;

        const [produtos] = await pool.query<RowDataPacket[]>(query, params);
        
        res.status(200).json(produtos);
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
      }
      break;

    case 'POST':
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

        // Validar se a categoria existe
        if (categoria_id) {
          const [categorias] = await pool.query<Categoria[]>(
            'SELECT id FROM categorias WHERE id = ?',
            [categoria_id]
          );

          if (!categorias || categorias.length === 0) {
            return res.status(400).json({ error: 'Categoria não encontrada' });
          }
        }

        const [result] = await pool.query<ResultSetHeader>(
          `INSERT INTO produtos (
            id,
            codigo,
            nome,
            descricao,
            preco_venda,
            preco_custo,
            estoque,
            estoque_minimo,
            categoria_id,
            data_validade
          ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            codigo,
            nome,
            descricao,
            preco_venda,
            preco_custo,
            estoque,
            estoque_minimo,
            categoria_id,
            data_validade
          ]
        );

        res.status(201).json({ message: 'Produto cadastrado com sucesso' });
      } catch (error) {
        console.error('Erro ao cadastrar produto:', error);
        res.status(500).json({ error: 'Erro ao cadastrar produto' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 