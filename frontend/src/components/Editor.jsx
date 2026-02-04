import { useEffect, useRef } from 'react';

export default function Editor({ content, onChange, onSave }) {
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);

  useEffect(() => {
    // Check if TinyMCE script is already loaded
    if (!window.tinymce) {
      const script = document.createElement('script');
      script.src = '/tinymce/tinymce.min.js';
      script.async = true;
      
      script.onload = () => {
        initializeEditor();
      };
      
      script.onerror = () => {
        console.error('Failed to load TinyMCE');
      };
      
      document.head.appendChild(script);
    } else {
      initializeEditor();
    }

    return () => {
      // Cleanup TinyMCE instance
      if (editorInstanceRef.current) {
        try {
          editorInstanceRef.current.remove();
        } catch (e) {
          // Ignore cleanup errors
        }
        editorInstanceRef.current = null;
      }
      // Also try to remove by ID if ref exists
      if (editorRef.current?.id && window.tinymce) {
        try {
          const editor = window.tinymce.get(editorRef.current.id);
          if (editor) {
            editor.remove();
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const initializeEditor = () => {
    if (!editorRef.current || !window.tinymce) return;

    // Generate unique ID for this editor instance
    const editorId = 'tinymce-' + Math.random().toString(36).substr(2, 9);
    
    // Check if element still exists before setting ID
    if (!editorRef.current) return;
    editorRef.current.id = editorId;

    window.tinymce.init({
      target: editorRef.current,
      license_key: 'gpl',
      height: 'calc(100vh - 200px)',
      menubar: false,
      plugins: [
        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
        'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
      ],
      toolbar: 'undo redo | blocks | ' +
        'bold italic forecolor | alignleft aligncenter ' +
        'alignright alignjustify | bullist numlist outdent indent | ' +
        'removeformat | help',
      content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
      setup: (editor) => {
        editorInstanceRef.current = editor;
        
        // Set initial content
        editor.on('init', () => {
          editor.setContent(content || '');
        });

        // Handle content changes
        editor.on('change', () => {
          const newContent = editor.getContent();
          onChange(newContent);
        });

        // Handle keyup for real-time updates
        editor.on('keyup', () => {
          const newContent = editor.getContent();
          onChange(newContent);
        });

        // Handle blur (auto-save)
        editor.on('blur', () => {
          onSave();
        });
      }
    });
  };

  // Update content when it changes externally
  useEffect(() => {
    if (editorInstanceRef.current && content !== undefined) {
      try {
        const currentContent = editorInstanceRef.current.getContent();
        if (currentContent !== content) {
          editorInstanceRef.current.setContent(content || '');
        }
      } catch (e) {
        // Editor might be destroyed, ignore
      }
    }
  }, [content]);

  return (
    <div className="w-full h-full">
      <textarea ref={editorRef} />
    </div>
  );
}
