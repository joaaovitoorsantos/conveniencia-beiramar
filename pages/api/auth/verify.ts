import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-segura';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Pegar o token do cookie
    const token = req.cookies.auth_token;


    if (!token) {
      return res.status(401).json({ error: 'Token não encontrado' });
    }

    // Verificar o token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Retornar os dados do usuário
    res.status(200).json({
      user: {
        id: decoded.id,
        usuario: decoded.usuario,
        email: decoded.email,
        perfilId: decoded.perfilId,
        permissoes: decoded.permissoes
      },
      token: token,
      valid: true
    });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido', valid: false });
  }
} 