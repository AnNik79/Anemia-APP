const PREDICTION_ENDPOINT = process.env.ANEMIA_PREDICTION_ENDPOINT ?? "";

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

      return createJsonResponse(responseBody, upstreamResponse.status);
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
