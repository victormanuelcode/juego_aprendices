<?php
declare(strict_types=1);

// Conexión a MySQL con PDO (lee variables de entorno, y si no existen usa defaults)
// Variables: DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT
final class Database
{
    private string $host;
    private string $db_name;
    private string $username;
    private string $password;
    private ?string $port = null;

    public function __construct()
    {
        // Si no hay .env, igual funciona con XAMPP (root sin clave)
        $this->host = $_ENV['DB_HOST'] ?? '127.0.0.1';
        $this->db_name = $_ENV['DB_NAME'] ?? 'juego_manual_apre';
        $this->username = $_ENV['DB_USER'] ?? 'root';
        $this->password = $_ENV['DB_PASS'] ?? '';
        $this->port = $_ENV['DB_PORT'] ?? null;
    }

    public function getConnection(): PDO
    {
        // Primero conecta sin DB para poder crearla si no existe
        $portSegment = $this->port ? ";port={$this->port}" : "";
        $dsnNoDb = "mysql:host={$this->host}{$portSegment};charset=utf8mb4";
        $pdo = new PDO($dsnNoDb, $this->username, $this->password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $db = preg_replace('/[^a-zA-Z0-9_]/', '', $this->db_name);
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$db}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $dsn = "mysql:host={$this->host}{$portSegment};dbname={$db};charset=utf8mb4";
        // Ahora sí devuelve la conexión apuntando a la DB final
        return new PDO($dsn, $this->username, $this->password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
}
