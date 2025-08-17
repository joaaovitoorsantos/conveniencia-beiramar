import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-segura';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { usuario, senha } = req.body;

    if (!usuario || !senha) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }



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
    const { senha: _, ...userWithoutPassword } = user as any;

    // Formatar permissões como array
    const userData = {
      ...userWithoutPassword,
      permissoes: user.permissoes ? user.permissoes.split(',') : []
    };

    // Gerar token JWT
    const tokenPayload = {
      id: userData.id,
      usuario: userData.usuario,
      email: userData.email,
      perfilId: userData.perfil_id,
      permissoes: userData.permissoes
    };
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

    // Configurar o token no cookie de forma segura
    const cookieValue = `auth_token=${token}; Path=/; SameSite=Lax; Max-Age=86400`;
    res.setHeader('Set-Cookie', cookieValue);
    


    res.status(200).json({
      message: 'Login realizado com sucesso',
      token: token,
      user: {
        id: userData.id,
        usuario: userData.usuario,
        email: userData.email,
        nome: userData.nome,
        perfilId: userData.perfil_id,
        permissoes: userData.permissoes
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
} 