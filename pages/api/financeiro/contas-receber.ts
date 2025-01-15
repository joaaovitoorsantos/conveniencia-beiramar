import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const [contas] = await pool.query<RowDataPacket[]>(`
        SELECT 
          cr.id,
          cr.cliente_id,
          c.nome as cliente_nome,
          cr.venda_id,
          cr.valor,
          cr.data_vencimento,
          cr.status,
          cr.data_pagamento
        FROM contas_receber cr
        LEFT JOIN clientes c ON cr.cliente_id = c.id
        ORDER BY cr.data_vencimento ASC
      `);

      res.status(200).json(contas);
    } catch (error) {
      console.error('Erro ao buscar contas a receber:', error);
      res.status(500).json({ error: 'Erro ao buscar contas a receber' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 