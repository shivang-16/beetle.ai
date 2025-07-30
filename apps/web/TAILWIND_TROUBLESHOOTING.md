# Tailwind CSS Troubleshooting Guide

## Common Issues and Solutions

### 1. Tailwind Classes Not Working

**Symptoms**: Tailwind classes are not being applied to elements.

**Solutions**:
- ✅ Ensure `@tailwind base; @tailwind components; @tailwind utilities;` are in `globals.css`
- ✅ Check that `globals.css` is imported in `layout.tsx`
- ✅ Verify `tailwind.config.js` has correct content paths
- ✅ Make sure `postcss.config.js` exists and is configured correctly

### 2. Turborepo Specific Issues

**Symptoms**: Tailwind works in some apps but not others.

**Solutions**:
- ✅ Each app needs its own `tailwind.config.js` and `postcss.config.js`
- ✅ Content paths should include workspace packages: `'../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}'`
- ✅ Use `pnpm install` at the root to ensure all workspace dependencies are linked

### 3. Version Conflicts

**Symptoms**: Build errors or unexpected behavior.

**Solutions**:
- ✅ Use Tailwind CSS v3.x (stable) instead of v4.x (experimental)
- ✅ Ensure PostCSS v8.x is installed
- ✅ Check for conflicting CSS frameworks

### 4. Development Server Issues

**Symptoms**: Changes not reflecting in development.

**Solutions**:
- ✅ Restart the development server after config changes
- ✅ Clear `.next` cache: `rm -rf .next`
- ✅ Check for TypeScript errors: `pnpm check-types`

## Current Setup Verification

### Files to Check:

1. **`apps/web/tailwind.config.js`**
   ```js
   module.exports = {
     content: [
       './pages/**/*.{js,ts,jsx,tsx,mdx}',
       './components/**/*.{js,ts,jsx,tsx,mdx}',
       './app/**/*.{js,ts,jsx,tsx,mdx}',
       '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
     ],
     theme: { extend: {} },
     plugins: [],
   }
   ```

2. **`apps/web/postcss.config.js`**
   ```js
   module.exports = {
     plugins: {
       tailwindcss: {},
       autoprefixer: {},
     },
   }
   ```

3. **`apps/web/app/globals.css`**
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

4. **`apps/web/app/layout.tsx`**
   ```tsx
   import './globals.css'
   ```

### Package Versions:

- `tailwindcss`: `^3.4.17`
- `postcss`: `^8.4.31`
- `autoprefixer`: `^10.4.21`

## Testing Tailwind

Visit `/test-tailwind` to see if Tailwind is working correctly.

## Commands to Run:

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Check for TypeScript errors
pnpm check-types

# Build the project
pnpm build
```