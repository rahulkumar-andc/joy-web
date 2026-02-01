/**
 * Multi-Language (i18n) Documentation
 * 
 * Guide for implementing and using internationalization
 */

# Multi-Language Support Guide

## Current Setup

The application already has i18n infrastructure in place using `react-i18next`.

### Client-Side Setup

**Location:** `client/src/i18n/config.ts`

The i18n configuration is already initialized with:
- Language detection
- Backend loading
- React integration

### Available Languages

Currently configured languages:
- English (en) - Default
- Hindi (hi)
- Spanish (es)
- French (fr)

## Translation Files Structure

```
client/src/i18n/locales/
├── en/
│   ├── common.json
│   ├── products.json
│   ├── checkout.json
│   └── auth.json
├── hi/
│   ├── common.json
│   ├── products.json
│   ├── checkout.json
│   └── auth.json
└── [other languages]/
```

## Usage in Components

### Using Translation Hook

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
    const { t } = useTranslation('common');
    
    return (
        <div>
            <h1>{t('welcome')}</h1>
            <p>{t('description', { name: 'User' })}</p>
        </div>
    );
}
```

### Translation File Example

**en/common.json:**
```json
{
    "welcome": "Welcome",
    "description": "Hello, {{name}}!",
    "cart": {
        "title": "Shopping Cart",
        "empty": "Your cart is empty",
        "total": "Total"
    }
}
```

**hi/common.json:**
```json
{
    "welcome": "स्वागत है",
    "description": "नमस्ते, {{name}}!",
    "cart": {
        "title": "खरीदारी की टोकरी",
        "empty": "आपकी कार्ट खाली है",
        "total": "कुल"
    }
}
```

## Language Switching

### Client-Side Language Switching

```typescript
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
    const { i18n } = useTranslation();
    
    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('language', lng);
    };
    
    return (
        <select 
            value={i18n.language} 
            onChange={(e) => changeLanguage(e.target.value)}
        >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
        </select>
    );
}
```

### Server-Side Language Detection

```typescript
// Middleware to detect language from request
app.use((req, res, next) => {
    const lang = req.headers['accept-language']?.split(',')[0] || 'en';
    req.language = lang;
    next();
});
```

## Email Templates

### Multi-Language Email Support

```typescript
import { emailService } from './services/email';

// Send email in user's preferred language
await emailService.sendEmail({
    to: user.email,
    subject: t('email.orderConfirmation', { lng: user.language }),
    template: 'order-confirmation',
    data: {
        orderId,
        language: user.language
    }
});
```

## Database Content Translation

### Product Translations Table (Optional)

```sql
CREATE TABLE product_translations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    language VARCHAR(5) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, language)
);
```

### Using Product Translations

```typescript
// Get product with translation
const product = await db
    .select()
    .from(products)
    .leftJoin(
        productTranslations,
        and(
            eq(productTranslations.productId, products.id),
            eq(productTranslations.language, userLanguage)
        )
    )
    .where(eq(products.id, productId));

// Return localized product
return {
    ...product,
    name: translation?.name || product.name,
    description: translation?.description || product.description
};
```

## Best Practices

1. **Namespace Organization**: Group translations by feature/module
2. **Fallback Language**: Always provide English translations
3. **Pluralization**: Use i18n plural forms
   ```json
   {
       "items": "{{count}} item",
       "items_plural": "{{count}} items"
   }
   ```
4. **Date/Number Formatting**: Use i18n formatters
   ```typescript
   {t('date', { val: new Date(), formatParams: { val: { dateStyle: 'long' }}})}
   ```

## Testing Translations

```typescript
import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config';

test('renders translated text', () => {
    const { getByText } = render(
        <I18nextProvider i18n={i18n}>
            <MyComponent />
        </I18nextProvider>
    );
    
    expect(getByText('Welcome')).toBeInTheDocument();
});
```

## Adding a New Language

1. Create translation files in `client/src/i18n/locales/[lang]/`
2. Add language to `i18n/config.ts`:
   ```typescript
   resources: {
       en: { ... },
       hi: { ... },
       fr: { ... },
       de: { ... } // New language
   }
   ```
3. Update language switcher component
4. Test all features in new language

## Production Checklist

- ✅ i18n configured
- ⚠️ Create translation files for all supported languages
- ⚠️ Add language switcher to UI
- ⚠️ Store user language preference
- ⚠️ Translate email templates
- ⚠️ Add RTL support (if needed for Arabic, Hebrew, etc.)
- ⚠️ Test all features in each language
