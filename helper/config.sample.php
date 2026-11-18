<?php
// Copy to config.php (gitignored) or let scripts/package-helper.mjs make
// it. Ships inside the helper zip; PHP files are executed, not shown, so
// a browser can't read it. The token only works through the storehouse,
// which caps it at a lifetime dollar budget; revoke it there if needed.
return [
    'storehouse_url'   => 'https://api-storehouse.dawn-boat-e04e.workers.dev',
    'storehouse_token' => 'PASTE-TOKEN-FROM-new-caller.mjs',
    'setup_code'       => 'CHANGE-ME',   // Noah types this once to choose his password
    'model'            => 'claude-sonnet-5-5',
    'budget_usd'       => 10,            // shown only if the storehouse meter is unreachable
    'client_name'      => 'Noah',
    'business'         => 'Emerald Forest Furnishings',
    'domain'           => 'emeraldforestfurnishings.com',
    'owner_name'       => 'Connor',
];
