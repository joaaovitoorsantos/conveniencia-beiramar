// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { id } = req.query;

      // Buscar detalhes do cliente incluindo contas a receber
      const [cliente] = await pool.query(
        `SELECT 
          c.*, 
          (
            SELECT COALESCE(
              SUM(
                CASE 
                  WHEN cr.status = 'pendente' THEN cr.valor
                  WHEN cr.status = 'parcial' THEN (
                    cr.valor - COALESCE(
                      (SELECT SUM(pr.valor) FROM pagamentos_receber pr WHERE pr.conta_id = cr.id),
                      0
                    )
                  )
                  ELSE 0
                END
              ),
              0
            )
            FROM contas_receber cr
            WHERE cr.cliente_id = c.id
          ) as valor_devido
         FROM clientes c
         WHERE c.id = ?`,
        [id]
      );

      console.log('Cliente:', cliente[0]);

      // Buscar contas a receber com seus pagamentos
      const [contas] = await pool.query(
        `SELECT 
           cr.*,
           v.valor_final,
           v.data,
           COALESCE(
             (SELECT SUM(pr.valor)
              FROM pagamentos_receber pr
              WHERE pr.conta_id = cr.id),
             0
           ) as total_pago,
           (
             SELECT GROUP_CONCAT(
               JSON_OBJECT(
                 'id', pr.id,
                 'valor', pr.valor,
                 'forma_pagamento', pr.forma_pagamento,
                 'data', pr.criado_em
               )
             )
             FROM pagamentos_receber pr
             WHERE pr.conta_id = cr.id
           ) as pagamentos
         FROM contas_receber cr
         LEFT JOIN vendas v ON v.id = cr.venda_id
         WHERE cr.cliente_id = ?
         ORDER BY cr.data_vencimento ASC`,
        [id]
      );

      console.log('Contas a receber:', contas);

      // Formatar os pagamentos
      const contasFormatadas = contas.map((conta: any) => ({
        ...conta,
        pagamentos: conta.pagamentos ? JSON.parse(`[${conta.pagamentos}]`) : []
      }));

      contasFormatadas.forEach((conta: any) => {
        console.log('Conta:', conta.id, 'Valor:', conta.valor, 'Total Pago:', conta.total_pago, 'Pagamentos:', conta.pagamentos);
      });

      // Buscar compras do cliente
      const [compras] = await pool.query(`
        SELECT 
          v.*,
          u.nome as vendedor_nome,
          GROUP_CONCAT(
            DISTINCT
            JSON_OBJECT(
              'forma_pagamento', pv.forma_pagamento,
              'valor', pv.valor
            )
          ) as pagamentos,
          GROUP_CONCAT(
            DISTINCT
            JSON_OBJECT(
              'produto_id', iv.produto_id,
              'quantidade', iv.quantidade,
              'preco_venda', iv.preco_venda,
              'valor_total', iv.valor_total,
              'produto_nome', p.nome
            )
          ) as itens
        FROM vendas v
        LEFT JOIN usuarios u ON v.vendedor_id = u.id
        LEFT JOIN pagamentos_venda pv ON v.id = pv.venda_id
        LEFT JOIN itens_venda iv ON v.id = iv.venda_id
        LEFT JOIN produtos p ON iv.produto_id = p.id
        WHERE v.cliente_id = ?
        GROUP BY v.id
        ORDER BY v.data DESC
      `, [id]);

      // Formatar os dados das compras
      const comprasFormatadas = compras.map((compra: any) => ({
        ...compra,
        pagamentos: compra.pagamentos ? JSON.parse(`[${compra.pagamentos}]`) : [],
        itens: compra.itens ? JSON.parse(`[${compra.itens}]`) : []
      }));

      // Retornar os dados completos
      res.status(200).json({
        ...cliente[0],
        contas: contasFormatadas,
        compras: comprasFormatadas
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes do cliente:', error);
      res.status(500).json({ error: 'Erro ao buscar detalhes do cliente' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 