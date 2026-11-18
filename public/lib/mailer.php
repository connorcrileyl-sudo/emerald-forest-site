<?php
// Shared mail code for contact.php and the helper's test email.
//
// Settings live in form-config.php ONE LEVEL ABOVE public_html, so they
// are never served and never overwritten by a site upload. The helper's
// "Contact form settings" panel writes that file; it can also be made
// by hand from form-config.sample.php.

declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailException;

require_once __DIR__ . '/phpmailer/Exception.php';
require_once __DIR__ . '/phpmailer/PHPMailer.php';
require_once __DIR__ . '/phpmailer/SMTP.php';

/** Path of form-config.php, given the public_html folder. */
function ef_form_config_path(string $publicHtml): string
{
    return dirname($publicHtml) . '/form-config.php';
}

/** The settings array, or null when the file is missing or incomplete. */
function ef_form_config(string $publicHtml): ?array
{
    $path = ef_form_config_path($publicHtml);
    if (!is_file($path)) return null;
    $cfg = include $path;
    if (!is_array($cfg)) return null;
    foreach (['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'to'] as $k) {
        if (empty($cfg[$k])) return null;
    }
    return $cfg;
}

/**
 * Send one message. Returns null on success, or a short error text that
 * never contains the password.
 */
function ef_send_mail(array $cfg, string $subject, string $body, ?string $replyTo = null, ?string $replyName = null): ?string
{
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = (string)$cfg['smtp_host'];
        $mail->Port = (int)$cfg['smtp_port'];
        $mail->SMTPAuth = true;
        $mail->Username = (string)$cfg['smtp_user'];
        $mail->Password = (string)$cfg['smtp_pass'];
        $mail->SMTPSecure = ((int)$cfg['smtp_port'] === 465)
            ? PHPMailer::ENCRYPTION_SMTPS
            : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Timeout = 20;
        $mail->CharSet = 'UTF-8';

        $from = (string)($cfg['from'] ?? $cfg['smtp_user']);
        $mail->setFrom($from, (string)($cfg['from_name'] ?? 'Website'));
        foreach (preg_split('/\s*,\s*/', (string)$cfg['to']) as $to) {
            if ($to !== '') $mail->addAddress($to);
        }
        if ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
            $mail->addReplyTo($replyTo, $replyName ?? '');
        }
        $mail->Subject = $subject;
        $mail->Body = $body;
        $mail->isHTML(false);
        $mail->send();
        return null;
    } catch (MailException $e) {
        $msg = $mail->ErrorInfo ?: $e->getMessage();
        return str_replace((string)$cfg['smtp_pass'], '***', $msg);
    }
}
