#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🔍 Checking Tailwind CSS setup...\n');

const checks = [
  {
    name: 'Tailwind Config',
    file: 'tailwind.config.js',
    required: true
  },
  {
    name: 'PostCSS Config',
    file: 'postcss.config.js',
    required: true
  },
  {
    name: 'Global CSS',
    file: 'app/globals.css',
    required: true
  },
  {
    name: 'Package.json',
    file: 'package.json',
    required: true
  }
];

let allPassed = true;

for (const check of checks) {
  const filePath = path.join(process.cwd(), check.file);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (check.name === 'Global CSS') {
      const hasTailwindDirectives = content.includes('@tailwind base') && 
                                  content.includes('@tailwind components') && 
                                  content.includes('@tailwind utilities');
      if (hasTailwindDirectives) {
        console.log(`✅ ${check.name} - Found Tailwind directives`);
      } else {
        console.log(`❌ ${check.name} - Missing Tailwind directives`);
        allPassed = false;
      }
    } else if (check.name === 'Package.json') {
      const packageJson = JSON.parse(content);
      const hasTailwind = packageJson.devDependencies?.tailwindcss;
      const hasPostCSS = packageJson.devDependencies?.postcss;
      const hasAutoprefixer = packageJson.devDependencies?.autoprefixer;
      
      if (hasTailwind && hasPostCSS && hasAutoprefixer) {
        console.log(`✅ ${check.name} - All required dependencies found`);
        console.log(`   Tailwind: ${hasTailwind}`);
        console.log(`   PostCSS: ${hasPostCSS}`);
        console.log(`   Autoprefixer: ${hasAutoprefixer}`);
      } else {
        console.log(`❌ ${check.name} - Missing required dependencies`);
        allPassed = false;
      }
    } else {
      console.log(`✅ ${check.name} - File exists`);
    }
  } else {
    console.log(`❌ ${check.name} - File missing`);
    allPassed = false;
  }
}

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All checks passed! Tailwind CSS should be working correctly.');
  console.log('\n📝 Next steps:');
  console.log('1. Visit http://localhost:3000/test-tailwind to verify styling');
  console.log('2. Visit http://localhost:3000/analysis to test the analysis UI');
  console.log('3. Check that dark mode and responsive design work');
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
}

console.log('\n' + '='.repeat(50));