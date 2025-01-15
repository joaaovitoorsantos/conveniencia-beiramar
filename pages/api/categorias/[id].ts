//@ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Verifica se existem produtos usando esta categoria
    const [products] = await pool.query(
      'SELECT COUNT(*) as count FROM produtos WHERE categoria_id = ?',
      [id]
    );

    if (products[0].count > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir uma categoria que possui produtos vinculados' 
      });
    }

    await pool.query('DELETE FROM categorias WHERE id = ?', [id]);
    res.status(200).json({ message: 'Categoria removida com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar categoria:', error);
    res.status(500).json({ error: 'Erro ao remover categoria' });
  }
} 