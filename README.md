# Multi-Agent Business Research System

A NestJS-based multi-agent system that analyzes business websites and returns comprehensive business intelligence reports using web scraping and OpenAI agents.

## Features

- **Multi-Agent Architecture**: Specialized agents for different aspects of business analysis
  - Web Crawler Agent: Extracts content from websites
  - Personnel Research Agent: Identifies key personnel and decision makers
  - Business Analysis Agent: Analyzes operations and market strategy
  - News Research Agent: Finds recent developments and trends
  - Quality Assurance Agent: Evaluates data completeness

- **Intelligent Web Scraping**: Uses Puppeteer and Cheerio for robust data extraction
- **OpenAI Integration**: Leverages GPT-4 for intelligent data analysis
- **Docker Support**: Fully containerized application
- **Comprehensive API**: RESTful API with Swagger documentation
- **Configurable**: Environment-based configuration for all settings

## Prerequisites

- Node.js 18.x or higher
- Docker and Docker Compose
- OpenAI API key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd crawler
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Configure your OpenAI API key in `.env`:
```
OPENAI_API_KEY=your_openai_api_key_here
```

## Running the Application

### Development Mode

```bash
# Start in watch mode
npm run start:dev

# Start with Docker
docker-compose up app
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm run start:prod

# Or use Docker
docker-compose up app-prod
```

## API Documentation

Once the application is running, you can access:

- Swagger Documentation: `http://localhost:3000/api/docs`
- Health Check: `http://localhost:3000/health`

## API Endpoints

### Analyze Business Website

**POST** `/api/business-research/analyze`

Request body:
```json
{
  "website": "https://example.com",
  "maxPages": 10,
  "timeoutMinutes": 5
}
```

Response:
```json
{
  "success": true,
  "metadata": {
    "requestId": "uuid",
    "duration": "45s",
    "pagesAnalyzed": 8
  },
  "summary": "Business summary text...",
  "report": {
    "businessOverview": {
      "name": "Example Corp",
      "industry": "Technology",
      "description": "...",
      "operations": ["Software Development", "Consulting"]
    },
    "keyPersonnel": {
      "owners": [...],
      "executives": [...],
      "decisionMakers": [...]
    },
    "marketStrategy": {
      "targetMarket": "Enterprise clients",
      "goToMarketStrategy": "Direct sales",
      "marketingChannels": ["Website", "LinkedIn", "Content Marketing"]
    },
    "currentStatus": {
      "recentNews": [...],
      "challenges": [...],
      "opportunities": [...]
    }
  }
}
```

## Testing

Run the test suite:
```bash
# Unit tests
npm run test

# Test coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## Configuration

Key configuration options in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key (required) | - |
| `PORT` | Application port | 3000 |
| `MAX_PAGES_PER_ANALYSIS` | Maximum pages to scrape | 10 |
| `ANALYSIS_TIMEOUT_MINUTES` | Analysis timeout | 5 |
| `LOG_LEVEL` | Logging level | info |
| `PUPPETEER_TIMEOUT_MS` | Page load timeout | 30000 |

## Architecture

The system follows a modular architecture:

```
src/
├── modules/
│   ├── web-scraping/       # Web scraping functionality
│   ├── agent-orchestration/ # Agent coordination
│   └── report-generation/   # Report formatting
├── common/
│   ├── interfaces/         # TypeScript interfaces
│   └── dto/               # Data transfer objects
└── config/                # Configuration files
```

## Docker

Build and run with Docker:

```bash
# Build image
docker build -t business-research-system .

# Run container
docker run -p 3000:3000 --env-file .env business-research-system

# Or use docker-compose
docker-compose up
```

## Performance Considerations

- The system limits web scraping to 10 pages by default
- Analysis timeout is set to 5 minutes
- Puppeteer runs with optimized settings for containerized environments
- Rate limiting is implemented to avoid overwhelming target websites

## Troubleshooting

### Common Issues

1. **Puppeteer fails in Docker**: Ensure Chrome dependencies are installed (handled in Dockerfile)
2. **OpenAI API errors**: Check your API key and rate limits
3. **Timeout errors**: Increase `ANALYSIS_TIMEOUT_MINUTES` for complex websites
4. **Memory issues**: Adjust Docker memory limits in docker-compose.yml

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run start:dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the UNLICENSED license.
