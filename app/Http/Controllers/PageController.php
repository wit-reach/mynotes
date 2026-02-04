<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Book;
use App\Models\Page;
use Illuminate\Support\Facades\Auth;

class PageController extends Controller
{
    // Helper to resolve book by ID or Title
    private function resolveBook($identifier)
    {
        $decoded = urldecode($identifier);

        $book = Book::where('user_id', Auth::id())
            ->where(function ($query) use ($decoded, $identifier) {
                $query->where('title', $decoded)
                    ->orWhere('id', $identifier);
            })->first();

        return $book;
    }

    // Helper to resolve page by ID or Title within a book
    private function resolvePage(Book $book, $identifier)
    {
        $decoded = urldecode($identifier);

        $page = Page::where('book_id', $book->id)
            ->where(function ($query) use ($decoded, $identifier) {
                $query->where('title', $decoded)
                    ->orWhere('id', $identifier);
            })->first();

        return $page;
    }

    public function index(Request $request, $bookIdentifier)
    {
        $book = $this->resolveBook($bookIdentifier);
        if (!$book)
            return response()->json(['error' => 'Book not found'], 404);

        $pages = Page::where('book_id', $book->id)->orderBy('updated_at', 'desc')->get();
        return response()->json(['pages' => $pages, 'book' => $book]);
    }

    public function store(Request $request, $bookIdentifier)
    {
        $book = $this->resolveBook($bookIdentifier);
        if (!$book)
            return response()->json(['error' => 'Book not found'], 404);

        $validated = $request->validate(['title' => 'required|string']);

        $page = Page::create([
            'book_id' => $book->id,
            'title' => $validated['title'],
            'content_html' => '',
            'word_count' => 0
        ]);

        return response()->json($page, 201);
    }

    public function show(Request $request, $bookIdentifier, $pageIdentifier)
    {
        $book = $this->resolveBook($bookIdentifier);
        if (!$book)
            return response()->json(['error' => 'Book not found'], 404);

        $page = $this->resolvePage($book, $pageIdentifier);
        if (!$page)
            return response()->json(['error' => 'Page not found'], 404);

        return response()->json($page);
    }

    public function update(Request $request, $bookIdentifier, $pageIdentifier)
    {
        $book = $this->resolveBook($bookIdentifier);
        if (!$book)
            return response()->json(['error' => 'Book not found'], 404);

        $page = $this->resolvePage($book, $pageIdentifier);
        if (!$page)
            return response()->json(['error' => 'Page not found'], 404);

        $validated = $request->validate([
            'title' => 'nullable|string',
            'content_html' => 'nullable|string'
        ]);

        $updates = [];
        if (isset($validated['title']))
            $updates['title'] = $validated['title'];
        if (isset($validated['content_html'])) {
            $updates['content_html'] = $validated['content_html'];
            // Calculate word count
            $text = strip_tags($validated['content_html']);
            $updates['word_count'] = str_word_count($text);
        }

        if (!empty($updates)) {
            $page->update($updates);
        }

        return response()->json($page);
    }

    public function destroy(Request $request, $bookIdentifier, $pageIdentifier)
    {
        $book = $this->resolveBook($bookIdentifier);
        if (!$book)
            return response()->json(['error' => 'Book not found'], 404);

        $page = $this->resolvePage($book, $pageIdentifier);
        if (!$page)
            return response()->json(['error' => 'Page not found'], 404);

        $page->delete();
        return response()->json(['message' => 'Page deleted successfully']);
    }

    public function duplicate(Request $request, $bookIdentifier, $pageIdentifier)
    {
        $book = $this->resolveBook($bookIdentifier);
        if (!$book)
            return response()->json(['error' => 'Book not found'], 404);

        $page = $this->resolvePage($book, $pageIdentifier);
        if (!$page)
            return response()->json(['error' => 'Page not found'], 404);

        $newPage = $page->replicate();
        $newPage->title = $page->title . ' (Copy)';
        $newPage->created_at = now();
        $newPage->updated_at = now();
        $newPage->save();

        return response()->json($newPage);
    }
}
