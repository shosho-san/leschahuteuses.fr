<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/cms.php';

$action = $_GET['action'] ?? '';
$hasAuth = co_load_auth() !== null;

if (!$hasAuth && $action !== 'setup') {
    header('Content-Type: text/html; charset=utf-8');
    echo co_login_page(null, true);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'setup') {
    if ($hasAuth) {
        http_response_code(409);
        echo co_login_page('Le mot de passe est déjà configuré.');
        exit;
    }
    try {
        co_save_auth((string) ($_POST['password'] ?? ''));
        $token = co_make_token();
        if (!$token) throw new RuntimeException('Erreur de session.');
        co_set_session_cookies($token);
        header('Location: /?edit=1', true, 303);
        exit;
    } catch (Throwable $e) {
        header('Content-Type: text/html; charset=utf-8');
        echo co_login_page($e->getMessage(), true);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
    if (!co_check_password((string) ($_POST['password'] ?? ''))) {
        http_response_code(401);
        header('Content-Type: text/html; charset=utf-8');
        echo co_login_page('Mot de passe incorrect.');
        exit;
    }
    $token = co_make_token();
    if (!$token) {
        http_response_code(500);
        header('Content-Type: text/html; charset=utf-8');
        echo co_login_page('Erreur serveur.');
        exit;
    }
    co_set_session_cookies($token);
    header('Location: /?edit=1', true, 303);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'logout') {
    co_clear_session_cookies();
    co_json_response(['ok' => true]);
}

if (co_is_authed()) {
    header('Location: /?edit=1', true, 302);
    exit;
}

header('Content-Type: text/html; charset=utf-8');
echo co_login_page();
