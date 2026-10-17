<?php
/**
 * WordPress test doubles for the SSO endpoints. Run only from CLI.
 * Invocation: php sso-handler-fixture.php <scenario>
 */
if (PHP_SAPI !== 'cli') {
    exit(1);
}
define('ABSPATH', '/fake-wordpress/');
define('BCA_WORDPRESS_SSO_SECRET', 'test-only-wordpress-sso-secret');
$scenario = $argv[1] ?? '';
$GLOBALS['test_status'] = 200;
$GLOBALS['test_logout_calls'] = 0;
$GLOBALS['test_backend_calls'] = [];
function plugin_dir_path($file) { return dirname($file) . '/'; }
function add_action(...$args) {}
function add_filter(...$args) {}
function register_activation_hook(...$args) {}
function register_deactivation_hook(...$args) {}
function add_rewrite_rule(...$args) {}
function flush_rewrite_rules() {}
function get_query_var($name) {
    return $name === 'bca_api' ? 'auth/wordpress/' . ($GLOBALS['scenario_path'] ?? 'session') : '';
}
function is_user_logged_in() { return $GLOBALS['test_logged_in']; }
function wp_get_current_user() {
    return (object) [
        'ID' => 42, 'user_email' => 'Maker@Example.com',
        'display_name' => 'Test Maker', 'user_login' => 'maker',
    ];
}
function wp_verify_nonce($nonce, $action) {
    return $nonce === 'valid-nonce' && $action === 'bca_wordpress_auth';
}
function wp_logout() { $GLOBALS['test_logout_calls']++; }
function wp_json_encode($data) { return json_encode($data); }
function wp_login_url($redirect) { return 'https://wp.example.test/login?redirect=' . rawurlencode($redirect); }
function home_url($path = '') { return 'https://wp.example.test' . $path; }
function is_ssl() { return true; }
function nocache_headers() {}
function status_header($status) { $GLOBALS['test_status'] = $status; }
function wp_remote_request($url, $args) {
    $GLOBALS['test_backend_calls'][] = ['url' => $url, 'args' => $args];
    return ['status' => 200, 'body' => '{"message":"connected"}', 'headers' => [
        'content-type' => 'application/json',
        'set-cookie' => 'bca_session=abc; Path=/; HttpOnly; Secure; SameSite=Lax',
    ]];
}
function is_wp_error($response) { return false; }
function wp_remote_retrieve_response_code($r) { return $r['status']; }
function wp_remote_retrieve_header($r, $key) { return $r['headers'][$key] ?? ''; }
function wp_remote_retrieve_body($r) { return $r['body']; }
function wp_die($message) { throw new RuntimeException($message); }

$GLOBALS['scenario_path'] = $scenario === 'logout' ? 'logout' : 'session';
$GLOBALS['test_logged_in'] = $scenario !== 'expired';
$_SERVER['REQUEST_METHOD'] = $scenario === 'get' ? 'GET' : 'POST';
$_SERVER['HTTP_X_BCA_WP_NONCE'] =
    $scenario === 'bad-nonce' ? 'invalid-nonce' : 'valid-nonce';

register_shutdown_function(function () {
    echo "\nBCA_TEST_META=" . json_encode([
        'status' => $GLOBALS['test_status'],
        'logoutCalls' => $GLOBALS['test_logout_calls'],
        'backendCalls' => $GLOBALS['test_backend_calls'],
    ]);
});

require dirname(__DIR__) . '/brand-compliance-ai.php';
bca_handle_api_proxy();
