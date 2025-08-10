#!/usr/bin/env node
/**
 * Script to seed Convex database with AOI and instrument data
 */

const fs = require('fs');
const path = require('path');

async function seedConvex() {
  // Your Convex URL
  const CONVEX_URL = 'https://wary-duck-484.convex.cloud';
  
  // Generate a temporary seed secret (in production, use environment variable)
  const SEED_SECRET = 'temporary-seed-secret-' + Date.now();
  
  console.log('🌱 Seeding Convex database...');
  console.log('📍 Convex URL:', CONVEX_URL);
  
  // Load data files
  const aoisPath = path.join(__dirname, '..', 'data', 'aois.json');
  const instrumentMapPath = path.join(__dirname, '..', 'data', 'instrumentMap.json');
  
  if (!fs.existsSync(aoisPath)) {
    console.error('❌ aois.json not found at:', aoisPath);
    process.exit(1);
  }
  
  if (!fs.existsSync(instrumentMapPath)) {
    console.error('❌ instrumentMap.json not found at:', instrumentMapPath);
    process.exit(1);
  }
  
  const aois = JSON.parse(fs.readFileSync(aoisPath, 'utf-8'));
  const instrumentMap = JSON.parse(fs.readFileSync(instrumentMapPath, 'utf-8'));
  
  console.log(`📊 Loaded ${aois.length} AOIs`);
  console.log(`📊 Loaded instrument maps for ${Object.keys(instrumentMap).length} types`);
  
  // Note: In production, you would set SEED_SECRET in Convex environment variables
  // For now, we'll skip authentication for seeding
  console.log('\n⚠️  Note: Seed authentication is not configured.');
  console.log('    In production, set SEED_SECRET in Convex dashboard environment variables.');
  
  // Since we can't directly seed without authentication, let's create a mutation instead
  console.log('\n📝 Creating seed data file for manual import...');
  
  const seedData = {
    aois: aois,
    instrumentMap: instrumentMap
  };
  
  const seedFilePath = path.join(__dirname, '..', 'backend', 'seed-data.json');
  fs.writeFileSync(seedFilePath, JSON.stringify(seedData, null, 2));
  
  console.log('✅ Seed data file created at:', seedFilePath);
  console.log('\n📌 Next steps:');
  console.log('1. Run: npx convex dev -C ./backend');
  console.log('2. In another terminal, run: npx convex run -C ./backend seed:importData');
  console.log('\nAlternatively, you can use the Convex dashboard to import the data manually.');
  
  return seedData;
}

// Run the seeding
seedConvex()
  .then(data => {
    console.log('\n✅ Seed preparation complete!');
    console.log(`   - ${data.aois.length} AOIs ready`);
    console.log(`   - ${Object.keys(data.instrumentMap).length} instrument maps ready`);
  })
  .catch(error => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
