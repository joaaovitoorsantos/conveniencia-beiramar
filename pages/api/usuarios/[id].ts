import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  switch (req.method) {
    case 'PUT':
      try {
        const {
          nome,
          usuario,
          email,
          senha,
          perfil_id,
          ativo
        } = req.body;

        // Se tiver senha, faz o hash
        let hashedPassword;
        if (senha) {
          hashedPassword = await bcrypt.hash(senha, 10);
        }

        // Atualiza usuário
        const query = `
          UPDATE usuarios 
          SET 
            nome = ?,
            usuario = ?,
            email = ?,
            ${senha ? 'senha = ?,' : ''}
            perfil_id = ?,
            ativo = ?,
            atualizado_em = CURRENT_TIMESTAMP
          WHERE id = ?
        `;

        const values = senha 
          ? [nome, usuario, email, hashedPassword, perfil_id, ativo, id]
          : [nome, usuario, email, perfil_id, ativo, id];

        await pool.query(query, values);

        res.status(200).json({ message: 'Usuário atualizado com sucesso' });
      } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
      }
      break;

    case 'DELETE':
      try {
        await pool.query(
          'UPDATE usuarios SET ativo = false WHERE id = ?',
          [id]
        );
        res.status(200).json({ message: 'Usuário desativado com sucesso' });
      } catch (error) {
        console.error('Erro ao desativar usuário:', error);
        res.status(500).json({ error: 'Erro ao desativar usuário' });
      }
      break;

    default:
      res.setHeader('Allow', ['PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 