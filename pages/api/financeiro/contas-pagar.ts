import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const [contas] = await pool.query<RowDataPacket[]>(`
        SELECT 
          cp.id,
          cp.fornecedor_id,
          f.nome as fornecedor_nome,
          cp.compra_id,
          cp.valor,
          cp.data_vencimento,
          cp.status,
          cp.data_pagamento
        FROM contas_pagar cp
        LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
        ORDER BY cp.data_vencimento ASC
      `);

      res.status(200).json(contas);
    } catch (error) {
      console.error('Erro ao buscar contas a pagar:', error);
      res.status(500).json({ error: 'Erro ao buscar contas a pagar' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 