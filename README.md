# BioTransport Anemia Screening

Next.js web app for AI-powered anemia risk screening from a clear eye or inner eyelid photo.

## Getting Started

Install dependencies if needed:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Prediction API

The app posts uploaded images to `app/api/predict/route.ts`. Set an anemia model endpoint before using live predictions:

```bash
ANEMIA_PREDICTION_ENDPOINT=https://your-endpoint.example/predict
```

If the endpoint is not configured, the UI still builds and loads, but live prediction requests return a configuration error.
