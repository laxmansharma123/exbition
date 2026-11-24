
// ==================================================
// BANSSA WIRE INDUSTRIES
// OPENROUTER AI INQUIRY SCANNER
// ==================================================

const FIELD_KEYS = [
  "name",
  "company",
  "mobile",
  "email",
  "designation",
  "address",
  "product",
  "annualQuantity",
  "endUse",
  "presentSource",
  "diameter",
  "tensileRange",
  "surface",
  "packaging",
  "notes"
];

const MAX_FILE_SIZE = 12 * 1024 * 1024;

const API_ENDPOINT = "/api/scan-inquiry";

let scanQueue = Promise.resolve();

// ==================================================
// VALIDATE UPLOADED IMAGE
// ==================================================

function validateImage(file) {
  if (!file) {
    throw new Error(
      "Please select an inquiry image."
    );
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      "Please upload a JPG, PNG or WEBP image."
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      "Maximum image size is 12 MB."
    );
  }
}

// ==================================================
// NORMALIZE AI EXTRACTED FIELDS
// ==================================================

function normalizeFields(input) {
  const fields = {};

  for (const key of FIELD_KEYS) {
    const value = input?.[key];

    let text =
      typeof value === "string" ||
      typeof value === "number"
        ? String(value).trim()
        : "";

    if (
      /^(n\/?a|none|null|unknown|unreadable|blank|not visible|[-?]+)$/i.test(text)
    ) {
      text = "";
    }

    fields[key] = text;
  }

  return fields;
}

// ==================================================
// MAIN AI SCANNING FUNCTION
// ==================================================

async function performScan(file, onProgress) {
  validateImage(file);

  const startedAt = performance.now();

  const report = message => {
    if (typeof onProgress === "function") {
      onProgress(message);
    }
  };

  const formData = new FormData();

  formData.append("image", file);

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 135000);

  try {
    console.log("============================");

    console.log(
      "BANSSA OPENROUTER AI SCAN STARTED"
    );

    report("Preparing inquiry image...");

    report(
      "AI is reading visiting card and handwritten requirements..."
    );

    // Send image to secure local AI server.

    const response = await fetch(
      API_ENDPOINT,
      {
        method: "POST",
        body: formData,
        signal: controller.signal
      }
    );

    const data = await response
      .json()
      .catch(() => {
        throw new Error(
          "Invalid server response. Make sure server.mjs is running."
        );
      });

    // Handle API errors.

    if (
      !response.ok ||
      data.success !== true
    ) {
      throw new Error(
        data.error ||
        "Unable to scan inquiry image."
      );
    }

    if (
      !data.fields ||
      typeof data.fields !== "object" ||
      Array.isArray(data.fields)
    ) {
      throw new Error(
        "AI returned invalid inquiry details."
      );
    }

    report(
      "Processing extracted customer details..."
    );

    // Map extracted details to existing CRM fields.

    const fields = normalizeFields(
      data.fields
    );

    const filledCount = FIELD_KEYS.filter(
      key => Boolean(fields[key])
    ).length;

    const needsReview = Array.isArray(
      data.needsReview
    )
      ? data.needsReview.filter(
          key => FIELD_KEYS.includes(key)
        )
      : FIELD_KEYS.filter(
          key => key !== "notes"
        );

    const rawText = String(
      data.rawText || ""
    );

    const elapsed = (
      (performance.now() - startedAt) / 1000
    ).toFixed(1);

    console.log(
      "AI MODEL:",
      data.model || "OpenRouter"
    );

    console.log(
      "TOTAL FIELDS FILLED:",
      filledCount,
      "/ 15"
    );

    console.log(
      "SCAN TIME:",
      elapsed + " seconds"
    );

    console.log("============================");

    if (filledCount === 0) {
      report(
        "No readable details found. Please enter manually."
      );
    } else {
      report(
        `AI scan complete: ${filledCount}/15 fields captured. Please verify.`
      );
    }

    // Return data in existing App.jsx format.

    return {
      success: true,

      fields,

      needsReview,

      filledCount,

      rawText,

      text: rawText,

      model: data.model || "",

      engine: "OpenRouter Vision AI"
    };

  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "AI scan timed out. Please try again."
      );
    }

    if (error.message === "Failed to fetch") {
      throw new Error(
        "Cannot connect to AI server. Run node server.mjs."
      );
    }

    console.error(
      "INQUIRY SCAN FAILED:",
      error.message
    );

    throw error;

  } finally {
    clearTimeout(timeout);
  }
}

// ==================================================
// SCAN QUEUE
// Prevent simultaneous inquiry requests
// ==================================================

export function scanInquiryAI(file, onProgress) {
  const job = scanQueue
    .catch(() => {})
    .then(() =>
      performScan(file, onProgress)
    );

  scanQueue = job.catch(() => {});

  return job;
}

// ==================================================
// EXISTING APP.JSX COMPATIBLE EXPORTS
// ==================================================

export const scanInquiry = scanInquiryAI;

export default scanInquiryAI;
