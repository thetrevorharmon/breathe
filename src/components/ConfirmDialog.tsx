import * as AlertDialog from '@radix-ui/react-alert-dialog'

type Props = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/** Accessible confirm dialog (focus trap, Escape cancels). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Keep going',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(340px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 rounded-card border border-border bg-bg-bottom p-6 text-text shadow-xl">
          <AlertDialog.Title className="m-0 text-[20px] font-extrabold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mb-6 mt-2 text-[14px] text-muted">
            {description}
          </AlertDialog.Description>
          <div className="flex gap-3">
            <AlertDialog.Cancel className="h-12 flex-1 rounded-full border-0 bg-subtle text-[15px] font-bold text-text">
              {cancelLabel}
            </AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={onConfirm}
              className="h-12 flex-1 rounded-full border-0 bg-breath text-[15px] font-extrabold text-on-breath"
            >
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
