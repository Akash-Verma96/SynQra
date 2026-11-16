# SynQra

**One Knowledge Hub. Multiple Sources. Intelligent Answers.**

SynQra is a multi-source Retrieval-Augmented Generation (RAG) workspace. It lets you bring information from documents, websites, YouTube videos, and text into one place, then ask questions and get answers grounded in the content you have indexed.

<p align="center">
  <a href="https://synqra-pearl.vercel.app/"><strong>🚀 Try the Live Demo</strong></a>
</p>

---

## What SynQra does

Instead of opening several files and searching through them one by one, SynQra turns supported content into searchable knowledge. Add a source, let the background workers process it, and ask questions in natural language.

### Key features

- **Google sign-in** — authenticate with your Google account.
- **Multiple source types** — add PDF and DOCX files, website URLs, YouTube URLs, or text snippets.
- **Cloud-based file upload** — files are uploaded directly to Cloudinary using a server-generated signature.
- **Website crawling** — crawl a website and extract page content as Markdown through Firecrawl.
- **YouTube transcripts** — retrieve available English captions and use the transcript as searchable content.
- **Background processing** — BullMQ and Redis handle crawling, transcript retrieval, indexing, and query jobs asynchronously.
- **Semantic search** — convert text chunks into embeddings and store them in Qdrant.
- **User-scoped retrieval** — indexed chunks carry a `metadata.user_id` value, and retrieval filters on the authenticated user's ID.
- **Query enhancement** — expand a question with rewriting, step-back prompting, sub-questions, and Hypothetical Document Embeddings (HyDE).
- **Context-grounded answers** — combine and rank retrieved passages before asking the language model to answer from that context.
- **Progress feedback** — the interface polls background job status and displays indexing or processing states.
- **Conversation context** — previous messages can be passed along with a new question.

> **Current implementation note:** The backend retrieves against the authenticated user's indexed content. The selected source in the interface controls the workspace view and whether querying is enabled, but the current retrieval request is filtered by user ID rather than by an individual source ID. The source list is held in frontend state; the current Prisma schema persists users, linked Google accounts, and sessions, not a separate source-library record.

---

## How it works

At a high level, SynQra has two main workflows:

1. **Ingestion:** content is collected, converted into LangChain documents, split into smaller chunks, embedded, and stored in Qdrant.
2. **Question answering:** a user's question is expanded into several search queries, relevant chunks are retrieved and ranked, and an LLM generates an answer using the selected context.

### RAG pipeline

```mermaid
flowchart TD
    A["User adds a source"] --> B{"Source type"}
    B --> C["PDF / DOCX upload"]
    B --> D["Website URL"]
    B --> E["YouTube URL"]
    B --> F["Text snippet"]

    C --> G["Signed upload to Cloudinary"]
    G --> H["Cloudinary indexing job"]
    D --> I["BullMQ crawl queue"]
    E --> J["BullMQ transcript queue"]
    F --> K["Create LangChain Document"]

    I --> L["Firecrawl extracts page Markdown"]
    L --> M["Create website Markdown file"]
    M --> N["Index queue"]
    J --> O["Fetch English captions"]
    O --> P["Create transcript Document"]
    P --> Q["Index queue"]
    H --> R["Index worker"]
    N --> R
    K --> S["Index documents"]
    Q --> S
    R --> T["Download and load source"]
    T --> S

    S --> U["Split into chunks"]
    U --> V["Generate embeddings"]
    V --> W[("Qdrant vector collection")]

    X["User asks a question"] --> Y["Query queue"]
    Y --> Z["Query worker"]
    Z --> AA["Rewrite + step-back + 3 sub-queries + HyDE"]
    AA --> AB["Semantic retrieval for the user"]
    W --> AB
    AB --> AC["Reciprocal Rank Fusion (RRF)"]
    AC --> AD["Top 3 passages"]
    AD --> AE["Groq-hosted chat model"]
    AE --> AF["Grounded answer returned to the UI"]
```

### Ingestion flow

1. **Add content:** choose a supported source type in the workspace.
2. **Upload or collect content:**
   - Files are uploaded directly to Cloudinary after the backend returns signed upload parameters.
   - Website URLs are sent to a crawl queue. Firecrawl extracts page content in Markdown.
   - YouTube URLs are sent to a transcript queue. The worker fetches available English captions.
   - Text snippets are wrapped directly in LangChain `Document` objects.
3. **Queue the work:** BullMQ stores the asynchronous jobs in Redis.
4. **Load the content:** the worker downloads Cloudinary files when needed and uses the appropriate loader to create LangChain documents.
5. **Split into chunks:** `RecursiveCharacterTextSplitter` uses a chunk size of **1,000 characters** and an overlap of **150 characters**.
6. **Embed and index:** Hugging Face Transformers embeddings (`Xenova/all-MiniLM-L6-v2`) are generated and stored in the configured Qdrant collection in batches of 32.
7. **Track progress:** the frontend polls the relevant job endpoint until the job completes or fails.

### Question-answering flow

1. The frontend submits the question and available conversation history.
2. The query is added to the BullMQ query queue.
3. The query worker generates search variants:
   - the original question;
   - a rewritten, self-contained question;
   - a broader step-back question;
   - three focused sub-questions;
   - a HyDE passage (a hypothetical answer-like document used to improve retrieval).
4. Each variant is used for semantic retrieval from Qdrant, with a `metadata.user_id` filter.
5. Reciprocal Rank Fusion (RRF) combines the ranked result lists and selects the **top 3** passages.
6. The passages and question are sent to the configured Groq chat model. The system prompt instructs the model to answer from the supplied context and state when the context is insufficient.
7. The frontend polls the query job and displays the completed answer.

---

## Architecture

SynQra is split into a React frontend and an Express backend, with separate infrastructure services for relational data, vector search, and background jobs.

```mermaid
flowchart LR
    U["User / Browser"] --> FE["React 19 + Vite frontend"]
    FE -->|"REST API + session cookie"| API["Express 5 API"]

    API --> AUTH["Google OAuth + session services"]
    AUTH --> PG[("PostgreSQL\nPrisma 7")]

    API --> Q["BullMQ queues"]
    Q <--> R[("Redis")]
    Q --> IW["Index / crawl / YouTube / query workers"]

    IW --> LOAD["LangChain document loaders"]
    LOAD --> SPLIT["Text splitter"]
    SPLIT --> EMB["Hugging Face embeddings"]
    EMB --> VDB[("Qdrant vector database")]

    IW --> FC["Firecrawl"]
    IW --> YT["YouTube transcript fetcher"]
    API --> CL["Cloudinary"]
    IW --> CL

    IW --> LLM["Groq API\nOpenAI-compatible client"]
    VDB --> IW
    IW --> API
    API --> FE
```

### Main components

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4 | Workspace, sign-in, source input, job status, and chat UI |
| API | Node.js, Express 5 | REST endpoints, authentication checks, uploads, and job creation |
| Authentication | Google OAuth, HTTP-only cookies | Google sign-in and session-based access |
| Relational database | PostgreSQL, Prisma 7 | User accounts, Google auth accounts, and sessions |
| Job processing | BullMQ, Redis | Queueing and processing ingestion and query tasks |
| Document processing | LangChain loaders and text splitters | Convert source content into documents and chunks |
| Embeddings | Hugging Face Transformers | Generate vector embeddings with `Xenova/all-MiniLM-L6-v2` |
| Vector database | Qdrant | Store and retrieve embedded document chunks |
| File storage | Cloudinary | Store uploaded files before backend indexing |
| Website extraction | Firecrawl | Crawl websites and extract Markdown |
| LLM | Groq API | Query rewriting, HyDE generation, and final answers |

---

## Supported sources

| Source | Current path |
|---|---|
| PDF | Upload to Cloudinary, download in the worker, parse with LangChain `PDFLoader` |
| DOCX | Upload to Cloudinary, download in the worker, extract text with Mammoth |
| Website URL | Firecrawl crawl → Markdown file → indexing queue |
| YouTube URL | Fetch English captions → LangChain document → indexing |
| Text snippet | Create a LangChain document directly and index it |

**Format note:** The universal file loader currently handles `.pdf`, `.docx`, `.md`, and `.txt`. The workspace exposes PDF and DOCX file selection, website URLs, YouTube URLs, and text snippets. Although the backend upload filter accepts some additional MIME types, that does not mean every such format has a working document loader. Image, spreadsheet, and presentation content should not be considered supported end-to-end in this version.

---

## Repository structure

```text
SynQra/
├── Backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/          # Environment, OAuth, Redis, and Qdrant setup
│   │   ├── controllers/     # Authentication controllers
│   │   ├── lib/             # Prisma client
│   │   ├── loaders/         # PDF, DOCX, text, and website loaders
│   │   ├── middleware/      # Session authentication
│   │   ├── producers/       # BullMQ job producers
│   │   ├── queues/          # Index, crawl, YouTube, and query queues
│   │   ├── routers/         # API and authentication routes
│   │   ├── services/        # Auth, indexing, RAG, query, and ranking logic
│   │   ├── utils/           # Crawling, transcript, session, and upload helpers
│   │   ├── workers/         # Background job workers
│   │   └── server.js
│   ├── docker-compose.yml
│   ├── package.json
│   └── prisma7.config.ts
│
├── Frontend/
│   ├── src/
│   │   ├── components/ui/
│   │   ├── config/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## Getting started locally

### Prerequisites

Make sure you have the following installed or available:

- Node.js (use a version compatible with the dependencies in the lockfiles)
- npm
- Docker Desktop / Docker Engine with Docker Compose
- A PostgreSQL database
- A Qdrant collection
- A Redis instance
- API credentials for Google OAuth, Cloudinary, Firecrawl, and Groq

You can run PostgreSQL, Redis, and Qdrant locally with the supplied Docker Compose file. The backend can also be configured to use hosted services.

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd SynQra
```

### 2. Start local infrastructure

From the `Backend` directory:

```bash
cd Backend
```

Create a `.env` file in `Backend/` with the PostgreSQL password used by Docker Compose:

```env
POSTGRES_PASSWORD=change_me
```

Start the infrastructure:

```bash
docker compose up -d
```

This starts:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Qdrant on `localhost:6333` (HTTP) and `localhost:6334` (gRPC)

The Compose file creates the database `synqra_db` with the user `synqra`.

### 3. Configure backend environment variables

Create `Backend/.env` (or the environment-specific file selected by `APP_ENV`) and provide the required values.

```env
APP_ENV=local
PORT=3001

# PostgreSQL
DATABASE_URL=postgresql://synqra:change_me@localhost:5432/synqra_db
DIRECT_URL=postgresql://synqra:change_me@localhost:5432/synqra_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Qdrant
QDRANT_CLUSTER_END_POINT=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=synqra_documents

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/google/callback

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Firecrawl
FIRECRAWL_API_KEY=

# Groq
GROQ_API_KEY=

# Optional URL overrides
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173

# Optional cookie settings
SESSION_COOKIE_SAME_SITE=lax
SESSION_COOKIE_SECURE=false
```

Use your own credentials. Do not commit `.env` files or expose API secrets in the frontend.

**Database configuration detail:** The runtime Prisma client reads `DATABASE_URL`. The checked-in `prisma7.config.ts` uses `DIRECT_URL` for Prisma CLI datasource configuration, so provide both when running local database commands.

### 4. Prepare PostgreSQL and Qdrant

Install backend dependencies:

```bash
npm install
```

Generate the Prisma client and apply the checked-in migrations using the Prisma 7 config:

```bash
npx prisma generate --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts
```

Create the configured Qdrant collection before running the Qdrant payload-index migration. The migration script adds the `metadata.user_id` keyword payload index:

```bash
npm run migrate:qdrant
```

The collection name must match `QDRANT_COLLECTION`.

### 5. Run the backend

From `Backend/`:

```bash
npm run dev
```

The API runs on `http://localhost:3001` by default. The root endpoint (`/`) returns a basic status response, and `/api/v1/health` provides the API health check.

### 6. Configure and run the frontend

Open another terminal:

```bash
cd Frontend
npm install
```

The frontend defaults to the local backend when running in Vite development mode. You can override it with:

```env
VITE_APP_ENV=local
VITE_BACKEND_URL=http://localhost:3001
```

Start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite (typically `http://localhost:5173`).

### Google OAuth callback

For local sign-in, add this exact callback URL to the authorized redirect URIs in your Google Cloud OAuth client:

```text
http://localhost:3001/api/v1/google/callback
```

For the deployed app, the backend callback URL must match the production callback configured in Google Cloud. The production frontend and backend URLs are configured in the project as:

- Frontend: `https://synqra-pearl.vercel.app`
- Backend: `https://synqra-rai9.onrender.com`

---

## API overview

All API routes are mounted under `/api/v1`. Routes marked **authenticated** require a valid SynQra session cookie.

| Method | Endpoint | Auth | Purpose |
|---|---|---:|---|
| GET | `/google` | No | Start Google OAuth |
| GET | `/google/callback` | OAuth flow | Handle Google's OAuth callback |
| GET | `/me` | Yes | Return the current user |
| POST | `/logout` | No session required to call | Revoke the current session and clear the cookie |
| GET | `/health` | No | API health check |
| POST | `/cloudinary/signature` | Yes | Generate signed Cloudinary upload parameters |
| POST | `/index/cloudinary` | Yes | Queue a Cloudinary asset for indexing |
| GET | `/index/:id` | No route-level auth | Check an indexing job |
| POST | `/url` | Yes | Queue a website/YouTube source or index a text snippet |
| GET | `/crawl/:id` | No route-level auth | Check a website crawl job |
| GET | `/youtube/:id` | No route-level auth | Check a YouTube transcript job |
| POST | `/query` | Yes | Queue a RAG query |
| GET | `/query/:id` | No route-level auth | Check a query job and retrieve its result |

The job-status endpoints are listed as implemented in the router; they do not currently apply the `requireAuth` middleware themselves. Avoid exposing job IDs publicly.

---

## Environment variables

| Variable | Used for |
|---|---|
| `APP_ENV` | Selects `local` or `production` backend configuration |
| `PORT` | Backend HTTP port |
| `DATABASE_URL` | Runtime PostgreSQL connection |
| `DIRECT_URL` | Prisma CLI datasource URL in `prisma7.config.ts` |
| `REDIS_HOST`, `REDIS_PORT` | Redis connection used by BullMQ |
| `QDRANT_CLUSTER_END_POINT` | Qdrant endpoint |
| `QDRANT_API_KEY` | Qdrant API key (if required) |
| `QDRANT_COLLECTION` | Qdrant collection name |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Signed Cloudinary uploads |
| `FIRECRAWL_API_KEY` | Website crawling |
| `GROQ_API_KEY` | Groq chat completions |
| `BACKEND_URL`, `FRONTEND_URL` | Optional deployed/local URL overrides |
| `SESSION_COOKIE_SAME_SITE`, `SESSION_COOKIE_SECURE` | Optional session cookie settings |
| `VITE_APP_ENV` | Frontend environment selection |
| `VITE_BACKEND_URL` | Optional frontend API base override |

---

## Deployment

The checked-in frontend configuration points to the deployed services by default when production mode is selected:

- **Frontend:** [https://synqra-pearl.vercel.app/](https://synqra-pearl.vercel.app/)
- **Backend:** [https://synqra-rai9.onrender.com/](https://synqra-rai9.onrender.com/)

For a deployment, configure the backend environment variables in the hosting provider and set the frontend's `VITE_APP_ENV` to `production`. If the backend URL changes, set `VITE_BACKEND_URL` to the new backend origin. Make sure the backend's `FRONTEND_URL`, Google OAuth callback URL, CORS origin, and cookie settings match the deployed domains.

---

## Important implementation details

- **Chunking:** 1,000-character chunks with 150-character overlap.
- **Embedding model:** `Xenova/all-MiniLM-L6-v2`, loaded through LangChain's Hugging Face Transformers integration.
- **Index batch size:** 32 documents per batch.
- **Retrieval:** up to 5 results per query variant.
- **Ranking:** Reciprocal Rank Fusion, returning the top 3 passages.
- **User isolation:** each indexed document is tagged with `metadata.user_id`; the Qdrant retriever filters on that payload.
- **Answer generation:** uses the Groq API through the OpenAI-compatible SDK client. The configured model identifier is `openai/gpt-oss-20b`.
- **Sessions:** Google OAuth sign-in creates an HTTP-only session cookie. Session tokens are stored in PostgreSQL as SHA-256 hashes and expire after 7 days.

---

## Current scope and limitations

This README describes the implementation present in this repository, not a roadmap or a claim that every UI element is already powered by a backend feature.

- Audio overview, video overview, mind maps, flashcards, and quiz tabs are shown as disabled/coming-soon UI elements.
- The Summary and AI notes panels currently contain static interface content; they are not separate generated-insight APIs.
- The frontend source list is maintained in React state and is not restored from a persisted source-library endpoint.
- Query retrieval is scoped to the authenticated user, not to the source currently selected in the sidebar.
- The universal loader currently supports PDF, DOCX, Markdown, and plain text files. Other upload MIME types accepted by the upload filter are not necessarily parseable by the loader.
- YouTube transcript retrieval depends on captions being available and accessible from the backend environment.

---

## Contributing

Contributions are welcome. A practical way to get started:

1. Fork the repository.
2. Create a branch for your change.
3. Keep changes focused and add tests where appropriate.
4. Run the frontend build and check the backend locally.
5. Open a pull request with a clear description of the change.

---

## License

