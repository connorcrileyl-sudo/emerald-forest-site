<?php
// Website helper: a password-protected page on the client's own hosting
// where Claude walks them through moving to the new site and makes
// small text edits they approve.
//
// Claude is reached through Connor's api-storehouse, which holds the real
// Anthropic key and enforces this caller's lifetime dollar budget. This
// file only holds a storehouse token (config.php) that Connor can revoke.

declare(strict_types=1);

header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

if (!is_file(__DIR__ . '/config.php')) {
    http_response_code(500);
    exit('Helper is missing config.php. Ask Connor for a new helper zip.');
}
$CFG = require __DIR__ . '/config.php';

define('PUBLIC_HTML', dirname(__DIR__));
define('DATA', (static function (): string {
    $outside = dirname(PUBLIC_HTML) . '/helper-data';
    if (is_dir($outside) || @mkdir($outside, 0700, true)) {
        if (is_writable($outside)) return $outside;
    }
    $inside = __DIR__ . '/data';
    @mkdir($inside, 0700, true);
    if (!is_file("$inside/.htaccess")) {
        file_put_contents("$inside/.htaccess", "Require all denied\nDeny from all\n");
    }
    return $inside;
})());

require __DIR__ . '/tools.php';

const MAX_TOOL_ROUNDS = 12;
const MAX_CONTEXT_TOKENS = 150000;
// USD per million tokens, Nov 2026. Only used to update the meter right
// away; the storehouse's own count is the one that is enforced.
const RATES = [
    'claude-opus-5-5' => [4, 20, 0.2],
    'claude-sonnet-5-5' => [2, 10, 0.1],
    'claude-haiku-5-5' => [0.5, 2.5, 0.05],
];

// ---------- session + auth ----------

session_name('helper_sess');
session_set_cookie_params([
    'lifetime' => 0, 'path' => dirname($_SERVER['SCRIPT_NAME']) . '/',
    'secure' => !empty($_SERVER['HTTPS']) || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https',
    'httponly' => true, 'samesite' => 'Strict',
]);
session_start();

function authed(): bool { return !empty($_SESSION['ok']) && ($_SESSION['exp'] ?? 0) > time(); }

function out(array $body, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function too_many_logins(): bool
{
    $key = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? '');
    $tries = array_filter(store_read('logins')[$key] ?? [], static fn($t) => $t > time() - 3600);
    return count($tries) >= 10;
}

function count_login_failure(): void
{
    $all = store_read('logins');
    $key = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? '');
    $all[$key] = array_values(array_filter($all[$key] ?? [], static fn($t) => $t > time() - 3600));
    $all[$key][] = time();
    store_write('logins', $all);
}

function login_ok(): void
{
    session_regenerate_id(true);
    $_SESSION['ok'] = true;
    $_SESSION['exp'] = time() + 12 * 3600;
}

// ---------- storehouse ----------

function storehouse(string $method, string $path, ?array $body = null): array
{
    global $CFG;
    $ch = curl_init(rtrim($CFG['storehouse_url'], '/') . $path);
    $headers = [
        'x-api-key: ' . $CFG['storehouse_token'],
        'anthropic-version: 2023-06-01',
        'content-type: application/json',
    ];
    if ($body !== null && str_starts_with($path, '/anthropic/')) {
        $headers[] = 'anthropic-beta: server-side-fallback-2026-07-01';
    }
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 240,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($raw === false) return ['_status' => 0, 'error' => ['message' => "network error: $err"]];
    $json = json_decode((string)$raw, true);
    return (is_array($json) ? $json : ['error' => ['message' => substr((string)$raw, 0, 300)]]) + ['_status' => $status];
}

function meter(): array
{
    global $CFG;
    $r = storehouse('GET', '/_budget');
    foreach ($r['budgets'] ?? [] as $b) {
        if (in_array($b['service'], ['anthropic', '*'], true)) {
            return ['spent' => (float)$b['spent_usd'], 'max' => (float)$b['max_usd']];
        }
    }
    return ['spent' => null, 'max' => (float)($CFG['budget_usd'] ?? 10), 'error' => 'meter unavailable'];
}

function call_cost(array $resp): float
{
    $u = $resp['usage'] ?? [];
    [$in, $outRate, $read] = RATES[$resp['model'] ?? ''] ?? [10, 50, 1];
    return (($u['input_tokens'] ?? 0) * $in + ($u['cache_creation_input_tokens'] ?? 0) * $in * 1.25
        + ($u['cache_read_input_tokens'] ?? 0) * $read + ($u['output_tokens'] ?? 0) * $outRate) / 1e6;
}

// ---------- Claude ----------

function system_prompt(): string
{
    global $CFG;
    $client = $CFG['client_name'];
    $biz = $CFG['business'];
    $domain = $CFG['domain'];
    $owner = $CFG['owner_name'];
    return <<<TXT
You are the website helper for {$client}, who owns {$biz} ({$domain}). {$owner} built {$client} a new website. This page runs on {$client}'s own Hostinger hosting, inside public_html/helper/.

{$client} is not technical. Write short, plain replies: one step at a time, numbered when there are several, no jargon, no code unless he must copy it. Hostinger's menu names change now and then; if he can't find something, ask what he sees on screen.

Every reply costs money from a fixed \$10 allowance shown at the top of the page. Be efficient: don't read pages you don't need, don't repeat yourself, and keep answers brief.

## Your four jobs

1. Move the live site from the old WordPress site to the new one.
2. Explain the new contact form, which replaces SureForms and SureMail.
3. Changes to the website are not made here: he makes them in his Site Editor (https://emerald-forest-editor.dawn-boat-e04e.workers.dev, also in his Kitchen portal), which can change wording, photos, pages and design. Send him there when he wants a change.
4. Help him sort out problems with his website: a page looks wrong or shows old text, the site is down, enquiries aren't arriving, or he can't find something in hPanel, Web3Forms or Proton Mail.

## Moving the site (do these in order; use check_server to see where things stand)

0. First, use check_server: if upload_zip_still_in_public_html is true, he must delete it now (File Manager, right-click the zip, Delete; only that .zip, not the helper folder), because anyone could download it from his web address and it holds this helper's settings.
1. Backup first. In hPanel: Websites, then Backups (or Files, then Backups). Make or download a backup of the site files and database. Don't continue until he says it's done.
2. Take over the contact form account, before the switch. {$owner} made a Web3Forms account (the service the new contact form sends through) on a Proton Mail address, barangvillage@protonmail.com, and gives Noah the password himself, not through this chat. First he signs in at proton.me/mail and changes that password to his own. Then he signs in at web3forms.com with the same address and his new password, and adds his Gmail as the address enquiries go to (if Web3Forms sends a confirmation email to his Gmail, he clicks it). Don't continue until he says his Gmail is set. Never ask for or repeat a password in the chat.
3. Switch. Use propose_site_switch. A button appears; when he clicks it, the old WordPress files move into an "old-site-<date>" folder next to public_html (nothing is deleted, the database is untouched) and the new site goes live. This helper stays where it is.
4. After the switch: in hPanel, purge the CDN cache (Websites, then Performance or CDN, then Purge cache). Then he opens {$domain} in a private window, checks a few pages, and sends himself a message through the contact page.
5. The contact form: every enquiry now arrives in his Gmail through Web3Forms, with Reply going to the customer, and the last 30 days are also in his Web3Forms dashboard. If a test message isn't in his inbox within a few minutes, he checks Spam and marks it "Not spam"; if it isn't there either, he tells {$owner}. Never ask for passwords in the chat.
6. SureMail and SureForms now sit, switched off, inside the old-site folder. If SureMail was connected to a paid email service, he can cancel that service. He should leave the old-site folder alone; {$owner} will remove it in a couple of weeks.
If something looks wrong after the switch, propose_restore_old_site puts the old site back, and he should tell {$owner}.

## Changes to the site

You can't change the site from here. For any change (wording, photos, a new page, design), send him to his Site Editor: https://emerald-forest-editor.dawn-boat-e04e.workers.dev . It shows him a preview, and when he publishes it gives him a new site zip; he uploads that zip into public_html with File Manager, extracts it (replacing files), deletes the zip and purges the CDN cache. You can help with those upload steps and with check_server, search_site and read_page to see what is live.

## Problems

Use check_server and search_site to look before guessing. Usual causes, in order: the CDN cache (purge it in hPanel), a recent change (in the Site Editor: Undo last, Publish, then upload the new zip), the form recipient in Web3Forms or Gmail's Spam folder, then hPanel itself. Ask what he sees on screen and walk him through one step at a time. If it's still broken after a few tries, or it's about layout, design or how the site works, tell him to contact {$owner} and say what you checked.

Questions that aren't about this website (general computer help, Gmail settings, social media, writing posts or emails) use up his allowance. Answer in a line if it's quick; otherwise suggest he asks free ChatGPT (chatgpt.com) instead, kindly.

Notes in brackets at the start of his messages, like [Noah applied ...], are from this page, not from him; use them to know what happened.
TXT;
}

function call_claude(array $messages): array
{
    global $CFG;
    // Stored turns go through json_decode(…, true), which turns an empty
    // tool input {} into []; the API rejects that, so restore the object.
    foreach ($messages as &$msg) {
        if (!is_array($msg['content'])) continue;
        foreach ($msg['content'] as &$blk) {
            if (($blk['type'] ?? '') === 'tool_use' && ($blk['input'] ?? null) === []) $blk['input'] = new stdClass();
        }
        unset($blk);
    }
    unset($msg);
    return storehouse('POST', '/anthropic/v1/messages', [
        'model' => $CFG['model'] ?? 'claude-sonnet-5-5',
        'max_tokens' => 8000,
        'system' => [['type' => 'text', 'text' => system_prompt(), 'cache_control' => ['type' => 'ephemeral']]],
        'tools' => tool_definitions(),
        'messages' => $messages,
        'output_config' => ['effort' => 'medium'],
        'cache_control' => ['type' => 'ephemeral'],
        'fallbacks' => 'default',
    ]);
}

function api_error_text(array $r): string
{
    $msg = (string)($r['error']['message'] ?? $r['error'] ?? 'unknown error');
    if (($r['_status'] ?? 0) === 429 && str_contains($msg, 'budget')) {
        return 'The $10 allowance for this helper is used up. Ask ' . ($GLOBALS['CFG']['owner_name'] ?? 'Connor') . ' if you need more.';
    }
    if (($r['_status'] ?? 0) === 429) return 'Too many requests right now. Wait a minute and try again.';
    return 'The helper could not reach Claude (' . ($r['_status'] ?? 0) . '): ' . mb_substr($msg, 0, 200);
}

function chat_turn(string $text): array
{
    $chat = store_read('chat', ['messages' => [], 'display' => [], 'last_input' => 0]);
    if (($chat['last_input'] ?? 0) > MAX_CONTEXT_TOKENS) {
        return ['error' => 'This conversation has got long, which makes every reply cost more. Press "New chat" to start fresh.'];
    }
    $m = meter();
    if ($m['spent'] !== null && $m['spent'] >= $m['max']) {
        return ['error' => api_error_text(['_status' => 429, 'error' => ['message' => 'budget']])];
    }

    $content = [];
    $notes = store_read('notes');
    if ($notes) {
        $content[] = ['type' => 'text', 'text' => '[' . implode(' ', $notes) . ']'];
        store_write('notes', []);
    }
    $content[] = ['type' => 'text', 'text' => $text];
    $chat['messages'][] = ['role' => 'user', 'content' => $content];
    $chat['display'][] = ['role' => 'user', 'text' => $text];

    $spent = 0.0;
    $replyParts = [];
    $error = null;
    for ($round = 0; $round < MAX_TOOL_ROUNDS; $round++) {
        $resp = call_claude($chat['messages']);
        if (!empty($resp['error']) || !isset($resp['content'])) {
            $error = api_error_text($resp);
            break;
        }
        $spent += call_cost($resp);
        $u = $resp['usage'] ?? [];
        $chat['last_input'] = ($u['input_tokens'] ?? 0) + ($u['cache_read_input_tokens'] ?? 0) + ($u['cache_creation_input_tokens'] ?? 0);
        if (!$resp['content']) {
            $replyParts[] = ($resp['stop_reason'] ?? '') === 'refusal'
                ? 'Sorry, I can\'t help with that one. Please ask ' . ($GLOBALS['CFG']['owner_name'] ?? 'Connor') . '.'
                : '(No answer came back. Please try again.)';
            break;
        }
        $chat['messages'][] = ['role' => 'assistant', 'content' => $resp['content']];

        $toolResults = [];
        foreach ($resp['content'] as $block) {
            if (($block['type'] ?? '') === 'text' && trim($block['text']) !== '') $replyParts[] = $block['text'];
            if (($block['type'] ?? '') === 'tool_use') {
                $result = run_tool((string)$block['name'], is_array($block['input'] ?? null) ? $block['input'] : []);
                $toolResults[] = [
                    'type' => 'tool_result', 'tool_use_id' => $block['id'],
                    'content' => json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                    'is_error' => isset($result['error']),
                ];
            }
        }
        if ($toolResults) {
            $chat['messages'][] = ['role' => 'user', 'content' => $toolResults];
        }

        $stop = $resp['stop_reason'] ?? '';
        if ($stop === 'refusal') {
            $replyParts[] = 'Sorry, I can\'t help with that one. Please ask ' . ($GLOBALS['CFG']['owner_name'] ?? 'Connor') . '.';
            break;
        }
        if ($stop === 'tool_use' || $stop === 'pause_turn') continue;
        if ($stop === 'max_tokens') $replyParts[] = '(My answer was cut short. Ask me to continue.)';
        break;
    }

    $reply = trim(implode("\n\n", $replyParts));
    if ($reply !== '') $chat['display'][] = ['role' => 'assistant', 'text' => $reply];
    if ($error) $chat['display'][] = ['role' => 'error', 'text' => $error];
    store_write('chat', $chat);
    log_line('usage.log', ['turn_cost_estimate' => round($spent, 4)]);

    if ($m['spent'] !== null) $m['spent'] += $spent;
    return ['reply' => $reply, 'error' => $error, 'meter' => $m];
}

// ---------- API ----------

$api = $_GET['api'] ?? null;
if ($api !== null) {
    $isPost = ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST';
    // Same-site JSON requests only (blocks cross-site form posts).
    if ($isPost && ($_SERVER['HTTP_X_HELPER'] ?? '') !== '1') out(['error' => 'bad request'], 400);
    $in = $isPost ? (json_decode((string)file_get_contents('php://input'), true) ?: []) : [];
    $auth = store_read('auth', null);

    if ($api === 'state') {
        if (!authed()) out(['authed' => false, 'needs_setup' => !$auth]);
        $chat = store_read('chat', ['display' => []]);
        out([
            'authed' => true,
            'client' => $CFG['client_name'],
            'meter' => meter(),
            'display' => $chat['display'],
            'pending' => array_values(store_read('pending')),
            'can_undo' => (bool)array_filter(store_read('history'), static fn($h) => !$h['undone']),
        ]);
    }
    if (!$isPost) out(['error' => 'POST only'], 405);

    if ($api === 'setup') {
        if ($auth) out(['error' => 'Already set up. Log in instead.'], 400);
        if (too_many_logins()) out(['error' => 'Too many tries. Wait an hour.'], 429);
        if (!hash_equals((string)$CFG['setup_code'], trim((string)($in['code'] ?? '')))) {
            count_login_failure();
            out(['error' => 'That setup code is not right.'], 403);
        }
        $pw = (string)($in['password'] ?? '');
        if (mb_strlen($pw) < 10) out(['error' => 'Use at least 10 characters.'], 400);
        store_write('auth', ['hash' => password_hash($pw, PASSWORD_DEFAULT), 'at' => date('c')]);
        login_ok();
        out(['ok' => true]);
    }
    if ($api === 'login') {
        if (!$auth) out(['error' => 'Not set up yet.'], 400);
        if (too_many_logins()) out(['error' => 'Too many tries. Wait an hour.'], 429);
        if (!password_verify((string)($in['password'] ?? ''), $auth['hash'])) {
            count_login_failure();
            out(['error' => 'Wrong password.'], 403);
        }
        login_ok();
        out(['ok' => true]);
    }
    if (!authed()) out(['error' => 'Please log in again.'], 401);

    switch ($api) {
        case 'logout':
            $_SESSION = [];
            session_destroy();
            out(['ok' => true]);
        case 'chat':
            $text = trim(mb_substr((string)($in['message'] ?? ''), 0, 4000));
            if ($text === '') out(['error' => 'Type a message first.'], 400);
            $lock = fopen(DATA . '/chat.lock', 'c');
            if (!flock($lock, LOCK_EX | LOCK_NB)) out(['error' => 'Still working on your last message.'], 409);
            session_write_close(); // don't block other requests while Claude thinks
            $res = chat_turn($text);
            flock($lock, LOCK_UN);
            out($res + ['pending' => array_values(store_read('pending'))]);
        case 'newchat':
            store_write('chat', ['messages' => [], 'display' => [], 'last_input' => 0]);
            store_write('notes', []);
            out(['ok' => true]);
        case 'apply':
            out(apply_pending((string)($in['id'] ?? '')) + ['pending' => array_values(store_read('pending'))]);
        case 'discard':
            discard_pending((string)($in['id'] ?? ''));
            out(['ok' => true, 'pending' => array_values(store_read('pending'))]);
        case 'undo':
            out(undo_last_edit());
        case 'password':
            if (!password_verify((string)($in['old'] ?? ''), $auth['hash'])) out(['error' => 'Current password is wrong.'], 403);
            if (mb_strlen((string)($in['new'] ?? '')) < 10) out(['error' => 'Use at least 10 characters.'], 400);
            store_write('auth', ['hash' => password_hash((string)$in['new'], PASSWORD_DEFAULT), 'at' => date('c')]);
            out(['ok' => true]);
    }
    out(['error' => 'unknown action'], 404);
}

// ---------- page ----------
header('Content-Type: text/html; charset=utf-8');
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Website Helper</title>
<style>
:root {
  --bg: #f6f5f1; --panel: #ffffff; --text: #1f2a24; --muted: #5b675f;
  --line: #dcdcd4; --accent: #2f5d45; --accent-text: #ffffff;
  --warn: #9a5b00; --bad: #a3262a; --you: #e6efe9;
  --meter-bg: #e4e4dc; --meter-fill: #2f5d45;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #141816; --panel: #1d2320; --text: #e8ece9; --muted: #a2ada6;
    --line: #333b37; --accent: #7cc39b; --accent-text: #0f1512;
    --warn: #e0a54a; --bad: #ef7a7d; --you: #24312a;
    --meter-bg: #2b322e; --meter-fill: #7cc39b;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text);
  font: 17px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; }
.wrap { max-width: 46rem; margin: 0 auto; padding: 0 16px 24px; }
header { position: sticky; top: 0; z-index: 2; background: var(--bg);
  border-bottom: 1px solid var(--line); padding: 12px 0 10px; }
.top { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.top h1 { font-size: 1.05rem; margin: 0 auto 0 0; }
.meter { margin-top: 8px; }
.meter .bar { height: 10px; border-radius: 6px; background: var(--meter-bg); overflow: hidden; }
.meter .fill { height: 100%; width: 0; background: var(--meter-fill); transition: width .4s; }
.meter .label { font-size: .85rem; color: var(--muted); margin-top: 3px; }
.meter.low .fill { background: var(--warn); }
button, .btn { font: inherit; font-size: .9rem; border: 1px solid var(--line);
  background: var(--panel); color: var(--text); border-radius: 8px;
  padding: 6px 12px; cursor: pointer; }
button.primary { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
button:disabled { opacity: .5; cursor: default; }
#log { display: flex; flex-direction: column; gap: 12px; padding: 16px 0; }
.msg { max-width: 75ch; padding: 10px 14px; border-radius: 12px; background: var(--panel);
  border: 1px solid var(--line); overflow-wrap: anywhere; }
.msg.user { align-self: flex-end; background: var(--you); }
.msg.error { border-color: var(--bad); color: var(--bad); }
.msg p { margin: 0 0 .6em; } .msg p:last-child { margin: 0; }
.msg ol, .msg ul { margin: 0 0 .6em; padding-left: 1.3em; }
.msg code { font-size: .9em; background: var(--bg); padding: 1px 4px; border-radius: 4px; }
.starters { display: flex; flex-wrap: wrap; gap: 8px; }
.card { border: 2px solid var(--accent); border-radius: 12px; padding: 12px 14px;
  background: var(--panel); margin-bottom: 10px; }
.card h3 { margin: 0 0 6px; font-size: 1rem; }
.card .diff { font: .85rem/1.4 ui-monospace, Consolas, monospace; white-space: pre-wrap;
  overflow-wrap: anywhere; max-height: 10rem; overflow: auto; padding: 6px 8px;
  border-radius: 6px; margin: 4px 0; background: var(--bg); }
.card .row { display: flex; gap: 8px; margin-top: 8px; }
.small { font-size: .85rem; color: var(--muted); }
form.ask { display: flex; gap: 8px; position: sticky; bottom: 0; background: var(--bg);
  padding: 10px 0 14px; border-top: 1px solid var(--line); }
form.ask textarea { flex: 1; font: inherit; resize: vertical; min-height: 2.8em; max-height: 12em;
  padding: 8px 10px; border-radius: 8px; border: 1px solid var(--line);
  background: var(--panel); color: var(--text); }
.gate { max-width: 26rem; margin: 12vh auto; padding: 0 16px; }
.gate input, dialog input { width: 100%; font: inherit; padding: 8px 10px; margin: 4px 0 12px;
  border-radius: 8px; border: 1px solid var(--line); background: var(--panel); color: var(--text); }
label { font-size: .9rem; color: var(--muted); }
dialog { border: 1px solid var(--line); border-radius: 12px; background: var(--panel);
  color: var(--text); max-width: min(30rem, calc(100vw - 32px)); padding: 18px; }
dialog::backdrop { background: rgba(0,0,0,.4); }
.err { color: var(--bad); min-height: 1.4em; }
.thinking { color: var(--muted); font-style: italic; }
</style>
</head>
<body>
<div id="app"></div>

<script>
const app = document.getElementById('app');
let state = null, busy = false;

async function api(name, body) {
  const opt = body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Helper': '1' },
    body: JSON.stringify(body)
  };
  try {
    const r = await fetch('?api=' + name, opt);
    return await r.json();
  } catch (e) { return { error: 'Could not reach the helper. Check your connection.' }; }
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// Small, safe Markdown: paragraphs, numbered and bullet lists, **bold**, `code`.
function md(text) {
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  return text.split(/\n{2,}/).map(block => {
    const lines = block.split('\n');
    if (lines.every(l => /^\s*\d+[.)]\s/.test(l))) return '<ol>' + lines.map(l => '<li>' + inline(l.replace(/^\s*\d+[.)]\s/, '')) + '</li>').join('') + '</ol>';
    if (lines.every(l => /^\s*[-*]\s/.test(l))) return '<ul>' + lines.map(l => '<li>' + inline(l.replace(/^\s*[-*]\s/, '')) + '</li>').join('') + '</ul>';
    return '<p>' + lines.map(inline).join('<br>') + '</p>';
  }).join('');
}

function money(n) { return '$' + Number(n).toFixed(2); }

function gate(needsSetup) {
  app.innerHTML = `<div class="gate">
    <h1 style="font-size:1.3rem">Website Helper</h1>
    ${needsSetup ? `<p>First time here. Enter the setup code you were given, then choose a password.</p>
      <label>Setup code</label><input id="g_code" autocomplete="off">
      <label>New password (10+ characters)</label><input id="g_pw" type="password" autocomplete="new-password">`
    : `<label>Password</label><input id="g_pw" type="password" autocomplete="current-password">`}
    <p class="err" id="g_err"></p>
    <button class="primary" id="g_go">${needsSetup ? 'Set password' : 'Log in'}</button></div>`;
  const go = async () => {
    const body = { password: document.getElementById('g_pw').value };
    if (needsSetup) body.code = document.getElementById('g_code').value;
    const r = await api(needsSetup ? 'setup' : 'login', body);
    if (r.error) document.getElementById('g_err').textContent = r.error; else load();
  };
  document.getElementById('g_go').onclick = go;
  document.getElementById('g_pw').onkeydown = e => { if (e.key === 'Enter') go(); };
}

function renderMeter(m) {
  const el = document.getElementById('meter');
  if (!el) return;
  if (m.spent === null) { el.querySelector('.label').textContent = 'Usage meter unavailable right now'; return; }
  const pct = Math.min(100, (m.spent / m.max) * 100);
  el.querySelector('.fill').style.width = pct + '%';
  el.classList.toggle('low', m.max - m.spent < 1);
  el.querySelector('.label').textContent =
    `${money(m.spent)} of ${money(m.max)} used · ${money(Math.max(0, m.max - m.spent))} left`;
}

function shell() {
  app.innerHTML = `<header><div class="wrap">
      <div class="top"><h1>Website Helper</h1>
        <button id="b_undo">Undo last edit</button>
        <button id="b_new">New chat</button>
        <button id="b_out">Log out</button></div>
      <div class="meter" id="meter"><div class="bar"><div class="fill"></div></div><div class="label">Checking usage…</div></div>
    </div></header>
    <main class="wrap"><div id="log"></div><div id="pending"></div>
      <form class="ask" id="ask"><textarea id="q" rows="2" placeholder="Ask the helper…"></textarea>
      <button class="primary" id="send">Send</button></form></main>`;
  document.getElementById('b_undo').onclick = async () => {
    const r = await api('undo', {});
    addMsg(r.error ? 'error' : 'assistant', r.error || `Undone: ${r.undone}. If the live site still shows it, purge the CDN cache in hPanel.`);
    load(true);
  };
  document.getElementById('b_new').onclick = async () => { await api('newchat', {}); load(); };
  document.getElementById('b_out').onclick = async () => { await api('logout', {}); load(); };
  const q = document.getElementById('q');
  document.getElementById('ask').onsubmit = e => { e.preventDefault(); send(q.value); };
  q.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(q.value); } };
}

function addMsg(role, text) {
  const d = document.createElement('div');
  d.className = 'msg ' + role;
  d.innerHTML = role === 'user' ? esc(text).replace(/\n/g, '<br>') : md(text);
  document.getElementById('log').appendChild(d);
  d.scrollIntoView({ block: 'end' });
  return d;
}

function renderLog(display) {
  const log = document.getElementById('log');
  log.innerHTML = '';
  if (!display.length) {
    addMsg('assistant', `Hi ${state.client}. I can help you move to your new website and sort out problems with it afterwards. To change your site, use your Site Editor.\n\nThe bar at the top shows how much of your $10 allowance is used.`);
    const s = document.createElement('div');
    s.className = 'starters';
    for (const t of ['Help me move to my new website', 'How does my contact form work?', 'I want to change something on my site']) {
      const b = document.createElement('button');
      b.textContent = t; b.onclick = () => send(t);
      s.appendChild(b);
    }
    log.appendChild(s);
  }
  for (const m of display) addMsg(m.role, m.text);
}

function renderPending(list) {
  const box = document.getElementById('pending');
  box.innerHTML = '';
  for (const p of list) {
    const c = document.createElement('div');
    c.className = 'card';
    let body = '';
    if (p.type === 'edit') {
      const pages = Object.keys(p.files);
      const n = Object.values(p.files).reduce((a, b) => a + b, 0);
      body = `<div class="small">Change ${n} place${n > 1 ? 's' : ''} on ${pages.length} page${pages.length > 1 ? 's' : ''}</div>
        <div class="small">Now:</div><div class="diff">${esc(p.find)}</div>
        <div class="small">Becomes:</div><div class="diff">${esc(p.replace)}</div>`;
    } else if (p.type === 'switch') {
      body = `<p class="small">Your old WordPress site moves into a backup folder (nothing is deleted) and the new site goes live. Only do this after your Hostinger backup.</p>`;
    } else {
      body = `<p class="small">The new site moves out and the old WordPress site comes back.</p>`;
    }
    const label = p.type === 'edit' ? 'Apply' : p.type === 'switch' ? 'Switch to the new site' : 'Put the old site back';
    c.innerHTML = `<h3>${esc(p.summary)}</h3>${body}
      <div class="row"><button class="primary">${label}</button><button>Discard</button></div>`;
    const [yes, no] = c.querySelectorAll('button');
    yes.onclick = async () => {
      yes.disabled = no.disabled = true;
      if (p.type !== 'edit') yes.textContent = 'Working…';
      const r = await api('apply', { id: p.id });
      addMsg(r.error ? 'error' : 'assistant', r.error || ('Done. ' + (r.note || '')));
      renderPending(r.pending || []);
      document.getElementById('b_undo').disabled = false;
    };
    no.onclick = async () => { const r = await api('discard', { id: p.id }); renderPending(r.pending || []); };
    box.appendChild(c);
  }
}

async function send(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true;
  const q = document.getElementById('q'), btn = document.getElementById('send');
  q.value = ''; btn.disabled = true;
  document.querySelector('.starters')?.remove();
  addMsg('user', text);
  const wait = addMsg('assistant', 'Thinking…');
  wait.classList.add('thinking');
  const r = await api('chat', { message: text });
  wait.remove();
  if (r.reply) addMsg('assistant', r.reply);
  if (r.error) addMsg('error', r.error);
  if (r.meter) renderMeter(r.meter);
  if (r.pending) renderPending(r.pending);
  busy = false; btn.disabled = false; q.focus();
}

async function load(keepLog) {
  const s = await api('state');
  if (s.error && !('authed' in s)) { app.innerHTML = `<div class="gate"><p class="err">${esc(s.error)}</p></div>`; return; }
  if (!s.authed) { state = null; return gate(s.needs_setup); }
  const first = !state;
  state = s;
  if (first || !keepLog) { shell(); renderLog(s.display); }
  renderMeter(s.meter);
  renderPending(s.pending);
  document.getElementById('b_undo').disabled = !s.can_undo;
}
load();
</script>
</body>
</html>
