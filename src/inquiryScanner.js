
// ==================================================
// BANSSA WIRE INDUSTRIES
// LOCAL + VERCEL CLOUD AI INQUIRY SCANNER
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

const API_ENDPOINT = "/api/scan-inquiry";

const MAX_UPLOAD_SIZE = 3.5 * 1024 * 1024;

const MAX_INPUT_SIZE = 30 * 1024 * 1024;

let scanQueue = Promise.resolve();

// ==================================================
// IMAGE VALIDATION
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

  if (file.size > MAX_INPUT_SIZE) {
    throw new Error(
      "Maximum original image size is 30 MB."
    );
  }
}

// ==================================================
// LOAD IMAGE
// ==================================================

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);

    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);

      reject(
        new Error("Unable to read inquiry image.")
      );
    };

    image.src = url;
  });
}

// ==================================================
// CONVERT CANVAS TO JPEG
// ==================================================

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(
            new Error("Image compression failed.")
          );
        }
      },
      "image/jpeg",
      quality
    );
  });
}

// ==================================================
// SMART IMAGE COMPRESSION
// ==================================================

async function compressImage(file) {
  // Preserve original image when already small enough.

  if (file.size <= MAX_UPLOAD_SIZE) {
    return file;
  }

  const image = await loadImage(file);

  const canvas = document.createElement("canvas");

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Image processing is not supported."
    );
  }

  const originalWidth = image.naturalWidth;
  const originalHeight = image.naturalHeight;

  const maxDimension = 2400;

  const initialScale = Math.min(
    1,
    maxDimension /
      Math.max(originalWidth, originalHeight)
  );

  let width = Math.max(
    1,
    Math.round(originalWidth * initialScale)
  );

  let height = Math.max(
    1,
    Math.round(originalHeight * initialScale)
  );

  let quality = 0.94;

  for (let attempt = 0; attempt < 12; attempt++) {
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
      0,
      0,
      width,
      height
    );

    ctx.imageSmoothingEnabled = true;

    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      0,
      0,
      width,
      height
    );

    const blob = await canvasToBlob(
      canvas,
      quality
    );

    if (blob.size <= MAX_UPLOAD_SIZE) {
      console.log(
        "ORIGINAL IMAGE:",
        (file.size / 1024 / 1024).toFixed(2),
        "MB"
      );

      console.log(
        "COMPRESSED IMAGE:",
        (blob.size / 1024 / 1024).toFixed(2),
        "MB"
      );

      return new File(
        [blob],
        file.name.replace(/\.[^.]+$/, "") +
          "-compressed.jpg",
        {
          type: "image/jpeg",
          lastModified: Date.now()
        }
      );
    }

    if (quality > 0.75) {
      quality -= 0.07;
    } else {
      width = Math.max(
        1,
        Math.round(width * 0.85)
      );

      height = Math.max(
        1,
        Math.round(height * 0.85)
      );

      quality = 0.90;
    }
  }

  throw new Error(
    "Image is too large. Please upload a smaller image."
  );
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

  report("Preparing inquiry image...");

  const processedFile = await compressImage(file);

  const formData = new FormData();

  formData.append(
    "image",
    processedFile
  );

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    135000
  );

  try {
    console.log("============================");

    console.log(
      "BANSSA OPENROUTER AI SCAN STARTED"
    );

    report(
      "AI is reading visiting card and handwritten requirements..."
    );

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
      .catch(() => null);

    if (response.status === 413) {
      throw new Error(
        "Image is too large. Please upload a smaller image."
      );
    }

    if (!data) {
      throw new Error(
        "Invalid AI server response."
      );
    }

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
      : [...FIELD_KEYS];

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
        "Cannot connect to AI server. Please check your connection."
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
