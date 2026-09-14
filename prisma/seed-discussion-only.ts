import "dotenv/config";
import { seedDiscussion } from "./seed-discussion";

/** Reseeds just the board, for when only the thread fixtures have changed. */
async function main(): Promise<void> {
  await seedDiscussion();
}

void main().then(() => process.exit(0));
