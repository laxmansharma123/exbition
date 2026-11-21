
import { createWorker } from "tesseract.js";

// Reuse OCR worker for faster subsequent scans
let workerPromise = null;
let progressCallback = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("eng", 1, {
      logger: (message) => {
        if (
          message.status === "recognizing text" &&
          progressCallback
        ) {
          progressCallback(
            Math.round(message.progress * 100)
          );
        }
      },
    }).catch((error) => {
      workerPromise = null;
      throw error;
    });
  }

  return workerPromise;
}

// Improve image quality before OCR
async function prepareImage(file) {
  const url = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error("Invalid image. Use JPG or PNG."));

      img.src = url;
    });

    const maxSize = 2000;

    const scale = Math.min(
      1,
      maxSize / Math.max(image.width, image.height)
    );

    const canvas = document.createElement("canvas");

    canvas.width = Math.max(
      1,
      Math.round(image.width * scale)
    );

    canvas.height = Math.max(
      1,
      Math.round(image.height * scale)
    );

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Canvas is not supported.");
    }

    ctx.filter = "grayscale(1) contrast(1.4)";

    ctx.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Image processing failed."));
        },
        "image/png"
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Business card parsing rules
const COMPANY_WORDS =
  /\b(pvt|private|ltd|limited|llp|inc|industries|industry|enterprises?|corporation|corp|company|group|traders|trading|solutions|engineering|engineers|exports?|imports?|steels?|wires?|infra|constructions?|builders|associates|agency|agencies|works|mills|manufactur\w*|international|technologies|systems|fabricators?|hardware|metals?|projects|electricals|cables)\b/i;

const TITLE_WORDS =
  /\b(manager|director|ceo|cto|cfo|coo|founder|owner|proprietor|partner|engineer|executive|officer|head|president|chairman|sales|marketing|purchase|procurement|consultant|vp|gm|agm|dgm|md|supervisor|incharge|in-charge|representative|specialist|accountant|admin|business development)\b/i;

const ADDRESS_WORDS =
  /\b(road|rd\.?|street|st\.?|sector|plot|nagar|area|phase|industrial|estate|marg|lane|floor|building|bldg|near|opp\.?|block|colony|village|dist\.?|district|tower|complex|park|chowk|bazar|bazaar|pin)\b/i;

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Chandigarh",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
];

const FREE_MAIL = [
  "gmail.com",
  "yahoo.com",
  "yahoo.co.in",
  "hotmail.com",
  "outlook.com",
  "rediffmail.com",
  "live.com",
  "icloud.com",
  "ymail.com",
];

function titleCase(value) {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function extractPhones(text) {
  const found = [];

  const matches =
    text.match(/\+?\d[\d\s\-().]{7,}\d/g) || [];

  for (const raw of matches) {
    let digits = raw.replace(/\D/g, "");

    if (digits.length < 8 || digits.length > 13) {
      continue;
    }

    if (
      digits.length === 12 &&
      digits.startsWith("91")
    ) {
      digits = digits.slice(2);
    }

    if (
      digits.length === 11 &&
      digits.startsWith("0") &&
      /^[6-9]/.test(digits.slice(1))
    ) {
      digits = digits.slice(1);
    }

    if (!found.includes(digits)) {
      found.push(digits);
    }
  }

  const mobiles = found.filter((phone) =>
    /^[6-9]\d{9}$/.test(phone)
  );

  const others = found.filter(
    (phone) => !mobiles.includes(phone)
  );

  return [...mobiles, ...others];
}

// Extract details from OCR text
export function parseCardText(text) {
  const lines = text
    .split("\n")
    .map((line) =>
      line
        .replace(/[|_~`"“”©®™]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((line) => line.length > 1);

  const emails = [
    ...new Set(
      (
        text.match(
          /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
        ) || []
      ).map((email) => email.toLowerCase())
    ),
  ];

  const email = emails[0] || "";

  const phones = extractPhones(text);

  const textLine = (line) =>
    !/\d/.test(line) &&
    !line.includes("@") &&
    !/www\.|\.com|\.in\b/i.test(line);

  // Find designation
  const designationIndex = lines.findIndex(
    (line) =>
      textLine(line) &&
      TITLE_WORDS.test(line) &&
      line.split(" ").length <= 6
  );

  const designation =
    designationIndex >= 0
      ? titleCase(lines[designationIndex])
      : "";

  // Find company
  let company =
    lines.find(
      (line) =>
        textLine(line) &&
        COMPANY_WORDS.test(line) &&
        !TITLE_WORDS.test(line)
    ) || "";

  // Fallback: derive company from business email
  if (!company && email) {
    const domain = email.split("@")[1];

    if (domain && !FREE_MAIL.includes(domain)) {
      company = titleCase(domain.split(".")[0]);
    }
  }

  // Find name
  const looksLikeName = (line) =>
    textLine(line) &&
    /^[A-Za-z][A-Za-z.\s']+$/.test(line) &&
    line.split(" ").length >= 2 &&
    line.split(" ").length <= 4 &&
    line !== company &&
    !COMPANY_WORDS.test(line) &&
    !TITLE_WORDS.test(line) &&
    !ADDRESS_WORDS.test(line) &&
    !INDIAN_STATES.some(
      (state) =>
        state.toLowerCase() === line.toLowerCase()
    );

  let name = "";

  if (
    designationIndex > 0 &&
    looksLikeName(lines[designationIndex - 1])
  ) {
    name = lines[designationIndex - 1];
  } else if (
    designationIndex >= 0 &&
    designationIndex < lines.length - 1 &&
    looksLikeName(lines[designationIndex + 1])
  ) {
    name = lines[designationIndex + 1];
  } else {
    name = lines.find(looksLikeName) || "";
  }

  if (name && name === name.toUpperCase()) {
    name = titleCase(name);
  }

  if (company && company === company.toUpperCase()) {
    company = titleCase(company);
  }

  // Find address
  const address = lines
    .filter(
      (line) =>
        (
          ADDRESS_WORDS.test(line) ||
          /\b\d{6}\b/.test(line)
        ) &&
        !line.includes("@")
    )
    .join(", ");

  // Find website
  let website = "";

  for (const line of lines) {
    if (line.includes("@")) continue;

    const match = line.match(
      /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:com|in|co\.in|net|org|biz|info|co)\b/i
    );

    if (match) {
      website = match[0].toLowerCase();
      break;
    }
  }

  // Find state
  const state =
    INDIAN_STATES.find((item) =>
      text.toLowerCase().includes(item.toLowerCase())
    ) || "";

  const notes = [
    website ? `Website: ${website}` : "",
    state ? `State: ${state}` : "",
    phones.length > 1
      ? `Other phones: ${phones.slice(1).join(", ")}`
      : "",
    emails.length > 1
      ? `Other emails: ${emails.slice(1).join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    name,
    company,
    mobile: phones[0] || "",
    email,
    designation,
    address,
    notes,
  };
}

// Main scanning function
export async function scanCard(file, onProgress) {
  if (!file) {
    throw new Error("Please select a card image.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload a valid image.");
  }

  progressCallback = onProgress || null;

  try {
    const worker = await getWorker();

    const image = await prepareImage(file);

    const { data } = await worker.recognize(image);

    const text = data.text || "";

    return {
      text,
      fields: parseCardText(text),
    };
  } finally {
    progressCallback = null;
  }
}
