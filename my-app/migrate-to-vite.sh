#!/bin/bash

set -e

echo "🚀 Starting migration from CRA to Vite..."

# 1. Save current directory name
APP_NAME=$(basename "$PWD")

# 2. Create new Vite project
npm create vite@latest vite-temp -- --template react
cd vite-temp
npm install

# 3. Copy src, public and environment files
cd ..
cp -r src vite-temp/
cp -r public vite-temp/
cp .env* vite-temp/ 2>/dev/null || true

# 4. Replace root project with vite-temp
rm -rf node_modules package.json package-lock.json public src
mv vite-temp/* . && mv vite-temp/.* . 2>/dev/null || true
rm -rf vite-temp

# 5. Install required packages
npm install react react-dom
npm install -D sass

# 6. Fix index.html
sed -i '' 's|<title>Vite App</title>|<title>'"$APP_NAME"'</title>|' index.html
echo "✅ index.html updated."

# 7. Optional: add path alias
cat <<EOL > vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
EOL
echo "✅ vite.config.js with alias '@' created."

echo "🎉 Migration complete. Run with: npm run dev"
