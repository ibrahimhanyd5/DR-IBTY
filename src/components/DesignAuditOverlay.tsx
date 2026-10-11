/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DesignIssue, DocData, Item } from '../types/printStudio';

interface DesignAuditOverlayProps {
  issues: DesignIssue[];
  scale: number;
  doc: DocData;
  onAutoFix: (issue: DesignIssue) => void;
  onClose: () => void;
}

export function DesignAuditOverlay({
  issues,
  scale,
  doc,
  onAutoFix,
  onClose,
}: DesignAuditOverlayProps) {
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const selectedIssue = issues.find((i) => i.id === selectedIssueId);

  return (
    <>
      {/* Visual Markers positioned directly on the canvas elements */}
      <div
        className="absolute inset-0 pointer-events-none z-30"
        style={{ width: `${doc.w}px`, height: `${doc.h}px` }}
      >
        {issues.map((issue) => {
          const isSelected = issue.id === selectedIssueId;
          const isError = issue.severity === 'error';

          return (
            <div
              key={issue.id}
              className="absolute pointer-events-auto cursor-pointer group"
              style={{
                left: `${issue.x}px`,
                top: `${issue.y}px`,
                width: `${Math.max(24, issue.w)}px`,
                height: `${Math.max(24, issue.h)}px`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIssueId(issue.id);
              }}
            >
              {/* Highlight Bounding Box */}
              <div
                className={`w-full h-full border-2 rounded transition-all duration-200 ${
                  isError
                    ? 'border-rose-500/80 bg-rose-500/10'
                    : 'border-amber-500/80 bg-amber-500/10'
                } ${isSelected ? 'ring-4 ring-rose-400/50 ring-offset-1' : ''}`}
              />

              {/* Pulsing Target Dot on corner */}
              <div className="absolute -top-3 -right-3 flex items-center justify-center">
                <span
                  className={`absolute w-6 h-6 rounded-full animate-ping opacity-75 ${
                    isError ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                />
                <span
                  className={`relative flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white shadow-md ${
                    isError ? 'bg-rose-600' : 'bg-amber-600'
                  }`}
                >
                  !
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Guidance Panel at Bottom Right of Screen */}
      <div className="fixed bottom-16 right-4 sm:right-8 z-40 max-w-sm w-full bg-[var(--bar)] border border-[var(--bd)] shadow-2xl rounded-2xl p-4 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--bd)]">
          <div className="flex items-center gap-2">
            <span className="text-rose-500 font-bold text-sm">🔍 فاحص أسس وقواعد التصميم</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-semibold">
              {issues.length} {issues.length === 1 ? 'ملاحظة' : 'ملاحظات'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[var(--mut)] hover:text-[var(--fg)] p-1 rounded-md"
            title="إغلاق الفاحص"
          >
            ✕
          </button>
        </div>

        {issues.length === 0 ? (
          <div className="py-6 text-center text-xs text-emerald-600 font-medium">
            🎉 رائع جداً! التصميم يراعي كافة أسس وقواعد التصميم والطباعة المعيارية.
          </div>
        ) : selectedIssue ? (
          <div className="py-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[var(--fg)]">{selectedIssue.title}</h4>
              <span
                className={`text-[10px] px-2 py-0.5 rounded ${
                  selectedIssue.severity === 'error'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {selectedIssue.severity === 'error' ? 'حرج للمطبعة' : 'تحسين بصري'}
              </span>
            </div>

            <p className="text-xs text-[var(--fg)] leading-relaxed">
              {selectedIssue.description}
            </p>

            <div className="bg-[var(--row)] p-2.5 rounded-xl border border-[var(--bd)] text-xs text-[var(--mut)] leading-relaxed">
              <span className="font-semibold text-[var(--fg)] block mb-0.5">💡 إرشاد للمبتدئين:</span>
              {selectedIssue.advice}
            </div>

            <div className="flex gap-2 pt-2">
              {selectedIssue.canAutoFix && (
                <button
                  className="ps-btn ps-btn-primary flex-1 text-xs py-1.5 font-bold"
                  onClick={() => onAutoFix(selectedIssue)}
                >
                  ⚡ تطبيق الإصلاح التلقائي
                </button>
              )}
              <button
                className="ps-btn text-xs py-1.5 px-3"
                onClick={() => setSelectedIssueId(null)}
              >
                كل الملاحظات ({issues.length})
              </button>
            </div>
          </div>
        ) : (
          <div className="py-3 space-y-2 max-h-56 overflow-y-auto">
            <p className="text-xs text-[var(--mut)]">
              انقر على أي نقطة حمراء فوق التصميم لمعرفة المشكلة وكيفية معالجتها:
            </p>
            {issues.map((iss) => (
              <div
                key={iss.id}
                onClick={() => setSelectedIssueId(iss.id)}
                className="p-2 rounded-xl bg-[var(--row)] hover:bg-[var(--bd)] cursor-pointer transition-colors border border-[var(--bd)] text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="font-medium text-[var(--fg)] truncate">{iss.title}</span>
                </div>
                <span className="text-[10px] text-[var(--mut)] shrink-0">عرض الإرشاد ←</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
