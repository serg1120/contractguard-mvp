import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from './FileUpload';
import { contractService } from '../../services/contractService';

interface UploadFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface FormData {
  file: File | null;
  nickname: string;
  contractorName: string;
}

interface FormErrors {
  file?: string;
  nickname?: string;
  contractorName?: string;
  submit?: string;
}

const UploadForm: React.FC<UploadFormProps> = ({ onSuccess, onError }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    file: null,
    nickname: '',
    contractorName: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isUploading, setIsUploading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.file) {
      newErrors.file = 'Please select a PDF file to upload';
    }

    if (!formData.nickname.trim()) {
      newErrors.nickname = 'Contract nickname is required';
    } else if (formData.nickname.trim().length < 2) {
      newErrors.nickname = 'Contract nickname must be at least 2 characters';
    }

    if (!formData.contractorName.trim()) {
      newErrors.contractorName = 'Contractor name is required';
    } else if (formData.contractorName.trim().length < 2) {
      newErrors.contractorName = 'Contractor name must be at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, file }));
    if (errors.file && file) {
      setErrors(prev => ({ ...prev, file: undefined }));
    }
  };

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsUploading(true);
    setErrors(prev => ({ ...prev, submit: undefined }));

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', formData.file!);
      uploadFormData.append('nickname', formData.nickname.trim());
      uploadFormData.append('contractor_name', formData.contractorName.trim());

      await contractService.uploadContract(uploadFormData);
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Default behavior: redirect to dashboard
        navigate('/dashboard', { 
          state: { 
            message: 'Contract uploaded successfully!',
            type: 'success'
          }
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to upload contract. Please try again.';
      
      setErrors(prev => ({ ...prev, submit: errorMessage }));
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      file: null,
      nickname: '',
      contractorName: ''
    });
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="upload-form">
      {/* File Upload Section */}
      <div className="mb-4">
        <label className="form-label">
          <strong>Contract Document</strong>
          <span className="text-danger ms-1">*</span>
        </label>
        <FileUpload 
          onChange={handleFileChange}
          className={errors.file ? 'is-invalid' : ''}
        />
        {errors.file && (
          <div className="invalid-feedback d-block">
            {errors.file}
          </div>
        )}
      </div>

      {/* Contract Details Section */}
      <div className="row">
        <div className="col-md-6 mb-3">
          <label htmlFor="nickname" className="form-label">
            <strong>Contract Nickname</strong>
            <span className="text-danger ms-1">*</span>
          </label>
          <input
            type="text"
            id="nickname"
            className={`form-control ${errors.nickname ? 'is-invalid' : ''}`}
            placeholder="e.g., Q1 Marketing Services"
            value={formData.nickname}
            onChange={handleInputChange('nickname')}
            disabled={isUploading}
            maxLength={100}
          />
          {errors.nickname && (
            <div className="invalid-feedback">
              {errors.nickname}
            </div>
          )}
          <div className="form-text">
            Give your contract a memorable name for easy identification
          </div>
        </div>

        <div className="col-md-6 mb-3">
          <label htmlFor="contractorName" className="form-label">
            <strong>Contractor Name</strong>
            <span className="text-danger ms-1">*</span>
          </label>
          <input
            type="text"
            id="contractorName"
            className={`form-control ${errors.contractorName ? 'is-invalid' : ''}`}
            placeholder="e.g., ABC Marketing Inc."
            value={formData.contractorName}
            onChange={handleInputChange('contractorName')}
            disabled={isUploading}
            maxLength={100}
          />
          {errors.contractorName && (
            <div className="invalid-feedback">
              {errors.contractorName}
            </div>
          )}
          <div className="form-text">
            Name of the company or individual you're contracting with
          </div>
        </div>
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {errors.submit}
        </div>
      )}

      {/* Action Buttons */}
      <div className="d-flex gap-3 justify-content-end mt-4">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={handleReset}
          disabled={isUploading}
        >
          <i className="bi bi-arrow-clockwise me-2"></i>
          Reset
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Uploading...
            </>
          ) : (
            <>
              <i className="bi bi-cloud-upload me-2"></i>
              Upload Contract
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default UploadForm;