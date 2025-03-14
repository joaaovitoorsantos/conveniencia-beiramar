import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { periodo } = req.query;
      
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

      // Estatísticas gerais
      const [estatisticas] = await pool.query<RowDataPacket[]>(`
        SELECT 
          COALESCE(SUM(v.valor_final), 0) as total_vendas,
          COALESCE(SUM(c.valor_total), 0) as total_compras,
          COALESCE(AVG(v.valor_final), 0) as ticket_medio,
          COALESCE(SUM(v.valor_final - COALESCE(c.valor_total, 0)), 0) as lucro_liquido,
          COALESCE((
            SELECT SUM(valor) 
            FROM contas_receber 
            WHERE status = 'pendente'
          ), 0) as contas_receber,
          COALESCE((
            SELECT SUM(valor) 
            FROM contas_pagar 
            WHERE status = 'pendente'
          ), 0) as contas_pagar,
          COALESCE(
            SUM(v.valor_final) - 
            COALESCE(SUM(c.valor_total), 0) -
            COALESCE((SELECT SUM(valor) FROM contas_pagar WHERE status = 'pendente'), 0) +
            COALESCE((SELECT SUM(valor) FROM contas_receber WHERE status = 'pendente'), 0),
            0
          ) as fluxo_caixa
        FROM vendas v
        LEFT JOIN compras c ON DATE(c.data) = DATE(v.data)
        WHERE ${dateFilter.replace('data', 'v.data')}
      `);

      // Vendas por forma de pagamento
      const [vendasPorFormaPagamento] = await pool.query<RowDataPacket[]>(`
        SELECT 
          pv.forma_pagamento,
          SUM(pv.valor) as valor,
          COUNT(*) as quantidade
        FROM pagamentos_venda pv
        JOIN vendas v ON v.id = pv.venda_id
        WHERE ${dateFilter.replace('data', 'v.data')}
        GROUP BY pv.forma_pagamento
      `);

      // Fluxo de caixa diário
      const [fluxoCaixa] = await pool.query<RowDataPacket[]>(`
        SELECT 
          DATE(data) as data,
          COALESCE(SUM(entradas), 0) as entradas,
          COALESCE(SUM(saidas), 0) as saidas,
          COALESCE(SUM(entradas - saidas), 0) as saldo
        FROM (
          SELECT 
            v.data,
            v.valor_final as entradas,
            0 as saidas
          FROM vendas v
          WHERE ${dateFilter.replace('data', 'v.data')}
          UNION ALL
          SELECT 
            c.data,
            0 as entradas,
            c.valor_total as saidas
          FROM compras c
          WHERE ${dateFilter.replace('data', 'c.data')}
        ) as movimentacoes
        GROUP BY DATE(data)
        ORDER BY data
      `);

      // Últimas transações
      const [ultimasTransacoes] = await pool.query<RowDataPacket[]>(`
        (SELECT 
          v.id,
          'entrada' as tipo,
          v.data,
          CONCAT('Venda #', v.id) as descricao,
          v.valor_final as valor,
          v.status,
          GROUP_CONCAT(DISTINCT pv.forma_pagamento) as forma_pagamento
        FROM vendas v
        LEFT JOIN pagamentos_venda pv ON v.id = pv.venda_id
        WHERE ${dateFilter.replace('data', 'v.data')}
        GROUP BY v.id)
        UNION ALL
        (SELECT 
          c.id,
          'saida' as tipo,
          c.data,
          CONCAT('Compra #', c.id) as descricao,
          c.valor_total as valor,
          c.status,
          c.forma_pagamento
        FROM compras c
        WHERE ${dateFilter.replace('data', 'c.data')})
        ORDER BY data DESC
        LIMIT 50
      `);

      res.status(200).json({
        estatisticas: {
          totalVendas: Number(estatisticas[0]?.total_vendas || 0),
          totalCompras: Number(estatisticas[0]?.total_compras || 0),
          lucroLiquido: Number(estatisticas[0]?.lucro_liquido || 0),
          ticketMedio: Number(estatisticas[0]?.ticket_medio || 0),
          contasReceber: Number(estatisticas[0]?.contas_receber || 0),
          contasPagar: Number(estatisticas[0]?.contas_pagar || 0),
          fluxoCaixa: Number(estatisticas[0]?.fluxo_caixa || 0)
        },
        vendasPorFormaPagamento,
        fluxoCaixa,
        ultimasTransacoes
      });
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
      res.status(500).json({ error: 'Erro ao buscar dados financeiros' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 