import { MongoClient, Db } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | null = null;

function ensureClient(): Promise<MongoClient> {
  if (clientPromise) return clientPromise;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }
  const client = new MongoClient(uri);
  if (process.env.NODE_ENV !== "production") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const connectedClient = await ensureClient();
  const dbName = process.env.MONGODB_DB;
  if (!dbName) {
    throw new Error("Missing MONGODB_DB environment variable");
  }
  return connectedClient.db(dbName);
}


