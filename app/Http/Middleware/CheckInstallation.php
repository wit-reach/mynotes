<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckInstallation
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if the application is installed based on APP_INSTALLED env var
        $isInstalled = env('APP_INSTALLED', false);

        // Define routes that should be accessible during installation
        $isInstallRoute = $request->is('install') || $request->is('install/*');

        if (!$isInstalled) {
            // If not installed, redirect everything to /install (except the install routes themselves)
            if (!$isInstallRoute) {
                return redirect('/install');
            }
        } else {
            // If installed, block access to /install and redirect to home
            if ($isInstallRoute) {
                return redirect('/');
            }
        }

        return $next($request);
    }
}
