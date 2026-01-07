# Resume Upload API Documentation

## Overview

The Resume Upload API allows support workers to upload their resume/CV documents to their profile. Uploaded resumes are stored on Cloudinary and the secure URL is saved to the worker's profile.

## Authentication

This endpoint requires authentication via Bearer token and is restricted to **Support Workers only**.

```
Authorization: Bearer <your_access_token>
```

## Base URL

```
/api/v1/users
```

## Endpoint

### Upload Resume

Upload a resume document for the authenticated support worker.

**Endpoint:** `POST /api/v1/users/upload-resume`

**Authentication:** Required (Support Worker only)

**Request Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Resume document (PDF, JPG, JPEG, or PNG) |

**File Requirements:**

- **Accepted formats:** PDF, JPG, JPEG, PNG
- **Maximum size:** 10 MB
- **Field name:** `file`

**Request Example:**

```http
POST /api/v1/users/upload-resume
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="john_doe_resume.pdf"
Content-Type: application/pdf

[Binary file data]
------WebKitFormBoundary--
```

**cURL Example:**

```bash
curl -X POST \
  https://api.guardiancarepro.com/api/v1/users/upload-resume \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -F 'file=@/path/to/resume.pdf'
```

**JavaScript Example (using axios):**

```javascript
const formData = new FormData();
formData.append('file', resumeFile); // resumeFile is a File object

const response = await axios.post(
  '/api/v1/users/upload-resume',
  formData,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'multipart/form-data'
    }
  }
);
```

**Response Example:**

```json
{
  "success": true,
  "message": "Resume uploaded successfully",
  "data": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "SUPPORT_WORKER",
    "resume": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/user-documents/document-60f7b3b3b3b3b3b3b3b3b3b3.pdf",
    "skills": [...],
    "bio": "Experienced support worker...",
    "hourlyRate": {
      "baseRate": 42,
      "weekendRate": 50,
      "holidayRate": 60
    },
    "createdAt": "2024-12-13T10:00:00.000Z",
    "updatedAt": "2024-12-13T11:30:00.000Z"
  }
}
```

---

## How It Works

### Upload Process

1. **File Validation**: The uploaded file is validated against:
   - File type (must be PDF, JPG, JPEG, or PNG)
   - File size (must be ≤ 10 MB)

2. **Cloudinary Upload**: The file is uploaded to Cloudinary:
   - Folder: `user-documents/`
   - Public ID: `document-{userId}`
   - Resource type: `auto` (automatically detects file type)

3. **URL Storage**: The secure Cloudinary URL is saved to the worker's `resume` field

4. **Response**: The updated user profile (with resume URL) is returned

---

## Resume URL Format

The resume URL follows this pattern:

```
https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/user-documents/document-{userId}.{extension}
```

**Example:**
```
https://res.cloudinary.com/guardiancare/image/upload/v1702468800/user-documents/document-60f7b3b3b3b3b3b3b3b3b3b3.pdf
```

### URL Validation

The `resume` field must be a valid URL matching this pattern:

```regex
^(https?:\/\/)?[\w-]+(\.[\w-]+)+([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$
```

---

## Error Responses

### 400 Bad Request - Invalid File Type

```json
{
  "success": false,
  "message": "Invalid file type. Only JPG, JPEG, PNG and PDF are allowed."
}
```

### 400 Bad Request - File Too Large

```json
{
  "success": false,
  "message": "File too large. Maximum size is 10MB."
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Only support workers can upload resumes"
}
```

### 413 Payload Too Large

```json
{
  "success": false,
  "message": "Payload too large"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Error uploading resume"
}
```

---

## Integration with Worker Profile

### Resume Field in Worker Model

```typescript
{
  resume?: string;  // Optional URL to uploaded resume document
}
```

### Worker Onboarding

The resume field is now **required** during worker onboarding:

```http
POST /api/v1/users/workers/onboarding
```

**Request Body:**

```json
{
  "bio": "Experienced support worker...",
  "skills": ["60f7b3b3b3b3b3b3b3b3b3b4"],
  "serviceCategories": ["60f7b3b3b3b3b3b3b3b3b3b3"],
  "languages": ["English", "Spanish"],
  "experience": [...],
  "resume": "https://res.cloudinary.com/guardiancare/image/upload/v1702468800/user-documents/document-60f7b3b3b3b3b3b3b3b3b3b3.pdf",
  "hourlyRate": {
    "baseRate": 42
  },
  "shiftRates": [...],
  "availability": {...}
}
```

### Displaying Resume

When retrieving worker profiles, the `resume` field contains the direct URL:

```json
{
  "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
  "firstName": "John",
  "lastName": "Doe",
  "resume": "https://res.cloudinary.com/guardiancare/image/upload/v1702468800/user-documents/document-60f7b3b3b3b3b3b3b3b3b3b3.pdf"
}
```

You can:
- Display a download link: `<a href="{resume}" download>Download Resume</a>`
- Embed PDF viewer: `<iframe src="{resume}"></iframe>`
- Open in new tab: `<a href="{resume}" target="_blank">View Resume</a>`

---

## Frontend Implementation Examples

### React Example (with File Input)

```jsx
import { useState } from 'react';
import axios from 'axios';

function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    // Validate file size (10MB = 10485760 bytes)
    if (selectedFile && selectedFile.size > 10485760) {
      setError('File size exceeds 10MB limit');
      return;
    }
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (selectedFile && !allowedTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Only PDF, JPG, JPEG, and PNG are allowed');
      return;
    }
    
    setFile(selectedFile);
    setError('');
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        '/api/v1/users/upload-resume',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('Resume uploaded:', response.data.data.resume);
      alert('Resume uploaded successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload Resume'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

### Vue Example

```vue
<template>
  <div>
    <input 
      type="file" 
      ref="fileInput"
      accept=".pdf,.jpg,.jpeg,.png"
      @change="handleFileChange"
      :disabled="uploading"
    />
    <button @click="uploadResume" :disabled="!file || uploading">
      {{ uploading ? 'Uploading...' : 'Upload Resume' }}
    </button>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      file: null,
      uploading: false,
      error: ''
    };
  },
  methods: {
    handleFileChange(event) {
      const selectedFile = event.target.files[0];
      
      if (selectedFile && selectedFile.size > 10485760) {
        this.error = 'File size exceeds 10MB limit';
        return;
      }
      
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (selectedFile && !allowedTypes.includes(selectedFile.type)) {
        this.error = 'Invalid file type';
        return;
      }
      
      this.file = selectedFile;
      this.error = '';
    },
    async uploadResume() {
      if (!this.file) return;

      this.uploading = true;
      this.error = '';

      try {
        const formData = new FormData();
        formData.append('file', this.file);

        const response = await this.$axios.post(
          '/api/v1/users/upload-resume',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        this.$emit('uploaded', response.data.data.resume);
      } catch (err) {
        this.error = err.response?.data?.message || 'Upload failed';
      } finally {
        this.uploading = false;
      }
    }
  }
};
</script>
```

---

## Security Considerations

1. **File Type Validation**: Only PDF and image files (JPG, JPEG, PNG) are accepted
2. **File Size Limit**: Maximum 10 MB to prevent abuse
3. **Authentication Required**: Only authenticated support workers can upload
4. **Role-Based Access**: Endpoint is restricted to `SUPPORT_WORKER` role only
5. **Cloudinary Security**: Files are stored securely with Cloudinary's infrastructure
6. **URL Validation**: Resume URLs are validated using regex pattern before storage

---

## Related Endpoints

- [User Profile API](/docs/api/v1/users.md#update-profile) - Update user profile
- [Worker Onboarding API](/docs/api/v1/users.md#worker-onboarding) - Complete worker onboarding
- [Profile Image Upload](/docs/api/v1/users.md#upload-profile-image) - Upload profile picture

---

## Notes

- The resume field is optional in the worker model but recommended for completeness
- During onboarding, the resume URL must be provided after uploading
- Previous resume uploads for the same user are overwritten (same public_id)
- Resume URLs are permanent and can be accessed directly via the Cloudinary CDN
- The file is temporarily stored in memory before being uploaded to Cloudinary
- No local file system storage is used
