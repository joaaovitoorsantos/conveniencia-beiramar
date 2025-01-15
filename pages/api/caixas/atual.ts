import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT 
          id, 
          data_abertura,
          valor_inicial,
          valor_final
         FROM caixas 
         WHERE data_fechamento IS NULL 
         ORDER BY data_abertura DESC 
         LIMIT 1`
      );

      if (rows.length > 0) {
        res.status(200).json(rows[0]);
      } else {
        res.status(404).json({ message: 'Nenhum caixa aberto' });
      }
    } catch (error) {
      console.error('Erro ao buscar caixa atual:', error);
      res.status(500).json({ error: 'Erro ao buscar caixa atual' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 