import React, { useState, useRef } from 'react'
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Building2,
  Trash2,
  ArrowRight,
  ClipboardPaste,
  Navigation,
} from 'lucide-react'
import { downloadRosterTemplate } from '../../utils/csvTemplate'
import { parseMemberSpreadsheet } from '../../utils/spreadsheetParser'
import type { SpreadsheetParseResult } from '../../utils/spreadsheetParser'
import type { Member, Chapter } from '../../types/member'

interface BulkMemberImporterModalProps {
  isOpen: boolean
  onClose: () => void
  chapter: Chapter
  onImportComplete: (newMembers: Member[]) => void
}

export const BulkMemberImporterModal: React.FC<BulkMemberImporterModalProps> = ({
  isOpen,
  onClose,
  chapter,
  onImportComplete,
}) => {
  const [tab, setTab] = useState<'UPLOAD' | 'PASTE'>('UPLOAD')
  const [pastedText, setPastedText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [parseResult, setParseResult] = useState<SpreadsheetParseResult | null>(null)
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'WARNINGS'>('ALL')
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  // Process raw text string into parsed members
  const processRawInput = async (content: string) => {
    if (!content.trim()) return
    setIsProcessing(true)
    try {
      const result = await parseMemberSpreadsheet(content, {
        id: chapter.id,
        name: chapter.name,
        city: chapter.city,
        accessKey: chapter.accessKey,
        centerCoordinates: chapter.centerCoordinates,
      })
      setParseResult(result)
    } catch (err) {
      console.error('Failed to parse spreadsheet content:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle file drop or selection
  const handleFileUpload = (file: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (content) processRawInput(content)
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  // Handle inline removal of a parsed row
  const handleRemoveRow = (rowNumber: number) => {
    if (!parseResult) return
    const updatedRows = parseResult.rows.filter((r) => r.rowNumber !== rowNumber)
    const updatedMembers = parseResult.members.filter((_, idx) => {
      // Corresponding index in rows
      return parseResult.rows[idx]?.rowNumber !== rowNumber
    })
    setParseResult({
      ...parseResult,
      totalRows: updatedRows.length,
      validCount: updatedRows.filter((r) => r.isValid).length,
      warningCount: updatedRows.filter((r) => r.warnings.length > 0).length,
      rows: updatedRows,
      members: updatedMembers,
    })
  }

  // Final commit
  const handleCommitImport = () => {
    if (!parseResult || parseResult.members.length === 0) return
    onImportComplete(parseResult.members)
    onClose()
  }

  const filteredReviewRows = parseResult?.rows.filter((r) => {
    if (reviewFilter === 'WARNINGS') return r.warnings.length > 0
    return true
  }) || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="bg-[#F8F9FD] w-full max-w-4xl rounded-[32px] sm:rounded-[36px] shadow-[0_28px_80px_rgba(15,23,42,0.35)] border border-white/95 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header Bar */}
        <div className="p-5 sm:p-6 pb-4 bg-white/90 border-b border-black/[0.06] backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 flex-shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base sm:text-lg font-extrabold text-[#0F172A] tracking-tight">
                  Spreadsheet Member Importer
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0071E3] border border-blue-200/60 text-[10px] font-bold font-display">
                  {chapter.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Import 40–80 members in one go from Excel or Google Sheets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Download Template Action */}
            <button
              type="button"
              onClick={() => downloadRosterTemplate(chapter.name, chapter.city)}
              className="ios-press px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-black/5 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer font-display"
              title="Download clean Excel / CSV template with sample rows"
            >
              <Download className="w-3.5 h-3.5 text-[#0071E3]" />
              <span className="hidden sm:inline">Download Standard Template (.csv)</span>
              <span className="sm:hidden">Template</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: If no parsed result, show Upload/Paste Step */}
        {!parseResult ? (
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
            
            {/* Template Advice Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-start sm:items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#0071E3] flex-shrink-0 mt-0.5 sm:mt-0" />
                <span className="text-slate-700 font-medium leading-relaxed">
                  First time importing? Download the pre-formatted <strong>{chapter.city} Roster Template</strong> with column headers and sample Google Maps links.
                </span>
              </div>
              <button
                type="button"
                onClick={() => downloadRosterTemplate(chapter.name, chapter.city)}
                className="ios-press text-xs font-bold text-[#0071E3] hover:underline flex-shrink-0 flex items-center gap-1 cursor-pointer font-display"
              >
                <span>Download .csv</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tab Switcher: Upload File vs Paste Rows */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setTab('UPLOAD')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-display flex items-center gap-1.5 ${
                  tab === 'UPLOAD'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV / Excel File</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('PASTE')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-display flex items-center gap-1.5 ${
                  tab === 'PASTE'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Paste Directly from Sheet</span>
              </button>
            </div>

            {tab === 'UPLOAD' ? (
              /* Drag & Drop File Zone */
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#0071E3] bg-blue-50/60 scale-[0.99]'
                    : 'border-slate-300 hover:border-[#0071E3]/60 bg-white hover:bg-slate-50/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0])
                    }
                  }}
                />
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0071E3] flex items-center justify-center mx-auto mb-3 shadow-2xs ring-1 ring-blue-100">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="font-display text-base font-extrabold text-slate-900">
                  Drag and drop your chapter spreadsheet here
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-medium">
                  Accepts <span className="font-mono font-bold text-slate-700">.csv</span> or{' '}
                  <span className="font-mono font-bold text-slate-700">.tsv</span> files exported from Microsoft Excel, Numbers, or Google Sheets.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 font-display">
                  <span>Browse local file</span>
                </div>
              </div>
            ) : (
              /* Paste from Clipboard Textarea */
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-medium">
                  Select and copy rows from your spreadsheet (including headers), then paste them below:
                </p>
                <textarea
                  rows={8}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Full Name\tCompany Name\tBusiness Category\tPhone\tOffice Address\tGoogle Maps Link\nVikram Menon\tApex Legal\tCommercial Law\t+91 98401 23456\tAnna Nagar\thttps://maps.google.com/?q=13.0878,80.2155\nDr. Ananya Rao\tAura Diagnostics\tHealthcare\t+91 98402 34567\tKilpauk\t13.0784, 80.2412`}
                  className="w-full text-xs font-mono p-4 rounded-2xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 shadow-inner"
                />
                <button
                  type="button"
                  disabled={!pastedText.trim() || isProcessing}
                  onClick={() => processRawInput(pastedText)}
                  className="ios-press w-full py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer font-display shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Parse & Preview Pasted Roster</span>
                </button>
              </div>
            )}

            {isProcessing && (
              <div className="p-4 rounded-2xl bg-white border border-black/5 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-[#0071E3] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-700">Resolving locations and coordinates...</p>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Validation Inspector & Review Table */
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col space-y-4">
            
            {/* Top Diagnostic Banner */}
            <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 border border-emerald-200">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display text-sm font-extrabold text-slate-900">
                    {parseResult.validCount} Members Ready to Import
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {parseResult.warningCount > 0
                      ? `${parseResult.warningCount} members have auto-resolved locations or missing fields`
                      : 'All members passed full coordinate and contact validation'}
                  </p>
                </div>
              </div>

              {/* Review Filter Pills */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-xl text-xs font-bold text-slate-600 font-mono-num">
                <button
                  type="button"
                  onClick={() => setReviewFilter('ALL')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    reviewFilter === 'ALL' ? 'bg-white text-[#0071E3] shadow-2xs font-extrabold' : ''
                  }`}
                >
                  All ({parseResult.totalRows})
                </button>
                {parseResult.warningCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setReviewFilter('WARNINGS')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      reviewFilter === 'WARNINGS' ? 'bg-amber-500 text-white shadow-2xs font-extrabold' : 'text-amber-700'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Warnings ({parseResult.warningCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Members Review Table */}
            <div className="border border-black/[0.06] rounded-2xl bg-white overflow-hidden shadow-2xs flex-1 min-h-[220px]">
              <div className="overflow-x-auto max-h-[360px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F8F9FC] text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-black/[0.05] sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Member & Company</th>
                      <th className="py-2.5 px-3">Business Category</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">Resolved Location</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] text-slate-700 font-medium">
                    {filteredReviewRows.map((row) => (
                      <tr key={row.rowNumber} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 font-mono-num text-[11px]">
                          {row.rowNumber - 1}
                        </td>
                        <td className="py-2.5 px-3 min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0071E3] flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {row.fullName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[#0F172A] truncate leading-tight">
                                {row.fullName}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                <Building2 className="w-2.5 h-2.5" />
                                <span>{row.company}</span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 min-w-[140px] truncate">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {row.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono-num text-[11px] text-slate-600">
                          {row.phone || <span className="text-amber-500 italic">None</span>}
                        </td>
                        <td className="py-2.5 px-3 min-w-[160px]">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#0071E3] flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-slate-800 font-semibold truncate leading-tight">
                                {row.resolvedLocation.area}
                              </p>
                              <p className="text-[9px] text-slate-400 font-mono-num truncate">
                                {row.resolvedLocation.latitude.toFixed(4)}, {row.resolvedLocation.longitude.toFixed(4)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {row.locationSource === 'GOOGLE_MAPS_LINK' || row.locationSource === 'RAW_COORDINATES' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200">
                              <Navigation className="w-2.5 h-2.5" />
                              <span>GPS Pin</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[#0071E3] text-[9px] font-bold border border-blue-200" title="Distributed around district corridor">
                              <span>District Cluster</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.rowNumber)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove row from import"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setParseResult(null)}
                className="ios-press px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer font-display"
              >
                ← Back to Upload
              </button>

              <button
                type="button"
                onClick={handleCommitImport}
                className="btn-proxima-primary ios-press px-6 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm font-display"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Import {parseResult.validCount} Members into Chapter</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
