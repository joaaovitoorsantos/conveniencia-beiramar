import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { valor_inicial, operador_id } = req.body;

      // Validação dos campos obrigatórios
      if (!operador_id) {
        return res.status(400).json({ error: 'Operador não informado' });
      }

      if (!valor_inicial && valor_inicial !== 0) {
        return res.status(400).json({ error: 'Valor inicial não informado' });
      }

      // Verifica se já existe um caixa aberto
      const [caixasAbertos] = await pool.query(
        'SELECT id FROM caixas WHERE data_fechamento IS NULL'
      );

      if (Array.isArray(caixasAbertos) && caixasAbertos.length > 0) {
        return res.status(400).json({ error: 'Já existe um caixa aberto' });
      }

      const id = crypto.randomUUID();
      
      await pool.query<ResultSetHeader>(
        `INSERT INTO caixas (
          id, data_abertura, valor_inicial, operador_id
        ) VALUES (?, CURRENT_TIMESTAMP, ?, ?)`,
        [id, valor_inicial, operador_id]
      );

      res.status(201).json({ message: 'Caixa aberto com sucesso' });
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
      res.status(500).json({ error: 'Erro ao abrir caixa' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 