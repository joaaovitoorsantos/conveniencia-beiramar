import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const [compras] = await pool.query<RowDataPacket[]>(`
        SELECT 
          c.*,
          f.nome as fornecedor_nome,
          f.cnpj as fornecedor_cnpj,
          u.nome as usuario_nome,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', ic.id,
              'produto_id', ic.produto_id,
              'quantidade', ic.quantidade,
              'valor_unitario', ic.valor_unitario,
              'valor_total', ic.valor_total,
              'produto_nome', p.nome
            )
          ) as itens
        FROM compras c
        LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
        LEFT JOIN usuarios u ON c.usuario_id = u.id
        LEFT JOIN itens_compra ic ON c.id = ic.compra_id
        LEFT JOIN produtos p ON ic.produto_id = p.id
        WHERE c.id = ?
        GROUP BY c.id
      `, [id]);

      if (compras.length === 0) {
        return res.status(404).json({ error: 'Compra não encontrada' });
      }

      res.status(200).json(compras[0]);
    } catch (error) {
      console.error('Erro ao buscar compra:', error);
      res.status(500).json({ error: 'Erro ao buscar compra' });
    }
  } 
  else if (req.method === 'PUT') {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const { status } = req.body;

      await connection.query<ResultSetHeader>(
        `UPDATE compras SET status = ? WHERE id = ?`,
        [status, id]
      );

      // Se a compra for concluída, atualiza o estoque
      if (status === 'concluida') {
        const [itens] = await connection.query<RowDataPacket[]>(
          `SELECT * FROM itens_compra WHERE compra_id = ?`,
          [id]
        );

        for (const item of itens) {
          await connection.query(
            `UPDATE produtos 
             SET estoque = estoque + ? 
             WHERE id = ?`,
            [item.quantidade, item.produto_id]
          );
        }
      }

      await connection.commit();
      res.status(200).json({ message: 'Compra atualizada com sucesso' });
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao atualizar compra:', error);
      res.status(500).json({ error: 'Erro ao atualizar compra' });
    } finally {
      connection.release();
    }
  } 
  else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 