export type CreateClientState =
  | { success: true; clientId: string; clientName: string }
  | { success: false; error: string }
  | null
