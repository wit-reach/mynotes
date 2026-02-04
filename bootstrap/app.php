<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);
        $middleware->encryptCookies(except: [
            'token', // Exclude authentication token from encryption
        ]);
        $middleware->web(append: [
            \App\Http\Middleware\CheckInstallation::class,
        ]);

        $middleware->validateCsrfTokens(except: [
            'install/*',
        ]);

        $middleware->alias([
            'auth.jwt' => \App\Http\Middleware\EnsureJwtIsValid::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
