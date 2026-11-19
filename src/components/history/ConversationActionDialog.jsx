import { useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Pencil, Trash2 } from 'lucide-react'

function ConversationActionDialog({ action, onClose, onDelete, onRename }) {
  const [title, setTitle] = useState(action.conversation.title)
  const [actionError, setActionError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isDelete = action.type === 'delete'

  const submitAction = async (event) => {
    event.preventDefault()
    if (isSubmitting || (!isDelete && !title.trim())) return

    setActionError('')
    setIsSubmitting(true)
    try {
      if (isDelete) await onDelete(action.conversation.id)
      else onRename(action.conversation.id, title)
      onClose()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="conversation-action-backdrop" />
        <Dialog.Popup className="conversation-action-dialog">
          <div className="conversation-action-heading">
            <span className={`conversation-action-icon ${isDelete ? 'is-delete' : 'is-rename'}`}>
              {isDelete ? <Trash2 size={20} /> : <Pencil size={20} />}
            </span>
            <Dialog.Title>{isDelete ? 'Delete this chat?' : 'Rename chat'}</Dialog.Title>
          </div>
          <Dialog.Description className="conversation-action-description">
            {isDelete
              ? <>“<strong>{action.conversation.title || ''}</strong>” and all its messages will be permanently deleted. This action cannot be undone.</>
              : 'Choose a new name for this conversation.'}
          </Dialog.Description>
          {actionError && <p className="conversation-action-error" role="alert">{actionError}</p>}
          <form onSubmit={submitAction}>
            {!isDelete && (
              <label className="conversation-action-rename-field">
                Chat name
                <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} required />
              </label>
            )}
            <div className="conversation-action-actions">
              <Dialog.Close className="conversation-action-cancel" disabled={isSubmitting} type="button">
                Cancel
              </Dialog.Close>
              <button
                className={`conversation-action-confirm ${isDelete ? 'is-delete' : 'is-rename'}`}
                disabled={isSubmitting || (!isDelete && !title.trim())}
                type="submit"
              >
                {isDelete ? (isSubmitting ? 'Deleting…' : 'Delete') : 'Save'}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default ConversationActionDialog
