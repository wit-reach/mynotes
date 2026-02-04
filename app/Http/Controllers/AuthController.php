<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    private $secret;

    public function __construct()
    {
        $this->secret = env('JWT_SECRET', 'your-secret-key-change-in-production');
    }

    public function signup(Request $request)
    {
        try {
            $validated = $request->validate([
                'email' => 'required|email|unique:users',
                'password' => 'required|min:6',
                'username' => 'nullable|string',
                'phone' => 'nullable|string',
                'profile_picture' => 'nullable|string'
            ]);

            $user = User::create([
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'username' => $validated['username'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'profile_picture' => $validated['profile_picture'] ?? null,
                'name' => $validated['username'] ?? 'User' // Default name
            ]);

            $token = $this->generateJwt($user);

            return response()->json(['user' => $user])
                ->withCookie(cookie('token', $token, 60 * 24 * 7, '/', null, env('SECURE_COOKIE', false), true, false, 'Lax'));

        } catch (\Exception $e) {
            Log::error('Signup Error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to create user'], 500);
        }
    }

    public function signin(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        $token = $this->generateJwt($user);

        return response()->json(['user' => $user])
            ->withCookie(cookie('token', $token, 60 * 24 * 7, '/', null, env('SECURE_COOKIE', false), true, false, 'Lax'));
    }

    public function signout()
    {
        return response()->json(['message' => 'Signed out'])
            ->withCookie(cookie('token', '', -1));
    }

    public function me(Request $request)
    {
        $user = $this->getUserFromRequest($request);
        if (!$user) {
            return response()->json(['user' => null]);
        }
        return response()->json(['user' => $user]);
    }

    // --- JWT Helper Methods ---

    private function generateJwt($user)
    {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'id' => $user->id,
            'email' => $user->email,
            'exp' => time() + (7 * 24 * 60 * 60) // 7 days
        ]);

        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $this->secret, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public function getUserFromRequest(Request $request)
    {
        $token = $request->cookie('token');
        if (!$token)
            return null;

        $parts = explode('.', $token);
        if (count($parts) !== 3)
            return null;

        $header = $parts[0];
        $payload = $parts[1];
        $signature = $parts[2];

        $validSignature = hash_hmac('sha256', $header . "." . $payload, $this->secret, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($validSignature));

        if ($base64UrlSignature !== $signature)
            return null;

        $data = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
        if ($data['exp'] < time())
            return null;

        return User::find($data['id']);
    }
}
