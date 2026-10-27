import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ApiError } from './errors.js';

type Conversation = { id: string; title: string; createdAt: string; updatedAt: string };
export type SavedMessage = { id: string; conversationId: string; role: 'user' | 'assistant'; content: string; createdAt: string };

export class ConversationStore {
  private db: DatabaseSync;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
    this.db = new DatabaseSync(path);
    try {
      this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
      const version = this.db.prepare('PRAGMA user_version').get()!.user_version;
      if (version !== 0 && version !== 1) throw new Error(`Versione database non supportata: ${version}`);
      if (version === 0) this.db.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE conversations (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
        CREATE TABLE messages (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT,
          id TEXT NOT NULL UNIQUE,
          conversationId TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
          content TEXT NOT NULL CHECK (length(content) > 0),
          createdAt TEXT NOT NULL
        );
        CREATE INDEX messages_conversation ON messages(conversationId, sequence);
        CREATE INDEX conversations_updated ON conversations(updatedAt DESC, id);
        PRAGMA user_version = 1;
        COMMIT;
      `);
    } catch (error) { this.db.close(); throw error; }
  }

  create(title: string): Conversation {
    const conversation = { id: randomUUID(), title, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.db.prepare('INSERT INTO conversations VALUES (?, ?, ?, ?)')
      .run(conversation.id, title, conversation.createdAt, conversation.updatedAt);
    return conversation;
  }

  list(limit = 50, offset = 0): Conversation[] {
    return this.db.prepare('SELECT * FROM conversations ORDER BY updatedAt DESC, id LIMIT ? OFFSET ?').all(limit, offset) as Conversation[];
  }

  get(id: string): Conversation {
    const row = this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
    if (!row) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversazione non trovata');
    return row as Conversation;
  }

  messages(id: string): SavedMessage[] {
    this.get(id);
    return this.db.prepare('SELECT id, conversationId, role, content, createdAt FROM messages WHERE conversationId = ? ORDER BY sequence').all(id) as SavedMessage[];
  }

  appendTurn(id: string, user: string, assistant: string) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.get(id);
      const insert = this.db.prepare('INSERT INTO messages (id, conversationId, role, content, createdAt) VALUES (?, ?, ?, ?, ?)');
      const now = new Date().toISOString();
      insert.run(randomUUID(), id, 'user', user, now);
      insert.run(randomUUID(), id, 'assistant', assistant, now);
      this.db.prepare('UPDATE conversations SET updatedAt = ? WHERE id = ?').run(now, id);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  delete(id: string) {
    this.get(id);
    this.db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
  }

  close() { this.db.close(); }
}
