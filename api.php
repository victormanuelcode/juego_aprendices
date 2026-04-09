<?php

declare(strict_types=1);

// API del juego (se llama desde game.js)
header('Content-Type: application/json; charset=utf-8');

// Aquí está la clase Database (con PDO)
require_once __DIR__ . '/conexion.php';

// Respuesta rápida en JSON y se termina el script
function responder(int $estado, array $carga): void
{
    http_response_code($estado);
    echo json_encode($carga, JSON_UNESCAPED_UNICODE);
    exit;
}

// Lee datos de entrada: si llega JSON lo toma, si no, usa POST normal
function leer_entrada(): array
{
    $raw = file_get_contents('php://input');
    if (is_string($raw) && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }
    return $_POST;
}

// Limpia texto y lo recorta a un máximo
function limitar_texto(string $s, int $max): string
{
    $s = trim($s);
    if (mb_strlen($s, 'UTF-8') > $max) {
        $s = mb_substr($s, 0, $max, 'UTF-8');
    }
    return $s;
}

// Conexión a la base de datos (PDO)
function conexion_bd(): PDO
{
    $db = new Database();
    return $db->getConnection();
}

// Acción a ejecutar (viene en ?action=...)
$accion = $_GET['action'] ?? '';
$entrada = leer_entrada();
if ($accion === '' && isset($entrada['action'])) {
    $accion = (string) $entrada['action'];
}
$accion = strtolower(trim((string) $accion));

try {
    $pdo = conexion_bd();

    // 1) Registrar aprendiz (guarda o reutiliza si ya existe)
    if ($accion === 'registrar') {
        $nombre = limitar_texto((string) ($entrada['nombre'] ?? ''), 60);
        $ficha = limitar_texto((string) ($entrada['ficha'] ?? ''), 30);
        if (mb_strlen($nombre, 'UTF-8') < 2) {
            responder(400, ['ok' => false, 'error' => 'Nombre inválido']);
        }

        $now = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');

        $stmt = $pdo->prepare('INSERT INTO usuarios (nombre, ficha, creado_en) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)');
        $stmt->execute([$nombre, $ficha, $now]);
        $idUsuario = (int) $pdo->lastInsertId();

        $stmt2 = $pdo->prepare('SELECT id, nombre, ficha, creado_en FROM usuarios WHERE id = ? LIMIT 1');
        $stmt2->execute([$idUsuario]);
        $usuario = $stmt2->fetch();

        if (!is_array($usuario)) responder(500, ['ok' => false, 'error' => 'No se pudo registrar']);
        responder(200, ['ok' => true, 'user' => $usuario]);
    }

    // 2) Guardar partida (puntaje/tiempo/aciertos)
    if ($accion === 'guardar_partida') {
        $idUsuario = (int) ($entrada['user_id'] ?? 0);
        $puntaje = (int) ($entrada['puntaje'] ?? ($entrada['score'] ?? 0));
        $aciertos = (int) ($entrada['aciertos'] ?? ($entrada['correct'] ?? 0));
        $total = (int) ($entrada['total'] ?? 0);
        $tiempoSeg = (float) ($entrada['tiempo_seg'] ?? ($entrada['time_sec'] ?? 0));
        $distancia = (float) ($entrada['distancia'] ?? ($entrada['distance'] ?? 0));

        if ($idUsuario <= 0) responder(400, ['ok' => false, 'error' => 'Usuario inválido']);
        if ($puntaje < 0) $puntaje = 0;
        if ($aciertos < 0) $aciertos = 0;
        if ($total <= 0) $total = 1;
        if ($tiempoSeg < 0) $tiempoSeg = 0;
        if ($distancia < 0) $distancia = 0;

        $stmtU = $pdo->prepare('SELECT id FROM usuarios WHERE id = ? LIMIT 1');
        $stmtU->execute([$idUsuario]);
        $existe = $stmtU->fetch();
        if (!is_array($existe)) responder(404, ['ok' => false, 'error' => 'Usuario no existe']);

        $now = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
        $stmt = $pdo->prepare(
            'INSERT INTO partidas (id_usuario, puntaje, aciertos, total, tiempo_seg, distancia, creado_en)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$idUsuario, $puntaje, $aciertos, $total, $tiempoSeg, $distancia, $now]);

        responder(200, ['ok' => true]);
    }

    // 3) Ranking (top N)
    if ($accion === 'clasificacion') {
        $limite = isset($_GET['limit']) ? (int) $_GET['limit'] : 10;
        $limite = max(1, min(50, $limite));

        $sql =
            'SELECT
                u.nombre,
                u.ficha,
                p.puntaje,
                p.aciertos,
                p.total,
                p.tiempo_seg,
                p.creado_en
            FROM partidas p
            JOIN usuarios u ON u.id = p.id_usuario
            ORDER BY p.puntaje DESC, p.tiempo_seg ASC, p.creado_en DESC
            LIMIT ' . $limite;
        $rows = $pdo->query($sql)->fetchAll() ?: [];
        responder(200, ['ok' => true, 'rows' => $rows]);
    }

    // Si no coincide con nada, es que mandaron un action raro
    responder(404, ['ok' => false, 'error' => 'Acción no encontrada']);
} catch (Throwable $e) {
    // Error general (por ejemplo: BD apagada, tablas no existen, etc.)
    responder(500, ['ok' => false, 'error' => 'Error del servidor']);
}
