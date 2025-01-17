import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const { id } = req.query;
      const { valor } = req.body;

      await connection.query(`
        UPDATE contas_receber 
        SET 
          status = 'pago',
          data_pagamento = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [id]);

      await connection.commit();
      res.status(200).json({ message: 'Pagamento registrado com sucesso' });
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao registrar pagamento:', error);
      res.status(500).json({ error: 'Erro ao registrar pagamento' });
    } finally {
      connection.release();
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 