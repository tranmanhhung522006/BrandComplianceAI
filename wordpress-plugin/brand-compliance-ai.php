<?php
/**
 * Plugin Name: BrandComplianceAI
 * Description: WordPress integration layer for BrandComplianceAI.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

define(
    'BCA_PLUGIN_DIR',
    plugin_dir_path(__FILE__)
);

function bca_backend_url() {
    if (defined('BCA_BACKEND_URL')) {
        return rtrim(
            BCA_BACKEND_URL,
            '/'
        );
    }

    return 'http://127.0.0.1:3000';
}

function bca_sso_secret() {
    if (
        defined(
            'BCA_WORDPRESS_SSO_SECRET'
        ) &&
        BCA_WORDPRESS_SSO_SECRET
    ) {
        return BCA_WORDPRESS_SSO_SECRET;
    }

    $secret =
        getenv(
            'WORDPRESS_SSO_SECRET'
        );

    if ($secret) {
        return $secret;
    }

    return '';
}

function bca_register_routes() {
    add_rewrite_rule(
        '^app/?$',
        'index.php?bca_app=1',
        'top'
    );

    add_rewrite_rule(
        '^app/(.*)$',
        'index.php?bca_app=1&bca_path=$matches[1]',
        'top'
    );

    add_rewrite_rule(
        '^api/(.*)$',
        'index.php?bca_api=$matches[1]',
        'top'
    );
}

add_action(
    'init',
    'bca_register_routes'
);

function bca_query_vars($vars) {
    $vars[] = 'bca_app';
    $vars[] = 'bca_path';
    $vars[] = 'bca_api';

    return $vars;
}

add_filter(
    'query_vars',
    'bca_query_vars'
);

register_activation_hook(
    __FILE__,
    function () {
        bca_register_routes();
        flush_rewrite_rules();
    }
);

register_deactivation_hook(
    __FILE__,
    'flush_rewrite_rules'
);

function bca_send_file($file) {
    $extension =
        strtolower(
            pathinfo(
                $file,
                PATHINFO_EXTENSION
            )
        );

    $types = [
        'js' =>
            'application/javascript; charset=utf-8',

        'css' =>
            'text/css; charset=utf-8',

        'json' =>
            'application/json; charset=utf-8',

        'svg' =>
            'image/svg+xml',

        'png' =>
            'image/png',

        'jpg' =>
            'image/jpeg',

        'jpeg' =>
            'image/jpeg',

        'gif' =>
            'image/gif',

        'webp' =>
            'image/webp',

        'ico' =>
            'image/x-icon',

        'woff' =>
            'font/woff',

        'woff2' =>
            'font/woff2',
    ];

    if (
        isset(
            $types[$extension]
        )
    ) {
        header(
            'Content-Type: ' .
            $types[$extension]
        );
    }

    header(
        'Cache-Control: public, max-age=3600'
    );

    readfile($file);
    exit;
}

function bca_build_sso_url() {
    $secret =
        bca_sso_secret();

    if (!$secret) {
        wp_die(
            'BrandComplianceAI SSO secret is not configured.'
        );
    }

    $user =
        wp_get_current_user();

    $timestamp =
        (string) time();

    $wp_user_id =
        (string) $user->ID;

    $email =
        strtolower(
            trim(
                $user->user_email
            )
        );

    $name =
        $user->display_name
            ?: $user->user_login;

    $name_base64 =
        base64_encode(
            $name
        );

    $payload =
        implode(
            "\n",
            [
                $timestamp,
                $wp_user_id,
                $email,
                $name_base64,
            ]
        );

    $signature =
        hash_hmac(
            'sha256',
            $payload,
            $secret
        );

    $query =
        http_build_query(
            [
                'wpUserId' =>
                    $wp_user_id,

                'email' =>
                    $email,

                'nameBase64' =>
                    $name_base64,

                'timestamp' =>
                    $timestamp,

                'signature' =>
                    $signature,
            ],
            '',
            '&',
            PHP_QUERY_RFC3986
        );

    return
        home_url(
            '/api/auth/wordpress/callback'
        )
        .
        '?'
        .
        $query;
}

function bca_handle_app() {
    if (
        !get_query_var(
            'bca_app'
        )
    ) {
        return;
    }

    if (
        !is_user_logged_in()
    ) {
        wp_safe_redirect(
            wp_login_url(
                home_url(
                    '/app/'
                )
            )
        );

        exit;
    }

    if (
        empty(
            $_COOKIE[
                'bca_session'
            ]
        )
    ) {
        wp_safe_redirect(
            bca_build_sso_url()
        );

        exit;
    }

    $dist =
        realpath(
            BCA_PLUGIN_DIR .
            'dist'
        );

    if (!$dist) {
        wp_die(
            'BrandComplianceAI frontend build is missing.'
        );
    }

    $requested =
        (string)
        get_query_var(
            'bca_path'
        );

    if ($requested) {
        $candidate =
            realpath(
                $dist .
                DIRECTORY_SEPARATOR .
                $requested
            );

        if (
            $candidate &&
            is_file(
                $candidate
            ) &&
            str_starts_with(
                $candidate,
                $dist
            )
        ) {
            bca_send_file(
                $candidate
            );
        }
    }

    $index =
        $dist .
        DIRECTORY_SEPARATOR .
        'index.html';

    if (
        !is_file(
            $index
        )
    ) {
        wp_die(
            'BrandComplianceAI index.html is missing.'
        );
    }

    $html =
        file_get_contents(
            $index
        );

    $base =
        esc_url(
            home_url(
                '/app/'
            )
        );

    $html =
        str_replace(
            '<head>',
            '<head><base href="' .
            $base .
            '">',
            $html
        );

    nocache_headers();

    header(
        'Content-Type: text/html; charset=utf-8'
    );

    echo $html;
    exit;
}

function bca_handle_api_proxy() {
    $api_path =
        get_query_var(
            'bca_api'
        );

    if (
        $api_path === ''
    ) {
        return;
    }

    $target =
        bca_backend_url() .
        '/' .
        ltrim(
            $api_path,
            '/'
        );

    $request_uri =
        isset(
            $_SERVER[
                'REQUEST_URI'
            ]
        )
            ? $_SERVER[
                'REQUEST_URI'
            ]
            : '';

    $query =
        parse_url(
            $request_uri,
            PHP_URL_QUERY
        );

    if ($query) {
        $target .=
            '?' .
            $query;
    }

    $method =
        isset(
            $_SERVER[
                'REQUEST_METHOD'
            ]
        )
            ? strtoupper(
                $_SERVER[
                    'REQUEST_METHOD'
                ]
            )
            : 'GET';

    $headers = [];

    if (
        function_exists(
            'getallheaders'
        )
    ) {
        foreach (
            getallheaders()
            as $name => $value
        ) {
            $lower =
                strtolower(
                    $name
                );

            if (
                in_array(
                    $lower,
                    [
                        'accept',
                        'authorization',
                        'content-type',
                        'cookie',
                        'origin',
                        'referer',
                        'sec-fetch-site',
                        'x-csrf-token',
                    ],
                    true
                )
            ) {
                $headers[
                    $name
                ] = $value;
            }
        }
    }

    $args = [
        'method' =>
            $method,

        'headers' =>
            $headers,

        'timeout' =>
            120,

        'redirection' =>
            0,
    ];

    if (
        !in_array(
            $method,
            [
                'GET',
                'HEAD',
            ],
            true
        )
    ) {
        $args[
            'body'
        ] =
            file_get_contents(
                'php://input'
            );
    }

    $response =
        wp_remote_request(
            $target,
            $args
        );

    if (
        is_wp_error(
            $response
        )
    ) {
        status_header(
            502
        );

        header(
            'Content-Type: application/json'
        );

        echo wp_json_encode(
            [
                'statusCode' =>
                    502,

                'message' =>
                    'Backend unavailable',

                'error' =>
                    'Bad Gateway',
            ]
        );

        exit;
    }

    $status =
        wp_remote_retrieve_response_code(
            $response
        );

    status_header(
        $status
    );

    $content_type =
        wp_remote_retrieve_header(
            $response,
            'content-type'
        );

    if ($content_type) {
        header(
            'Content-Type: ' .
            $content_type
        );
    }

    $location =
        wp_remote_retrieve_header(
            $response,
            'location'
        );

    if ($location) {
        header(
            'Location: ' .
            $location
        );
    }

    $set_cookie =
        wp_remote_retrieve_header(
            $response,
            'set-cookie'
        );

    if ($set_cookie) {
        header(
            'Set-Cookie: ' .
            $set_cookie,
            false
        );
    }

    echo wp_remote_retrieve_body(
        $response
    );

    exit;
}

function bca_template_redirect() {
    if (
        get_query_var(
            'bca_api'
        ) !== ''
    ) {
        bca_handle_api_proxy();

        return;
    }

    bca_handle_app();
}

add_action(
    'template_redirect',
    'bca_template_redirect',
    0
);
