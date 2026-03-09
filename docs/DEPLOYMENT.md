# Deployment Guide

Quick deployment instructions for different platforms.

## Vercel (Recommended)

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_REPO_URL)

### Manual Setup

1. **Connect Repository**
   ```bash
   npm i -g vercel
   vercel login
   vercel
   ```

2. **Environment Variables**
   
   Add in Vercel Dashboard → Project → Settings → Environment Variables:
   
   | Variable | Value |
   |----------|-------|
   | `VITE_SUPABASE_URL` | `https://[PROJECT_ID].supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon key |
   | `VITE_SUPABASE_PROJECT_ID` | Your Supabase project ID |

3. **Build Settings**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Deploy**
   ```bash
   vercel --prod
   ```

---

## Netlify

### One-Click Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=YOUR_REPO_URL)

### Manual Setup

1. **Connect Repository**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repo

2. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Environment Variables**
   
   Site settings → Build & deploy → Environment:
   
   ```
   VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   VITE_SUPABASE_PROJECT_ID=your-project-id
   ```

4. **Redirects for SPA**
   
   Create `public/_redirects`:
   ```
   /*    /index.html   200
   ```

---

## Cloudflare Pages

1. **Connect Repository**
   - Go to Cloudflare Dashboard → Pages
   - Create a project and connect GitHub

2. **Build Configuration**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`

3. **Environment Variables**
   - Add the same `VITE_SUPABASE_*` variables

4. **Functions** (for SSR, if needed)
   - Place in `functions/` directory

---

## Docker

### Build Image

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    server {
        listen 80;
        root /usr/share/nginx/html;
        index index.html;
        
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        location /assets {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### Build & Run

```bash
docker build -t reviveos .
docker run -p 3000:80 \
  -e VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co \
  -e VITE_SUPABASE_PUBLISHABLE_KEY=your-key \
  reviveos
```

---

## Custom Domain Setup

### Vercel
1. Go to Project → Settings → Domains
2. Add your domain
3. Update DNS with provided records

### Netlify
1. Go to Site settings → Domain management
2. Add custom domain
3. Configure DNS

### Supabase Auth Redirect

After setting up custom domain, update Supabase:
1. Authentication → URL Configuration
2. Set Site URL to `https://yourdomain.com`
3. Add redirect URLs:
   - `https://yourdomain.com/**`

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
          VITE_SUPABASE_PROJECT_ID: ${{ secrets.VITE_SUPABASE_PROJECT_ID }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Performance Optimization

### Build Optimization

The Vite config already includes:
- Code splitting
- Tree shaking
- Minification

### CDN Assets

Static assets in `public/` are served directly. For better caching:

```javascript
// vite.config.ts - already configured
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom'],
        ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
      }
    }
  }
}
```

### Environment-specific Builds

```bash
# Development
npm run build:dev

# Production
npm run build
```
