import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../components/ToastProvider';
import Editor from '../components/Editor';
import InlineEdit from '../components/InlineEdit';
import { encodeForUrl, decodeFromUrl } from '../utils/slugify';

export default function EditorPage() {
  const { bookName, pageName } = useParams();
  const [page, setPage] = useState(null);
  const [book, setBook] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const autosaveIntervalRef = useRef(null);
  const contentRef = useRef('');
  const pageRef = useRef(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Keep refs in sync with state
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    fetchPage();

    return () => {
      if (autosaveIntervalRef.current) {
        clearInterval(autosaveIntervalRef.current);
      }
    };
  }, [pageName]);

  const handleSave = useCallback(async (isAutosave = false) => {
    const currentPage = pageRef.current;
    const currentContent = contentRef.current;
    
    if (!currentPage) return;

    setSaving(true);
    try {
      const response = await axios.patch(`/api/books/${bookName}/pages/${pageName}`, {
        content_html: currentContent,
      });
      setPage(response.data);
      setLastSaved(new Date().toISOString());
      if (!isAutosave) {
        showToast('Saved successfully', 'success');
      }
    } catch (error) {
      if (!isAutosave) {
        showToast('Failed to save', 'error');
      }
    } finally {
      setSaving(false);
    }
  }, [bookName, pageName, showToast]);

  useEffect(() => {
    // Set up autosave interval
    if (autosaveIntervalRef.current) {
      clearInterval(autosaveIntervalRef.current);
    }

    autosaveIntervalRef.current = setInterval(() => {
      if (contentRef.current && pageRef.current) {
        handleSave(true);
      }
    }, 8000); // 8 seconds

    return () => {
      if (autosaveIntervalRef.current) {
        clearInterval(autosaveIntervalRef.current);
      }
    };
  }, [handleSave]);

  const fetchPage = async () => {
    try {
      const response = await axios.get(`/api/pages/${bookName}/${pageName}`);
      setPage(response.data);
      setContent(response.data.content_html || '');
      setLastSaved(response.data.updated_at);
    } catch (error) {
      showToast('Failed to load page', 'error');
      navigate(`/books/${bookName}/pages`);
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = async (newTitle) => {
    try {
      const response = await axios.patch(`/api/books/${bookName}/pages/${pageName}`, {
        title: newTitle,
      });
      setPage(response.data);
      showToast('Title updated', 'success');
      // Navigate to new URL with updated page name
      navigate(`/books/${encodeForUrl(bookName)}/pages/${encodeForUrl(newTitle)}`);
    } catch (error) {
      showToast('Failed to update title', 'error');
    }
  };

  const formatLastSaved = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!page) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Breadcrumb and toolbar */}
      <div className="border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link to="/books" className="hover:text-gray-900">Books</Link>
            <span>/</span>
            <Link to={`/books/${bookName}/pages`} className="hover:text-gray-900">
              Pages
            </Link>
            <span>/</span>
            <span className="text-gray-900">Editor</span>
          </div>
          <div className="flex items-center gap-4">
            {saving && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                <span>Saving...</span>
              </div>
            )}
            {!saving && lastSaved && (
              <span className="text-sm text-gray-500">
                Last saved: {formatLastSaved(lastSaved)}
              </span>
            )}
            <button
              onClick={() => handleSave(false)}
              className="p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
              title="Save"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-2">
          <InlineEdit
            value={page.title}
            onSave={handleTitleChange}
            className="text-2xl font-bold text-gray-900"
          />
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-4 sm:px-6 lg:px-8">
          <Editor
            content={content}
            onChange={setContent}
            onSave={() => handleSave(true)}
          />
        </div>
      </div>
    </div>
  );
}

