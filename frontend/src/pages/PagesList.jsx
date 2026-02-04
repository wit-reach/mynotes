import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../components/ToastProvider';
import InlineEdit from '../components/InlineEdit';
import ConfirmModal from '../components/ConfirmModal';
import { encodeForUrl, decodeFromUrl } from '../utils/slugify';

export default function PagesList() {
  const { bookName } = useParams();
  const [pages, setPages] = useState([]);
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletePageId, setDeletePageId] = useState(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    fetchPages();
  }, [bookName]);

  const fetchPages = async () => {
    try {
      const response = await axios.get(`/api/books/${bookName}/pages`);
      setPages(response.data.pages || []);
      setBook(response.data.book || null);
      setLoading(false);
    } catch (error) {
      showToast('Failed to load pages', 'error');
      setLoading(false);
    }
  };

  const handleCreatePage = async (e) => {
    e.preventDefault();
    if (!newPageTitle.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    try {
      const response = await axios.post(`/api/books/${bookName}/pages`, {
        title: newPageTitle,
      });
      setPages([response.data, ...pages]);
      setShowCreateModal(false);
      setNewPageTitle('');
      showToast('Page created successfully', 'success');
      // Navigate to the new page
      navigate(`/books/${encodeForUrl(book.title)}/pages/${encodeForUrl(response.data.title)}`);
    } catch (error) {
      showToast('Failed to create page', 'error');
    }
  };

  const handleRenamePage = async (pageTitle, newTitle) => {
    try {
      const response = await axios.patch(`/api/books/${bookName}/pages/${encodeForUrl(pageTitle)}`, {
        title: newTitle,
      });
      setPages(pages.map((page) => (page.title === pageTitle ? response.data : page)));
      showToast('Page renamed successfully', 'success');
    } catch (error) {
      showToast('Failed to rename page', 'error');
    }
  };

  const handleDuplicatePage = async (pageTitle) => {
    try {
      const response = await axios.post(`/api/books/${bookName}/pages/${encodeForUrl(pageTitle)}/duplicate`);
      setPages([response.data, ...pages]);
      showToast('Page duplicated successfully', 'success');
    } catch (error) {
      showToast('Failed to duplicate page', 'error');
    }
  };

  const handleDeletePage = async () => {
    if (!deletePageId) return;

    const pageToDelete = pages.find(p => p.id === deletePageId);
    if (!pageToDelete) return;

    try {
      await axios.delete(`/api/books/${bookName}/pages/${encodeForUrl(pageToDelete.title)}`);
      setPages(pages.filter((page) => page.id !== deletePageId));
      setDeletePageId(null);
      showToast('Page deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete page', 'error');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      <div className="mb-4">
        <Link to="/books" className="text-indigo-600 hover:text-indigo-900">
          ← Back to Books
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {book?.title || 'Pages'}
          </h1>
          {book?.description && (
            <p className="text-gray-600 mt-1">{book.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Create Page
        </button>
      </div>

      {pages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No pages yet. Create your first page!</p>
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
                  Last Modified
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Word Count
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <InlineEdit
                      value={page.title}
                      onSave={(newTitle) => handleRenamePage(page.id, newTitle)}
                      className="font-medium text-gray-900"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(page.updated_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {page.word_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/books/${encodeForUrl(book.title)}/pages/${encodeForUrl(page.title)}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Open
                      </Link>
                      <button
                        onClick={() => handleDuplicatePage(page.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => setDeletePageId(page.id)}
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

      {/* Create Page Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Page</h3>
            <form onSubmit={handleCreatePage}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewPageTitle('');
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
        isOpen={deletePageId !== null}
        onClose={() => setDeletePageId(null)}
        onConfirm={handleDeletePage}
        title="Delete Page"
        message="Are you sure you want to delete this page? This action cannot be undone."
      />
    </div>
  );
}

