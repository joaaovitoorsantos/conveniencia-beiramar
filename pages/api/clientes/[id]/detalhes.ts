// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { id } = req.query;

      // Buscar compras do cliente com itens em uma única query
      const [compras] = await pool.query(`
        SELECT 
          v.*,
          u.nome as vendedor_nome,
          GROUP_CONCAT(
            DISTINCT
            JSON_OBJECT(
              'forma_pagamento', pv.forma_pagamento,
              'valor', pv.valor
            )
          ) as pagamentos,
          GROUP_CONCAT(
            DISTINCT
            JSON_OBJECT(
              'produto_id', iv.produto_id,
              'quantidade', iv.quantidade,
              'preco_venda', iv.preco_venda,
              'valor_total', iv.valor_total,
              'produto_nome', p.nome
            )
          ) as itens
        FROM vendas v
        LEFT JOIN usuarios u ON v.vendedor_id = u.id
        LEFT JOIN pagamentos_venda pv ON v.id = pv.venda_id
        LEFT JOIN itens_venda iv ON v.id = iv.venda_id
        LEFT JOIN produtos p ON iv.produto_id = p.id
        WHERE v.cliente_id = ?
        GROUP BY v.id
        ORDER BY v.data DESC
      `, [id]);

      // Buscar contas a receber
      const [contas] = await pool.query(`
        SELECT *
        FROM contas_receber
        WHERE cliente_id = ?
        ORDER BY data_vencimento ASC
      `, [id]);

      // Formatar os dados das compras
      const comprasFormatadas = compras.map((compra: any) => ({
        ...compra,
        pagamentos: compra.pagamentos ? JSON.parse(`[${compra.pagamentos}]`) : [],
        itens: compra.itens ? JSON.parse(`[${compra.itens}]`) : []
      }));

      res.status(200).json({
        compras: comprasFormatadas,
        contas
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes do cliente:', error);
      res.status(500).json({ error: 'Erro ao buscar detalhes do cliente' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 