// Creates the app database on the local MySQL started by
// scripts/replit-start.sh. Uses the app's own mysql2 driver rather than the
// `mysql` command-line client, which isn't always runnable: the
// directly-downloaded MySQL binary's client needs libncurses.so.5, missing
// on recent images, while mysqld itself runs fine.
//
// Usage: node scripts/create-database.mjs <port> <database>
import mysql from "mysql2/promise";

const [port = "3306", database = "tafawoq"] = process.argv.slice(2);
if (!/^[A-Za-z0-9_]+$/.test(database)) {
  console.error(`Refusing unsafe database name: ${database}`);
  process.exit(2);
}
try {
  const connection = await mysql.createConnection({ host: "127.0.0.1", port: Number(port), user: "root" });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  await connection.end();
  console.log(`[create-database] ${database} is ready.`);
} catch (error) {
  console.error(`[create-database] Could not create ${database}:`, error instanceof Error ? error.message : error);
  process.exit(1);
}
