# 📈 Market Bot: An AI Chatbot for the Nairobi Securities Exchange

**Market Bot** is an AI-powered chatbot that answers questions about the Nairobi Securities Exchange (NSE). It's built on the Vercel AI Chatbot template and uses a Retrieval-Augmented Generation (RAG) system to provide answers based *only* on the official NSE website.

This project is designed to be highly cost-effective by using a free, local embedding model and a serverless database, minimizing API costs.

## ✨ Features

* **AI-Powered Q&A:** Ask questions about the NSE in natural language.
* **Retrieval-Augmented Generation (RAG):** The bot fetches relevant information from a vector database (populated by the NSE website) to provide accurate, grounded answers.
* **100% Free Embeddings:** Uses a local model (`Xenova/all-MiniLM-L6-v2`) for vector embeddings, completely avoiding OpenAI's embedding API costs.
* **Modern Tech Stack:** Built with Next.js 15 (App Router), Vercel AI SDK, and Drizzle ORM.
* **Serverless Database:** Uses Neon as a serverless Postgres database with `pgvector` for vector storage and search.
* **Data Scraper Included:** Comes with a Python data pipeline to scrape and embed the knowledge base from any website.

## 🛠️ Tech Stack

* **Framework:** Next.js 15 (App Router)
* **AI SDK:** Vercel AI SDK
* **Chat LLM:** OpenAI (GPT-4o, GPT-3.5-Turbo)
* **Embedding Model (Vectorization):** `Xenova/all-MiniLM-L6-v2`
* **Database:** [Neon](https://neon.tech/) (Serverless Postgres)
* **Vector Extension:** `pgvector`
* **ORM:** Drizzle ORM
* **UI:** Tailwind CSS, shadcn/ui

---

## 🚀 How It Works: The RAG Pipeline

This project is split into two parts: the `nse-data-pipeline` (which you run once) and the `market-bot` (the app itself).

1.  **Data Ingestion (One-Time):**
    * The `nse-data-pipeline/scrape.py` script crawls the `nse.co.ke` sitemap and scrapes all text from informational pages, saving it to `nse_knowledge_base.txt`.

2.  **Embedding (One-Time):**
    * The `nse-data-pipeline/embed.py` script reads the `.txt` file, splits it into chunks, and uses the `sentence-transformers` library (`all-MiniLM-L6-v2`) to turn each chunk into a 384-dimension vector.

3.  **Storage (One-Time):**
    * These vectors and their corresponding text are uploaded to the `nse_knowledge` table in your Neon Postgres database.

4.  **User Query (Real-Time):**
    * A user asks a question in the `market-bot` web app.

5.  **Vector Search (Real-Time):**
    * The Next.js API route (`/app/(chat)/api/chat/route.ts`) gets the message.
    * It uses `@xenova/transformers` to embed the user's question into a 384-dimension vector *on the server*. (This is the "cold boot" step).

6.  **Retrieval (Real-Time):**
    * The app queries the Neon database to find the text chunks with the most similar vectors to the user's question.

7.  **Generation (Real-Time):**
    * The retrieved text (context) and the user's original question are put into a system prompt and sent to the OpenAI API (GPT-4o).

8.  **Response (Real-Time):**
    * The AI's answer is streamed back to the user.

---

## ⚙️ How to Set Up and Run

Follow these steps to get the project running locally.

### Phase 1: `market-bot` (The Next.js App)

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/olukfidel/market-bot.git](https://github.com/olukfidel/market-bot.git)
    cd market-bot
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```
    *This template uses `pnpm`. If you don't have it: `npm install -g pnpm`*

3.  **Set up Neon Database:**
    * Go to [Neon](https://neon.tech/) and create a new free project.
    * In the **SQL Editor**, run this command to enable vector search:
        ```sql
        CREATE EXTENSION IF NOT EXISTS vector;
        ```

4.  **Set up Environment Variables:**
    * Copy the example file: `cp .env.example .env.local`
    * Edit `.env.local` with your keys:
        ```text
        # Get from your Neon dashboard
        DATABASE_URL="YOUR_NEON_DATABASE_CONNECTION_STRING"
        POSTGRES_URL="YOUR_NEON_DATABASE_CONNECTION_STRING" 
        
        # Get from your OpenAI account
        OPENAI_API_KEY="sk-YOUR_OPENAI_API_KEY"

        # Run `openssl rand -base64 32` to generate
        AUTH_SECRET="YOUR_GENERATED_AUTH_SECRET"
        AUTH_DRIZZLE_URL=$DATABASE_URL
        ```

5.  **Run Database Migrations:**
    * This command will read `lib/db/schema.ts` and create all the tables in your Neon DB.
    ```bash
    pnpm db:migrate
    ```

### Phase 2: `nse-data-pipeline` (The Knowledge Base)

This folder is included in the repo. You'll need Python 3.

1.  **Navigate to the pipeline:**
    ```bash
    cd ../nse-data-pipeline 
    ```

2.  **Create an environment file:**
    * Create a file named `.env` in this folder.
    * Add your database URL (the same one from before):
        ```text
        DATABASE_URL="YOUR_NEON_DATABASE_CONNECTION_STRING"
        ```

3.  **Install Python dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Step 1: Scrape the Website:**
    * This will create the `nse_knowledge_base.txt` file.
    ```bash
    python scrape.py
    ```

5.  **Step 2: Embed and Upload:**
    * This will read the `.txt` file, generate vectors, and upload them to your database. This will take a few minutes.
    ```bash
    python embed.py
    ```

### Phase 3: Run the App

You're all set! Go back to the app folder and start the server.

1.  **Navigate back to the app:**
    ```bash
    cd ../market-bot
    ```

2.  **Run the development server:**
    ```bash
    pnpm dev
    ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Important:** The **very first question** you ask will be slow (2-3 minutes). This is because your server is downloading the 300MB embedding model for the first time. After this one-time download, responses will be much faster.

---

## ☁️ Deploying to Vercel

You can deploy this project directly to Vercel.

1.  Push your project (the `market-bot` folder) to GitHub.
2.  Import the repository on Vercel.
3.  Go to **Project Settings > Environment Variables** and add all the variables from your `.env.local` file.
4.  Re-deploy.

### ⚠️ Cold Boot Warning
Because this project uses a free local embedding model (`@xenova/transformers`), Vercel's serverless functions will have a "cold boot."

**This means the first chat request after 15 minutes of inactivity will be slow (30-60 seconds)** while the server re-downloads and loads the 300MB model. Subsequent requests will be fast, until it goes to sleep again.

A future improvement would be to use a dedicated embedding API (like OpenAI's or a hosted model) to solve this.