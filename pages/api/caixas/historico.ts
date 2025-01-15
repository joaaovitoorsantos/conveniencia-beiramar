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
          dateFilter = 'DATE(c.data_abertura) = CURDATE()';
          break;
        case 'semana':
          dateFilter = 'c.data_abertura >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
          break;
        case 'mes':
          dateFilter = 'c.data_abertura >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
          break;
        case 'ano':
          dateFilter = 'c.data_abertura >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
          break;
        default:
          dateFilter = 'DATE(c.data_abertura) = CURDATE()';
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
          COALESCE(SUM(v.valor_final), 0) as total_vendas
        FROM caixas c
        LEFT JOIN usuarios u ON c.operador_id = u.id
        LEFT JOIN vendas v ON v.caixa_id = c.id
        WHERE ${dateFilter}
        GROUP BY c.id
        ORDER BY c.data_abertura DESC
      `);

      // Calcular estatísticas
      const [estatisticas] = await pool.query<RowDataPacket[]>(`
        SELECT 
          COALESCE(SUM(v.valor_final), 0) as total_vendas,
          COALESCE(AVG(v.valor_final), 0) as media_vendas,
          COUNT(DISTINCT c.id) as total_caixas,
          COALESCE(SUM(c.valor_final - c.valor_inicial), 0) as saldo_total
        FROM caixas c
        LEFT JOIN vendas v ON v.caixa_id = c.id
        WHERE ${dateFilter}
      `);

      res.status(200).json({
        caixas,
        estatisticas: {
          totalVendas: Number(estatisticas[0].total_vendas),
          mediaVendas: Number(estatisticas[0].media_vendas),
          totalCaixas: Number(estatisticas[0].total_caixas),
          saldoTotal: Number(estatisticas[0].saldo_total)
        }
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