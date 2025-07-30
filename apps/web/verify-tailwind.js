#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🔍 Verifying Tailwind CSS Setup...\n');

try {
  // Check package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const tailwindVersion = packageJson.devDependencies?.tailwindcss;
  const postcssVersion = packageJson.devDependencies?.postcss;
  const autoprefixerVersion = packageJson.devDependencies?.autoprefixer;

  console.log('📦 Package Versions:');
  console.log(`   Tailwind CSS: ${tailwindVersion}`);
  console.log(`   PostCSS: ${postcssVersion}`);
  console.log(`   Autoprefixer: ${autoprefixerVersion}`);

  // Check if files exist
  const files = [
    'tailwind.config.js',
    'postcss.config.js',
    'app/globals.css'
  ];

  console.log('\n📁 Configuration Files:');
  for (const file of files) {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file} exists`);
    } else {
      console.log(`   ❌ ${file} missing`);
    }
  }

  // Check globals.css content
  const globalsCss = fs.readFileSync('app/globals.css', 'utf8');
  const hasTailwindDirectives = globalsCss.includes('@tailwind base') && 
                               globalsCss.includes('@tailwind components') && 
                               globalsCss.includes('@tailwind utilities');

  console.log('\n🎨 CSS Directives:');
  if (hasTailwindDirectives) {
    console.log('   ✅ Tailwind directives found in globals.css');
  } else {
    console.log('   ❌ Tailwind directives missing from globals.css');
  }

  // Check if server is running
  try {
    const response = execSync('curl -s http://localhost:3000', { timeout: 5000 });
    console.log('\n🌐 Development Server:');
    console.log('   ✅ Server is running on port 3000');
  } catch (error) {
    console.log('\n🌐 Development Server:');
    console.log('   ❌ Server not running on port 3000');
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Verification complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Visit http://localhost:3000/test-tailwind');
  console.log('2. Visit http://localhost:3000/analysis');
  console.log('3. Check that Tailwind classes are working');

} catch (error) {
  console.error('❌ Error during verification:', error.message);
}