import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const [fornecedores] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM fornecedores WHERE id = ?`,
        [id]
      );

      if (fornecedores.length === 0) {
        return res.status(404).json({ error: 'Fornecedor não encontrado' });
      }

      res.status(200).json(fornecedores[0]);
    } catch (error) {
      console.error('Erro ao buscar fornecedor:', error);
      res.status(500).json({ error: 'Erro ao buscar fornecedor' });
    }
  } 
  else if (req.method === 'PUT') {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const { nome, cnpj, telefone, email, endereco } = req.body;

      await connection.query<ResultSetHeader>(
        `UPDATE fornecedores 
         SET nome = ?, cnpj = ?, telefone = ?, email = ?, endereco = ?
         WHERE id = ?`,
        [nome, cnpj, telefone, email, endereco, id]
      );

      await connection.commit();
      res.status(200).json({ message: 'Fornecedor atualizado com sucesso' });
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao atualizar fornecedor:', error);
      res.status(500).json({ error: 'Erro ao atualizar fornecedor' });
    } finally {
      connection.release();
    }
  } 
  else if (req.method === 'DELETE') {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.query(
        'DELETE FROM fornecedores WHERE id = ?',
        [id]
      );

      await connection.commit();
      res.status(200).json({ message: 'Fornecedor excluído com sucesso' });
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao excluir fornecedor:', error);
      res.status(500).json({ error: 'Erro ao excluir fornecedor' });
    } finally {
      connection.release();
    }
  } 
  else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 