export type Payload = {
  op: number // opcode
  d?: unknown // data
  s?: number // sequence
  t?: string // type as UPPER_SNAKE_CASE
  n?: string // nonce
}