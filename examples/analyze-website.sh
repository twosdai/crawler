#!/bin/bash

# Example script to analyze a business website using the API

# Set the API endpoint
API_URL="http://localhost:3000/api/business-research/analyze"

# Example website to analyze
WEBSITE="https://example.com"

echo "Analyzing website: $WEBSITE"
echo "This may take a few minutes..."

# Make the API request
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "website": "'"$WEBSITE"'",
    "maxPages": 10,
    "timeoutMinutes": 5
  }' \
  | jq '.'

echo ""
echo "Analysis complete!"