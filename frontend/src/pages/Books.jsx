import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../components/ToastProvider';
import InlineEdit from '../components/InlineEdit';
import ConfirmModal from '../components/ConfirmModal';
import { encodeForUrl } from '../utils/slugify';

export default function Books() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookDescription, setNewBookDescription] = useState('');
  const [deleteBookId, setDeleteBookId] = useState(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await axios.get('/api/books');
      setBooks(response.data);
    } catch (error) {
      showToast('Failed to load books', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBook = async (e) => {
    e.preventDefault();
    if (!newBookTitle.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    try {
      const response = await axios.post('/api/books', {
        title: newBookTitle,
        description: newBookDescription || null,
      });
      setBooks([response.data, ...books]);
      setShowCreateModal(false);
      setNewBookTitle('');
      setNewBookDescription('');
      showToast('Book created successfully', 'success');
    } catch (error) {
      showToast('Failed to create book', 'error');
    }
  };

  const handleRenameBook = async (bookId, newTitle) => {
    try {
      const response = await axios.patch(`/api/books/${bookId}`, {
        title: newTitle,
      });
      setBooks(books.map((book) => (book.id === bookId ? response.data : book)));
      showToast('Book renamed successfully', 'success');
    } catch (error) {
      showToast('Failed to rename book', 'error');
    }
  };

  const handleDeleteBook = async () => {
    if (!deleteBookId) return;

    try {
      await axios.delete(`/api/books/${deleteBookId}`);
      setBooks(books.filter((book) => book.id !== deleteBookId));
      setDeleteBookId(null);
      showToast('Book deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete book', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Books</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Create Book
        </button>
      </div>

      {books.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No books yet. Create your first book!</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {books.map((book) => (
                <tr key={book.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <InlineEdit
                      value={book.title}
                      onSave={(newTitle) => handleRenameBook(book.id, newTitle)}
                      className="font-medium text-gray-900"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {book.description || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(book.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/books/${encodeForUrl(book.title)}/pages`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Open Pages
                      </Link>
                      <button
                        onClick={() => setDeleteBookId(book.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Book Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Book</h3>
            <form onSubmit={handleCreateBook}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  autoFocus
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newBookDescription}
                  onChange={(e) => setNewBookDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows="3"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewBookTitle('');
                    setNewBookDescription('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteBookId !== null}
        onClose={() => setDeleteBookId(null)}
        onConfirm={handleDeleteBook}
        title="Delete Book"
        message="Are you sure you want to delete this book? All pages in this book will also be deleted."
      />
    </div>
  );
}

