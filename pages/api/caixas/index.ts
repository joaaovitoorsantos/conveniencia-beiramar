import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Buscar todos os caixas com informações dos operadores
      const [caixas] = await pool.query<RowDataPacket[]>(`
        SELECT 
          c.id,
          c.data_abertura,
          c.data_fechamento,
          c.valor_inicial,
          c.valor_final,
          c.diferenca,
          c.status,
          c.operador_id,
          c.observacoes,
          c.criado_em,
          u.nome as operador_nome,
          u.email as operador_email
        FROM caixas c
        LEFT JOIN usuarios u ON c.operador_id = u.id
        ORDER BY c.data_abertura DESC
      `);

      res.status(200).json(caixas);
    } catch (error) {
      console.error('Erro ao buscar caixas:', error);
      res.status(500).json({ error: 'Erro ao buscar caixas' });
    }
  } else if (req.method === 'POST') {
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
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 