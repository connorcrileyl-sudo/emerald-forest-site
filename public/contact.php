<?php
// Contact form handler (replaces SureForms + SureMail from the old
// WordPress site). The form on /contact/ POSTs here; it answers JSON.
//
// Checks: POST only, honeypot field empty, email valid, message present,
// at most 5 sends per visitor IP per hour. Mail goes out over SMTP with
// the settings in form-config.php (one level above public_html).

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function reply(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    reply(405, ['ok' => false, 'error' => 'POST only']);
}

$field = static fn(string $k, int $max = 2000): string =>
    mb_substr(trim((string)($_POST[$k] ?? '')), 0, $max);

// Bots fill every field; people never see this one.
if ($field('company-website') !== '') {
    reply(200, ['ok' => true]); // pretend it worked
}

$name    = $field('first-name', 100);
$email   = $field('email', 200);
$phone   = $field('phone', 50);
$heard   = $field('referral', 100);
$message = $field('what-would-you-like-built-or-repaired', 5000);

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $message === '') {
    reply(422, ['ok' => false, 'error' => 'Please give an email address and a message.']);
}

// Rate limit, kept outside public_html.
$dataDir = dirname(__DIR__) . '/form-data';
if (!is_dir($dataDir)) @mkdir($dataDir, 0700, true);
$rlFile = $dataDir . '/ratelimit.json';
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$key = hash('sha256', $ip);
$fh = @fopen($rlFile, 'c+');
if ($fh && flock($fh, LOCK_EX)) {
    $seen = json_decode(stream_get_contents($fh) ?: '{}', true) ?: [];
    $hourAgo = time() - 3600;
    foreach ($seen as $k => $times) {
        $seen[$k] = array_values(array_filter($times, static fn($t) => $t > $hourAgo));
        if (!$seen[$k]) unset($seen[$k]);
    }
    if (count($seen[$key] ?? []) >= 5) {
        flock($fh, LOCK_UN);
        fclose($fh);
        reply(429, ['ok' => false, 'error' => 'Too many messages. Please call instead.']);
    }
    $seen[$key][] = time();
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($seen));
    flock($fh, LOCK_UN);
    fclose($fh);
}

require __DIR__ . '/lib/mailer.php';
$cfg = ef_form_config(__DIR__);
if (!$cfg) {
    error_log('contact.php: form-config.php missing or incomplete');
    reply(500, ['ok' => false, 'error' => 'The form is not set up yet.']);
}

$body = "New message from the website contact form.\n\n"
    . "Name:  {$name}\n"
    . "Email: {$email}\n"
    . "Phone: " . ($phone !== '' ? $phone : '(not given)') . "\n"
    . "Heard about us: " . ($heard !== '' ? $heard : '(not given)') . "\n\n"
    . "What they would like built or repaired:\n{$message}\n\n"
    . "Press Reply to answer them directly.\n";

$subject = 'Website enquiry' . ($name !== '' ? " from {$name}" : '');
$err = ef_send_mail($cfg, $subject, $body, $email, $name);
if ($err !== null) {
    error_log('contact.php: send failed: ' . $err);
    reply(502, ['ok' => false, 'error' => 'That did not send. Please call instead.']);
}
reply(200, ['ok' => true]);
