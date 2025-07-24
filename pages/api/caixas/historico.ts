import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import moment from 'moment-timezone';

// Configurar timezone
process.env.TZ = 'America/Sao_Paulo';
moment.tz.setDefault('America/Sao_Paulo');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { periodo, data } = req.query;
      
      let dateFilter = '';
      
      // Se uma data específica foi fornecida, usar ela
      if (data && typeof data === 'string') {
        dateFilter = `DATE(c.data_abertura) = '${data}'`;
      } else {
        // Caso contrário, usar o período
        switch (periodo) {
          case 'hoje':
            dateFilter = `c.data_fechamento IS NULL`;
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
      }

      console.log('Filtro de data aplicado:', dateFilter);

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
        WHERE ${dateFilter}
        GROUP BY c.id
        ORDER BY c.data_abertura DESC
      `);

      // Para cada caixa, buscar as formas de pagamento agrupadas
      for (const caixa of caixas) {
        const [formasPagamento] = await pool.query<RowDataPacket[]>(`
          SELECT 
            pv.forma_pagamento,
            COUNT(*) as quantidade_pagamentos,
            SUM(pv.valor) as valor_total
          FROM pagamentos_venda pv
          INNER JOIN vendas v ON v.id = pv.venda_id
          WHERE v.caixa_id = ?
          GROUP BY pv.forma_pagamento
        `, [caixa.id]);
        caixa.formas_pagamento = formasPagamento;
      }

      // Calcular estatísticas
      const [estatisticas] = await pool.query<RowDataPacket[]>(`
        SELECT 
          COALESCE(SUM(v.valor_final), 0) as total_vendas,
          COALESCE(AVG(v.valor_final), 0) as media_vendas,
          COUNT(DISTINCT c.id) as total_caixas,
          (
            SELECT COALESCE(SUM(caixa.valor_inicial), 0) + COALESCE(SUM(venda.valor_final), 0)
            FROM caixas caixa
            LEFT JOIN vendas venda ON venda.caixa_id = caixa.id
            WHERE ${dateFilter}
          ) as saldo_total
        FROM caixas c
        LEFT JOIN vendas v ON v.caixa_id = c.id
        WHERE ${dateFilter}
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
        INNER JOIN caixas c ON v.caixa_id = c.id
        WHERE ${dateFilter}
        GROUP BY p.id
        ORDER BY total_quantidade DESC
        LIMIT 10
      `);

      // Adicionar query para totais por forma de pagamento
      console.log('Iniciando busca de formas de pagamento...');
      const [totaisPorFormaPagamento] = await pool.query<RowDataPacket[]>(`
        SELECT 
          COALESCE(pv.forma_pagamento, 'não informado') as forma_pagamento,
          COUNT(*) as quantidade_pagamentos,
          SUM(pv.valor) as valor_total
        FROM pagamentos_venda pv
        INNER JOIN vendas v ON v.id = pv.venda_id
        INNER JOIN caixas c ON v.caixa_id = c.id
        WHERE ${dateFilter}
        GROUP BY pv.forma_pagamento
        ORDER BY valor_total DESC
      `);

      console.log('Resultado bruto das formas de pagamento:', JSON.stringify(totaisPorFormaPagamento, null, 2));
      console.log('Número de formas de pagamento encontradas:', totaisPorFormaPagamento.length);
      
      // Log detalhado de cada forma de pagamento
      totaisPorFormaPagamento.forEach((pagamento, index) => {
        console.log(`Forma de Pagamento ${index + 1}:`, {
          forma: pagamento.forma_pagamento,
          quantidade: pagamento.quantidade_pagamentos,
          total: pagamento.valor_total
        });
      });

      res.status(200).json({
        caixas, // agora cada caixa tem .formas_pagamento
        estatisticas: {
          totalVendas: Number(estatisticas[0].total_vendas),
          mediaVendas: Number(estatisticas[0].media_vendas),
          totalCaixas: Number(estatisticas[0].total_caixas),
          saldoTotal: Number(estatisticas[0].saldo_total)
        },
        produtosMaisVendidos
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