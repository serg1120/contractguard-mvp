import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface FileUploadProps {
  onChange: (file: File | null) => void;
  className?: string;
}

interface FileState {
  file: File | null;
  error: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onChange, className = '' }) => {
  const [fileState, setFileState] = useState<FileState>({
    file: null,
    error: null
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  const ACCEPTED_FILE_TYPE = 'application/pdf';

  const validateFile = (file: File): string | null => {
    // Check file type
    if (file.type !== ACCEPTED_FILE_TYPE) {
      return 'Please upload only PDF files';
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  const handleFile = (file: File | null) => {
    if (!file) {
      setFileState({ file: null, error: null });
      onChange(null);
      return;
    }

    const error = validateFile(file);
    
    if (error) {
      setFileState({ file: null, error });
      onChange(null);
    } else {
      setFileState({ file, error: null });
      onChange(file);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    handleFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`file-upload-container ${className}`}>
      <div
        className={`card ${isDragging ? 'border-primary' : 'border-secondary'} ${fileState.error ? 'border-danger' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ borderStyle: 'dashed', borderWidth: '2px' }}
      >
        <div className="card-body text-center py-5">
          {!fileState.file ? (
            <>
              <div className="mb-3">
                <i className="bi bi-cloud-upload" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
              </div>
              <h5 className="mb-3">Drag and drop your PDF file here</h5>
              <p className="text-muted mb-3">or</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleButtonClick}
              >
                Select File
              </button>
              <p className="text-muted mt-3 mb-0">
                <small>Maximum file size: 10MB | Accepted format: PDF</small>
              </p>
            </>
          ) : (
            <div className="file-preview">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <i className="bi bi-file-pdf" style={{ fontSize: '2.5rem', color: '#dc3545' }}></i>
                  <div className="ms-3 text-start">
                    <h6 className="mb-1">{fileState.file.name}</h6>
                    <p className="text-muted mb-0">
                      <small>{formatFileSize(fileState.file.size)}</small>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={handleRemoveFile}
                >
                  <i className="bi bi-trash"></i> Remove
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {fileState.error && (
        <div className="alert alert-danger mt-3" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {fileState.error}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default FileUpload;