import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM categorias');
        res.status(200).json(rows);
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro ao buscar categorias' });
      }
      break;

    case 'POST':
      try {
        const { nome, descricao } = req.body;

        const [result] = await pool.query<ResultSetHeader>(
          'INSERT INTO categorias (id, nome, descricao) VALUES (UUID(), ?, ?)',
          [nome, descricao]
        );

        res.status(201).json({ message: 'Categoria cadastrada com sucesso' });
      } catch (error) {
        console.error('Erro ao cadastrar categoria:', error);
        res.status(500).json({ error: 'Erro ao cadastrar categoria' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 