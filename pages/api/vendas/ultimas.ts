import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const [vendas] = await pool.query<RowDataPacket[]>(`
        SELECT 
          v.id,
          v.data,
          v.valor_total,
          v.desconto,
          v.valor_final,
          v.status,
          u.nome as vendedor_nome,
          GROUP_CONCAT(
            JSON_OBJECT(
              'id', pv.id,
              'forma_pagamento', pv.forma_pagamento,
              'valor', pv.valor
            )
          ) as pagamentos
        FROM vendas v
        LEFT JOIN usuarios u ON v.vendedor_id = u.id
        LEFT JOIN pagamentos_venda pv ON v.id = pv.venda_id
        GROUP BY v.id
        ORDER BY v.data DESC
        LIMIT 5
      `);

      // Formatar os pagamentos
      const vendasFormatadas = vendas.map(venda => ({
        ...venda,
        pagamentos: JSON.parse(`[${venda.pagamentos}]`)
      }));

      res.status(200).json(vendasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar últimas vendas:', error);
      res.status(500).json({ error: 'Erro ao buscar últimas vendas' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 