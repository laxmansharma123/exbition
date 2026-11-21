
import { useState, useRef, useEffect } from "react";
import { scanCard } from "./cardScanner";
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

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwg7Xtrnoe103VUmkqQfUIiIQjiccE_WpKoPxWV9OLTfuvIkgfJQktc2bgBWz7AwUbg/exec";

const NAVY = "#0c2343";
const GOLD = "#fbbf24";

const initialLeads = [];



const menu = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Scan Card", icon: Camera },
  { name: "Bulk Cards", icon: Layers },
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

function App() {
  const [page, setPage] = useState("Dashboard");
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
  const sourceColors = [NAVY, GOLD, "#b8c9e8", "#e4e9f2"];
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
    <div className="relative flex h-[300px] min-w-0 overflow-hidden rounded-2xl bg-[#0c2343] text-white shadow-sm">
      <div className="absolute -left-24 -top-24 h-52 w-52 rounded-full border-[38px] border-amber-400" />
      <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-amber-400" />

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
        <div className="mb-2 text-[9px] font-extrabold tracking-[1.3px] text-amber-400">
          ✦ SMART LEAD CAPTURE
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
            className="mt-1 flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-[11px] font-bold text-[#10223f] hover:bg-amber-300"
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
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#edf0f5" vertical={false} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} domain={[0, 50]} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="leads"
              stroke="#e8a900"
              strokeWidth={3}
              fill="url(#goldArea)"
              dot={{ r: 3, fill: "#e8a900" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const LeadTable = ({ data }) => (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-left text-[11px]">
        <thead className="bg-[#f0f3f8] text-slate-600">
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
              <td className="px-3 py-3 font-bold">{l.name || "—"}</td>
              <td className="px-3 py-3">{l.company || "—"}</td>
              <td className="px-3 py-3">{l.mobile || "—"}</td>
              <td className="px-3 py-3">{l.email || "—"}</td>
              <td className="px-3 py-3">{l.designation || "—"}</td>
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
    <div className="min-h-screen bg-[#f4f6fa] font-sans text-[#0d2040]">
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
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col overflow-hidden bg-[#0c2343] text-white transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[100px] shrink-0 items-center gap-3 px-6">
          <div className="text-[51px] leading-none font-black italic text-amber-400">B</div>
          <div className="text-[17px] leading-[1.2] font-extrabold">
            Banssa Wire<br />Industries
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
                  ? "bg-amber-400 text-[#0c2343]"
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
            <Factory size={25} className="text-amber-400" />
            <div>
              <p className="text-[12px] font-bold">Exhibition Mode</p>
              <p className="mt-1 text-[11px] text-emerald-400">● Active</p>
            </div>
          </div>
          <div className="absolute -bottom-24 -left-12 h-36 w-80 rotate-[-14deg] rounded-[50%] bg-amber-400" />
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
            <LayoutDashboard size={27} className="hidden shrink-0 text-[#0c2343] sm:block" />
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
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#183c70] text-[15px] font-bold text-white">
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
                      gold ? "bg-amber-50/60" : "bg-white"
                    }`}
                  >
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${
                      gold ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-[#14325c]"
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
                    className="flex items-center gap-2 text-[12px] font-bold text-amber-600"
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
                        <button type="button" disabled={saving || importing || bulkSaving} onClick={() => bulkInputRef.current?.click()} className="flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-3 text-xs font-bold disabled:opacity-50"><Layers size={16} /> Add Cards / Images</button>
                        <button type="button" disabled={saving || importing || bulkSaving} onClick={() => pdfInputRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-bold disabled:opacity-50"><FileText size={16} /> Add PDF Cards</button>
                        <button type="button" disabled={saving || scanning || importing || bulkSaving || !bulkQueue.length} onClick={saveAllBulkCards} className="flex items-center gap-2 rounded-lg bg-[#0c2343] px-4 py-3 text-xs font-bold text-white disabled:opacity-50"><Save size={16} /> {bulkSaving ? "Submitting Queue..." : "Submit All Unsaved"}</button>
                      </div>
                      {(importing || bulkSaving) && <p className="text-xs font-semibold text-amber-700">{importProgress || "Processing..."}</p>}
                      {!!bulkQueue.length && <>
                        <p className="text-xs font-bold">Card {bulkIndex + 1} of {bulkQueue.length} • Pending cards only</p>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={bulkIndex === 0 || scanning || saving || importing || bulkSaving} onClick={() => goToBulkCard(bulkIndex - 1)} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40"><ArrowLeft size={14} className="inline" /> Previous</button>
                          <button type="button" disabled={bulkIndex >= bulkQueue.length - 1 || scanning || saving || importing || bulkSaving} onClick={() => goToBulkCard(bulkIndex + 1)} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Next <SkipForward size={14} className="inline" /></button>
                        </div>
                        <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                          {bulkQueue.map((file, i) => (
                            <div key={`${queueVersion}-${i}`} className={`relative overflow-hidden rounded-lg border-2 ${i === bulkIndex ? "border-amber-400" : "border-slate-200"}`}>
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
                        <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${scanProgress}%` }} />
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
                          className="w-full rounded-lg border border-slate-200 px-3 py-3 text-xs outline-none focus:border-amber-400"
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
                      className="w-full rounded-lg border border-slate-200 p-3 text-xs outline-none focus:border-amber-400"
                    />
                  </label>

                  {message && <p className="mt-3 text-xs text-amber-700" role="status">{message}</p>}
                  {rawText && (
                    <details className="mt-3 rounded-lg border border-slate-200 p-3 text-xs">
                      <summary className="cursor-pointer font-semibold">View extracted card text</summary>
                      <pre className="mt-2 whitespace-pre-wrap break-words text-slate-600">{rawText}</pre>
                    </details>
                  )}

                  <button type="submit" disabled={scanning || saving || bulkSaving || importing || (page === "Bulk Cards" && (!bulkQueue.length || bulkStatuses[bulkIndex] === "submitted"))} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 py-3 text-sm font-bold hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50">
                    <Plus size={17} /> {scanning ? `Scanning... ${scanProgress}%` : saving ? "Submitting..." : page === "Bulk Cards" ? (bulkStatuses[bulkIndex] === "submitted" ? "Already Submitted" : "Submit Lead & Next Card") : "Save Lead"}
                  </button>
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
                  <button onClick={() => navigate("Scan Card")} className="flex items-center gap-1 rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold">
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
