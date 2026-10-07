/**
 * JARVIS Production 3.0 — Browser Profile Registry
 * 
 * Manages authorized browser profiles, persistent storage directories,
 * and capability permissions without exposing passwords, cookies, or secrets.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const RUNTIME_DIR = path.join(process.cwd(), 'runtime');
const PROFILES_DIR = path.join(RUNTIME_DIR, 'browser_profiles');
const DOWNLOADS_DIR = path.join(RUNTIME_DIR, 'browser_downloads');
const REGISTRY_FILE = path.join(PROFILES_DIR, 'profiles.json');

export class BrowserProfileRegistry {
  constructor() {
    this.profiles = new Map();
    this.initStorage();
    this.loadRegistry();
  }

  initStorage() {
    if (!fs.existsSync(PROFILES_DIR)) {
      fs.mkdirSync(PROFILES_DIR, { recursive: true });
    }
    if (!fs.existsSync(DOWNLOADS_DIR)) {
      fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
    }
  }

  loadRegistry() {
    if (fs.existsSync(REGISTRY_FILE)) {
      try {
        const data = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
        for (const item of data) {
          this.profiles.set(item.profile_id, item);
        }
      } catch {}
    }

    // Ensure default system profiles exist
    if (!this.profiles.has('research_sandbox')) {
      this.registerProfile({
        profile_id: 'research_sandbox',
        browser_type: 'edge',
        profile_path: path.join(PROFILES_DIR, 'research_sandbox'),
        mode: 'RESEARCH_BROWSER',
        owner: 'operator',
        allowed_capabilities: ['browser.search', 'browser.navigate', 'browser.extract_dom'],
        status: 'READY'
      });
    }

    if (!this.profiles.has('user_interactive')) {
      this.registerProfile({
        profile_id: 'user_interactive',
        browser_type: 'edge',
        profile_path: path.join(PROFILES_DIR, 'jarvis_edge_user'),
        mode: 'INTERACTIVE_USER_BROWSER',
        owner: 'operator',
        allowed_capabilities: [
          'browser.search',
          'browser.navigate',
          'browser.extract_dom',
          'browser.screenshot',
          'browser.interact',
          'browser.download',
          'browser.upload',
          'browser.tabs',
          'browser.session_status'
        ],
        status: 'READY'
      });
    }
  }

  saveRegistry() {
    try {
      const list = Array.from(this.profiles.values());
      fs.writeFileSync(REGISTRY_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch {}
  }

  registerProfile(profile) {
    const entry = {
      profile_id: profile.profile_id,
      browser_type: profile.browser_type || 'edge',
      profile_path: profile.profile_path,
      mode: profile.mode || 'RESEARCH_BROWSER',
      owner: profile.owner || 'operator',
      allowed_capabilities: profile.allowed_capabilities || ['browser.search', 'browser.navigate'],
      last_used: new Date().toISOString(),
      status: profile.status || 'READY'
    };

    if (!fs.existsSync(entry.profile_path)) {
      fs.mkdirSync(entry.profile_path, { recursive: true });
    }

    this.profiles.set(entry.profile_id, entry);
    this.saveRegistry();
    return entry;
  }

  getProfile(profileId = 'user_interactive') {
    return this.profiles.get(profileId) || this.profiles.get('user_interactive');
  }

  listProfiles() {
    return Array.from(this.profiles.values()).map(p => ({
      profile_id: p.profile_id,
      browser_type: p.browser_type,
      mode: p.mode,
      owner: p.owner,
      status: p.status,
      allowed_capabilities: p.allowed_capabilities,
      last_used: p.last_used
    }));
  }

  getDownloadsDir() {
    return DOWNLOADS_DIR;
  }

  touchProfile(profileId) {
    const profile = this.profiles.get(profileId);
    if (profile) {
      profile.last_used = new Date().toISOString();
      this.saveRegistry();
    }
  }
}

export const browserProfileRegistry = new BrowserProfileRegistry();
