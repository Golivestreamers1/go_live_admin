import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { blogService } from '../../services/blogService';

/**
 * Upload-or-paste image field. The upload endpoint returns a stored URL which
 * becomes the field value; `previewUrl` is only used for the thumbnail because
 * it is a short-lived signed link.
 */
export default function ImageUploadField({ value, previewUrl, onChange, label }) {
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState('');
  const fileRef = useRef(null);

  const handleUpload = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      toast.error('Choose a JPEG, PNG, GIF or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Images must be 5MB or smaller');
      return;
    }
    try {
      setUploading(true);
      const result = await blogService.uploadImage(file);
      if (result?.url) {
        onChange(result.url);
        setLocalPreview(result.previewUrl || result.url);
        toast.success(`${label} uploaded`);
      } else {
        toast.error('Upload failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const shown = localPreview || previewUrl || value;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>

        {shown && (
          <>
            <div className="h-12 w-20 flex-shrink-0 overflow-hidden rounded border bg-muted">
              <img src={shown} alt="" className="h-full w-full object-cover" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange(null);
                setLocalPreview('');
              }}
            >
              <X className="mr-1 h-4 w-4" />
              Remove
            </Button>
          </>
        )}
      </div>

      <Input
        type="url"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="Or paste an image URL"
      />
    </div>
  );
}

ImageUploadField.propTypes = {
  value: PropTypes.string,
  previewUrl: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
};

ImageUploadField.defaultProps = {
  label: 'Image',
};
