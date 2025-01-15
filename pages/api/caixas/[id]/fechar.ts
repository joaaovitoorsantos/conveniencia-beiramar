import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'PUT') {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const { id } = req.query;

      // 1. Buscar valor inicial do caixa
      const [caixaResult] = await connection.query<RowDataPacket[]>(
        'SELECT valor_inicial FROM caixas WHERE id = ?',
        [id]
      );
      
      const valorInicial = Number(caixaResult[0]?.valor_inicial || 0);

      // 2. Calcular total de vendas do caixa
      const [vendasResult] = await connection.query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(valor_final), 0) as total_vendas 
         FROM vendas 
         WHERE caixa_id = ?`,
        [id]
      );
      
      const totalVendas = Number(vendasResult[0]?.total_vendas || 0);

      // 3. Calcular valor final (valor inicial + total de vendas)
      const valorFinal = valorInicial + totalVendas;

      // 4. Atualizar caixa com data de fechamento e valor final
      await connection.query(
        `UPDATE caixas 
         SET data_fechamento = CURRENT_TIMESTAMP,
             valor_final = ?
         WHERE id = ? AND data_fechamento IS NULL`,
        [valorFinal, id]
      );

      await connection.commit();
      res.status(200).json({ 
        message: 'Caixa fechado com sucesso',
        valor_final: valorFinal
      });
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao fechar caixa:', error);
      res.status(500).json({ error: 'Erro ao fechar caixa' });
    } finally {
      connection.release();
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 