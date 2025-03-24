// @ts-nocheck
// pages/api/clientes/[id]/pagar-geral.ts
import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { valor, forma_pagamento } = req.body;

  if (!id || !valor || !forma_pagamento) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Primeiro, buscar o ID do usuário padrão do sistema
    const [usuarios] = await connection.query(
      `SELECT id FROM usuarios LIMIT 1`
    );

    if (!usuarios || usuarios.length === 0) {
      throw new Error('Nenhum usuário encontrado no sistema');
    }

    const usuario_id = usuarios[0].id;

    // Buscar todas as contas pendentes ordenadas por data de vencimento
    const [contas] = await connection.query(
      `SELECT cr.id, cr.valor, cr.status, cr.data_vencimento, cr.cliente_id
       FROM contas_receber cr
       WHERE cr.cliente_id = ? 
       AND cr.status = 'pendente'
       ORDER BY cr.data_vencimento ASC`,
      [id]
    );

    // Log para debug
    console.log('Cliente ID:', id);
    console.log('Contas encontradas:', contas);

    if (!contas || contas.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        error: 'Não existem contas pendentes para este cliente',
        debug: {
          clienteId: id,
          contasEncontradas: contas
        }
      });
    }

    let valorRestante = Number(valor);
    const pagamentosRealizados = [];

    // Para cada conta, pagar total ou parcial até acabar o valor
    for (const conta of contas) {
      if (valorRestante <= 0) break;

      const valorPagar = Math.min(Number(conta.valor), valorRestante);
      
      // Registrar o pagamento
      const [result] = await connection.query(
        `INSERT INTO pagamentos_receber 
         (id, conta_id, valor, forma_pagamento, recebido_por) 
         VALUES (UUID(), ?, ?, ?, ?)`,
        [conta.id, valorPagar, forma_pagamento, usuario_id]
      );

      pagamentosRealizados.push({
        conta_id: conta.id,
        valor: valorPagar
      });

      // Atualizar apenas o status da conta
      if (valorPagar >= Number(conta.valor)) {
        await connection.query(
          `UPDATE contas_receber 
           SET status = 'pago', 
               data_pagamento = NOW()
           WHERE id = ?`,
          [conta.id]
        );
      } else {
        await connection.query(
          `UPDATE contas_receber 
           SET status = 'parcial'
           WHERE id = ?`,
          [conta.id]
        );
      }

      valorRestante -= valorPagar;
    }

    // Antes de atualizar o valor devido
    const [valorAntes] = await connection.query(
      `SELECT valor_devido FROM clientes WHERE id = ?`,
      [id]
    );
    console.log('Valor devido antes:', valorAntes[0].valor_devido);

    // Vamos ver todas as contas e seus pagamentos
    const [contasDebug] = await connection.query(
      `SELECT 
         cr.id,
         cr.valor as valor_original,
         cr.status,
         COALESCE(SUM(pr.valor), 0) as total_pago
       FROM contas_receber cr
       LEFT JOIN pagamentos_receber pr ON pr.conta_id = cr.id
       WHERE cr.cliente_id = ?
       GROUP BY cr.id`,
      [id]
    );
    console.log('Status das contas:', contasDebug);

    // Atualizar o valor devido do cliente com uma query mais simples
    await connection.query(
      `UPDATE clientes c
       SET c.valor_devido = (
         SELECT COALESCE(
           SUM(
             CASE
               WHEN cr.status = 'pendente' THEN cr.valor
               WHEN cr.status = 'parcial' THEN cr.valor - COALESCE(
                 (SELECT SUM(valor) FROM pagamentos_receber WHERE conta_id = cr.id),
                 0
               )
               ELSE 0
             END
           ),
           0
         )
         FROM contas_receber cr
         WHERE cr.cliente_id = ?
       )
       WHERE c.id = ?`,
      [id, id]
    );

    // Verificar o valor depois
    const [valorDepois] = await connection.query(
      `SELECT valor_devido FROM clientes WHERE id = ?`,
      [id]
    );
    console.log('Valor devido depois:', valorDepois[0].valor_devido);

    await connection.commit();
    res.status(200).json({ 
      message: 'Pagamento registrado com sucesso',
      pagamentos: pagamentosRealizados
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erro ao registrar pagamento:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erro ao registrar pagamento' 
    });
  } finally {
    connection.release();
  }
}