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
      // Primeiro, buscar as vendas
      const [vendas] = await pool.query<RowDataPacket[]>(`
        SELECT 
          v.id,
          v.data,
          v.valor_total,
          v.desconto,
          v.valor_final,
          v.status,
          u.nome as vendedor_nome
        FROM vendas v
        LEFT JOIN usuarios u ON v.vendedor_id = u.id
        ORDER BY v.data DESC
        LIMIT 5
      `);

      // Para cada venda, buscar seus pagamentos e itens
      const vendasCompletas = await Promise.all(vendas.map(async (venda) => {
        // Buscar pagamentos
        const [pagamentos] = await pool.query<RowDataPacket[]>(`
          SELECT id, forma_pagamento, valor
          FROM pagamentos_venda
          WHERE venda_id = ?
        `, [venda.id]);

        // Buscar itens
        const [itens] = await pool.query<RowDataPacket[]>(`
          SELECT 
            iv.produto_id,
            iv.quantidade,
            iv.preco_venda as valor_unitario,
            iv.valor_total,
            p.nome as produto_nome
          FROM itens_venda iv
          LEFT JOIN produtos p ON iv.produto_id = p.id
          WHERE iv.venda_id = ?
        `, [venda.id]);

        return {
          ...venda,
          pagamentos,
          itens
        };
      }));

      res.status(200).json(vendasCompletas);
    } catch (error) {
      console.error('Erro ao buscar últimas vendas:', error);
      res.status(500).json({ error: 'Erro ao buscar últimas vendas' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 