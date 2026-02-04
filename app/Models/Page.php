<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Page extends Model
{
    use HasFactory;

    protected $fillable = ['book_id', 'title', 'content_html', 'word_count'];

    public function book()
    {
        return $this->belongsTo(Book::class);
    }
}
