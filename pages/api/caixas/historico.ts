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
          dateFilter = 'DATE(data_abertura) = CURDATE()';
          break;
        case 'semana':
          dateFilter = 'data_abertura >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
          break;
        case 'mes':
          dateFilter = 'data_abertura >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
          break;
        case 'ano':
          dateFilter = 'data_abertura >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
          break;
        default:
          dateFilter = 'DATE(data_abertura) = CURDATE()';
      }

      // Buscar caixas
      const [caixas] = await pool.query<RowDataPacket[]>(`
        SELECT 
          c.id,
          c.data_abertura,
          c.data_fechamento,
          c.valor_inicial,
          c.valor_final,
          u.nome as operador_nome,
          COALESCE(SUM(v.valor_final), 0) as total_vendas,
          COALESCE(
            SUM(
              (
                SELECT SUM(iv.quantidade * p.preco_custo)
                FROM itens_venda iv
                LEFT JOIN produtos p ON iv.produto_id = p.id
                WHERE iv.venda_id = v.id
              )
            ),
            0
          ) as custo_total
        FROM caixas c
        LEFT JOIN usuarios u ON c.operador_id = u.id
        LEFT JOIN vendas v ON v.caixa_id = c.id
        WHERE ${dateFilter.replace('data_abertura', 'c.data_abertura')}
        GROUP BY c.id
        ORDER BY c.data_abertura DESC
      `);

      // Calcular estatísticas
      const [estatisticas] = await pool.query<RowDataPacket[]>(`
        SELECT 
          COALESCE(SUM(v.valor_final), 0) as total_vendas,
          COALESCE(AVG(v.valor_final), 0) as media_vendas,
          COUNT(DISTINCT c.id) as total_caixas,
          COALESCE(
            (
              SELECT SUM(valor_final - valor_inicial)
              FROM caixas 
              WHERE data_fechamento IS NOT NULL
              AND ${dateFilter}
            ), 
            0
          ) as saldo_total,
          COALESCE(
            SUM(
              (
                SELECT SUM(iv.quantidade * (iv.preco_venda - COALESCE(p.preco_custo, 0)))
                FROM itens_venda iv
                LEFT JOIN produtos p ON iv.produto_id = p.id
                WHERE iv.venda_id = v.id
              )
            ),
            0
          ) as lucro_bruto
        FROM caixas c
        LEFT JOIN vendas v ON v.caixa_id = c.id
        WHERE ${dateFilter.replace('data_abertura', 'c.data_abertura')}
      `);

      // Adicionar query para produtos mais vendidos
      const [produtosMaisVendidos] = await pool.query<RowDataPacket[]>(`
        SELECT 
          p.id,
          p.nome,
          p.codigo,
          SUM(iv.quantidade) as total_quantidade,
          SUM(iv.valor_total) as total_vendas,
          COUNT(DISTINCT v.id) as total_vendas_distintas
        FROM produtos p
        INNER JOIN itens_venda iv ON p.id = iv.produto_id
        INNER JOIN vendas v ON v.id = iv.venda_id
        WHERE ${dateFilter.replace('data_abertura', 'v.data')}
        GROUP BY p.id
        ORDER BY total_quantidade DESC
        LIMIT 10
      `);

      // Adicionar query para totais por forma de pagamento
      const [totaisPorFormaPagamento] = await pool.query<RowDataPacket[]>(`
        SELECT 
          pv.forma_pagamento,
          COUNT(*) as quantidade_pagamentos,
          SUM(pv.valor) as valor_total
        FROM pagamentos_venda pv
        INNER JOIN vendas v ON v.id = pv.venda_id
        WHERE ${dateFilter.replace('data_abertura', 'v.data')}
        GROUP BY pv.forma_pagamento
        ORDER BY valor_total DESC
      `);

      res.status(200).json({
        caixas,
        estatisticas: {
          totalVendas: Number(estatisticas[0].total_vendas),
          mediaVendas: Number(estatisticas[0].media_vendas),
          totalCaixas: Number(estatisticas[0].total_caixas),
          saldoTotal: Number(estatisticas[0].saldo_total),
          lucroBruto: Number(estatisticas[0].lucro_bruto)
        },
        produtosMaisVendidos,
        totaisPorFormaPagamento
      });
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 