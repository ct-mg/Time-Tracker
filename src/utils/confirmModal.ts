/**
 * Unified Confirmation Modal
 * 
 * Beautiful, modern confirmation dialog to replace native confirm()
 * Features:
 * - Dark mode support via CSS variables
 * - Keyboard support (ESC to cancel, Enter to confirm)
 * - Promise-based API
 * - Smooth animations
 */

export interface ConfirmModalOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonStyle?: 'danger' | 'primary';
}

export function showConfirmModal(options: ConfirmModalOptions): Promise<boolean> {
    return new Promise((resolve) => {
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease-out;
        `;

        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: var(--bg-primary, #fff);
            color: var(--text-primary, #333);
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 90%;
            padding: 0;
            animation: slideIn 0.2s ease-out;
            overflow: hidden;
        `;

        // Modal header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 1.25rem 1.5rem 1rem 1.5rem;
            border-bottom: 1px solid var(--border-color, #e0e0e0);
        `;
        header.innerHTML = `
            <h3 style="margin: 0; font-size: 1.25rem; font-weight: 600; color: var(--text-primary, #333);">
                ${escapeHtml(options.title)}
            </h3>
        `;

        // Modal body
        const body = document.createElement('div');
        body.style.cssText = `
            padding: 1.25rem 1.5rem;
            color: var(--text-secondary, #666);
            line-height: 1.6;
        `;

        // Format message: support for line breaks and basic formatting
        const formattedMessage = formatMessage(options.message);
        body.innerHTML = formattedMessage;

        // Modal footer
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 1rem 1.5rem;
            display: flex;
            gap: 0.75rem;
            justify-content: flex-end;
            border-top: 1px solid var(--border-color, #e0e0e0);
            background: var(--bg-secondary, #f8f9fa);
        `;

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = options.cancelText || 'Cancel';
        cancelBtn.style.cssText = `
            padding: 0.5rem 1.5rem;
            border: 1px solid var(--border-color, #ccc);
            background: var(--bg-primary, #fff);
            color: var(--text-primary, #333);
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.95rem;
            font-weight: 500;
            transition: all 0.2s;
        `;
        cancelBtn.onmouseover = () => {
            cancelBtn.style.background = 'var(--bg-hover, #f0f0f0)';
        };
        cancelBtn.onmouseout = () => {
            cancelBtn.style.background = 'var(--bg-primary, #fff)';
        };

        // Confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = options.confirmText || 'Confirm';
        const isDanger = options.confirmButtonStyle === 'danger';
        confirmBtn.style.cssText = `
            padding: 0.5rem 1.5rem;
            border: none;
            background: ${isDanger ? '#dc3545' : '#007bff'};
            color: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.95rem;
            font-weight: 500;
            transition: all 0.2s;
        `;
        confirmBtn.onmouseover = () => {
            confirmBtn.style.background = isDanger ? '#c82333' : '#0056b3';
        };
        confirmBtn.onmouseout = () => {
            confirmBtn.style.background = isDanger ? '#dc3545' : '#007bff';
        };

        footer.appendChild(cancelBtn);
        footer.appendChild(confirmBtn);

        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        backdrop.appendChild(modal);

        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideIn {
                from { 
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        // Cleanup function
        const cleanup = () => {
            backdrop.style.animation = 'fadeOut 0.2s ease-out';
            setTimeout(() => {
                backdrop.remove();
                style.remove();
            }, 200);
        };

        // Event handlers
        const handleConfirm = () => {
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        confirmBtn.onclick = handleConfirm;
        cancelBtn.onclick = handleCancel;
        backdrop.onclick = (e) => {
            if (e.target === backdrop) {
                handleCancel();
            }
        };

        // Keyboard support
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleCancel();
                document.removeEventListener('keydown', handleKeyDown);
            } else if (e.key === 'Enter') {
                handleConfirm();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        // Add to DOM
        document.body.appendChild(backdrop);

        // Focus on confirm button
        setTimeout(() => confirmBtn.focus(), 100);
    });
}

// Helper function to escape HTML
function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Helper function to format message with highlights
function formatMessage(message: string): string {
    // Split by double newlines to separate paragraphs
    const parts = message.split('\n\n');

    return parts.map((part, index) => {
        // Escape HTML first
        let formatted = escapeHtml(part);

        // Highlight labels (text ending with colon)
        // Pattern: "Label: value" becomes "<strong>Label:</strong> value"
        formatted = formatted.replace(/^([^:]+:)/gm, '<strong style="color: var(--text-primary, #333); font-weight: 600;">$1</strong>');

        // Replace newlines with <br> for line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        // Wrap in paragraph with appropriate margin
        const marginTop = index === 0 ? '0' : '1rem';
        return `<p style="margin: ${marginTop} 0 0 0;">${formatted}</p>`;
    }).join('');
}
