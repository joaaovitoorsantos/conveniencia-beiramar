import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { periodo = 'mes' } = req.query;

      let dateFilter = '';
      switch (periodo) {
        case 'hoje':
          dateFilter = `data >= (
            SELECT data_abertura 
            FROM caixas 
            WHERE data_fechamento IS NULL 
            ORDER BY data_abertura DESC 
            LIMIT 1
          )`;
          break;
        case 'semana':
          dateFilter = 'data >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
          break;
        case 'mes':
          dateFilter = 'data >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
          break;
        case 'ano':
          dateFilter = 'data >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
          break;
        default:
          dateFilter = 'DATE(data) = CURDATE()';
      }

      const [fluxoCaixa] = await pool.query<RowDataPacket[]>(`
        SELECT 
          DATE(data) as data,
          SUM(CASE 
            WHEN tipo = 'entrada' THEN valor 
            ELSE 0 
          END) as entradas,
          SUM(CASE 
            WHEN tipo = 'saida' THEN valor 
            ELSE 0 
          END) as saidas,
          SUM(CASE 
            WHEN tipo = 'entrada' THEN valor 
            ELSE -valor 
          END) as saldo
        FROM (
          -- Vendas
          SELECT 
            data,
            'entrada' as tipo,
            valor_final as valor
          FROM vendas
          WHERE ${dateFilter}
          
          UNION ALL
          
          -- Compras
          SELECT 
            data,
            'saida' as tipo,
            valor_total as valor
          FROM compras
          WHERE ${dateFilter}
          
          UNION ALL
          
          -- Pagamentos recebidos
          SELECT 
            data_pagamento as data,
            'entrada' as tipo,
            valor
          FROM contas_receber
          WHERE status = 'pago' 
          AND ${dateFilter.replace('data', 'data_pagamento')}
          
          UNION ALL
          
          -- Pagamentos efetuados
          SELECT 
            data_pagamento as data,
            'saida' as tipo,
            valor
          FROM contas_pagar
          WHERE status = 'pago'
          AND ${dateFilter.replace('data', 'data_pagamento')}
        ) as movimentacoes
        GROUP BY DATE(data)
        ORDER BY data
      `);

      res.status(200).json(fluxoCaixa);
    } catch (error) {
      console.error('Erro ao buscar fluxo de caixa:', error);
      res.status(500).json({ error: 'Erro ao buscar fluxo de caixa' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 