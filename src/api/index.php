<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/cms.php';

$route = $_GET['route'] ?? '';

if ($route === 'session' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    co_json_response(['authenticated' => co_is_authed()]);
}

if ($route === 'content' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        co_json_response(co_read_content());
    } catch (Throwable $e) {
        co_json_response(['error' => $e->getMessage()], 500);
    }
}

if ($route === 'content' && $_SERVER['REQUEST_METHOD'] === 'PUT') {
    if (!co_is_authed()) {
        co_json_response(['error' => 'Session expirée, reconnecte-toi.'], 401);
    }
    try {
        $clean = co_sanitize_content(co_read_json_body());
        co_ensure_private_dir();
        co_write_json(co_content_file(), $clean, 0640);
        co_json_response(['ok' => true]);
    } catch (Throwable $e) {
        co_json_response(['error' => $e->getMessage()], $e instanceof RuntimeException ? 400 : 500);
    }
}

if ($route === 'upload' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!co_is_authed()) {
        co_json_response(['error' => 'Session expirée, reconnecte-toi.'], 401);
    }
    try {
        $body = co_read_json_body();
        $data = (string) ($body['data'] ?? '');
        if (!preg_match('/^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+\/=]+)$/', $data, $m)) {
            co_json_response(['error' => 'Format non supporté — image PNG, JPG, WebP ou GIF attendue.'], 400);
        }
        $binary = base64_decode($m[2], true);
        if ($binary === false) {
            co_json_response(['error' => 'Image illisible.'], 400);
        }
        if (strlen($binary) > 4 * 1024 * 1024) {
            co_json_response(['error' => 'Image trop lourde (4 Mo maximum).'], 400);
        }
        $ext = $m[1] === 'jpeg' ? 'jpg' : $m[1];
        $name = dechex(time()) . '-' . bin2hex(random_bytes(5)) . '.' . $ext;
        $dir = co_upload_dir();
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $file = $dir . '/' . $name;
        if (file_put_contents($file, $binary, LOCK_EX) === false) {
            throw new RuntimeException("Échec de l'enregistrement de l'image.");
        }
        chmod($file, 0644);
        co_json_response(['path' => '/uploads/' . $name]);
    } catch (Throwable $e) {
        co_json_response(['error' => $e->getMessage()], 500);
    }
}

co_json_response(['error' => 'Route introuvable'], 404);
