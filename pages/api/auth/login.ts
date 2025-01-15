import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { usuario, senha } = req.body;

    // Buscar usuário com suas permissões
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        u.id,
        u.nome,
        u.usuario,
        u.email,
        u.senha,
        u.ativo,
        p.id as perfil_id,
        p.nome as perfil_nome,
        GROUP_CONCAT(pp.permissao_id) as permissoes
      FROM usuarios u
      LEFT JOIN perfis p ON u.perfil_id = p.id
      LEFT JOIN perfis_permissoes pp ON p.id = pp.perfil_id
      WHERE u.usuario = ?
      GROUP BY u.id
    `, [usuario]);

    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    if (!user.ativo) {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    const isValid = await bcrypt.compare(senha, user.senha);

    if (!isValid) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    // Remover senha do objeto antes de enviar
    const { senha: _, ...userWithoutPassword } = user;

    // Formatar permissões como array
    const userData = {
      ...userWithoutPassword,
      permissoes: user.permissoes ? user.permissoes.split(',') : []
    };

    res.status(200).json({
      user: userData,
      message: 'Login realizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao realizar login:', error);
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
} 