
import { useState, useRef, useEffect } from "react";
import { scanCard } from "./cardScanner";
import { scanInquiryAI } from "./inquiryScanner";

import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  LayoutDashboard, Camera, Users, ChartNoAxesColumnIncreasing,
  Download, Settings, Bell, ChevronDown, Menu, X, Layers, SkipForward, ArrowLeft, FileText, Trash2, Save,
  CalendarDays, Target, TrendingUp, ArrowRight, Upload,
  Factory, Search, Plus, CheckCircle2, UserRound
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell
} from "recharts";

const GOOGLE_SCRIPT_URL = "https://script.google.com/a/macros/bansalwire.com/s/AKfycbz2jgmhuf_6kyYcllSGPsQM1IoJPJVQE-udVSPoCC6E64wCDt2cRx7dFeo7qkIfloS3/exec";

const BANSAL_LOGO = "data:image/png;base64,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";

const NAVY = "#202124";
const GOLD = "#dc2626";

const initialLeads = [];



const menu = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Scan Card", icon: Camera },
  { name: "Bulk Cards", icon: Layers },
  { name: "Inquiries", icon: FileText },
  { name: "Leads", icon: Users },
  { name: "Analytics", icon: ChartNoAxesColumnIncreasing },
  { name: "Export", icon: Download },
  { name: "Settings", icon: Settings }
];

const emptyForm = {
  name: "", company: "", mobile: "", email: "",
  designation: "", address: "", notes: ""
};

function CardThumbnail({ file, index }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return src ? <img src={src} alt={`Card ${index + 1}`} className="h-24 w-full rounded object-contain bg-slate-50" /> : null;
}

function CardThumbnailLarge({ file }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return src ? <img src={src} alt="Inquiry form preview" className="max-h-[750px] w-full rounded-lg object-contain" /> : null;
}

function App() {
  const [page, setPage] = useState("Dashboard");
  const [inquiryQueue, setInquiryQueue] = useState([]);
  const inquiryQueueRef = useRef([]);
  const [inquiryIndex, setInquiryIndex] = useState(0);
  const inquiryIndexRef = useRef(0);
  const inquiryDraftsRef = useRef({});
  const [inquiryForm, setInquiryForm] = useState({});
  const [inquiryRaw, setInquiryRaw] = useState("");
  const [inquiryReview, setInquiryReview] = useState([]);
  const [inquiryBusy, setInquiryBusy] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquiryProgress, setInquiryProgress] = useState("");
  const inquiryImageInputRef = useRef(null);
  const inquiryPdfInputRef = useRef(null);
  const inquiryScanToken = useRef(0);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [leads, setLeads] = useState(() => {
    try { return JSON.parse(localStorage.getItem("banssa_crm_leads") || "[]"); }
    catch { return []; }
  });
  const [bulkQueue, setBulkQueue] = useState([]);
  const [bulkIndex, setBulkIndex] = useState(0);
  const bulkInputRef = useRef(null);
  const bulkQueueRef = useRef([]);
  const bulkIndexRef = useRef(0);
  const bulkDraftsRef = useRef({});
  const [bulkStatuses, setBulkStatuses] = useState({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const pdfInputRef = useRef(null);
  const [queueVersion, setQueueVersion] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [rawText, setRawText] = useState("");
  const scanIdRef = useRef(0);

  useEffect(() => {
    localStorage.setItem("banssa_crm_leads", JSON.stringify(leads));
  }, [leads]);

  const INQUIRY_FIELDS = [
    ["name", "Contact Person"], ["company", "Company Name"],
    ["mobile", "Phone No."], ["email", "E-mail"],
    ["designation", "Designation"], ["address", "Address"],
    ["product", "Product"], ["annualQuantity", "Annual Quantity"],
    ["endUse", "End Use"], ["presentSource", "Present Source"],
    ["diameter", "Diameter"], ["tensileRange", "Tensile Range"],
    ["surface", "Surface"], ["packaging", "Packaging"],
    ["notes", "Additional Notes"]
  ];
  const EMPTY_INQUIRY = Object.fromEntries(INQUIRY_FIELDS.map(([key]) => [key, ""]));

  // Printed visiting-card OCR is used for identity fields. Handwritten cells
  // are kept blank when confidence is insufficient rather than fabricated.
  const parseInquiryText = (text, cardFields = {}) => {
    const lines = text.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
    const readLabel = (pattern) => {
      const i = lines.findIndex(v => pattern.test(v));
      if (i < 0) return "";
      const value = lines[i].replace(/^.*?\s*:\s*/, "").trim();
      return value !== lines[i] && value.length > 1 ? value : "";
    };
    return {
      ...EMPTY_INQUIRY,
      ...Object.fromEntries(Object.keys(EMPTY_INQUIRY).filter(k => k in cardFields).map(k => [k, cardFields[k] || ""])),
      product: readLabel(/^\s*PRODUCT\s*:/i),
      annualQuantity: readLabel(/^\s*ANNUAL\s+QUANTITY\s*:/i),
      endUse: readLabel(/^\s*END\s+USE\s*:/i),
      presentSource: readLabel(/^\s*PRESENT\s+SOURCE\s*:/i),
      diameter: readLabel(/^\s*DIAMETER\s*:/i),
      tensileRange: readLabel(/^\s*TENSILE\s+RANGE\s*:/i),
      surface: readLabel(/^\s*SURFACE\s*:/i),
      packaging: readLabel(/^\s*PACKAGING\s*:/i),
    };
  };

  const scanInquiryAt = async (index, force = false) => {
    const file = inquiryQueueRef.current[index];
    if (!file) return;
    const token = ++inquiryScanToken.current;
    inquiryIndexRef.current = index;
    setInquiryIndex(index);
    const previous = inquiryDraftsRef.current[index];
    if (previous && !force) {
      setInquiryForm({ ...EMPTY_INQUIRY, ...previous.fields });
      setInquiryRaw(previous.text || "");
      setInquiryReview(previous.review || []);
      setInquiryMessage("Review details and handwritten fields before saving.");
      return;
    }
    setInquiryBusy(true);
    setInquiryProgress(`Scanning inquiry ${index + 1}...`);
    try {
      const result = await scanInquiryAI(file, progress => {
        if (token === inquiryScanToken.current) {
            setInquiryProgress(progress);
        }
    });
      if (token !== inquiryScanToken.current) return;
      const scannedFields = { ...EMPTY_INQUIRY, ...(result.fields || {}) };
      // During a forced rescan, keep manually entered values if OCR misses them.
      const fields = force && previous
        ? Object.fromEntries(Object.keys(EMPTY_INQUIRY).map(key => [
            key, String(previous.fields?.[key] || "").trim() || scannedFields[key] || ""
          ]))
        : scannedFields;
      const review = (result.needsReview || []).filter(key => !fields[key]);
      inquiryDraftsRef.current[index] = { fields, text: result.rawText || "", review };
      setInquiryForm(fields);
      setInquiryRaw(result.rawText || "");
      setInquiryReview(review);
      setInquiryMessage(review.length
        ? `OCR scan complete. Please verify: ${review.join(", ")}.`
        : "OCR scan complete. Review details before saving.");
    } catch (error) {
      if (token !== inquiryScanToken.current) return;
      // Keep existing data on OCR failure; do not cache an empty failed scan.
      if (previous) {
        setInquiryForm({ ...EMPTY_INQUIRY, ...previous.fields });
        setInquiryRaw(previous.text || "");
        setInquiryReview(previous.review || []);
      } else {
        setInquiryForm({ ...EMPTY_INQUIRY });
        setInquiryRaw("");
        setInquiryReview([]);
      }
      setInquiryMessage(`OCR failed: ${error.message}. Enter details manually.`);
    } finally {
      if (token === inquiryScanToken.current) {
        setInquiryBusy(false);
        setInquiryProgress("");
      }
    }
  };

  const addInquiryFiles = async (fileList, isPdf = false) => {
    const files = Array.from(fileList || []);
    if (!files.length || inquiryBusy) return;
    setInquiryBusy(true);
    try {
      const added = [];
      for (const file of files) {
        if (isPdf) {
          if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") continue;
          setInquiryProgress(`Rendering ${file.name}...`);
          added.push(...await pdfToCards(file));
        } else if (file.type.startsWith("image/") && file.size <= 10 * 1024 * 1024) {
          added.push(file);
        }
      }
      if (!added.length) throw new Error("No valid images or PDF pages found.");
      const oldLength = inquiryQueueRef.current.length;
      inquiryQueueRef.current = [...inquiryQueueRef.current, ...added];
      setInquiryQueue([...inquiryQueueRef.current]);
      setInquiryMessage(`${added.length} inquiry previews added. You can add more before saving.`);
      if (!oldLength) {
        // Avoid simultaneous OCR while importing.
        setInquiryBusy(false);
        await scanInquiryAt(0);
      }
    } catch (error) {
      setInquiryMessage(`Import failed: ${error.message}`);
    } finally {
      setInquiryBusy(false);
      setInquiryProgress("");
    }
  };

  const updateInquiryField = (key, value) => {
    const next = { ...inquiryForm, [key]: value };
    const updatedReview = inquiryReview.filter(field => field !== key);
    setInquiryReview(updatedReview);
    setInquiryForm(next);
    const index = inquiryIndexRef.current;
    inquiryDraftsRef.current[index] = {
      ...(inquiryDraftsRef.current[index] || {}),
      fields: next,
      review: updatedReview,
    };
  };

  const removeInquiryAt = async (index) => {
    const old = inquiryQueueRef.current;
    const remaining = old.filter((_, i) => i !== index);
    const drafts = {};
    old.forEach((_, i) => {
      if (i !== index && inquiryDraftsRef.current[i])
        drafts[i > index ? i - 1 : i] = inquiryDraftsRef.current[i];
    });
    inquiryDraftsRef.current = drafts;
    inquiryQueueRef.current = remaining;
    setInquiryQueue([...remaining]);
    if (remaining.length) {
      await scanInquiryAt(Math.min(index, remaining.length - 1));
    } else {
      ++inquiryScanToken.current;
      inquiryIndexRef.current = 0;
      setInquiryIndex(0);
      setInquiryForm({ ...EMPTY_INQUIRY });
      setInquiryRaw("");
      setInquiryReview([]);
      setInquiryReview([]);
    }
  };

  const submitInquiryData = async fields => {
    if (!String(fields.name || "").trim() && !String(fields.company || "").trim()) {
      throw new Error("Contact Person or Company Name is required.");
    }
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...fields, recordType: "inquiry", source: "Exhibition Inquiry" }),
    });
    setLeads(prev => [{ ...fields, source: "Exhibition Inquiry", id: Date.now() + Math.random(), syncStatus: "Unverified" }, ...prev]);
  };

  const saveInquiryAndNext = async e => {
    e.preventDefault();
    if (inquiryBusy || !inquiryQueueRef.current.length) return;
    const currentReview = inquiryDraftsRef.current[inquiryIndexRef.current]?.review || [];
    if (currentReview.length && !window.confirm(`OCR could not confidently read: ${currentReview.join(", ")}. Have you checked and corrected these fields?`)) return;
    setInquiryBusy(true);
    try {
      await submitInquiryData(inquiryForm);
      setInquiryMessage("Inquiry request dispatched. Check Google Sheet; server confirmation unavailable.");
      await removeInquiryAt(inquiryIndexRef.current);
    } catch (error) {
      setInquiryMessage(`Not submitted: ${error.message}`);
    } finally { setInquiryBusy(false); }
  };

  const submitAllInquiries = async () => {
    if (inquiryBusy || !inquiryQueueRef.current.length) return;
    setInquiryBusy(true);
    const removed = [];
    let skipped = 0;
    try {
      for (let i = 0; i < inquiryQueueRef.current.length; i++) {
        setInquiryProgress(`Reviewing inquiry ${i + 1}/${inquiryQueueRef.current.length}...`);
        let draft = inquiryDraftsRef.current[i];
        if (!draft) {
          try {
            const result = await scanInquiryAI(inquiryQueueRef.current[i]);
            draft = { fields: { ...EMPTY_INQUIRY, ...(result.fields || {}) }, text: result.rawText || "", review: result.needsReview || [] };
            inquiryDraftsRef.current[i] = draft;
          } catch { skipped++; continue; }
        }
        if (!draft.fields.name && !draft.fields.company) { skipped++; continue; }
        if (draft.review?.length) { skipped++; continue; }
        try { await submitInquiryData(draft.fields); removed.push(i); }
        catch { skipped++; }
      }
      const old = inquiryQueueRef.current;
      const kept = old.map((file, i) => ({ file, i })).filter(x => !removed.includes(x.i));
      const drafts = {};
      kept.forEach((x, i) => { if (inquiryDraftsRef.current[x.i]) drafts[i] = inquiryDraftsRef.current[x.i]; });
      inquiryDraftsRef.current = drafts;
      inquiryQueueRef.current = kept.map(x => x.file);
      setInquiryQueue([...inquiryQueueRef.current]);
      if (kept.length) {
        inquiryIndexRef.current = 0;
        setInquiryIndex(0);
        setInquiryForm({ ...EMPTY_INQUIRY, ...(drafts[0]?.fields || {}) });
        setInquiryRaw(drafts[0]?.text || "");
        setInquiryReview(drafts[0]?.review || []);
      } else {
        inquiryIndexRef.current = 0;
        setInquiryIndex(0);
        setInquiryForm({ ...EMPTY_INQUIRY });
        setInquiryRaw("");
        setInquiryReview([]);
      }
      setInquiryMessage(`${removed.length} requests dispatched (unverified). ${skipped} need review. Check Google Sheet before retrying.`);
    } finally { setInquiryBusy(false); setInquiryProgress(""); }
  };

  const navigate = (name) => {
    setPage(name);
    setSidebarOpen(false);
    setMessage("");
  };

  // PDF pages are rendered to images in the browser; OCR remains in cardScanner.js.
  const pdfToCards = async (file) => {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      useSystemFonts: true,
    }).promise;
    if (pdf.numPages > 100) throw new Error("Maximum 100 PDF pages per file.");
    const cards = [];
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      setImportProgress(`Rendering PDF page ${pageNo}/${pdf.numPages}...`);
      const page = await pdf.getPage(pageNo);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(2, 1800 / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable.");
      await page.render({ canvasContext: context, viewport }).promise;
      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("PDF rendering failed")), "image/png")
      );
      cards.push(new File([blob], `${file.name} - Page ${pageNo}.png`, { type: "image/png" }));
      page.cleanup();
    }
    return cards;
  };

  const updateDraft = (next) => {
    setForm(next);
    if (page === "Bulk Cards" && bulkQueueRef.current.length) {
      bulkDraftsRef.current[bulkIndexRef.current] = {
        ...(bulkDraftsRef.current[bulkIndexRef.current] || {}),
        fields: next,
      };
    }
  };

  const scanSelectedCard = async (file, targetPage = "Scan Card", index = null) => {
    if (!file) return;
    const requestId = ++scanIdRef.current;
    setPreview(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file); });
    setPage(targetPage);
    setSidebarOpen(false);
    setRawText("");
    setScanProgress(0);
    if (index !== null && bulkDraftsRef.current[index]?.scanned) {
      const draft = bulkDraftsRef.current[index];
      setForm({ ...emptyForm, ...draft.fields });
      setRawText(draft.text || "");
      setScanning(false);
      setMessage(`Card ${index + 1} ready. Review or edit before submitting.`);
      return;
    }
    setForm({ ...emptyForm });
    setScanning(true);
    setMessage("Reading visiting card...");
    try {
      const result = await scanCard(file, percent => {
        if (requestId === scanIdRef.current) setScanProgress(percent);
      });
      if (requestId !== scanIdRef.current) return;
      const fields = { ...emptyForm, ...(result.fields || {}) };
      setRawText(result.text || "");
      setForm(fields);
      if (index !== null) {
        bulkDraftsRef.current[index] = { scanned: true, fields, text: result.text || "" };
      }
      setMessage(result.text?.trim()
        ? "Card scanned. Verify details before saving."
        : "No text detected. Enter details manually.");
    } catch (error) {
      if (requestId === scanIdRef.current) {
        if (index !== null) bulkDraftsRef.current[index] = { scanned: true, fields: { ...emptyForm }, text: "" };
        setMessage("Unable to scan card: " + (error.message || "Unknown error"));
      }
    } finally {
      if (requestId === scanIdRef.current) setScanning(false);
    }
  };

  const handleImage = async file => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setMessage("Choose an image smaller than 10 MB.");
      return;
    }
    await scanSelectedCard(file);
  };

  // New selections APPEND; previous unsaved cards remain in the preview queue.
  const appendToQueue = async (newFiles) => {
    if (!newFiles.length) return;
    const oldLength = bulkQueueRef.current.length;
    bulkQueueRef.current = [...bulkQueueRef.current, ...newFiles];
    setBulkQueue([...bulkQueueRef.current]);
    setQueueVersion(v => v + 1);
    if (oldLength === 0) {
      bulkIndexRef.current = 0;
      setBulkIndex(0);
      await scanSelectedCard(newFiles[0], "Bulk Cards", 0);
    } else {
      setMessage(`${newFiles.length} cards added. ${bulkQueueRef.current.length} cards in queue. Unsaved cards are preserved.`);
    }
  };

  const handleBulkFiles = async fileList => {
    const files = Array.from(fileList || []);
    if (!files.length || importing) return;
    const valid = files.filter(f => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024);
    if (!valid.length) { setMessage("Choose JPG/PNG images smaller than 10 MB."); return; }
    await appendToQueue(valid);
    if (valid.length !== files.length) setMessage(`${valid.length} images added; unsupported or oversized files skipped.`);
  };

  const handlePdfFiles = async fileList => {
    const files = Array.from(fileList || []);
    if (!files.length || importing) return;
    setImporting(true);
    try {
      let cards = [];
      for (const file of files) {
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) continue;
        if (file.size > 35 * 1024 * 1024) throw new Error("PDF must be under 35 MB.");
        cards = [...cards, ...(await pdfToCards(file))];
        if (cards.length > 150) throw new Error("Maximum 150 queued PDF pages per import.");
      }
      if (!cards.length) throw new Error("No valid PDF pages found.");
      await appendToQueue(cards);
      setImportProgress("");
    } catch (error) {
      setMessage("PDF import failed: " + error.message);
    } finally {
      setImporting(false);
      setImportProgress("");
    }
  };

  const goToBulkCard = async index => {
    if (scanning || saving || bulkSaving || importing || index < 0 || index >= bulkQueueRef.current.length) return;
    if (bulkQueueRef.current.length) {
      bulkDraftsRef.current[bulkIndexRef.current] = {
        ...(bulkDraftsRef.current[bulkIndexRef.current] || {}),
        scanned: true, fields: { ...form }, text: rawText,
      };
    }
    bulkIndexRef.current = index;
    setBulkIndex(index);
    await scanSelectedCard(bulkQueueRef.current[index], "Bulk Cards", index);
  };

  const removeBulkCard = async index => {
    if (saving || scanning || importing || bulkSaving) return;
    const old = bulkQueueRef.current;
    if (index < 0 || index >= old.length) return;
    if (index === bulkIndexRef.current) ++scanIdRef.current;
    const updated = old.filter((_, i) => i !== index);
    const drafts = {};
    Object.entries(bulkDraftsRef.current).forEach(([key, val]) => {
      const n = Number(key);
      if (n !== index) drafts[n > index ? n - 1 : n] = val;
    });
    const statuses = {};
    Object.entries(bulkStatuses).forEach(([key, val]) => {
      const n = Number(key);
      if (n !== index) statuses[n > index ? n - 1 : n] = val;
    });
    bulkDraftsRef.current = drafts;
    bulkQueueRef.current = updated;
    setBulkQueue(updated);
    setBulkStatuses(statuses);
    const next = Math.min(index <= bulkIndexRef.current ? bulkIndexRef.current : index, updated.length - 1);
    if (!updated.length) {
      bulkIndexRef.current = 0;
      setBulkIndex(0);
      setForm({ ...emptyForm });
      setPreview(old => { if (old) URL.revokeObjectURL(old); return ""; });
      setRawText("");
      setMessage("Queue is empty.");
    } else {
      bulkIndexRef.current = next;
      setBulkIndex(next);
      await scanSelectedCard(updated[next], "Bulk Cards", next);
    }
  };

  // Remove successfully dispatched cards from the visible queue.
  // A no-cors dispatch is NOT proof of a Google Sheet write.
  const clearDispatchedCards = async removedIndices => {
    if (!removedIndices.length) return;
    const removed = new Set(removedIndices);
    const old = bulkQueueRef.current;
    const remainingIndices = old.map((_, i) => i).filter(i => !removed.has(i));
    const remaining = remainingIndices.map(i => old[i]);
    const drafts = {};
    const statuses = {};
    remainingIndices.forEach((oldIndex, newIndex) => {
      if (bulkDraftsRef.current[oldIndex]) drafts[newIndex] = bulkDraftsRef.current[oldIndex];
      if (bulkStatuses[oldIndex]) statuses[newIndex] = bulkStatuses[oldIndex];
    });
    bulkDraftsRef.current = drafts;
    bulkQueueRef.current = remaining;
    setBulkQueue(remaining);
    setBulkStatuses(statuses);
    setQueueVersion(v => v + 1);
    if (remaining.length) {
      const oldCurrent = bulkIndexRef.current;
      const nextOriginal = remainingIndices.find(i => i >= oldCurrent) ?? remainingIndices[0];
      const nextIndex = remainingIndices.indexOf(nextOriginal);
      bulkIndexRef.current = nextIndex;
      setBulkIndex(nextIndex);
      await scanSelectedCard(remaining[nextIndex], "Bulk Cards", nextIndex);
    } else {
      ++scanIdRef.current;
      bulkIndexRef.current = 0;
      setBulkIndex(0);
      setForm({ ...emptyForm });
      setRawText("");
      setPreview(oldPreview => { if (oldPreview) URL.revokeObjectURL(oldPreview); return ""; });
    }
  };

  const submitToSheets = async leadData => {
    // Apps Script no-cors returns an opaque response. A resolved fetch is NOT a confirmed write.
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(leadData),
    });
    setLeads(prev => [{ ...leadData, id: Date.now() + Math.random(), syncStatus: "Unverified" }, ...prev]);
  };

  const saveAllBulkCards = async () => {
    if (bulkSaving || saving || scanning || importing || !bulkQueueRef.current.length) return;
    bulkDraftsRef.current[bulkIndexRef.current] = { scanned: true, fields: { ...form }, text: rawText };
    setBulkSaving(true);
    let submitted = 0;
    let skipped = 0;
    const dispatchedIndices = [];
    try {
      for (let i = 0; i < bulkQueueRef.current.length; i++) {
        if (bulkStatuses[i] === "submitted") continue;
        let draft = bulkDraftsRef.current[i];
        if (!draft?.scanned) {
          setImportProgress(`Scanning card ${i + 1}/${bulkQueueRef.current.length}...`);
          try {
            const result = await scanCard(bulkQueueRef.current[i]);
            draft = { scanned: true, fields: { ...emptyForm, ...(result.fields || {}) }, text: result.text || "" };
            bulkDraftsRef.current[i] = draft;
          } catch {
            skipped++;
            continue;
          }
        }
        const fields = draft.fields || {};
        if (!String(fields.name || "").trim() && !String(fields.company || "").trim()) {
          skipped++;
          continue;
        }
        setImportProgress(`Submitting card ${i + 1}/${bulkQueueRef.current.length}...`);
        try {
          await submitToSheets({ ...fields, source: "Exhibition", date: new Date().toLocaleString("en-IN") });
          dispatchedIndices.push(i);
          submitted++;
        } catch (error) {
          setBulkStatuses(prev => ({ ...prev, [i]: "failed" }));
          setMessage(`Card ${i + 1} request failed: ${error.message}`);
        }
      }
      await clearDispatchedCards(dispatchedIndices);
      setMessage(`${submitted} cards removed from preview after request dispatch (Google Sheet confirmation unavailable); ${skipped} cards remain for review. Verify Sheet before retrying.`);
    } finally {
      setBulkSaving(false);
      setImportProgress("");
    }
  };

  const exportCSV = () => {
    const keys = ["name", "company", "mobile", "email", "designation", "source", "date"];
    const escape = (value) => {
      let text = String(value ?? "");
      if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = [
      keys.join(","),
      ...leads.map(l => keys.map(k => escape(l[k])).join(","))
    ].join("\r\n");

    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "exhibition-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveLead = async e => {
    e.preventDefault();
    if (scanning || saving || bulkSaving || importing) return;
    if (!form.name.trim() && !form.company.trim()) {
      setMessage("Enter name or company.");
      return;
    }
    const current = bulkIndexRef.current;
    if (page === "Bulk Cards" && bulkStatuses[current] === "submitted") {
      setMessage("Already submitted in this session. Verify Google Sheet before resubmitting.");
      return;
    }
    const leadData = { ...form, source: "Exhibition", date: new Date().toLocaleString("en-IN") };
    setSaving(true);
    setMessage("Sending lead to Google Apps Script...");
    try {
      await submitToSheets(leadData);
      if (page === "Bulk Cards") {
        // Hide the dispatched card immediately; show the next pending preview.
        await clearDispatchedCards([current]);
        setMessage("Card submitted and removed from preview (Sheet write unverified). Verify Google Sheet before retrying.");
      } else {
        setForm({ ...emptyForm });
        setRawText("");
        setPreview(old => { if (old) URL.revokeObjectURL(old); return ""; });
        setPage("Leads");
        setMessage("Lead submitted; verify the new row in Google Sheets.");
      }
    } catch (error) {
      console.error("Google Sheets request failed:", error);
      setMessage("Request failed: " + (error.message || "Network error") + ". Current card is preserved.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = leads.filter(l =>
    Object.values(l).some(v =>
      String(v).toLowerCase().includes(search.toLowerCase())
    )
  );

  const trend = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - i));
    return {
      day: date.toLocaleDateString("en-IN", { weekday: "short" }),
      leads: leads.filter(l => new Date(l.id).toDateString() === date.toDateString()).length,
    };
  });
  const sourceColors = [NAVY, GOLD, "#bcbcbc", "#e8e8e8"];
  const sources = [...new Set(leads.map(l => l.source || "Other"))].map((name, i) => ({
    name,
    value: leads.length ? Math.round(leads.filter(l => (l.source || "Other") === name).length / leads.length * 100) : 0,
    color: sourceColors[i % sourceColors.length],
  }));

  const cardStats = [
    { title: "Total Leads", value: leads.length, detail: "Recorded leads", icon: Users, gold: false },
    { title: "Today's Leads", value: leads.filter(l => new Date(l.id).toDateString() === new Date().toDateString()).length, detail: "Captured today", icon: CalendarDays, gold: true },
    { title: "This Week", value: leads.length, detail: "Recorded leads", icon: ChartNoAxesColumnIncreasing, gold: false },
    { title: "Pending Verification", value: leads.filter(l => l.syncStatus === "Unverified").length, detail: "Check Google Sheet", icon: Target, gold: true }
  ];

  const Scanner = () => (
    <div className="relative flex h-[300px] min-w-0 overflow-hidden rounded-2xl bg-[#202124] text-white shadow-sm">
      <div className="absolute -left-24 -top-24 h-52 w-52 rounded-full border-[38px] border-red-600" />
      <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-red-600" />

      <div className="absolute bottom-0 left-0 top-0 w-[39%] overflow-hidden">
        <img
          src="/wirecoil.jpeg"
          alt="Steel wire coil"
          className="h-full w-full object-cover grayscale opacity-70"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          style={{ maskImage: "linear-gradient(to right, black 40%, transparent)" }}
        />
      </div>

      <div className="relative z-10 ml-[29%] flex min-w-0 flex-1 flex-col justify-center px-4 py-4">
        <div className="mb-2 text-[9px] font-extrabold tracking-[1.3px] text-red-400">
          âœ¦ SMART LEAD CAPTURE
        </div>
        <h2 className="mb-2 text-[clamp(15px,1.5vw,23px)] font-extrabold leading-tight text-white">
          Scan Visiting Card
        </h2>
        <p className="mb-4 text-[11px] leading-relaxed text-slate-200">
          Upload or capture a visiting card to create a new exhibition lead.
        </p>

        <div
          className="flex min-h-[145px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300/70 bg-white/5 p-3 text-center"
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            handleImage(e.dataTransfer.files[0]);
          }}
        >
          <Camera size={26} className="text-white" />
          <strong className="text-[12px]">Upload Card Image</strong>
          <span className="text-[10px] text-slate-300">
            Drag & drop or click to select
          </span>
          <button
            onClick={() => inputRef.current?.click()}
            className="mt-1 flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-[11px] font-bold text-[#ffffff] hover:bg-red-700"
          >
            <Upload size={14} /> Choose Image
          </button>
        </div>
      </div>
    </div>
  );

  const SourceChart = () => (
    <div className="flex h-[300px] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-[16px] font-extrabold">Leads by Source</h3>
      <div className="flex min-h-0 flex-1 items-center">
        <div className="relative h-[175px] w-[53%] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sources}
                dataKey="value"
                innerRadius="67%"
                outerRadius="90%"
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                {sources.map(s => <Cell key={s.name} fill={s.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <strong className="text-[23px] font-extrabold">{leads.length}</strong>
            <span className="text-[11px]">Leads</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          {sources.map(s => (
            <div key={s.name} className="flex items-center gap-1.5 text-[10px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              <strong>{s.value}%</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const TrendChart = () => (
    <div className="flex h-[300px] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[16px] font-extrabold">Lead Trend</h3>
        <span className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-2 text-[10px] whitespace-nowrap">
          Last 7 Days <ChevronDown size={12} />
        </span>
      </div>
      <div className="mt-5 min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 10, right: 5, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#dc2626" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#dc2626" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#eeeeee" vertical={false} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} domain={[0, 50]} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="leads"
              stroke="#dc2626"
              strokeWidth={3}
              fill="url(#goldArea)"
              dot={{ r: 3, fill: "#dc2626" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const LeadTable = ({ data }) => (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-left text-[11px]">
        <thead className="bg-[#f1f1f1] text-slate-600">
          <tr>
            {["#", "Name", "Company", "Mobile", "Email", "Designation", "Source", "Date & Time", "Sheet Status"].map(h => (
              <th key={h} className="px-3 py-3 font-bold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length ? data.map((l, i) => (
            <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-3 py-3">{i + 1}</td>
              <td className="px-3 py-3 font-bold">{l.name || "â€”"}</td>
              <td className="px-3 py-3">{l.company || "â€”"}</td>
              <td className="px-3 py-3">{l.mobile || "â€”"}</td>
              <td className="px-3 py-3">{l.email || "â€”"}</td>
              <td className="px-3 py-3">{l.designation || "â€”"}</td>
              <td className="px-3 py-3">
                <span className={`rounded-md px-2 py-1 font-semibold ${
                  l.source === "Website" ? "bg-amber-100 text-amber-700" :
                  l.source === "Referral" ? "bg-violet-100 text-violet-700" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {l.source}
                </span>
              </td>
              <td className="px-3 py-3 whitespace-nowrap">{l.date}</td>
              <td className="px-3 py-3 text-amber-700">{l.syncStatus || "Unverified"}</td>
            </tr>
          )) : (
            <tr><td colSpan={9} className="p-8 text-center text-slate-500">No leads found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans text-[#242424]">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          handleImage(e.target.files[0]);
          e.target.value = "";
        }}
      />

      <input
        ref={bulkInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { handleBulkFiles(e.target.files); e.target.value = ""; }}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={e => { handlePdfFiles(e.target.files); e.target.value = ""; }}
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col overflow-hidden bg-[#202124] text-white transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[100px] shrink-0 items-center gap-3 px-6">
          <div className="flex h-[78px] min-w-0 flex-1 items-center justify-center rounded-xl bg-white px-3">
            <img src={BANSAL_LOGO} alt="Bansal Wire Industries" className="h-full w-full object-contain" />
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="px-8 pb-3 pt-7 text-[10px] font-bold tracking-[2px] text-slate-400">
          MAIN MENU
        </div>

        <nav className="space-y-2 px-4">
          {menu.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => {
                if (name === "Export") exportCSV();
                else navigate(name);
              }}
              className={`flex h-[49px] w-full items-center gap-4 rounded-xl px-5 text-left text-[13px] font-semibold transition-colors ${
                page === name
                  ? "bg-red-600 text-white"
                  : "text-slate-200 hover:bg-white/10"
              }`}
            >
              <Icon size={20} />
              {name}
            </button>
          ))}
        </nav>

        <div className="relative mt-auto overflow-hidden px-4 pb-20 pt-5">
          <div className="relative z-10 flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 p-4">
            <Factory size={25} className="text-red-400" />
            <div>
              <p className="text-[12px] font-bold">Exhibition Mode</p>
              <p className="mt-1 text-[11px] text-emerald-400">â— Active</p>
            </div>
          </div>
          <div className="absolute -bottom-24 -left-12 h-36 w-80 rotate-[-14deg] rounded-[50%] bg-red-600" />
        </div>
      </aside>

      {/* MAIN */}
      <div className="min-w-0 lg:ml-[250px]">
        {/* HEADER */}
        <header className="flex h-[82px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 lg:px-7">
          <div className="flex min-w-0 items-center gap-4">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu size={23} />
            </button>
            <LayoutDashboard size={27} className="hidden shrink-0 text-[#202124] sm:block" />
            <div className="min-w-0">
              <h1 className="text-[21px] font-extrabold tracking-tight">{page}</h1>
              <p className="hidden text-[12px] text-slate-500 sm:block">
                Capture, manage, and track your exhibition leads
              </p>
            </div>
          </div>

          <div className="flex h-full items-center gap-4">
            <div className="relative">
              <button
                className="relative p-2"
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileOpen(false);
                }}
              >
                <Bell size={23} />
                <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-red-500" />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-30 w-60 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                  <strong className="text-[13px]">Notifications</strong>
                  <p className="mt-2 text-[12px] text-slate-500">No new notifications</p>
                </div>
              )}
            </div>

            <div className="relative flex h-full items-center border-l border-slate-200 pl-4">
              <button
                className="flex items-center gap-3"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
              >
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#343434] text-[15px] font-bold text-white">
                  AS
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-[13px] font-bold">Ankit Sharma</p>
                  <p className="text-[11px] text-slate-500">Sales Team</p>
                </div>
                <ChevronDown size={15} className="hidden sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-[75px] z-30 w-56 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                  <strong className="text-[13px]">Ankit Sharma</strong>
                  <p className="mt-1 text-[11px] text-slate-500">Demo account</p>
                  <button className="mt-3 text-[12px] font-semibold" onClick={() => navigate("Settings")}>
                    Open Settings
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="w-full min-w-0 p-4 lg:p-5">
          {page === "Dashboard" && (
            <>
              {/* KPI CARDS */}
              <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                {cardStats.map(({ title, value, detail, icon: Icon, gold }) => (
                  <div
                    key={title}
                    className={`flex min-h-[118px] items-center gap-3 rounded-2xl border border-slate-200 p-3 shadow-sm sm:p-4 ${
                      gold ? "bg-red-50/60" : "bg-white"
                    }`}
                  >
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${
                      gold ? "bg-red-100 text-red-700" : "bg-slate-100 text-[#333333]"
                    }`}>
                      <Icon size={25} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold">{title}</p>
                      <p className="mt-1 text-[27px] leading-none font-extrabold">{value}</p>
                      <p className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600">
                        <TrendingUp size={12} /> {detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* THREE COLUMN ANALYTICS */}
              <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.8fr_1fr_1.1fr]">
                <div className="md:col-span-2 xl:col-span-1">
                  <Scanner />
                </div>
                <SourceChart />
                <TrendChart />
              </div>

              {/* RECENT LEADS */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <UserRound size={22} />
                    <h2 className="text-[17px] font-extrabold">Recent Leads</h2>
                  </div>
                  <button
                    onClick={() => navigate("Leads")}
                    className="flex items-center gap-2 text-[12px] font-bold text-red-700"
                  >
                    View All <ArrowRight size={16} />
                  </button>
                </div>
                <LeadTable data={leads.slice(0, 5)} />
              </div>
            </>
          )}

          {(page === "Scan Card" || page === "Bulk Cards") && (
            <>
              <div className="mb-5">
                <h2 className="text-xl font-extrabold">{page === "Bulk Cards" ? "Bulk Visiting Card Scanner" : "Visiting Card Scanner"}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Upload a visiting card and create a lead.
                </p>
              </div>
              <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
                <div className="space-y-4">
                  {page === "Bulk Cards" ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                      <h3 className="text-sm font-bold">Bulk Cards Queue</h3>
                      <p className="text-xs text-slate-500">Add images one by one or many at once, without saving first. PDF pages are added as card previews. Review, submit and move to the next card. Submitted previews disappear from the queue.</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={saving || importing || bulkSaving} onClick={() => bulkInputRef.current?.click()} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-xs font-bold disabled:opacity-50 text-white"><Layers size={16} /> Add Cards / Images</button>
                        <button type="button" disabled={saving || importing || bulkSaving} onClick={() => pdfInputRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-bold disabled:opacity-50"><FileText size={16} /> Add PDF Cards</button>
                        <button type="button" disabled={saving || scanning || importing || bulkSaving || !bulkQueue.length} onClick={saveAllBulkCards} className="flex items-center gap-2 rounded-lg bg-[#202124] px-4 py-3 text-xs font-bold text-white disabled:opacity-50"><Save size={16} /> {bulkSaving ? "Submitting Queue..." : "Submit All Unsaved"}</button>
                      </div>
                      {(importing || bulkSaving) && <p className="text-xs font-semibold text-amber-700">{importProgress || "Processing..."}</p>}
                      {!!bulkQueue.length && <>
                        <p className="text-xs font-bold">Card {bulkIndex + 1} of {bulkQueue.length} â€¢ Pending cards only</p>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={bulkIndex === 0 || scanning || saving || importing || bulkSaving} onClick={() => goToBulkCard(bulkIndex - 1)} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40"><ArrowLeft size={14} className="inline" /> Previous</button>
                          <button type="button" disabled={bulkIndex >= bulkQueue.length - 1 || scanning || saving || importing || bulkSaving} onClick={() => goToBulkCard(bulkIndex + 1)} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Next <SkipForward size={14} className="inline" /></button>
                        </div>
                        <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                          {bulkQueue.map((file, i) => (
                            <div key={`${queueVersion}-${i}`} className={`relative overflow-hidden rounded-lg border-2 ${i === bulkIndex ? "border-red-600" : "border-slate-200"}`}>
                              <button type="button" disabled={scanning || saving || importing || bulkSaving} onClick={() => goToBulkCard(i)} className="w-full p-1 text-left disabled:opacity-50">
                                <CardThumbnail file={file} index={i} />
                                <span className="block truncate text-[10px] font-semibold">{i + 1}. {file.name}</span>
                                <span className={`block text-[10px] ${bulkStatuses[i] === "submitted" ? "text-emerald-700" : bulkStatuses[i] === "failed" ? "text-red-600" : "text-slate-500"}`}>{bulkStatuses[i] === "submitted" ? "Submitted (unverified)" : bulkStatuses[i] === "failed" ? "Request failed" : "Not submitted"}</span>
                              </button>
                              <button type="button" title="Remove card" disabled={saving || scanning || importing || bulkSaving} onClick={() => removeBulkCard(i)} className="absolute right-1 top-1 rounded bg-white p-1 text-red-600 shadow disabled:opacity-40"><Trash2 size={13} /></button>
                            </div>
                          ))}
                        </div>
                      </>}
                    </div>
                  ) : <Scanner />}
                  {preview && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <h3 className="mb-3 text-sm font-bold">Uploaded Card</h3>
                      <img src={preview} alt="Card preview" className="max-h-80 w-full rounded-lg object-contain" />
                    </div>
                  )}
                </div>

                <form onSubmit={saveLead} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-extrabold">Lead Information</h3>
                  <p className="mb-5 mt-2 text-xs text-slate-500">
                    Card details are extracted automatically using OCR. Verify before saving.
                  </p>

                  {scanning && (
                    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="mb-2 flex justify-between text-xs font-bold text-amber-800">
                        <span>Scanning Visiting Card...</span><span>{scanProgress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-amber-100">
                        <div className="h-full rounded-full bg-red-600 transition-all" style={{ width: `${scanProgress}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[
                      ["name", "Full Name"],
                      ["company", "Company"],
                      ["mobile", "Mobile Number"],
                      ["email", "Email Address"],
                      ["designation", "Designation"],
                      ["address", "Address"]
                    ].map(([key, label]) => (
                      <label key={key} className="block">
                        <span className="mb-2 block text-xs font-semibold">{label}</span>
                        <input
                          value={form[key]}
                          onChange={e => updateDraft({ ...form, [key]: e.target.value })}
                          type={key === "email" ? "email" : key === "mobile" ? "tel" : "text"}
                          placeholder={label}
                          className="w-full rounded-lg border border-slate-200 px-3 py-3 text-xs outline-none focus:border-red-600"
                        />
                      </label>
                    ))}
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-2 block text-xs font-semibold">Notes</span>
                    <textarea
                      value={form.notes}
                      onChange={e => updateDraft({ ...form, notes: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 p-3 text-xs outline-none focus:border-red-600"
                    />
                  </label>

                  {message && <p className="mt-3 text-xs text-amber-700" role="status">{message}</p>}
                  {rawText && (
                    <details className="mt-3 rounded-lg border border-slate-200 p-3 text-xs">
                      <summary className="cursor-pointer font-semibold">View extracted card text</summary>
                      <pre className="mt-2 whitespace-pre-wrap break-words text-slate-600">{rawText}</pre>
                    </details>
                  )}

                  <button type="submit" disabled={scanning || saving || bulkSaving || importing || (page === "Bulk Cards" && (!bulkQueue.length || bulkStatuses[bulkIndex] === "submitted"))} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3 text-sm font-bold hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 text-white">
                    <Plus size={17} /> {scanning ? `Scanning... ${scanProgress}%` : saving ? "Submitting..." : page === "Bulk Cards" ? (bulkStatuses[bulkIndex] === "submitted" ? "Already Submitted" : "Submit Lead & Next Card") : "Save Lead"}
                  </button>
                </form>
              </div>
            </>
          )}

          {page === "Inquiries" && (
            <>
              <div className="mb-5">
                <h2 className="text-xl font-extrabold">Exhibition Inquiry Forms</h2>
                <p className="mt-1 text-xs text-slate-500">Upload inquiry forms individually, in bulk, or as PDF pages. Review handwritten details before submission.</p>
              </div>
              <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold">Inquiry Preview Queue</h3>
                    <p className="text-xs text-slate-500">Add files without saving first. Previous / Next preserves edits. Submitted previews disappear.</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={inquiryBusy} onClick={() => inquiryImageInputRef.current?.click()} className="rounded-lg bg-red-600 px-4 py-3 text-xs font-bold disabled:opacity-50 text-white">Add Inquiry Images</button>
                      <button type="button" disabled={inquiryBusy} onClick={() => inquiryPdfInputRef.current?.click()} className="rounded-lg border px-4 py-3 text-xs font-bold disabled:opacity-50">Add Inquiry PDF</button>
                      <button type="button" disabled={inquiryBusy || !inquiryQueue.length} onClick={submitAllInquiries} className="rounded-lg bg-[#202124] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">Submit All Reviewed</button>
                      <button type="button" disabled={inquiryBusy || !inquiryQueue.length} onClick={() => scanInquiryAt(inquiryIndex, true)} className="rounded-lg border border-red-600 bg-red-50 px-4 py-3 text-xs font-bold text-red-800 disabled:opacity-50">Rescan Current Inquiry</button>
                    </div>
                    <input ref={inquiryImageInputRef} className="hidden" type="file" accept="image/*" multiple onChange={e => { addInquiryFiles(e.target.files); e.target.value = ""; }} />
                    <input ref={inquiryPdfInputRef} className="hidden" type="file" accept="application/pdf,.pdf" multiple onChange={e => { addInquiryFiles(e.target.files, true); e.target.value = ""; }} />
                    {inquiryProgress && <p className="text-xs font-bold text-amber-700">{inquiryProgress}</p>}
                    {!!inquiryQueue.length && <>
                      <p className="text-xs font-bold">Inquiry {inquiryIndex + 1} of {inquiryQueue.length} - Pending only</p>
                      <div className="flex gap-2">
                        <button type="button" className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40" disabled={inquiryBusy || inquiryIndex === 0} onClick={() => scanInquiryAt(inquiryIndex - 1)}>Previous</button>
                        <button type="button" className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40" disabled={inquiryBusy || inquiryIndex >= inquiryQueue.length - 1} onClick={() => scanInquiryAt(inquiryIndex + 1)}>Next</button>
                      </div>
                      <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                        {inquiryQueue.map((file, i) => <div key={file.name + i} className={`relative rounded-lg border-2 p-1 ${i === inquiryIndex ? "border-red-600" : "border-slate-200"}`}>
                          <button type="button" disabled={inquiryBusy} onClick={() => scanInquiryAt(i)} className="w-full text-left"><CardThumbnail file={file} index={i} /><span className="block truncate text-[10px]">{i + 1}. {file.name}</span></button>
                          <button type="button" disabled={inquiryBusy} onClick={() => removeInquiryAt(i)} title="Remove" className="absolute right-1 top-1 rounded bg-white p-1 text-red-600"><Trash2 size={13}/></button>
                        </div>)}
                      </div>
                    </>}
                  </div>
                  {!!inquiryQueue.length && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 text-sm font-bold">Full Inquiry Form Preview</h3>
                    <CardThumbnailLarge file={inquiryQueue[inquiryIndex]} />
                    {inquiryRaw && <details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold">View OCR text</summary><pre className="mt-2 whitespace-pre-wrap break-words">{inquiryRaw}</pre></details>}
                  </div>}
                </div>
                <form onSubmit={saveInquiryAndNext} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-extrabold">Inquiry Information</h3>
                  <p className="mb-4 mt-2 text-xs text-slate-500">Automatically reads visiting cards and handwritten inquiry details directly in your browser. Review before submitting.</p>
                  {inquiryMessage && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{inquiryMessage}</p>}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {INQUIRY_FIELDS.map(([key, label]) => <label key={key} className={key === "notes" ? "sm:col-span-2" : ""}>
                      <span className="mb-2 block text-xs font-semibold">{label}</span>
                      {key === "notes" ? <textarea rows={3} value={inquiryForm[key] || ""} onChange={e => updateInquiryField(key, e.target.value)} className="w-full rounded-lg border border-slate-200 p-3 text-xs focus:border-red-600" /> : <input value={inquiryForm[key] || ""} onChange={e => updateInquiryField(key, e.target.value)} type={key === "email" ? "email" : "text"} placeholder={label} className="w-full rounded-lg border border-slate-200 px-3 py-3 text-xs outline-none focus:border-red-600" />}
                    </label>)}
                  </div>
                  <button type="submit" disabled={inquiryBusy || !inquiryQueue.length} className="mt-5 flex w-full justify-center rounded-lg bg-red-600 py-3 text-sm font-bold disabled:opacity-50 text-white">{inquiryBusy ? "Processing..." : "Submit Inquiry & Next"}</button>
                </form>
              </div>
            </>
          )}

          {page === "Leads" && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {message && <p role="status" className="mx-5 mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{message}</p>}
              <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                <h2 className="text-lg font-extrabold">All Leads</h2>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3">
                    <Search size={16} className="text-slate-400" />
                    <input
                      placeholder="Search leads..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-36 py-2.5 text-xs outline-none sm:w-52"
                    />
                  </div>
                  <button onClick={() => navigate("Scan Card")} className="flex items-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white">
                    <Plus size={16} /> Add Lead
                  </button>
                </div>
              </div>
              <LeadTable data={filtered} />
            </div>
          )}

          {page === "Analytics" && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <SourceChart />
              <TrendChart />
            </div>
          )}

          {page === "Settings" && (
            <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold">Settings</h2>
              <div className="mt-5 space-y-4 text-sm">
                <p>Company: <strong>Banssa Wire Industries</strong></p>
                <p>User: <strong>Ankit Sharma (Demo)</strong></p>
                <p>Google Sheets: <strong>Submission enabled (confirmation unavailable in no-cors mode)</strong></p>
                <p>OCR Scanner: <strong>Enabled</strong></p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
