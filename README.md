# Lam Phuong Admin

A React + TypeScript + Vite admin dashboard with Airtable OAuth authentication.

## Features

- 🔐 Airtable OAuth 2.0 authentication
- 📧 Traditional email/password login
- 🎨 Dark/Light theme support
- 🛡️ Protected routes
- ⚡ Fast development with Vite

## Airtable OAuth Setup

To enable Airtable sign-in, you need to:

1. **Create an OAuth App in Airtable**:
   - Go to [Airtable Developer Hub](https://airtable.com/create/oauth)
   - Create a new OAuth integration
   - Set the redirect URI to: `http://localhost:5173/oauth/callback` (for development)
   - Copy your Client ID and Client Secret

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   VITE_AIRTABLE_CLIENT_ID=your_client_id_here
   VITE_AIRTABLE_CLIENT_SECRET=your_client_secret_here
   VITE_AIRTABLE_REDIRECT_URI=http://localhost:5173/oauth/callback
   ```

3. **Update Redirect URI for Production**:
   When deploying, update `VITE_AIRTABLE_REDIRECT_URI` to match your production URL and ensure it's added to your Airtable OAuth app settings.

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## OAuth Flow

The application implements the OAuth 2.0 authorization code flow:
1. User clicks "Sign in with Airtable"
2. Redirects to Airtable authorization page
3. User grants permissions
4. Airtable redirects back with authorization code
5. Application exchanges code for access/refresh tokens
6. User information is fetched and stored
7. User is redirected to dashboard

## Reference

- [Airtable OAuth Reference](https://airtable.com/developers/web/api/oauth-reference)

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
