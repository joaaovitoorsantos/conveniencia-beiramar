import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { periodo = 'hoje' } = req.query;
      
      let dateFilter = '';
      switch (periodo) {
        case 'hoje':
          dateFilter = 'DATE(v.data) = CURDATE()';
          break;
        case 'semana':
          dateFilter = 'v.data >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
          break;
        case 'mes':
          dateFilter = 'v.data >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
          break;
        case 'ano':
          dateFilter = 'v.data >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
          break;
        default:
          dateFilter = 'DATE(v.data) = CURDATE()';
      }

      const [vendas] = await pool.query<RowDataPacket[]>(`
        SELECT 
          v.id,
          v.data,
          v.valor_total,
          v.valor_final,
          v.desconto,
          v.status,
          v.caixa_id,
          u.nome as vendedor_nome,
          GROUP_CONCAT(
            JSON_OBJECT(
              'id', pv.id,
              'forma_pagamento', pv.forma_pagamento,
              'valor', pv.valor
            )
          ) as pagamentos,
          GROUP_CONCAT(
            JSON_OBJECT(
              'produto_id', iv.produto_id,
              'quantidade', iv.quantidade,
              'valor_unitario', p.preco_venda,
              'valor_total', iv.valor_total,
              'produto_nome', p.nome
            )
          ) as itens
        FROM vendas v
        LEFT JOIN usuarios u ON v.vendedor_id = u.id
        LEFT JOIN pagamentos_venda pv ON v.id = pv.venda_id
        LEFT JOIN itens_venda iv ON v.id = iv.venda_id
        LEFT JOIN produtos p ON iv.produto_id = p.id
        WHERE ${dateFilter}
        GROUP BY v.id
        ORDER BY v.data DESC
      `);

      // Formatar os dados
      const vendasFormatadas = vendas.map(venda => ({
        ...venda,
        pagamentos: venda.pagamentos ? JSON.parse(`[${venda.pagamentos}]`) : [],
        itens: venda.itens ? JSON.parse(`[${venda.itens}]`) : []
      }));

      res.status(200).json(vendasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      res.status(500).json({ error: 'Erro ao buscar vendas' });
    }
  } 
  else if (req.method === 'POST') {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const { 
        items, 
        total, 
        discount, 
        paymentMethods, 
        seller_id, 
        client_id,
        caixa_id 
      } = req.body;

      const vendaId = crypto.randomUUID();

      // 1. Inserir a venda
      await connection.query<ResultSetHeader>(
        `INSERT INTO vendas (
          id, data, valor_total, desconto, valor_final, 
          vendedor_id, cliente_id, caixa_id, status
        ) VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, 'concluida')`,
        [vendaId, total, discount, total - discount, seller_id, client_id || null, caixa_id]
      );

      // 2. Inserir os itens da venda
      for (const item of items) {
        await connection.query<ResultSetHeader>(
          `INSERT INTO itens_venda (
            venda_id, produto_id, quantidade, valor_total
          ) VALUES (?, ?, ?, ?)`,
          [
            vendaId,
            item.productId,
            item.quantity,
            item.total
          ]
        );

        // Atualizar estoque
        await connection.query(
          `UPDATE produtos 
           SET estoque = estoque - ? 
           WHERE id = ?`,
          [item.quantity, item.productId]
        );
      }

      // 3. Inserir os pagamentos
      for (const payment of paymentMethods) {
        await connection.query<ResultSetHeader>(
          `INSERT INTO pagamentos_venda (
            id, venda_id, forma_pagamento, valor
          ) VALUES (?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            vendaId,
            payment.method,
            payment.amount
          ]
        );
      }

      await connection.commit();
      res.status(201).json({ message: 'Venda realizada com sucesso', id: vendaId });
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao realizar venda:', error);
      res.status(500).json({ error: 'Erro ao realizar venda' });
    } finally {
      connection.release();
    }
  } 
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 