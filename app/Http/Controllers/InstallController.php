<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class InstallController extends Controller
{
    public function index()
    {
        // If already installed (simple check: users table exists?), maybe redirect?
        // For now, let's just show the page. User can use it to re-install (reset) too.
        return view('install');
    }

    public function setup(Request $request)
    {
        $validated = $request->validate([
            'db_host' => 'required',
            'db_port' => 'required',
            'db_name' => 'required',
            'db_username' => 'required',
            'db_password' => 'nullable',
            'app_url' => 'required|url',
        ]);

        try {
            // 1. Test Database Connectivity
            $pdo = new \PDO(
                "mysql:host={$validated['db_host']};port={$validated['db_port']};dbname={$validated['db_name']}",
                $validated['db_username'],
                $validated['db_password'],
                [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
            );
        } catch (\Exception $e) {
            return response()->json(['error' => 'Database connection failed: ' . $e->getMessage()], 400);
        }

        try {
            // 2. Write .env file
            $envContent = $this->generateEnvContent($validated);
            File::put(base_path('.env'), $envContent);

            // 3. Run Commands
            // We need to reload config to pick up new env values? 
            // Actually, in a running request, env() variables might be cached. 
            // But Artisan::call reads from disk mostly? No, it uses app config.
            // This is tricky in a single request. 
            // Workaround: We set config at runtime for the migration command.

            // Increase time limit for slow migrations on shared hosting
            set_time_limit(600);

            config([
                'database.connections.mysql.host' => $validated['db_host'],
                'database.connections.mysql.port' => $validated['db_port'],
                'database.connections.mysql.database' => $validated['db_name'],
                'database.connections.mysql.username' => $validated['db_username'],
                'database.connections.mysql.password' => $validated['db_password'],
            ]);

            // Force reconnect
            DB::purge('mysql');
            DB::reconnect('mysql');

            // Run Migrations
            Artisan::call('migrate:fresh --force');

            // Note: We already generated the key in generateEnvContent, so we don't need to run key:generate again.
            // This avoids potential file-locking issues on shared hosting.

            // Storage link (might fail on some shared hosts if symlink is disabled, so wrap in try/catch)
            try {
                Artisan::call('storage:link');
            } catch (\Exception $e) {
            }

            return response()->json(['message' => 'Installation successful!']);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Installation failed: ' . $e->getMessage()], 500);
        }
    }

    private function generateEnvContent($data)
    {
        $key = 'base64:' . base64_encode(random_bytes(32)); // Generate a generic key initially, artisan key:generate will overwrite
        $jwtSecret = base64_encode(random_bytes(32));

        return "APP_NAME=MyNotes
APP_ENV=production
APP_KEY={$key}
APP_DEBUG=true
APP_URL={$data['app_url']}
APP_INSTALLED=true
JWT_SECRET={$jwtSecret}

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST={$data['db_host']}
DB_PORT={$data['db_port']}
DB_DATABASE={$data['db_name']}
DB_USERNAME={$data['db_username']}
DB_PASSWORD={$data['db_password']}

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120

MEMCACHED_HOST=127.0.0.1

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS=\"hello@example.com\"
MAIL_FROM_NAME=\"\${APP_NAME}\"

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_HOST=
PUSHER_PORT=443
PUSHER_SCHEME=https
PUSHER_APP_CLUSTER=mt1

VITE_PUSHER_APP_KEY=\"\${PUSHER_APP_KEY}\"
VITE_PUSHER_HOST=\"\${PUSHER_HOST}\"
VITE_PUSHER_PORT=\"\${PUSHER_PORT}\"
VITE_PUSHER_SCHEME=\"\${PUSHER_SCHEME}\"
VITE_PUSHER_APP_CLUSTER=\"\${PUSHER_APP_CLUSTER}\"
";
    }
}
