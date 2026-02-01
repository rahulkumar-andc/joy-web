# ImageKit Integration Guide

## Overview
This project uses ImageKit for cloud-based image storage with automatic optimization and CDN delivery.

## Features
- **Automatic Optimization**: Images are converted to WebP when supported
- **Responsive Images**: Generate thumbnails and responsive sizes on-the-fly
- **CDN Delivery**: Fast global content delivery
- **Image Transformations**: Resize, crop, format conversion via URL parameters

## API Endpoints

### Upload Image
```http
POST /api/images/upload
Authorization: Required (Admin)
Content-Type: multipart/form-data

Parameters:
- image: File (required)
- folder: string (optional, default: "/products")
- tags: JSON array (optional)
```

### Upload Multiple Images
```http
POST /api/images/upload-multiple
Authorization: Required (Admin)
Content-Type: multipart/form-data

Parameters:
- images: File[] (required, max 10)
- folder: string (optional)
```

### Delete Image
```http
DELETE /api/images/:fileId
Authorization: Required (Admin)
```

### Migrate Existing Images
```http
POST /api/images/migrate
Authorization: Required (Admin)

Response:
{
  "total": 100,
  "successful": 98,
  "failed": 2,
  "results": [...]
}
```

### Check Migration Status
```http
GET /api/images/migration-status
Authorization: Required (Admin)

Response:
{
  "totalProducts": 100,
  "migratedProducts": 50,
  "unmigrated": 50
}
```

## Image URLs

### Original Image
```
https://ik.imagekit.io/1qfypyvouv/products/product-1-1.jpg
```

### Optimized (Auto WebP + Quality 80)
```
https://ik.imagekit.io/1qfypyvouv/products/product-1-1.jpg?tr=f-auto,q-80
```

### Thumbnail (200x200)
```
https://ik.imagekit.io/1qfypyvouv/products/product-1-1.jpg?tr=w-200,h-200,q-70
```

### Custom Transformations
```
https://ik.imagekit.io/1qfypyvouv/products/product-1-1.jpg?tr=w-400,h-300,f-webp,q-80
```

## Usage in Code

### Upload Image
```typescript
import { imagekitService } from './services/imagekitService';

const result = await imagekitService.uploadImage({
    file: buffer,
    fileName: 'product.jpg',
    folder: '/products',
    tags: ['sale', '2024']
});

console.log(result.url); // https://ik.imagekit.io/...
```

### Get Optimized URL
```typescript
const optimizedUrl = imagekitService.getOptimizedUrl(
    originalUrl,
    { width: 400, format: 'webp', quality: 80 }
);
```

### Generate Thumbnail
```typescript
const thumbnailUrl = imagekitService.getThumbnail(originalUrl, 200);
```

## Migration Process

1. **Check Status**: `GET /api/images/migration-status`
2. **Run Migration**: `POST /api/images/migrate`
3. **Verify**: Check product images in database

The migration:
- Uploads each image to ImageKit
- Updates product records with new URLs
- Preserves original URLs for rollback
- Handles errors gracefully

## Environment Variables

```env
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
```

## Best Practices

1. **Always use transformations**: Add `?tr=f-auto,q-80` for automatic optimization
2. **Generate thumbnails**: Use smaller sizes for product listings
3. **Lazy loading**: Use browser native lazy loading for images
4. **Responsive images**: Use `srcset` with different sizes

## Troubleshooting

### Images not showing
- Check ImageKit credentials in `.env`
- Verify URL endpoint is correct
- Check browser console for CORS errors

### Migration failed
- Check network connectivity
- Verify original image URLs are accessible
- Review migration results for specific errors

### Upload errors
- Ensure file size is under 5MB
- Check file type (JPEG, PNG, WebP only)
- Verify admin authentication
