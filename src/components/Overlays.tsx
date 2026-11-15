import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { Button, IconButton } from './ui'
import { cn } from '../lib/format'
import { useApp } from '../state/AppState'

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-pop sm:rounded-2xl',
              wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
            )}
          >
            <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
              <h2 className="truncate text-base font-semibold">{title}</h2>
              <IconButton icon={X} label="Tutup" onClick={onClose} className="-mr-2" />
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <footer className="safe-bottom flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ConfirmDialog({
  open,
  title,
  desc,
  confirmLabel = 'Ya, lanjutkan',
  danger,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean
  title: string
  desc: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
  children?: ReactNode
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose}>Batal</Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-mute">{desc}</p>
      {children}
    </Modal>
  )
}

export function ToastHost() {
  const { toasts, dismissToast } = useApp()
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'error' ? XCircle : Info
          return (
            <motion.div
              key={t.id}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-ctl border border-line bg-raised px-4 py-3 shadow-pop"
            >
              <Icon
                size={18}
                className={t.tone === 'success' ? 'text-brand' : t.tone === 'error' ? 'text-danger' : 'text-info'}
                aria-hidden
              />
              <p className="min-w-0 flex-1 text-[13px]">{t.msg}</p>
              <button onClick={() => dismissToast(t.id)} aria-label="Tutup notifikasi" className="text-mute hover:text-ink">
                <X size={14} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
