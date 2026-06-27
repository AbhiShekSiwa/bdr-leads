# BDR Lead Researcher

Sponsorship lead research tool for Big Dumb Rockets @ CU Boulder.
Searches the web, generates AI briefs, and pulls email patterns — all free tier APIs.

## APIs used (all free tier)
| API | What it does | Free limit |
|-----|-------------|------------|
| [Serper.dev](https://serper.dev) | Google search results | 2,500 searches/mo |
| [Groq](https://console.groq.com) | AI summarization (Llama 3.3 70B) | ~14,400 req/day |
| [Hunter.io](https://hunter.io) | Email pattern lookup | 25 searches/mo |

## Deploy to Vercel

### 1. Get your API keys
- **Serper**: https://serper.dev → sign up → Dashboard → API Key
- **Groq**: https://console.groq.com → sign up → API Keys → Create
- **Hunter.io**: https://hunter.io → sign up → Dashboard → API Key

### 2. Push to GitHub
```bash
cd bdr-leads
git init
git add .
git commit -m "init"
gh repo create bdr-leads --public --push
```

### 3. Deploy on Vercel
```bash
npm i -g vercel
vercel
```
Or go to vercel.com → New Project → import your GitHub repo.

### 4. Add environment variables
In Vercel → Project → Settings → Environment Variables, add:
```
SERPER_API_KEY   = your key
GROQ_API_KEY     = your key  
HUNTER_API_KEY   = your key
```
Then redeploy.

## Local dev
```bash
cp .env.example .env.local
# fill in your keys
vercel dev
```

## How to use

### Single lead
Fill in company name + any info you have → click Research.
Domain field helps Hunter.io find the email pattern faster (e.g. `agilespace.com`).

### Batch import
Paste companies one per line. Optional CSV format:
```
Company Name
Company Name, domain.com
Company Name, domain.com, POC Name, POC Role
```

### Export
Click "Download CSV" to get all researched leads as a spreadsheet — paste into your existing tracker.

## Hunter.io email pattern
The tool fetches ONE email pattern per company (e.g. `first.last@company.com`).
Use that pattern to construct emails for other contacts you find at that company.
This keeps your 25 free monthly searches spread across 25 different companies.
