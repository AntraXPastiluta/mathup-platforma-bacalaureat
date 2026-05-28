import { motion } from 'framer-motion'
import { FileText, Trash2, UploadCloud, ExternalLink } from 'lucide-react'
import { getTrustedStorageUrl } from '../../../shared/utils/safeUrl'

export function LessonFilesTab({
  regularFiles,
  uploading,
  handleFileUpload,
  handleDeleteFile,
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-indigo-600/10 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition-opacity" />
        <div className="relative p-10 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-[2rem] bg-slate-50/50 dark:bg-white/2 text-center group-hover:bg-white dark:group-hover:bg-white/5 transition-all shadow-inner">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,application/pdf,image/*"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-6"
          >
            <div className="size-20 rounded-[2rem] bg-gradient-to-br from-primary/10 to-indigo-600/10 flex items-center justify-center text-primary border border-white/20 shadow-lg">
              {uploading ? (
                <div className="size-8 border-4 border-primary/30 border-t-primary animate-spin rounded-full" />
              ) : (
                <UploadCloud className="size-10" />
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                {uploading ? 'Se încarcă fișierul...' : 'Încarcă materiale suport'}
              </h4>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                PDF, Documente sau Imagini pe care elevii le pot descărca direct din pagină.
              </p>
            </div>
            {!uploading && (
              <div className="px-6 py-2.5 bg-white dark:bg-white/5 rounded-full text-xs font-black uppercase tracking-widest text-slate-500 border border-slate-300 dark:border-white/5 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                Selectează Fișier
              </div>
            )}
          </label>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2">Materiale suport ({regularFiles.length})</h3>
        {regularFiles.length === 0 ? (
          <div className="p-12 text-center border border-slate-300 dark:border-white/5 rounded-3xl bg-slate-50 dark:bg-white/2 shadow-sm">
            <p className="text-sm text-slate-500 font-medium italic">Nu există fișiere pentru această lecție.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <tr>
                  <th className="px-6 py-4">Nume Fișier</th>
                  <th className="px-6 py-4">Tip</th>
                  <th className="px-6 py-4 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {regularFiles.map((file) => {
                  const fileHref = getTrustedStorageUrl(file.file_url)
                  return (
                    <tr key={file.id} className="group/row hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/5 shadow-sm">
                            <FileText className="size-4" />
                          </div>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{file.file_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-300 dark:border-white/10 shadow-sm">
                          {file.file_type?.split('/')[1] || 'DOC'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          {fileHref ? (
                            <a href={fileHref} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white dark:bg-white/5 text-slate-400 dark:text-slate-400 border border-slate-300 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-primary dark:hover:text-white transition-all shadow-sm">
                              <ExternalLink className="size-4" />
                            </a>
                          ) : null}
                          <button onClick={() => handleDeleteFile(file.id)} className="p-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all shadow-sm">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}
