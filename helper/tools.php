<?php
// The helper's site tools: what Claude may look at, and the changes it
// may PROPOSE. Nothing here changes the live site on Claude's say-so:
// edits, the site switch and the restore become "pending" cards that
// Noah has to click. Only apply_pending() (called from his click)
// writes files.

declare(strict_types=1);

const SKIP_DIRS = ['_astro', 'lib', 'wp-admin', 'wp-content', 'wp-includes', '.well-known', 'cgi-bin'];
const KEEP_IN_PLACE = ['.well-known', 'cgi-bin']; // never moved by the switch

function helper_dir_name(): string { return basename(__DIR__); }

// ---------- small JSON-file store ----------

function store_path(string $name): string { return DATA . '/' . $name . '.json'; }

function store_read(string $name, $default = [])
{
    $p = store_path($name);
    if (!is_file($p)) return $default;
    $v = json_decode((string)file_get_contents($p), true);
    return $v ?? $default;
}

function store_write(string $name, $value): void
{
    $p = store_path($name);
    $tmp = $p . '.' . bin2hex(random_bytes(4)) . '.tmp';
    file_put_contents($tmp, json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    rename($tmp, $p);
}

function add_note(string $text): void
{
    $notes = store_read('notes');
    $notes[] = $text;
    store_write('notes', $notes);
}

function log_line(string $file, array $row): void
{
    $row = ['ts' => date('c')] + $row;
    file_put_contents(DATA . '/' . $file, json_encode($row, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
}

// ---------- site files ----------

/** Relative path => absolute path for an editable page, or null. */
function site_file(string $rel): ?string
{
    $rel = ltrim(str_replace('\\', '/', trim($rel)), '/');
    if ($rel === '' || !preg_match('/\.html?$/i', $rel)) return null;
    $base = realpath(PUBLIC_HTML);
    $full = realpath(PUBLIC_HTML . '/' . $rel);
    if (!$base || !$full || !is_file($full)) return null;
    $base .= DIRECTORY_SEPARATOR;
    if (!str_starts_with($full, $base)) return null;
    $first = explode('/', str_replace('\\', '/', substr($full, strlen($base))))[0];
    if (in_array($first, SKIP_DIRS, true) || $first === helper_dir_name()) return null;
    return $full;
}

/** Every editable .html page, as relative paths. */
function site_pages(): array
{
    $out = [];
    $base = realpath(PUBLIC_HTML);
    if (!$base) return $out;
    $skip = array_merge(SKIP_DIRS, [helper_dir_name()]);
    $it = new RecursiveIteratorIterator(
        new RecursiveCallbackFilterIterator(
            new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS),
            static function (SplFileInfo $f, $key, $iter) use ($base, $skip) {
                if ($iter->hasChildren()) {
                    $rel = str_replace('\\', '/', substr($f->getPathname(), strlen($base) + 1));
                    return !in_array(explode('/', $rel)[0], $skip, true) && substr_count($rel, '/') < 4;
                }
                return (bool)preg_match('/\.html?$/i', $f->getFilename());
            }
        )
    );
    foreach ($it as $f) {
        $out[] = str_replace('\\', '/', substr($f->getPathname(), strlen($base) + 1));
        if (count($out) >= 300) break;
    }
    sort($out);
    return $out;
}

function page_title(string $html): string
{
    return preg_match('~<title[^>]*>(.*?)</title>~is', $html, $m)
        ? html_entity_decode(trim($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8') : '';
}

/** Page HTML with bulky, non-editable parts collapsed to save tokens. */
function compact_html(string $html): string
{
    $html = preg_replace('~<style\b[^>]*>.*?</style>~is', '<style>[css hidden]</style>', $html);
    $html = preg_replace_callback('~<script\b([^>]*)>(.*?)</script>~is', static function ($m) {
        return stripos($m[1], 'ld+json') !== false ? $m[0] : '<script' . $m[1] . '>[code hidden]</script>';
    }, $html);
    $html = preg_replace('~<svg\b[^>]*>.*?</svg>~is', '<svg>[icon]</svg>', $html);
    return $html;
}

function snippet(string $hay, int $pos, int $len, int $pad = 90): string
{
    $start = max(0, $pos - $pad);
    return ($start > 0 ? '…' : '') . substr($hay, $start, $len + 2 * $pad) . (($pos + $len + $pad) < strlen($hay) ? '…' : '');
}

// ---------- tool definitions sent to Claude ----------

function tool_definitions(): array
{
    $obj = static fn(array $props, array $req) => [
        'type' => 'object', 'properties' => (object)$props, 'required' => $req, 'additionalProperties' => false,
    ];
    return [
        [
            'name' => 'check_server',
            'description' => 'Look at the hosting account: whether the old WordPress site or the new site is live in public_html, whether the new site files are bundled and ready to switch in, whether the contact form settings are filled in (never shows the password), and earlier switches. Use before guiding any move or form step.',
            'input_schema' => $obj([], []),
        ],
        [
            'name' => 'list_pages',
            'description' => 'List the editable pages of the live site with their titles.',
            'input_schema' => $obj([], []),
        ],
        [
            'name' => 'search_site',
            'description' => 'Find text in every page of the live site (raw HTML, so also links like tel: and structured data). Returns each page with the number of matches and short snippets. Use this before any edit, to find every place a fact appears.',
            'input_schema' => $obj(['text' => ['type' => 'string', 'description' => 'Exact text to find, case-insensitive.']], ['text']),
        ],
        [
            'name' => 'read_page',
            'description' => 'Read one page\'s HTML. CSS, scripts and icons are collapsed to placeholders; never put a placeholder in an edit. Pages can be long, so prefer search_site when you only need to find something.',
            'input_schema' => $obj(['path' => ['type' => 'string', 'description' => 'Path from list_pages, e.g. "about/index.html".']], ['path']),
        ],
        [
            'name' => 'propose_edit',
            'description' => 'Propose a text change for Noah to approve. It replaces every exact, case-sensitive occurrence of `find` with `replace` in the listed pages. Nothing changes until he clicks Apply. Keep `find` short but unique enough (copy it exactly from search_site or read_page). Only text and simple inline HTML; no scripts, styles or layout changes. Make one proposal per logical change.',
            'input_schema' => $obj([
                'summary' => ['type' => 'string', 'description' => 'One plain sentence for Noah, e.g. "Change the phone number to (828) 555-0100 on every page".'],
                'find' => ['type' => 'string'],
                'replace' => ['type' => 'string'],
                'pages' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => 'Page paths, or ["ALL"] for every page that contains `find`.'],
            ], ['summary', 'find', 'replace', 'pages']),
        ],
        [
            'name' => 'send_test_email',
            'description' => 'Send a test message through the contact form settings to the address that receives the form. Returns OK or the mail server error.',
            'input_schema' => $obj([], []),
        ],
        [
            'name' => 'propose_site_switch',
            'description' => 'Propose switching the live site: the old WordPress files move out of public_html into a dated "old-site-..." folder next to it (nothing is deleted, the database is untouched), and the new site goes in. Noah must click to do it. Only after he has made a Hostinger backup and the test email worked.',
            'input_schema' => $obj(['summary' => ['type' => 'string']], ['summary']),
        ],
        [
            'name' => 'propose_restore_old_site',
            'description' => 'Propose undoing the last site switch: the new site moves out and the old WordPress site moves back. Noah must click to do it.',
            'input_schema' => $obj(['summary' => ['type' => 'string']], ['summary']),
        ],
    ];
}

// ---------- tool execution ----------

function run_tool(string $name, array $in): array
{
    try {
        return match ($name) {
            'check_server' => ['ok' => true] + server_status(),
            'list_pages' => tool_list_pages(),
            'search_site' => tool_search((string)($in['text'] ?? '')),
            'read_page' => tool_read((string)($in['path'] ?? '')),
            'propose_edit' => tool_propose_edit($in),
            'send_test_email' => tool_test_email(),
            'propose_site_switch' => tool_propose_simple('switch', (string)($in['summary'] ?? 'Switch to the new site')),
            'propose_restore_old_site' => tool_propose_simple('restore', (string)($in['summary'] ?? 'Put the old site back')),
            default => ['error' => "unknown tool $name"],
        };
    } catch (Throwable $e) {
        return ['error' => 'tool failed: ' . $e->getMessage()];
    }
}

function server_status(): array
{
    $names = array_values(array_diff(scandir(PUBLIC_HTML) ?: [], ['.', '..']));
    $cfg = ef_form_config_raw();
    $switch = store_read('switch', null);
    return [
        'public_html_contents' => array_slice($names, 0, 60),
        'wordpress_is_live' => is_file(PUBLIC_HTML . '/wp-config.php') || is_dir(PUBLIC_HTML . '/wp-content'),
        'new_site_is_live' => is_dir(PUBLIC_HTML . '/_astro') && is_file(PUBLIC_HTML . '/contact.php'),
        'new_site_bundle_ready' => is_file(__DIR__ . '/site.zip'),
        'zip_support' => class_exists('ZipArchive'),
        'php_version' => PHP_VERSION,
        'contact_form_settings' => $cfg ? [
            'smtp_host' => $cfg['smtp_host'] ?? '', 'smtp_port' => $cfg['smtp_port'] ?? '',
            'smtp_user' => $cfg['smtp_user'] ?? '', 'password_set' => !empty($cfg['smtp_pass']),
            'sends_to' => $cfg['to'] ?? '',
        ] : 'not set up yet (Noah fills in the Contact form settings panel)',
        'last_switch' => $switch,
        'old_site_folders' => array_values(array_filter(
            scandir(dirname(PUBLIC_HTML)) ?: [], static fn($n) => str_starts_with($n, 'old-site-')
        )),
    ];
}

function tool_list_pages(): array
{
    $pages = [];
    foreach (site_pages() as $rel) {
        $pages[] = ['path' => $rel, 'title' => page_title((string)file_get_contents(PUBLIC_HTML . '/' . $rel))];
    }
    return ['pages' => $pages, 'note' => $pages ? '' : 'No editable pages found. Is the new site live yet? Use check_server.'];
}

function tool_search(string $text): array
{
    if (mb_strlen($text) < 2) return ['error' => 'search text too short'];
    $hits = [];
    $total = 0;
    foreach (site_pages() as $rel) {
        $html = (string)file_get_contents(PUBLIC_HTML . '/' . $rel);
        $n = substr_count(strtolower($html), strtolower($text));
        if (!$n) continue;
        $total += $n;
        $snips = [];
        $off = 0;
        for ($k = 0; $k < 3; $k++) {
            $pos = stripos($html, $text, $off);
            if ($pos === false) break;
            $snips[] = snippet($html, $pos, strlen($text));
            $off = $pos + strlen($text);
        }
        $hits[] = ['page' => $rel, 'matches' => $n, 'snippets' => $snips];
        if (count($hits) >= 40) break;
    }
    return ['total_matches' => $total, 'pages' => $hits];
}

function tool_read(string $rel): array
{
    $full = site_file($rel);
    if (!$full) return ['error' => 'no such editable page; use list_pages'];
    $html = compact_html((string)file_get_contents($full));
    $cut = strlen($html) > 60000;
    return ['path' => $rel, 'html' => $cut ? substr($html, 0, 60000) : $html, 'truncated' => $cut];
}

function risky_html(string $s): bool
{
    return (bool)preg_match('~<\?|<script|<iframe|<object|<embed|<style|javascript:|\son[a-z]+\s*=~i', $s);
}

function tool_propose_edit(array $in): array
{
    $find = (string)($in['find'] ?? '');
    $replace = (string)($in['replace'] ?? '');
    $summary = trim((string)($in['summary'] ?? ''));
    $pages = $in['pages'] ?? [];
    if ($find === '' || $find === $replace) return ['error' => 'find must be non-empty and differ from replace'];
    if (strlen($find) > 3000 || strlen($replace) > 6000) return ['error' => 'change too large; split it up'];
    if (str_contains($find, '[css hidden]') || str_contains($find, '[code hidden]') || str_contains($find, '<svg>[icon]')) {
        return ['error' => 'find contains a placeholder from read_page; use text from the real page'];
    }
    if (risky_html($replace) && !risky_html($find)) {
        return ['error' => 'replace adds scripts, styles, frames or event handlers; not allowed. Tell Noah this needs Connor.'];
    }
    if (!is_array($pages) || !$pages) return ['error' => 'pages required'];
    $isAll = count($pages) === 1 && strtoupper((string)$pages[0]) === 'ALL';
    $targets = $isAll ? site_pages() : $pages;

    $files = [];
    $missing = [];
    foreach ($targets as $rel) {
        $full = site_file((string)$rel);
        if (!$full) { $missing[] = $rel; continue; }
        $n = substr_count((string)file_get_contents($full), $find);
        if ($n) $files[(string)$rel] = $n;
        elseif (!$isAll) $missing[] = $rel;
    }
    if (!$files) return ['error' => 'find text not found exactly (it is case-sensitive). Search again and copy it exactly.'];
    if ($missing) {
        return ['error' => 'not found in: ' . implode(', ', $missing) . '. Leave those pages out or fix find.'];
    }
    $id = bin2hex(random_bytes(3));
    $pending = store_read('pending');
    $pending[$id] = [
        'id' => $id, 'type' => 'edit', 'summary' => $summary ?: 'Edit',
        'find' => $find, 'replace' => $replace, 'files' => $files, 'created' => date('c'),
    ];
    store_write('pending', $pending);
    return ['ok' => true, 'proposal' => $id, 'pages' => count($files), 'occurrences' => array_sum($files),
        'next' => 'Noah now sees an Apply button. Tell him in one line what it will change.'];
}

function tool_propose_simple(string $type, string $summary): array
{
    if ($type === 'switch') {
        if (!is_file(__DIR__ . '/site.zip')) return ['error' => 'the new site bundle (site.zip) is missing; Connor must send a new helper zip'];
        if (!class_exists('ZipArchive')) return ['error' => 'this server has no ZIP support; Noah should ask Connor'];
    } elseif (!store_read('switch', null)) {
        return ['error' => 'there is no earlier switch to undo'];
    }
    $id = bin2hex(random_bytes(3));
    $pending = store_read('pending');
    foreach ($pending as $k => $p) if ($p['type'] === $type) unset($pending[$k]);
    $pending[$id] = ['id' => $id, 'type' => $type, 'summary' => $summary, 'created' => date('c')];
    store_write('pending', $pending);
    return ['ok' => true, 'proposal' => $id, 'next' => 'Noah now sees a button for this. Tell him what will happen.'];
}

function tool_test_email(): array
{
    $cfg = ef_form_config_raw();
    if (!$cfg) return ['error' => 'contact form settings are not filled in yet'];
    $mailer = mailer_path();
    if (!$mailer) return ['error' => 'mail library missing from the helper'];
    require_once $mailer;
    $err = ef_send_mail($cfg, 'Test from your website helper',
        "This is a test from the website helper.\nIf you can read this, the contact form can send email.\n");
    log_line('mail.log', ['test' => true, 'error' => $err]);
    return $err === null
        ? ['ok' => true, 'sent_to' => $cfg['to'], 'next' => 'Ask Noah to check that inbox, including Spam.']
        : ['error' => 'mail server said: ' . $err];
}

// ---------- form-config.php ----------

function mailer_path(): ?string
{
    foreach ([PUBLIC_HTML . '/lib/mailer.php', __DIR__ . '/lib/mailer.php'] as $p) if (is_file($p)) return $p;
    return null;
}

function form_config_path(): string { return dirname(PUBLIC_HTML) . '/form-config.php'; }

function ef_form_config_raw(): ?array
{
    $p = form_config_path();
    if (!is_file($p)) return null;
    $cfg = include $p;
    return is_array($cfg) ? $cfg : null;
}

function write_form_config(array $in): ?string
{
    $old = ef_form_config_raw() ?? [];
    $cfg = [
        'smtp_host' => trim((string)($in['smtp_host'] ?? '')) ?: 'smtp.hostinger.com',
        'smtp_port' => (int)($in['smtp_port'] ?? 465) ?: 465,
        'smtp_user' => trim((string)($in['smtp_user'] ?? '')),
        // Blank password field = keep the saved one.
        'smtp_pass' => (string)($in['smtp_pass'] ?? '') !== '' ? (string)$in['smtp_pass'] : (string)($old['smtp_pass'] ?? ''),
        'from' => trim((string)($in['smtp_user'] ?? '')),
        'from_name' => trim((string)($in['from_name'] ?? '')) ?: 'Website contact form',
        'to' => trim((string)($in['to'] ?? '')),
    ];
    if (!filter_var($cfg['smtp_user'], FILTER_VALIDATE_EMAIL)) return 'The mailbox must be a full email address.';
    foreach (preg_split('/\s*,\s*/', $cfg['to']) as $to) {
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return 'The "send to" address is not a valid email address.';
    }
    if ($cfg['smtp_pass'] === '') return 'Enter the mailbox password.';
    if (!preg_match('/^[a-z0-9.-]+$/i', $cfg['smtp_host'])) return 'The mail server name looks wrong.';
    $php = "<?php\n// Contact form settings, written by the website helper on " . date('Y-m-d') . ".\n"
        . "// Lives outside public_html on purpose. Keep it private.\nreturn " . var_export($cfg, true) . ";\n";
    $p = form_config_path();
    if (file_put_contents($p . '.tmp', $php) === false) return 'Could not save the settings file.';
    @chmod($p . '.tmp', 0600);
    rename($p . '.tmp', $p);
    if (function_exists('opcache_invalidate')) @opcache_invalidate($p, true);
    return null;
}

// ---------- applying pending changes (only from Noah's click) ----------

function apply_pending(string $id): array
{
    $pending = store_read('pending');
    $p = $pending[$id] ?? null;
    if (!$p) return ['error' => 'That change is no longer waiting.'];
    $res = match ($p['type']) {
        'edit' => apply_edit($p),
        'switch' => do_switch(),
        'restore' => do_restore(),
        default => ['error' => 'unknown change'],
    };
    if (empty($res['error'])) {
        unset($pending[$id]);
        store_write('pending', $pending);
        add_note("Noah clicked Apply on proposal {$id} ({$p['summary']}): done. " . ($res['note'] ?? ''));
    }
    return $res;
}

function discard_pending(string $id): void
{
    $pending = store_read('pending');
    if (isset($pending[$id])) {
        add_note("Noah discarded proposal {$id} ({$pending[$id]['summary']}).");
        unset($pending[$id]);
        store_write('pending', $pending);
    }
}

function apply_edit(array $p): array
{
    $backup = DATA . '/backups/' . $p['id'];
    @mkdir($backup, 0700, true);
    $plan = [];
    foreach ($p['files'] as $rel => $count) {
        $full = site_file((string)$rel);
        if (!$full) return ['error' => "Page $rel is gone. Ask the helper again."];
        $html = (string)file_get_contents($full);
        if (substr_count($html, $p['find']) !== $count) return ['error' => "Page $rel changed since this was proposed. Ask the helper again."];
        $plan[$rel] = [$full, $html];
    }
    foreach ($plan as $rel => [$full, $html]) {
        $dest = $backup . '/' . $rel;
        @mkdir(dirname($dest), 0700, true);
        file_put_contents($dest, $html);
        $tmp = $full . '.helper-tmp';
        file_put_contents($tmp, str_replace($p['find'], $p['replace'], $html));
        rename($tmp, $full);
    }
    $hist = store_read('history');
    $hist[] = ['id' => $p['id'], 'summary' => $p['summary'], 'files' => array_keys($plan), 'at' => date('c'), 'undone' => false];
    store_write('history', $hist);
    log_line('edits.log', ['id' => $p['id'], 'summary' => $p['summary'], 'find' => $p['find'], 'replace' => $p['replace'], 'files' => $p['files']]);
    return ['ok' => true, 'note' => 'If the live site still shows the old text, purge the CDN cache in hPanel.'];
}

function undo_last_edit(): array
{
    $hist = store_read('history');
    for ($i = count($hist) - 1; $i >= 0; $i--) {
        if ($hist[$i]['undone']) continue;
        $h = $hist[$i];
        foreach ($h['files'] as $rel) {
            $src = DATA . '/backups/' . $h['id'] . '/' . $rel;
            $full = site_file($rel);
            if (!is_file($src) || !$full) return ['error' => "Backup for $rel is missing."];
        }
        foreach ($h['files'] as $rel) {
            $full = site_file($rel);
            file_put_contents($full . '.helper-tmp', (string)file_get_contents(DATA . '/backups/' . $h['id'] . '/' . $rel));
            rename($full . '.helper-tmp', $full);
        }
        $hist[$i]['undone'] = true;
        store_write('history', $hist);
        log_line('edits.log', ['undo' => $h['id'], 'summary' => $h['summary']]);
        add_note("Noah clicked Undo: change {$h['id']} ({$h['summary']}) was reverted.");
        return ['ok' => true, 'undone' => $h['summary']];
    }
    return ['error' => 'There is nothing to undo.'];
}

/** Move every entry of $from (except $keep) into $to. Rolls back on failure. */
function move_entries(string $from, string $to, array $keep): array
{
    $moved = [];
    foreach (array_diff(scandir($from) ?: [], ['.', '..']) as $name) {
        if (in_array($name, $keep, true)) continue;
        if (!@rename("$from/$name", "$to/$name")) {
            foreach (array_reverse($moved) as $m) @rename("$to/$m", "$from/$m");
            throw new RuntimeException("could not move $name");
        }
        $moved[] = $name;
    }
    return $moved;
}

function do_switch(): array
{
    if (!is_file(__DIR__ . '/site.zip')) return ['error' => 'The new site files are missing from the helper.'];
    if (!class_exists('ZipArchive')) return ['error' => 'This server cannot open ZIP files. Ask Connor.'];
    $stamp = date('Ymd-His');
    $parent = dirname(PUBLIC_HTML);
    $stage = "$parent/new-site-staging-$stamp";
    $old = "$parent/old-site-$stamp";
    $zip = new ZipArchive();
    if ($zip->open(__DIR__ . '/site.zip') !== true) return ['error' => 'Could not open the new site files.'];
    @mkdir($stage, 0755, true);
    $ok = $zip->extractTo($stage);
    $zip->close();
    if (!$ok || !is_file("$stage/index.html")) return ['error' => 'The new site files did not unpack correctly.'];

    $keep = array_merge(KEEP_IN_PLACE, [helper_dir_name()]);
    @mkdir($old, 0755, true);
    try {
        $movedOld = move_entries(PUBLIC_HTML, $old, $keep);
    } catch (Throwable $e) {
        return ['error' => 'Stopped before changing anything visible: ' . $e->getMessage()];
    }
    try {
        $movedNew = move_entries($stage, PUBLIC_HTML, $keep);
    } catch (Throwable $e) {
        // Put the old site back exactly as it was.
        foreach (array_diff(scandir(PUBLIC_HTML) ?: [], ['.', '..'], $keep) as $n) @rename(PUBLIC_HTML . "/$n", "$stage/$n");
        foreach ($movedOld as $n) @rename("$old/$n", PUBLIC_HTML . "/$n");
        return ['error' => 'Could not finish, so the old site was put back: ' . $e->getMessage()];
    }
    @rmdir($stage);
    store_write('switch', ['at' => date('c'), 'old_folder' => basename($old), 'old_entries' => $movedOld, 'new_entries' => $movedNew]);
    log_line('site.log', ['switch' => basename($old)]);
    return ['ok' => true, 'note' => 'Old site saved in ' . basename($old) . '. Purge the CDN cache in hPanel next.'];
}

function do_restore(): array
{
    $sw = store_read('switch', null);
    if (!$sw) return ['error' => 'There is no switch to undo.'];
    $parent = dirname(PUBLIC_HTML);
    $old = "$parent/{$sw['old_folder']}";
    if (!is_dir($old)) return ['error' => 'The old site folder is missing.'];
    $removed = "$parent/new-site-removed-" . date('Ymd-His');
    @mkdir($removed, 0755, true);
    $keep = array_merge(KEEP_IN_PLACE, [helper_dir_name()]);
    try {
        move_entries(PUBLIC_HTML, $removed, $keep);
        move_entries($old, PUBLIC_HTML, $keep);
    } catch (Throwable $e) {
        return ['error' => 'Restore stopped partway: ' . $e->getMessage() . '. Call Connor before trying again.'];
    }
    @rmdir($old);
    @unlink(store_path('switch'));
    log_line('site.log', ['restore' => $sw['old_folder'], 'new_site_moved_to' => basename($removed)]);
    return ['ok' => true, 'note' => 'Old site is back. Purge the CDN cache in hPanel.'];
}
