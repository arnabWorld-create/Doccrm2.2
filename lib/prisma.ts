import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient({
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Only log errors in all environments — queries/warns add overhead
    log: ['error'],
  });
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

// Reuse the client across hot-reloads in development
if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

// NOTE: Do NOT call prisma.$disconnect() in serverless — the process is
// frozen between requests and re-used. Disconnecting causes a cold reconnect
// on every warm invocation, adding ~200-400ms per request.
