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

The app posts uploaded images to `app/api/predict/route.ts`. It defaults to the production anemia prediction endpoint:

```bash
https://qk6k15dt70.execute-api.us-east-1.amazonaws.com/prod/predict
```

Set `ANEMIA_PREDICTION_ENDPOINT` to override the endpoint locally.
