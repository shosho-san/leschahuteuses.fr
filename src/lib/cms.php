<?php
declare(strict_types=1);

const CO_SESSION_HOURS = 8;
const CO_COOKIE_SESSION = 'co_sess';
const CO_COOKIE_HINT = 'co_editor';

function co_root(): string {
    return dirname(__DIR__);
}

function co_private_dir(): string {
    return co_root() . '/private';
}

function co_auth_file(): string {
    return co_private_dir() . '/auth.json';
}

function co_content_file(): string {
    return co_private_dir() . '/content.json';
}

function co_content_seed_file(): string {
    return co_root() . '/content.json';
}

function co_upload_dir(): string {
    return co_root() . '/uploads';
}

function co_ensure_private_dir(): void {
    if (!is_dir(co_private_dir())) {
        mkdir(co_private_dir(), 0750, true);
    }
}

function co_load_auth(): ?array {
    $file = co_auth_file();
    if (!is_file($file)) return null;
    $data = json_decode((string) file_get_contents($file), true);
    return is_array($data) ? $data : null;
}

function co_save_auth(string $password): void {
    if (strlen($password) < 10) {
        throw new RuntimeException('Le mot de passe doit faire au moins 10 caractères.');
    }
    co_ensure_private_dir();
    $auth = [
        'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
        'sessionSecret' => bin2hex(random_bytes(32)),
        'createdAt' => gmdate('c'),
    ];
    co_write_json(co_auth_file(), $auth, 0640);
}

function co_check_password(string $password): bool {
    $auth = co_load_auth();
    return $auth && isset($auth['passwordHash']) && password_verify($password, $auth['passwordHash']);
}

function co_make_token(): ?string {
    $auth = co_load_auth();
    if (!$auth || empty($auth['sessionSecret'])) return null;
    $exp = time() + CO_SESSION_HOURS * 3600;
    $sig = hash_hmac('sha256', (string) $exp, (string) $auth['sessionSecret']);
    return $exp . '.' . $sig;
}

function co_token_valid(?string $token): bool {
    $auth = co_load_auth();
    if (!$auth || empty($auth['sessionSecret']) || !$token || !str_contains($token, '.')) return false;
    [$exp, $sig] = explode('.', $token, 2);
    if (!ctype_digit($exp) || time() > (int) $exp) return false;
    $expected = hash_hmac('sha256', $exp, (string) $auth['sessionSecret']);
    return hash_equals($expected, $sig);
}

function co_is_authed(): bool {
    return co_token_valid($_COOKIE[CO_COOKIE_SESSION] ?? null);
}

function co_cookie_options(int $maxAge): array {
    return [
        'expires' => $maxAge > 0 ? time() + $maxAge : time() - 3600,
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Lax',
    ];
}

function co_set_session_cookies(string $token): void {
    $maxAge = CO_SESSION_HOURS * 3600;
    setcookie(CO_COOKIE_SESSION, $token, co_cookie_options($maxAge));
    $hint = co_cookie_options($maxAge);
    $hint['httponly'] = false;
    setcookie(CO_COOKIE_HINT, '1', $hint);
}

function co_clear_session_cookies(): void {
    setcookie(CO_COOKIE_SESSION, '', co_cookie_options(0));
    $hint = co_cookie_options(0);
    $hint['httponly'] = false;
    setcookie(CO_COOKIE_HINT, '', $hint);
}

function co_json_response($data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function co_read_json_body(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    if (!is_array($data)) {
        throw new RuntimeException('Contenu JSON invalide');
    }
    return $data;
}

function co_empty_content(): array {
    return ['events' => [], 'formats' => [], 'texts' => []];
}

function co_read_json_file(string $file): ?array {
    if (!is_file($file)) return null;
    $data = json_decode((string) file_get_contents($file), true);
    return is_array($data) ? $data : null;
}

function co_read_content(): array {
    co_ensure_private_dir();

    $private = co_content_file();
    $data = co_read_json_file($private);
    if (is_array($data)) {
        return co_sanitize_content($data);
    }

    $seed = co_read_json_file(co_content_seed_file());
    $content = is_array($seed) ? co_sanitize_content($seed) : co_empty_content();
    co_write_json($private, $content, 0640);
    return $content;
}

function co_str($value, int $max): string {
    $value = (string) ($value ?? '');
    if (function_exists('mb_substr')) {
        return trim(mb_substr($value, 0, $max));
    }
    return trim(substr($value, 0, $max));
}

function co_sanitize_content(array $input): array {
    $events = isset($input['events']) && is_array($input['events']) ? $input['events'] : [];
    if (count($events) > 50) throw new RuntimeException("Trop d'événements (50 max)");

    $cleanEvents = [];
    foreach ($events as $idx => $event) {
        if (!is_array($event)) throw new RuntimeException('Événement ' . ($idx + 1) . ' invalide');
        $date = co_str($event['date'] ?? '', 10);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            throw new RuntimeException('Événement ' . ($idx + 1) . ' : date invalide');
        }
        $timeStart = co_str($event['timeStart'] ?? '', 5);
        $timeEnd = co_str($event['timeEnd'] ?? '', 5);
        if ($timeStart && !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $timeStart)) {
            throw new RuntimeException('Événement ' . ($idx + 1) . ' : heure de début invalide');
        }
        if ($timeEnd && !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $timeEnd)) {
            throw new RuntimeException('Événement ' . ($idx + 1) . ' : heure de fin invalide');
        }
        $ticketUrl = co_str($event['ticketUrl'] ?? '', 500);
        if ($ticketUrl && !preg_match('/^https:\/\//i', $ticketUrl)) {
            throw new RuntimeException('Événement ' . ($idx + 1) . ' : le lien doit commencer par https://');
        }
        $image = co_str($event['image'] ?? '', 300);
        if ($image && !preg_match('/^\/uploads\/[A-Za-z0-9._-]+$/', $image)) {
            throw new RuntimeException('Événement ' . ($idx + 1) . ' : image invalide');
        }
        $cleanEvents[] = [
            'id' => co_str($event['id'] ?? '', 60) ?: ('evt-' . bin2hex(random_bytes(4))),
            'title' => co_str($event['title'] ?? '', 200),
            'date' => $date,
            'timeStart' => $timeStart,
            'timeEnd' => $timeEnd,
            'venue' => co_str($event['venue'] ?? '', 200),
            'accessible' => !empty($event['accessible']),
            'ticketUrl' => $ticketUrl,
            'image' => $image,
            'description' => co_str($event['description'] ?? '', 2000),
        ];
    }

    $formats = isset($input['formats']) && is_array($input['formats']) ? $input['formats'] : [];
    if (count($formats) > 20) throw new RuntimeException('Trop de formats (20 max)');
    $cleanFormats = [];
    foreach ($formats as $idx => $format) {
        if (!is_array($format)) throw new RuntimeException('Format ' . ($idx + 1) . ' invalide');
        $link = co_str($format['linkUrl'] ?? '', 500);
        if ($link && !preg_match('/^(https:\/\/|mailto:|#)/i', $link)) {
            throw new RuntimeException('Format ' . ($idx + 1) . ' : lien invalide (https://, mailto: ou #ancre)');
        }
        $cleanFormats[] = [
            'id' => co_str($format['id'] ?? '', 60) ?: ('fmt-' . bin2hex(random_bytes(4))),
            'emoji' => co_str($format['emoji'] ?? '', 16),
            'badge' => co_str($format['badge'] ?? '', 120),
            'title' => co_str($format['title'] ?? '', 200),
            'description' => co_str($format['description'] ?? '', 3000),
            'linkText' => co_str($format['linkText'] ?? '', 120),
            'linkUrl' => $link,
        ];
    }

    $texts = [];
    $inputTexts = isset($input['texts']) && is_array($input['texts']) ? $input['texts'] : [];
    if (count($inputTexts) > 100) throw new RuntimeException('Trop de champs texte');
    foreach ($inputTexts as $key => $value) {
        $texts[co_str($key, 60)] = co_str($value, 4000);
    }

    return ['events' => $cleanEvents, 'formats' => $cleanFormats, 'texts' => $texts];
}

function co_write_json(string $file, $data, int $mode = 0644): void {
    $dir = dirname($file);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $tmp = $file . '.tmp';
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) throw new RuntimeException("Échec de l'encodage JSON");
    if (file_put_contents($tmp, $json . PHP_EOL, LOCK_EX) === false) {
        throw new RuntimeException("Échec de l'écriture serveur");
    }
    chmod($tmp, $mode);
    if (!rename($tmp, $file)) {
        @unlink($tmp);
        throw new RuntimeException("Échec de la publication du fichier");
    }
}

function co_login_page(?string $error = null, bool $setup = false): string {
    $title = $setup ? 'Initialiser l’espace édition' : 'Espace édition';
    $sub = $setup ? 'Choisis le mot de passe administrateur.' : 'Les Chahuteuses — modification du site';
    $action = $setup ? '/admin/setup' : '/admin/login';
    $button = $setup ? 'Créer le mot de passe' : 'Se connecter';
    $errorHtml = $error ? '<div class="err">' . htmlspecialchars($error, ENT_QUOTES, 'UTF-8') . '</div>' : '';
    return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . ' — Les Chahuteuses</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:linear-gradient(135deg,#1a0a2e,#2d1060);padding:1.5rem}
.box{background:#fff;border-radius:18px;padding:2.5rem;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.35)}
h1{font-size:1.3rem;color:#1a0a2e;margin-bottom:.3rem}
p.sub{color:#7a6050;font-size:.85rem;margin-bottom:1.5rem;line-height:1.45}
label{display:block;font-size:.8rem;font-weight:600;color:#2d1b00;margin-bottom:.4rem}
input{width:100%;padding:.75rem;border:1px solid #e0d5cc;border-radius:10px;font-size:1rem}
input:focus{outline:2px solid #f5a623;border-color:#f5a623}
button{width:100%;margin-top:1.2rem;padding:.8rem;border:0;border-radius:24px;background:#f4641b;color:#fff;font-size:.95rem;font-weight:700;cursor:pointer}
button:hover{background:#ff8c42}
.err{background:#fdecea;color:#b3261e;font-size:.82rem;padding:.6rem .8rem;border-radius:8px;margin-bottom:1rem;line-height:1.4}
</style></head><body>
<form class="box" method="POST" action="' . $action . '">
<h1>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</h1>
<p class="sub">' . htmlspecialchars($sub, ENT_QUOTES, 'UTF-8') . '</p>
' . $errorHtml . '
<label for="pw">Mot de passe</label>
<input id="pw" name="password" type="password" autocomplete="current-password" autofocus required>
<button type="submit">' . htmlspecialchars($button, ENT_QUOTES, 'UTF-8') . '</button>
</form></body></html>';
}
