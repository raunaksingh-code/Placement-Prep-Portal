import { useState } from 'react'
import { api, ApiError } from '../../lib/api'
import type { ConnectionRequest, ConnectionStatus } from '../../lib/types'
import { li } from './linkedinTheme'

export function ConnectButton({
  userId,
  status,
  connectionId,
  onChange,
}: {
  userId: number
  status: ConnectionStatus
  connectionId: number | null
  onChange: (status: ConnectionStatus, connectionId: number | null) => void
}) {
  const [busy, setBusy] = useState(false)

  if (status === 'self') return null

  async function connect() {
    setBusy(true)
    try {
      const res = await api<ConnectionRequest>(`/api/connections/${userId}`, { method: 'POST' })
      onChange('pending_outgoing', res.id)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to send connection request')
    } finally {
      setBusy(false)
    }
  }

  async function accept() {
    if (connectionId == null) return
    setBusy(true)
    try {
      await api(`/api/connections/${connectionId}/accept`, { method: 'PUT' })
      onChange('connected', connectionId)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to accept request')
    } finally {
      setBusy(false)
    }
  }

  async function removeConnection(confirmMessage?: string) {
    if (connectionId == null) return
    if (confirmMessage && !confirm(confirmMessage)) return
    setBusy(true)
    try {
      await api(`/api/connections/${connectionId}`, { method: 'DELETE' })
      onChange('none', null)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to update connection')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'connected') {
    return (
      <button onClick={() => removeConnection('Remove this connection?')} disabled={busy} className={li.outlineBtn}>
        ✓ Connected
      </button>
    )
  }

  if (status === 'pending_outgoing') {
    return (
      <button onClick={() => removeConnection()} disabled={busy} className={li.outlineBtn}>
        Pending
      </button>
    )
  }

  if (status === 'pending_incoming') {
    return (
      <div className="flex gap-2">
        <button onClick={accept} disabled={busy} className={li.primaryBtn}>Accept</button>
        <button onClick={() => removeConnection()} disabled={busy} className={li.outlineBtn}>Ignore</button>
      </div>
    )
  }

  return (
    <button onClick={connect} disabled={busy} className={li.primaryBtn}>
      + Connect
    </button>
  )
}
