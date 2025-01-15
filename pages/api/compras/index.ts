import { NextApiRequest, NextApiResponse } from 'next';
import { executeQuery } from '@/lib/db';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const compras = await executeQuery<RowDataPacket[]>(`
        SELECT 
          c.*,
          f.nome as fornecedor_nome,
          f.cnpj as fornecedor_cnpj,
          u.nome as usuario_nome,
          GROUP_CONCAT(
            CONCAT(
              '{"produto_id":"', ic.produto_id,
              '","quantidade":', ic.quantidade,
              ',"valor_unitario":', ic.preco_custo,
              ',"valor_total":', ic.valor_total,
              ',"produto_nome":"', IFNULL(p.nome, ''), '"}'
            )
          ) as itens
        FROM compras c
        LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
        LEFT JOIN usuarios u ON c.criado_por = u.id
        LEFT JOIN itens_compra ic ON c.id = ic.compra_id
        LEFT JOIN produtos p ON ic.produto_id = p.id
        GROUP BY c.id
        ORDER BY c.data DESC
      `);

      const comprasFormatadas = compras.map(compra => ({
        ...compra,
        itens: compra.itens ? JSON.parse(`[${compra.itens}]`) : []
      }));

      res.status(200).json(comprasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar compras:', error);
      res.status(500).json({ error: 'Erro ao buscar compras' });
    }
  } 
  else if (req.method === 'POST') {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const { 
        fornecedor_id, 
        itens,
        criado_por,
        observacoes 
      } = req.body;

      const compraId = crypto.randomUUID();
      const valor_total = itens.reduce((sum: number, item: any) => sum + (item.quantidade * item.valor_unitario), 0);

      // Inserir a compra
      await connection.query<ResultSetHeader>(
        `INSERT INTO compras (
          id, fornecedor_id, valor_total, 
          criado_por, observacoes
        ) VALUES (?, ?, ?, ?, ?)`,
        [compraId, fornecedor_id, valor_total, criado_por, observacoes]
      );

      // Inserir os itens da compra
      for (const item of itens) {
        await connection.query<ResultSetHeader>(
          `INSERT INTO itens_compra (
            compra_id, produto_id, quantidade, 
            preco_custo, valor_total
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            compraId,
            item.produto_id,
            item.quantidade,
            item.valor_unitario,
            item.quantidade * item.valor_unitario
          ]
        );

        // Atualizar o preço de custo e estoque do produto
        await connection.query(
          `UPDATE produtos 
           SET preco_custo = ?,
               estoque = estoque + ?
           WHERE id = ?`,
          [item.valor_unitario, item.quantidade, item.produto_id]
        );
      }

      await connection.commit();
      res.status(201).json({ message: 'Entrada registrada com sucesso', id: compraId });
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao registrar entrada:', error);
      res.status(500).json({ error: 'Erro ao registrar entrada' });
    } finally {
      connection.release();
    }
  } 
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}