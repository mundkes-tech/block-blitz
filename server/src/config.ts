import path from 'path'
import dotenv from 'dotenv'

dotenv.config()
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') })


function readPort(value: string | undefined): number {
  const port = Number(value ?? 5000)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  return port
}

export type AppConfig = {
  port: number
  clientUrl: string
  clientOrigins: string[]
  databaseUrl?: string
}

export function loadConfig(): AppConfig {
  const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173'
  const clientOrigins = (process.env.CLIENT_ORIGINS ?? clientUrl)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  try {
    new URL(clientUrl)
  } catch {
    throw new Error('CLIENT_URL must be a valid URL')
  }

  return {
    port: readPort(process.env.PORT),
    clientUrl,
    clientOrigins,
    databaseUrl: process.env.DATABASE_URL || undefined,
  }
}
