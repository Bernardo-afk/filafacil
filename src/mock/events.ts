// Tempo real sem SSE (spec §0.2 item 9, §4 decisão 5): EventTarget para a
// mesma aba + BroadcastChannel('filazero') para outras abas do mesmo navegador.

export type FilaZeroEventType = 'menu.updated' | 'establishment.updated' | 'waitlist.notified'

export interface FilaZeroEvent<T = unknown> {
  type: FilaZeroEventType
  payload: T
  at: string
}

type Handler<T = unknown> = (event: FilaZeroEvent<T>) => void

const target = new EventTarget()

let channel: BroadcastChannel | null = null
function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!channel) {
    channel = new BroadcastChannel('filazero')
    channel.addEventListener('message', (e: MessageEvent<FilaZeroEvent>) => {
      dispatchLocal(e.data)
    })
  }
  return channel
}

function dispatchLocal<T>(event: FilaZeroEvent<T>): void {
  target.dispatchEvent(new CustomEvent(event.type, { detail: event }))
}

/** Emite localmente (mesma aba) e retransmite para outras abas. */
export function emit<T>(type: FilaZeroEventType, payload: T): void {
  const event: FilaZeroEvent<T> = { type, payload, at: new Date().toISOString() }
  dispatchLocal(event)
  getChannel()?.postMessage(event)
}

/** Assina um tipo de evento. Devolve a função de cancelamento. */
export function subscribe<T = unknown>(type: FilaZeroEventType, handler: Handler<T>): () => void {
  getChannel() // garante que o canal entre abas está ativo
  const listener = (e: Event) => handler((e as CustomEvent<FilaZeroEvent<T>>).detail)
  target.addEventListener(type, listener)
  return () => target.removeEventListener(type, listener)
}
