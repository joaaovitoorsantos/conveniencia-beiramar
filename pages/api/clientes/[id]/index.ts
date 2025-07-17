// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const {
        nome,
        cpf,
        telefone,
        email,
        endereco,
        limite_credito = 0
      } = req.body;

      if (!nome) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }

      // Verificar se CPF já existe para outro cliente
      if (cpf) {
        const [existingCpf] = await pool.query(
          'SELECT id FROM clientes WHERE cpf = ? AND id <> ?',
          [cpf, id]
        );
        if (Array.isArray(existingCpf) && existingCpf.length > 0) {
          return res.status(400).json({ error: 'CPF já cadastrado para outro cliente' });
        }
      }

      await pool.query(
        `UPDATE clientes SET nome = ?, cpf = ?, telefone = ?, email = ?, endereco = ?, limite_credito = ? WHERE id = ?`,
        [nome, cpf, telefone, email, endereco, limite_credito, id]
      );

      res.status(200).json({ message: 'Cliente atualizado com sucesso' });
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 