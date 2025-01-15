import mysql from 'mysql2/promise'

// Criar pool de conexões
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  maxIdle: 5,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
})

// Função helper para executar queries
export async function executeQuery<T>(query: string, params?: any[]): Promise<T> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query(query, params);
    return result as T;
  } finally {
    connection.release();
  }
}

export default pool