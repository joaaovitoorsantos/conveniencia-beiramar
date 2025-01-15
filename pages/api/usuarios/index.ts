import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      try {
        const [rows] = await pool.query<RowDataPacket[]>(`
          SELECT 
            u.id,
            u.nome,
            u.usuario,
            u.email,
            u.ativo,
            p.nome as perfil_nome,
            p.id as perfil_id
          FROM usuarios u
          LEFT JOIN perfis p ON u.perfil_id = p.id
          ORDER BY u.nome
        `);
        res.status(200).json(rows);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
      }
      break;

    case 'POST':
      try {
        const {
          nome,
          usuario,
          email,
          senha,
          perfil_id
        } = req.body;

        // Validar campos obrigatórios
        if (!nome || !usuario || !email || !senha || !perfil_id) {
          return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }

        // Verificar se usuário já existe
        const [existingUser] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM usuarios WHERE usuario = ? OR email = ?',
          [usuario, email]
        );

        if (Array.isArray(existingUser) && existingUser.length > 0) {
          return res.status(400).json({ error: 'Usuário ou email já cadastrado' });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(senha, 10);

        // Inserir usuário
        const [result] = await pool.query<ResultSetHeader>(
          `INSERT INTO usuarios (
            id, nome, usuario, email, senha, perfil_id, ativo
          ) VALUES (UUID(), ?, ?, ?, ?, ?, true)`,
          [nome, usuario, email, hashedPassword, perfil_id]
        );

        res.status(201).json({ message: 'Usuário cadastrado com sucesso' });
      } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        res.status(500).json({ error: 'Erro ao cadastrar usuário' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 