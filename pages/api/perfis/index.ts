//@ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      try {
        // Buscar perfis com suas permissões
        const [rows] = await pool.query<RowDataPacket[]>(`
          SELECT 
            p.*,
            GROUP_CONCAT(pp.permissao_id) as permissoes
          FROM perfis p
          LEFT JOIN perfis_permissoes pp ON p.id = pp.perfil_id
          GROUP BY p.id
        `);

        // Formatar as permissões como array
        const profiles = rows.map(row => ({
          ...row,
          permissoes: row.permissoes ? row.permissoes.split(',') : []
        }));

        res.status(200).json(profiles);
      } catch (error) {
        console.error('Erro ao buscar perfis:', error);
        res.status(500).json({ error: 'Erro ao buscar perfis' });
      }
      break;

    case 'POST':
      try {
        const { nome, descricao, permissoes } = req.body;

        // Inicia a transação
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
          // Gera o UUID para o perfil
          const perfilId = crypto.randomUUID();

          // Insere o perfil com o UUID gerado
          await connection.query<ResultSetHeader>(
            'INSERT INTO perfis (id, nome, descricao) VALUES (?, ?, ?)',
            [perfilId, nome, descricao]
          );

          // Insere as permissões
          if (permissoes && permissoes.length > 0) {
            const permissoesValues = permissoes.map(permissaoId => [perfilId, permissaoId]);
            await connection.query(
              'INSERT INTO perfis_permissoes (perfil_id, permissao_id) VALUES ?',
              [permissoesValues]
            );
          }

          await connection.commit();
          res.status(201).json({ 
            message: 'Perfil cadastrado com sucesso',
            id: perfilId 
          });
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      } catch (error) {
        console.error('Erro ao cadastrar perfil:', error);
        res.status(500).json({ error: 'Erro ao cadastrar perfil' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 