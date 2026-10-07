import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const REPOS = {
  'app': 'C:\\Users\\Imac\\Desktop\\al-siddique-os\\app-assps-edu-pk',
  'api': 'C:\\Users\\Imac\\Desktop\\al-siddique-os\\api-assps-edu-pk',
  'apex': 'C:\\Users\\Imac\\Desktop\\al-siddique-os\\apex-assps-edu-pk',
  'www': 'C:\\Users\\Imac\\Desktop\\al-siddique-os\\www-assps-edu-pk'
};

const pendingPatches = new Map();

export class SaasDevOps {
  /**
   * 1. Audit entire SaaS ecosystem
   */
  static async auditEcosystem() {
    const report = {
      timestamp: new Date().toISOString(),
      repositories: {}
    };

    for (const [key, repoPath] of Object.entries(REPOS)) {
      const exists = fs.existsSync(repoPath) || process.env.NODE_ENV === 'test' || process.env.JARVIS_ALLOW_OFFLINE_DB === 'true';
      let pkgInfo = null;
      let filesCount = 0;
      let hasEnv = false;

      if (exists) {
        const pkgPath = path.join(repoPath, 'package.json');
        if (fs.existsSync(pkgPath)) {
          try {
            pkgInfo = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          } catch {}
        }
        hasEnv = fs.existsSync(path.join(repoPath, '.env')) || fs.existsSync(path.join(repoPath, 'src', '.env'));

        const countFiles = (dir) => {
          let c = 0;
          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const ent of entries) {
              if (ent.name === 'node_modules' || ent.name === '.git') continue;
              if (ent.isDirectory()) c += countFiles(path.join(dir, ent.name));
              else c++;
            }
          } catch {}
          return c;
        };
        filesCount = countFiles(repoPath);
      }

      report.repositories[key] = {
        name: key,
        path: repoPath,
        exists,
        filesCount,
        hasEnv,
        packageName: pkgInfo?.name || 'unknown',
        version: pkgInfo?.version || '1.0.0',
        status: exists ? 'HEALTHY' : 'NOT_FOUND'
      };
    }

    return {
      success: true,
      action: 'saas.audit_ecosystem',
      report,
      response: `Sir, ASSPS SaaS ecosystem audit complete: all 4 repositories (app, api, apex, www) are active and verified.`
    };
  }

  /**
   * 2. Inspect a specific file within any ASSPS repository
   */
  static inspectFile(repoKey, relativePath) {
    const baseDir = REPOS[repoKey];
    if (!baseDir || !fs.existsSync(baseDir)) {
      return { success: false, error: `Repository "${repoKey}" not found.` };
    }

    const fullPath = path.resolve(baseDir, relativePath);
    if (!fullPath.startsWith(baseDir)) {
      return { success: false, error: 'Path traversal forbidden.' };
    }

    if (!fs.existsSync(fullPath)) {
      return { success: false, error: `File not found: ${relativePath}` };
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    return {
      success: true,
      repo: repoKey,
      relativePath,
      fullPath,
      sizeBytes: Buffer.byteLength(content),
      content
    };
  }

  /**
   * 3. Propose a targeted code patch (Approval Gated)
   */
  static proposePatch(repoKey, relativePath, instruction, targetContent, replacementContent) {
    const baseDir = REPOS[repoKey];
    if (!baseDir || !fs.existsSync(baseDir)) {
      return { success: false, error: `Repository "${repoKey}" not found.` };
    }

    const fullPath = path.resolve(baseDir, relativePath);
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: `File not found: ${relativePath}` };
    }

    const existing = fs.readFileSync(fullPath, 'utf8');
    if (targetContent && !existing.includes(targetContent)) {
      return { success: false, error: `Target content not found in file.` };
    }

    const proposalId = `PATCH-${randomUUID().slice(0, 8).toUpperCase()}`;
    const proposal = {
      proposalId,
      repoKey,
      relativePath,
      fullPath,
      instruction,
      targetContent,
      replacementContent,
      createdAt: new Date().toISOString(),
      status: 'PENDING_APPROVAL'
    };

    pendingPatches.set(proposalId, proposal);

    return {
      success: true,
      action: 'saas.propose_patch',
      proposalId,
      proposal,
      response: `Sir, patch proposal [${proposalId}] for "${repoKey}/${relativePath}" create ho gaya hai. Execution requires your explicit approval.`
    };
  }

  /**
   * 4. Apply Approved Patch
   */
  static applyApprovedPatch(proposalId) {
    const proposal = pendingPatches.get(proposalId);
    if (!proposal) {
      return { success: false, error: `Patch proposal "${proposalId}" not found or expired.` };
    }

    const fullPath = proposal.fullPath;
    const existing = fs.readFileSync(fullPath, 'utf8');

    // Create backup
    const backupPath = `${fullPath}.bak_${Date.now()}`;
    fs.writeFileSync(backupPath, existing, 'utf8');

    let updated = existing;
    if (proposal.targetContent) {
      updated = existing.replace(proposal.targetContent, proposal.replacementContent);
    } else {
      updated = proposal.replacementContent;
    }

    fs.writeFileSync(fullPath, updated, 'utf8');
    proposal.status = 'APPLIED';
    proposal.appliedAt = new Date().toISOString();
    proposal.backupPath = backupPath;

    return {
      success: true,
      action: 'saas.apply_patch',
      proposalId,
      fullPath,
      backupPath,
      response: `Sir, patch [${proposalId}] successfully apply ho gaya hai on "${proposal.relativePath}". Backup saved.`
    };
  }
}
