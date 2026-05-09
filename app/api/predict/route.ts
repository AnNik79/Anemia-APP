const PREDICTION_ENDPOINT =
  process.env.ANEMIA_PREDICTION_ENDPOINT?.trim() ||
  "https://qk6k15dt70.execute-api.us-east-1.amazonaws.com/prod/predict";

export const runtime = "nodejs";

function createJsonResponse(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function extractStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonString(value: string) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return value;
  }
}

function unwrapApiGatewayBody(responseBody: unknown) {
  if (isRecord(responseBody) && typeof responseBody.body === "string") {
    return parseJsonString(responseBody.body);
  }

  return responseBody;
}

function findFirstValue(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    if (key in record) return record[key];
  }

  return undefined;
}

function normalizePredictionValue(value: unknown) {
  if (typeof value === "number") {
    if (value === 1) return { prediction: 1 as const, label: "Anemic" };
    if (value === 0) return { prediction: 0 as const, label: "Non-anemic" };
  }

  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");

  if (
    normalized === "0" ||
    normalized === "false" ||
    normalized === "negative" ||
    normalized === "normal" ||
    normalized.includes("non-anemic") ||
    normalized.includes("non anemic") ||
    normalized.includes("nonanemic") ||
    normalized.includes("not anemic")
  ) {
    return { prediction: 0 as const, label: "Non-anemic" };
  }

  if (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "positive" ||
    normalized.includes("anemic")
  ) {
    return { prediction: 1 as const, label: "Anemic" };
  }

  return null;
}

function normalizeConfidenceValue(value: unknown) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace("%", "").trim())
        : NaN;

  if (!Number.isFinite(numeric)) return null;

  const normalized = numeric > 1 ? numeric / 100 : numeric;

  return Math.min(1, Math.max(0, normalized));
}

function extractPredictionFields(responseBody: unknown) {
  const body = unwrapApiGatewayBody(responseBody);
  const records: JsonRecord[] = [];

  if (isRecord(body)) {
    if (isRecord(body.prediction)) records.push(body.prediction);
    if (isRecord(body.result)) records.push(body.result);
    records.push(body);
  }

  let rawPrediction: unknown;
  let rawConfidence: unknown;

  for (const record of records) {
    rawPrediction ??= findFirstValue(record, [
      "prediction",
      "predicted_class",
      "predictedClass",
      "classification",
      "label",
      "class",
      "result",
    ]);
    rawConfidence ??= findFirstValue(record, [
      "confidence",
      "confidence_score",
      "confidence score",
      "confidenceScore",
      "score",
      "probability",
    ]);
  }

  return {
    prediction: normalizePredictionValue(rawPrediction),
    confidence: normalizeConfidenceValue(rawConfidence),
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File) || image.size === 0) {
      return createJsonResponse({ error: "Please upload an eye or eyelid image." }, 400);
    }

    const whichEye = extractStringValue(formData, "which_eye");
    const sex = extractStringValue(formData, "sex");
    const ageValue = extractStringValue(formData, "age");
    const healthNotes = extractStringValue(formData, "health_notes") || "none";

    if (whichEye !== "left" && whichEye !== "right") {
      return createJsonResponse({ error: "Which eye must be left or right." }, 400);
    }

    if (!["M", "F", "O"].includes(sex)) {
      return createJsonResponse({ error: "Sex must be Male, Female, or Other." }, 400);
    }

    const age = Number(ageValue);

    if (!Number.isFinite(age) || age <= 0) {
      return createJsonResponse({ error: "Age must be a valid number." }, 400);
    }

    if (!PREDICTION_ENDPOINT) {
      return createJsonResponse(
        {
          error: "Anemia prediction endpoint is not configured.",
        },
        503,
      );
    }

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const payload = {
      image: imageBuffer.toString("base64"),
      which_eye: whichEye,
      sex,
      age,
      health_notes: healthNotes,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const upstreamResponse = await fetch(PREDICTION_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: controller.signal,
      });

      const responseText = await upstreamResponse.text();
      let responseBody: unknown = responseText;

      try {
        responseBody = responseText ? JSON.parse(responseText) : null;
      } catch {
        responseBody = responseText;
      }

      if (!upstreamResponse.ok) {
        return createJsonResponse(
          {
            error: "The anemia prediction endpoint returned an error.",
            status: upstreamResponse.status,
            details: responseBody,
          },
          upstreamResponse.status,
        );
      }

      const normalizedResult = extractPredictionFields(responseBody);

      if (!normalizedResult.prediction || normalizedResult.confidence === null) {
        return createJsonResponse(
          {
            error: "The anemia prediction endpoint returned an unexpected response.",
            details: responseBody,
          },
          502,
        );
      }

      return createJsonResponse(
        {
          prediction: normalizedResult.prediction.prediction,
          prediction_label: normalizedResult.prediction.label,
          confidence: normalizedResult.confidence,
          message:
            normalizedResult.prediction.prediction === 1
              ? "Anemia risk indicators detected."
              : "No anemia risk indicators detected.",
          metadata: {
            which_eye: whichEye,
            sex,
            age,
            health_notes: healthNotes,
            image_size_bytes: imageBuffer.length,
          },
        },
        upstreamResponse.status,
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return createJsonResponse(
          {
            error: "Request timed out. The prediction service may need more time. Try again.",
          },
          504,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return createJsonResponse(
      {
        error: "Unable to process the screening request right now.",
      },
      500,
    );
  }
}
