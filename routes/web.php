<?php

use App\Http\Controllers\ApiProxyController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\InstallController;

Route::get('/install', [InstallController::class, 'index']);
Route::post('/install/setup', [InstallController::class, 'setup']);

Route::get('/', function () {
    // Let .htaccess handle routing to React app
    return response()->file(public_path('index.html'));
});

// Proxy API requests to Node.js backend
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookController;

use App\Http\Controllers\PageController;

Route::prefix('api')->group(function () {
    // Auth Routes
    Route::post('auth/signup', [AuthController::class, 'signup']);
    Route::post('auth/signin', [AuthController::class, 'signin']);
    Route::post('auth/signout', [AuthController::class, 'signout']);
    Route::get('auth/me', [AuthController::class, 'me']);

    // Protected Routes
    Route::middleware('auth.jwt')->group(function () {
        // Books
        Route::get('books', [BookController::class, 'index']);
        Route::post('books', [BookController::class, 'store']);
        Route::patch('books/{id}', [BookController::class, 'update']);
        Route::delete('books/{id}', [BookController::class, 'destroy']);

        // Pages (Note: Parameters are 'bookIdentifier' and 'pageIdentifier')
        Route::get('books/{bookIdentifier}/pages', [PageController::class, 'index']);
        Route::post('books/{bookIdentifier}/pages', [PageController::class, 'store']);
        Route::get('pages/{bookIdentifier}/{pageIdentifier}', [PageController::class, 'show']);
        Route::patch('books/{bookIdentifier}/pages/{pageIdentifier}', [PageController::class, 'update']);
        Route::delete('books/{bookIdentifier}/pages/{pageIdentifier}', [PageController::class, 'destroy']);
        Route::post('books/{bookIdentifier}/pages/{pageIdentifier}/duplicate', [PageController::class, 'duplicate']);
    });
});

// Explicitly handle API 404s (if they don't match the proxy group)
Route::prefix('api')->any('{any}', function () {
    return response()->json(['error' => 'API route not found'], 404);
})->where('any', '.*');

// Catch-all route for React SPA (only for non-api routes)
Route::fallback(function () {
    return response()->file(public_path('index.html'));
});
