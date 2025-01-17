import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const [clientes] = await pool.query<RowDataPacket[]>(`
        SELECT 
          c.*,
          COALESCE(
            (
              SELECT SUM(cr2.valor) 
              FROM contas_receber cr2 
              WHERE cr2.cliente_id = c.id 
              AND cr2.status = 'pendente'
            ), 
            0
          ) as valor_devido,
          COUNT(DISTINCT v.id) as total_compras,
          MAX(v.data) as ultima_compra
        FROM clientes c
        LEFT JOIN vendas v ON c.id = v.cliente_id
        GROUP BY c.id
        ORDER BY c.nome ASC
      `);

      res.status(200).json(clientes);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
  } 
  else if (req.method === 'POST') {
    try {
      const { 
        nome, 
        cpf, 
        telefone, 
        email, 
        endereco,
        limite_credito = 0
      } = req.body;

      // Validações
      if (!nome) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }

      // Verificar se CPF já existe
      if (cpf) {
        const [existingCpf] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM clientes WHERE cpf = ?',
          [cpf]
        );

        if (Array.isArray(existingCpf) && existingCpf.length > 0) {
          return res.status(400).json({ error: 'CPF já cadastrado' });
        }
      }

      const id = crypto.randomUUID();

      await pool.query<ResultSetHeader>(
        `INSERT INTO clientes (
          id, nome, cpf, telefone, email, endereco, limite_credito
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, nome, cpf, telefone, email, endereco, limite_credito]
      );

      res.status(201).json({ 
        message: 'Cliente cadastrado com sucesso',
        id 
      });
    } catch (error) {
      console.error('Erro ao cadastrar cliente:', error);
      res.status(500).json({ error: 'Erro ao cadastrar cliente' });
    }
  } 
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 