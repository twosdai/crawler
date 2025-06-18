#!/usr/bin/env node

/**
 * Example Node.js script to analyze a business website using the API
 */

const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3000/api/business-research/analyze';
const WEBSITE_TO_ANALYZE = process.argv[2] || 'https://example.com';

async function analyzeWebsite(website) {
  console.log(`\nAnalyzing website: ${website}`);
  console.log('This may take a few minutes...\n');

  try {
    const startTime = Date.now();
    
    const response = await axios.post(API_URL, {
      website: website,
      maxPages: 10,
      timeoutMinutes: 5
    });

    const duration = (Date.now() - startTime) / 1000;
    
    if (response.data.success) {
      console.log('✅ Analysis completed successfully!');
      console.log(`⏱️  Duration: ${duration.toFixed(1)}s`);
      console.log('\n--- SUMMARY ---');
      console.log(response.data.summary);
      
      console.log('\n--- BUSINESS OVERVIEW ---');
      const overview = response.data.report.businessOverview;
      console.log(`Name: ${overview.name}`);
      console.log(`Industry: ${overview.industry}`);
      console.log(`Description: ${overview.description}`);
      
      console.log('\n--- KEY PERSONNEL ---');
      const personnel = response.data.report.keyPersonnel;
      console.log(`Total identified: ${personnel.totalIdentified}`);
      console.log(`Owners: ${personnel.owners.length}`);
      console.log(`Executives: ${personnel.executives.length}`);
      console.log(`Decision Makers: ${personnel.decisionMakers.length}`);
      
      console.log('\n--- MARKET STRATEGY ---');
      const strategy = response.data.report.marketStrategy;
      console.log(`Target Market: ${strategy.targetMarket}`);
      console.log(`GTM Strategy: ${strategy.goToMarketStrategy}`);
      console.log(`Marketing Channels: ${strategy.marketingChannels.join(', ')}`);
      
      console.log('\n--- METADATA ---');
      console.log(`Request ID: ${response.data.metadata.requestId}`);
      console.log(`Pages Analyzed: ${response.data.metadata.pagesAnalyzed}`);
      console.log(`Confidence: ${response.data.report.confidence}`);
      
      // Save full report to file
      const fs = require('fs');
      const filename = `report-${website.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(response.data, null, 2));
      console.log(`\n💾 Full report saved to: ${filename}`);
      
    } else {
      console.error('❌ Analysis failed:', response.data.message);
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data.message || error.response.statusText);
      console.error('Status:', error.response.status);
    } else if (error.request) {
      console.error('❌ No response from API. Is the server running?');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

// Check if axios is installed
try {
  require.resolve('axios');
} catch (e) {
  console.error('Please install axios first: npm install axios');
  process.exit(1);
}

// Run the analysis
analyzeWebsite(WEBSITE_TO_ANALYZE);