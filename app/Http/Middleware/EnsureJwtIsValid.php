<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class EnsureJwtIsValid
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->cookie('token');
        if (!$token) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $secret = env('JWT_SECRET', 'your-secret-key-change-in-production');

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return response()->json(['error' => 'Invalid token format'], 401);
        }

        $header = $parts[0];
        $payload = $parts[1];
        $signature = $parts[2];

        $validSignature = hash_hmac('sha256', $header . "." . $payload, $secret, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($validSignature));

        if ($base64UrlSignature !== $signature) {
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $data = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
        if ($data['exp'] < time()) {
            return response()->json(['error' => 'Token expired'], 401);
        }

        $user = User::find($data['id']);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 401);
        }

        // Login the user for this request
        Auth::login($user);

        return $next($request);
    }
}
