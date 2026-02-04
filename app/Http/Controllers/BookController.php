<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Book;
use Illuminate\Support\Facades\Auth;

class BookController extends Controller
{
    public function index(Request $request)
    {
        $books = Book::where('user_id', Auth::id())->orderBy('created_at', 'desc')->get();
        return response()->json($books);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string'
        ]);

        $book = Book::create([
            'user_id' => Auth::id(),
            'title' => $validated['title'],
            'description' => $validated['description'] ?? ''
        ]);

        return response()->json($book);
    }

    // Add other methods (update, destroy) if needed
    public function update(Request $request, $id)
    {
        $book = Book::where('id', $id)->where('user_id', Auth::id())->first();
        if (!$book)
            return response()->json(['error' => 'Book not found'], 404);

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string'
        ]);

        $book->update($validated);
        return response()->json($book);
    }

    public function destroy(Request $request, $id)
    {
        $book = Book::where('id', $id)->where('user_id', Auth::id())->first();
        if (!$book)
            return response()->json(['error' => 'Book not found'], 404);

        $book->delete();
        return response()->json(['message' => 'Book deleted successfully']);
    }
}
