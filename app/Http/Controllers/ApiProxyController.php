<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ApiProxyController extends Controller
{
    /**
     * Proxy API requests to the Node.js backend.
     */
    public function __invoke(Request $request, string $path = '')
    {
        $backendUrl = rtrim(config('app.api_backend_url', 'http://127.0.0.1:3001'), '/');
        $pathPart = trim($path ?? '', '/');
        $url = $backendUrl . '/api' . ($pathPart ? '/' . $pathPart : '');
        if (!empty($request->query())) {
            $url .= '?' . http_build_query($request->query());
        }

        // Forward relevant headers (exclude Laravel-specific and hop-by-hop)
        $excludeHeaders = [
            'host',
            'connection',
            'content-length',
            'transfer-encoding',
            'te',
            'trailers',
            'upgrade',
            'proxy-authorization',
            'proxy-authenticate',
        ];

        $headers = [];
        foreach ($request->headers->all() as $key => $values) {
            $keyLower = strtolower($key);
            if (!in_array($keyLower, $excludeHeaders)) {
                $headers[$key] = $values;
            }
        }

        try {
            $method = strtoupper($request->method());
            $http = Http::withHeaders($headers)
                ->timeout(30)
                ->connectTimeout(10)
                ->withOptions(['verify' => false]);

            $body = $request->getContent() ?: json_encode($request->all());
            $contentType = $request->header('Content-Type', 'application/json');

            $response = match ($method) {
                'GET' => $http->get($url),
                'POST' => $http->withBody($body, $contentType)->post($url),
                'PUT' => $http->withBody($body, $contentType)->put($url),
                'PATCH' => $http->withBody($body, $contentType)->patch($url),
                'DELETE' => $http->delete($url),
                default => $http->send($method, $url, ['body' => $body]),
            };

            // Build response - ensure Set-Cookie is forwarded (critical for login)
            $laravelResponse = response($response->body(), $response->status());
            foreach ($response->headers() as $key => $values) {
                $keyLower = strtolower($key);
                if (in_array($keyLower, ['transfer-encoding'])) {
                    continue;
                }
                $values = (array) $values;
                foreach ($values as $i => $value) {
                    $laravelResponse->header($key, $value, $i === 0);
                }
            }
            return $laravelResponse;
        } catch (\Exception $e) {
            \Log::error('API proxy error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Unable to reach the API server. Ensure the backend is running.',
            ], 502);
        }
    }
}
