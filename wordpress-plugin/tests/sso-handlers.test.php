<?php
/**
 * Self-contained regression tests for the WordPress side of SSO.
 * Run: php wordpress-plugin/tests/sso-handlers.test.php
 */
if (PHP_SAPI !== 'cli') {
    exit(1);
}

$fixture = __DIR__ . '/sso-handler-fixture.php';
$scenarios = ['session', 'bad-nonce', 'expired', 'get', 'logout'];
foreach ($scenarios as $scenario) {
    $command = escapeshellarg(PHP_BINARY) . ' ' .
        escapeshellarg($fixture) . ' ' . escapeshellarg($scenario);
    exec($command, $lines, $code);
    if ($code !== 0) {
        throw new RuntimeException("Fixture failed for $scenario");
    }
    $output = implode("\n", $lines);
    $marker = '\nBCA_TEST_META=';
    $position = strpos($output, "BCA_TEST_META=");
    if ($position === false) {
        throw new RuntimeException("Missing test metadata for $scenario: $output");
    }
    $body = trim(substr($output, 0, $position));
    $meta = json_decode(substr($output, $position + strlen('BCA_TEST_META=')), true);
    if (!is_array($meta)) {
        throw new RuntimeException("Invalid metadata for $scenario");
    }
    $assert = function ($condition, $reason) use ($scenario) {
        if (!$condition) {
            throw new RuntimeException("$scenario: $reason");
        }
    };

    if ($scenario === 'session') {
        $assert($meta['status'] === 200, 'must succeed');
        $assert(count($meta['backendCalls']) === 1, 'must call backend once');
        $request = $meta['backendCalls'][0];
        $assert(str_ends_with($request['url'], '/auth/wordpress/exchange'), 'must call signed exchange');
        $headers = $request['args']['headers'];
        $assert($headers['X-BCA-WP-User-ID'] === '42', 'identity comes from WP session');
        $assert($headers['X-BCA-WP-Email'] === 'maker@example.com', 'email normalized');
        $payload = implode("\n", [
            $headers['X-BCA-WP-Timestamp'], '42', 'maker@example.com',
            $headers['X-BCA-WP-Name-B64'],
        ]);
        $expected = hash_hmac('sha256', $payload, BCA_WORDPRESS_SSO_SECRET);
        $assert(hash_equals($expected, $headers['X-BCA-WP-Signature']), 'must sign identity');
        $assert(str_contains($body, 'connected'), 'must forward response');
    } elseif ($scenario === 'logout') {
        $assert($meta['status'] === 200, 'must succeed');
        $assert($meta['logoutCalls'] === 1, 'must terminate WP session');
        $assert(count($meta['backendCalls']) === 0, 'must not call exchange on logout');
        $assert(str_contains($body, 'loginUrl'), 'must return login URL');
    } else {
        $expected = match ($scenario) {
            'bad-nonce' => 403, 'expired' => 401, 'get' => 405,
        };
        $assert($meta['status'] === $expected, "expected status $expected");
        $assert(count($meta['backendCalls']) === 0, 'invalid request must not call backend');
        $assert($meta['logoutCalls'] === 0, 'invalid request must not log out');
    }
    echo "PASS: $scenario\n";
    $lines = [];
}
