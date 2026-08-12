'use client'

import { useState, ChangeEvent } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { UploadCloud, FileText, Trash2, Loader2 } from 'lucide-react'
import { reportFileSchema } from '@/lib/validations'
import { validateFile, FILE_UPLOAD_CONFIGS } from '@/lib/file-upload-validator'

const ReportsUploader = () => {
  const { control } = useFormContext()
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'reports',
  })
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file using centralized validator
    const validation = validateFile(file, FILE_UPLOAD_CONFIGS.PATIENT_REPORTS)
    if (!validation.valid) {
      setError(validation.error || 'File validation failed')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // Upload via API route (uses service role key — bypasses Supabase RLS)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-report', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.message || 'Upload failed')
      }

      const newReport = await response.json()

      // Validate with Zod before appending
      reportFileSchema.parse(newReport)
      append(newReport)

    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred.')
    } finally {
      setIsUploading(false)
      // Reset the input
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-brand-teal mb-2">Patient Reports</label>
        <div className="mt-2 flex justify-center rounded-lg border-2 border-dashed border-brand-teal px-6 py-10">
          <div className="text-center">
            {isUploading ? (
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-teal" />
            ) : (
              <UploadCloud className="mx-auto h-12 w-12 text-brand-teal" />
            )}
            <div className="mt-4 flex text-sm leading-6 text-brand-teal">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded-md bg-white font-semibold text-brand-teal focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-teal focus-within:ring-offset-2 hover:text-brand-yellow transition-all"
              >
                <span>Upload a file</span>
                <input 
                  id="file-upload" 
                  name="file-upload" 
                  type="file" 
                  className="sr-only" 
                  onChange={handleFileChange} 
                  disabled={isUploading}
                  accept=".pdf,.png,.jpg,.jpeg"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs leading-5 text-brand-teal">PDF, PNG, JPG up to 10MB</p>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-brand-red">{error}</p>}
      </div>
      
      {fields.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-brand-teal">Uploaded Files:</h4>
          <ul className="border-2 border-brand-teal rounded-md divide-y divide-brand-teal">
            {fields.map((field, index) => (
              <li key={field.id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                <div className="w-0 flex-1 flex items-center">
                  <FileText className="flex-shrink-0 h-5 w-5 text-brand-teal" />
                  <span className="ml-2 flex-1 w-0 truncate">{(field as any).filename}</span>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="font-medium text-brand-red hover:text-brand-red/80"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default ReportsUploader
