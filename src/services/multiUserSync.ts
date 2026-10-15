/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocData } from '../types/printStudio';

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  activePageIndex: number;
  selectedItemId: number | null;
  lastSeen: number;
}

export interface SyncMessage {
  type: 'presence' | 'doc_update' | 'item_lock';
  userId: string;
  userName: string;
  userColor: string;
  version?: number;
  doc?: DocData;
  activePageIndex?: number;
  selectedItemId?: number | null;
}

const CHANNEL_NAME = 'print_studio_collab_bus';

export class MultiUserSyncService {
  private channel: BroadcastChannel | null = null;
  private currentUserId: string;
  private currentUserName: string;
  private currentUserColor: string;
  private collaborators: Map<string, Collaborator> = new Map();
  private onCollaboratorsChange?: (users: Collaborator[]) => void;
  private onRemoteDocUpdate?: (remoteDoc: DocData) => void;

  constructor() {
    this.currentUserId = `user_${Math.random().toString(36).substring(2, 9)}`;
    const colors = ['#d81b79', '#0284c7', '#10b981', '#f59e0b', '#8b5cf6'];
    this.currentUserColor = colors[Math.floor(Math.random() * colors.length)];
    this.currentUserName = `مستخدم ${Math.floor(Math.random() * 900 + 100)}`;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = this.handleMessage.bind(this);
    }
  }

  public init(
    onCollaboratorsChange: (users: Collaborator[]) => void,
    onRemoteDocUpdate: (remoteDoc: DocData) => void
  ) {
    this.onCollaboratorsChange = onCollaboratorsChange;
    this.onRemoteDocUpdate = onRemoteDocUpdate;
    this.broadcastPresence(0, null);

    // Heartbeat every 4 seconds to clean stale collaborators
    setInterval(() => {
      this.broadcastPresence(0, null);
      this.cleanupStaleCollaborators();
    }, 4000);
  }

  public getUserId() {
    return this.currentUserId;
  }

  public getUserName() {
    return this.currentUserName;
  }

  public getUserColor() {
    return this.currentUserColor;
  }

  public broadcastPresence(pageIndex: number, selectedItemId: number | null) {
    if (!this.channel) return;
    const msg: SyncMessage = {
      type: 'presence',
      userId: this.currentUserId,
      userName: this.currentUserName,
      userColor: this.currentUserColor,
      activePageIndex: pageIndex,
      selectedItemId,
    };
    try {
      this.channel.postMessage(msg);
    } catch (_) {}
  }

  public broadcastDocUpdate(doc: DocData) {
    if (!this.channel) return;
    const nextVersion = (doc.version || 1) + 1;
    const updatedDoc: DocData = {
      ...doc,
      version: nextVersion,
      lastModifiedBy: this.currentUserName,
    };

    const msg: SyncMessage = {
      type: 'doc_update',
      userId: this.currentUserId,
      userName: this.currentUserName,
      userColor: this.currentUserColor,
      version: nextVersion,
      doc: updatedDoc,
    };
    try {
      this.channel.postMessage(msg);
    } catch (_) {}
    return updatedDoc;
  }

  private handleMessage(event: MessageEvent<SyncMessage>) {
    const msg = event.data;
    if (!msg || msg.userId === this.currentUserId) return;

    if (msg.type === 'presence') {
      this.collaborators.set(msg.userId, {
        id: msg.userId,
        name: msg.userName,
        color: msg.userColor,
        activePageIndex: msg.activePageIndex ?? 0,
        selectedItemId: msg.selectedItemId ?? null,
        lastSeen: Date.now(),
      });
      this.notifyCollaborators();
    } else if (msg.type === 'doc_update' && msg.doc) {
      if (this.onRemoteDocUpdate) {
        this.onRemoteDocUpdate(msg.doc);
      }
    }
  }

  private cleanupStaleCollaborators() {
    const now = Date.now();
    let changed = false;
    this.collaborators.forEach((collab, id) => {
      if (now - collab.lastSeen > 9000) {
        this.collaborators.delete(id);
        changed = true;
      }
    });
    if (changed) {
      this.notifyCollaborators();
    }
  }

  private notifyCollaborators() {
    if (this.onCollaboratorsChange) {
      this.onCollaboratorsChange(Array.from(this.collaborators.values()));
    }
  }

  public destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

export const multiUserSync = new MultiUserSyncService();
