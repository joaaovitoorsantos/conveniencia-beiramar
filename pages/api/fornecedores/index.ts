import { NextApiRequest, NextApiResponse } from 'next';
import { executeQuery } from '@/lib/db';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const fornecedores = await executeQuery<RowDataPacket[]>(`
        SELECT 
          f.id,
          f.nome,
          f.cnpj,
          f.telefone,
          f.email,
          f.endereco,
          COUNT(c.id) as total_compras,
          SUM(c.valor_total) as total_compras_valor
        FROM fornecedores f
        LEFT JOIN compras c ON f.id = c.fornecedor_id
        GROUP BY f.id
        ORDER BY f.nome ASC
      `);

      res.status(200).json(fornecedores);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      res.status(500).json({ error: 'Erro ao buscar fornecedores' });
    }
  } 
  else if (req.method === 'POST') {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const { nome, cnpj, telefone, email, endereco } = req.body;

      // Validações básicas
      if (!nome || !cnpj) {
        return res.status(400).json({ error: 'Nome e CNPJ são obrigatórios' });
      }

      // Verificar se CNPJ já existe
      const [existingCNPJ] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM fornecedores WHERE cnpj = ?',
        [cnpj]
      );

      if (existingCNPJ.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'CNPJ já cadastrado' });
      }

      const id = crypto.randomUUID();

      await connection.query<ResultSetHeader>(
        `INSERT INTO fornecedores (id, nome, cnpj, telefone, email, endereco) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, nome, cnpj, telefone, email, endereco]
      );

      await connection.commit();
      res.status(201).json({ 
        message: 'Fornecedor cadastrado com sucesso',
        fornecedor: {
          id,
          nome,
          cnpj,
          telefone,
          email,
          endereco
        }
      });
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao cadastrar fornecedor:', error);
      res.status(500).json({ error: 'Erro ao cadastrar fornecedor' });
    } finally {
      connection.release();
    }
  } 
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 