/**
 * JARVIS Production 2.0 — WhatsApp Persistent Message & Conversation Store
 */
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

class WhatsAppDatabase {
  constructor() {
    const runtimeDir = path.resolve(process.cwd(), "runtime");
    if (!fs.existsSync(runtimeDir)) {
      fs.mkdirSync(runtimeDir, { recursive: true });
    }
    this.dbPath = path.join(runtimeDir, "whatsapp.db");
    this.db = new DatabaseSync(this.dbPath);
    this.initTables();
  }

  initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS whatsapp_inbound_events (
        provider_message_id TEXT PRIMARY KEY,
        sender_number TEXT NOT NULL,
        received_at TEXT NOT NULL,
        payload_type TEXT NOT NULL,
        payload_hash TEXT,
        processing_status TEXT NOT NULL,
        mission_id TEXT,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT
      );

      CREATE TABLE IF NOT EXISTS whatsapp_outbound_messages (
        local_message_id TEXT PRIMARY KEY,
        mission_id TEXT,
        recipient TEXT NOT NULL,
        reply_to TEXT,
        content_hash TEXT,
        provider_message_id TEXT,
        state TEXT NOT NULL,
        created_at TEXT NOT NULL,
        sent_at TEXT,
        delivered_at TEXT,
        read_at TEXT,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT
      );

      CREATE TABLE IF NOT EXISTS whatsapp_conversations (
        conversation_id TEXT PRIMARY KEY,
        sender_number TEXT NOT NULL,
        role TEXT NOT NULL,
        verified_identity TEXT,
        context_json TEXT,
        updated_at TEXT NOT NULL,
        expires_at TEXT
      );

      CREATE TABLE IF NOT EXISTS whatsapp_complaints (
        complaint_id TEXT PRIMARY KEY,
        sender_number TEXT NOT NULL,
        category TEXT,
        text TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        resolved_at TEXT
      );

      CREATE TABLE IF NOT EXISTS whatsapp_escalations (
        escalation_id TEXT PRIMARY KEY,
        sender_number TEXT NOT NULL,
        role TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  recordInbound(event) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO whatsapp_inbound_events 
      (provider_message_id, sender_number, received_at, payload_type, payload_hash, processing_status, mission_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(
      event.provider_message_id,
      event.sender_number,
      event.received_at || new Date().toISOString(),
      event.payload_type || 'text',
      event.payload_hash || null,
      event.processing_status || 'QUEUED',
      event.mission_id || null
    );
    return res.changes > 0; // True if inserted, False if duplicate
  }

  updateInboundStatus(messageId, status, error = null) {
    this.db.prepare("UPDATE whatsapp_inbound_events SET processing_status = ?, last_error = ? WHERE provider_message_id = ?")
      .run(status, error, messageId);
  }

  recordOutbound(msg) {
    this.db.prepare(`
      INSERT OR REPLACE INTO whatsapp_outbound_messages
      (local_message_id, mission_id, recipient, reply_to, content_hash, provider_message_id, state, created_at, sent_at, last_error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      msg.local_message_id,
      msg.mission_id || null,
      msg.recipient,
      msg.reply_to || null,
      msg.content_hash || null,
      msg.provider_message_id || null,
      msg.state || 'QUEUED',
      msg.created_at || new Date().toISOString(),
      msg.sent_at || null,
      msg.last_error || null
    );
  }

  updateOutboundState(localId, state, providerId = null, error = null) {
    this.db.prepare(`
      UPDATE whatsapp_outbound_messages 
      SET state = ?, provider_message_id = COALESCE(?, provider_message_id), last_error = ?
      WHERE local_message_id = ?
    `).run(state, providerId, error, localId);
  }

  updateOutboundProviderState(providerId, state, error = null) {
    if (!providerId) return;
    const column = state === 'DELIVERED'
      ? 'delivered_at'
      : (state === 'READ' ? 'read_at' : null);
    if (column) {
      this.db.prepare(`
        UPDATE whatsapp_outbound_messages
        SET state = ?, ${column} = ?, last_error = ?
        WHERE provider_message_id = ?
      `).run(state, new Date().toISOString(), error, providerId);
      return;
    }
    this.db.prepare(`
      UPDATE whatsapp_outbound_messages
      SET state = ?, last_error = ?
      WHERE provider_message_id = ?
    `).run(state, error, providerId);
  }

  createComplaint(senderNumber, text, category = 'General') {
    const complaintId = `CMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    this.db.prepare(`
      INSERT INTO whatsapp_complaints (complaint_id, sender_number, category, text, status, created_at)
      VALUES (?, ?, ?, ?, 'OPEN', ?)
    `).run(complaintId, senderNumber, category, text, new Date().toISOString());
    return complaintId;
  }

  createEscalation(senderNumber, role, reason) {
    const escalationId = `ESC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    this.db.prepare(`
      INSERT INTO whatsapp_escalations (escalation_id, sender_number, role, reason, status, created_at)
      VALUES (?, ?, ?, ?, 'PENDING_OFFICE', ?)
    `).run(escalationId, senderNumber, role, reason, new Date().toISOString());
    return escalationId;
  }
}

export const whatsAppDb = new WhatsAppDatabase();

