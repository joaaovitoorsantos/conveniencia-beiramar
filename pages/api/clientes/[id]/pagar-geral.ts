// @ts-nocheck
// pages/api/clientes/[id]/pagar-geral.ts
import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { valor } = req.body;

  if (!id || !valor) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Buscar todas as contas pendentes ordenadas por data de vencimento
    const [contas] = await connection.query(
      `SELECT id, valor, valor_pago 
       FROM contas_receber 
       WHERE cliente_id = ? AND status = 'pendente' 
       ORDER BY data_vencimento ASC`,
      [id]
    );

    let valorRestante = Number(valor);
    
    // Para cada conta, pagar total ou parcial até acabar o valor
    for (const conta of contas) {
      if (valorRestante <= 0) break;

      const valorPendente = Number(conta.valor) - (Number(conta.valor_pago) || 0);
      const valorPagar = Math.min(valorPendente, valorRestante);
      
      if (valorPagar >= valorPendente) {
        // Pagamento total da conta
        await connection.query(
          `UPDATE contas_receber 
           SET status = 'pago', 
               data_pagamento = NOW(), 
               valor_pago = valor
           WHERE id = ?`,
          [conta.id]
        );
      } else {
        // Pagamento parcial
        await connection.query(
          `UPDATE contas_receber 
           SET valor_pago = COALESCE(valor_pago, 0) + ?
           WHERE id = ?`,
          [valorPagar, conta.id]
        );
      }

      valorRestante -= valorPagar;
    }

    // Atualizar o valor devido do cliente
    await connection.query(
      `UPDATE clientes 
       SET valor_devido = (
         SELECT COALESCE(SUM(valor - COALESCE(valor_pago, 0)), 0)
         FROM contas_receber
         WHERE cliente_id = ? AND status = 'pendente'
       )
       WHERE id = ?`,
      [id, id]
    );

    await connection.commit();
    res.status(200).json({ message: 'Pagamento registrado com sucesso' });

  } catch (error) {
    await connection.rollback();
    console.error('Erro ao registrar pagamento:', error);
    res.status(500).json({ error: 'Erro ao registrar pagamento' });
  } finally {
    connection.release();
  }
}