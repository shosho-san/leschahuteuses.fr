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

if ($route === 'instagram' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $fallback = [
        'posts' => [[
            'id' => 'DYkJtKmt_o-',
            'title' => 'Dernières places disponibles pour Histoires de Q n°28',
            'description' => 'Programmation du cabaret du vendredi 22 mai à La Bellevilloise.',
            'image' => 'https://scontent-cdg4-2.cdninstagram.com/v/t51.82787-15/704247454_18120221644709693_8281258221427833093_n.jpg?stp=c270.0.810.810a_dst-jpg_e35_s640x640_tt6&_nc_cat=107&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiRkVFRC5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=f6Tq8UU-sckQ7kNvwGVhTmH&_nc_oc=AdrWYFpY4nldxYyI4f7y4kvs6gsxBD5HeVNI68wyEaibBXzNU3UKFM_x484j0M4UEsM&_nc_zt=23&_nc_ht=scontent-cdg4-2.cdninstagram.com&_nc_gid=YzgOgToM4O0b-_lNcbbFBw&_nc_ss=7d60f&oh=00_Af5sXuFvp_mmu6I4Ej6qqdtiaUGanVl0Jk0no6CSHKc5_A&oe=6A14E4E3',
            'permalink' => 'https://www.instagram.com/histoiresdeq/p/DYkJtKmt_o-/',
            'timestamp' => '2026-05-20T00:00:00+00:00',
        ]],
        'source' => 'fallback',
    ];

    $cacheFile = co_private_dir() . '/instagram-cache.json';
    $configFile = co_private_dir() . '/instagram.php';

    if (is_file($cacheFile)) {
        $cached = json_decode((string) file_get_contents($cacheFile), true);
        $maxAge = is_array($cached) ? (int) ($cached['cache_ttl'] ?? 3600) : 3600;
        $fetchedAt = is_array($cached) ? strtotime((string) ($cached['fetched_at'] ?? '')) : false;
        if ($fetchedAt && time() - $fetchedAt < $maxAge) {
            co_json_response($cached);
        }
    }

    if (!is_file($configFile)) {
        co_json_response($fallback);
    }

    $config = require $configFile;
    if (!is_array($config) || empty($config['ig_user_id']) || empty($config['access_token'])) {
        co_json_response($fallback);
    }

    $limit = max(1, min(12, (int) ($config['limit'] ?? 6)));
    $ttl = max(300, (int) ($config['cache_ttl'] ?? 3600));
    $endpoint = 'https://graph.facebook.com/v20.0/' . rawurlencode((string) $config['ig_user_id']) . '/media'
        . '?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp'
        . '&limit=' . $limit
        . '&access_token=' . rawurlencode((string) $config['access_token']);

    try {
        $context = stream_context_create(['http' => ['timeout' => 8, 'ignore_errors' => true]]);
        $raw = file_get_contents($endpoint, false, $context);
        $payload = json_decode($raw ?: '', true);
        if (!is_array($payload) || !isset($payload['data']) || !is_array($payload['data'])) {
            throw new RuntimeException('Réponse Instagram invalide.');
        }

        $posts = [];
        foreach ($payload['data'] as $item) {
            if (!is_array($item)) continue;
            $type = (string) ($item['media_type'] ?? '');
            if (!in_array($type, ['IMAGE', 'CAROUSEL_ALBUM', 'VIDEO'], true)) continue;
            $image = (string) (($type === 'VIDEO' ? ($item['thumbnail_url'] ?? '') : '') ?: ($item['media_url'] ?? '') ?: ($item['thumbnail_url'] ?? ''));
            $link = (string) ($item['permalink'] ?? '');
            if (!$image || !$link) continue;

            $caption = trim((string) ($item['caption'] ?? ''));
            $firstLine = trim((string) preg_split('/\R/u', $caption, 2)[0]);
            $title = $firstLine !== '' ? co_str($firstLine, 90) : 'Publication Instagram';
            $description = $caption !== '' ? co_str(preg_replace('/\s+/u', ' ', $caption), 160) : 'Voir la publication sur Instagram.';

            $posts[] = [
                'id' => co_str($item['id'] ?? '', 80),
                'title' => $title,
                'description' => $description,
                'image' => $image,
                'permalink' => $link,
                'timestamp' => co_str($item['timestamp'] ?? '', 40),
            ];
        }

        if (!$posts) throw new RuntimeException('Aucune publication Instagram exploitable.');
        $response = [
            'posts' => $posts,
            'source' => 'instagram_graph_api',
            'fetched_at' => gmdate('c'),
            'cache_ttl' => $ttl,
        ];
        co_write_json($cacheFile, $response, 0640);
        co_json_response($response);
    } catch (Throwable $e) {
        if (is_file($cacheFile)) {
            $cached = json_decode((string) file_get_contents($cacheFile), true);
            if (is_array($cached)) co_json_response($cached);
        }
        co_json_response($fallback);
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
