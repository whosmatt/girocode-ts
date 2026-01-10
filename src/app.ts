/// <reference path="lib/qrcodegen.ts" />

const STORAGE_NAME = 'epc-name';
const STORAGE_IBAN = 'epc-iban';

class EPCQRGenerator {
    private canvas: HTMLCanvasElement;
    private shareBtn: HTMLButtonElement;
    private errorMessage: HTMLElement;
    private nameInput: HTMLInputElement;
    private ibanInput: HTMLInputElement;
    private amountInput: HTMLInputElement;
    private textInput: HTMLInputElement;
    private rememberCheckbox: HTMLInputElement;

    constructor() {
        this.canvas = document.getElementById('qrcode') as HTMLCanvasElement;
        this.shareBtn = document.getElementById('shareBtn') as HTMLButtonElement;
        this.errorMessage = document.getElementById('error-message') as HTMLElement;
        this.nameInput = document.getElementById('name') as HTMLInputElement;
        this.ibanInput = document.getElementById('iban') as HTMLInputElement;
        this.amountInput = document.getElementById('amount') as HTMLInputElement;
        this.textInput = document.getElementById('text') as HTMLInputElement;
        this.rememberCheckbox = document.getElementById('remember-credentials') as HTMLInputElement;

        this.init();
    }

    private init(): void {
        // Load from localStorage
        const storedName = localStorage.getItem(STORAGE_NAME);
        const storedIban = localStorage.getItem(STORAGE_IBAN);
        
        if (storedName !== null) {
            this.nameInput.value = storedName;
            this.rememberCheckbox.checked = true;
        }
        if (storedIban !== null) {
            this.ibanInput.value = storedIban;
            this.rememberCheckbox.checked = true;
        }

        // Listen for service worker cache updates
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'SW_CACHE_UPDATED') {
                    location.reload();
                }
            });
        }

        // Add event listeners
        this.nameInput.addEventListener('input', () => this.handleInputChange());
        this.ibanInput.addEventListener('input', () => this.handleInputChange());
        this.amountInput.addEventListener('input', () => this.generateQRCode());
        this.textInput.addEventListener('input', () => this.generateQRCode());
        this.rememberCheckbox.addEventListener('change', () => this.handleCheckboxChange());

        // Add share button listener
        this.shareBtn.addEventListener('click', () => this.shareQRCode());

        // Generate initial QR code if we have required fields
        this.generateQRCode();
    }

    private handleInputChange(): void {
        // Update localStorage if checkbox is checked
        if (this.rememberCheckbox.checked) {
            if (this.nameInput.value) {
                localStorage.setItem(STORAGE_NAME, this.nameInput.value);
            } else {
                localStorage.removeItem(STORAGE_NAME);
            }
            if (this.ibanInput.value) {
                localStorage.setItem(STORAGE_IBAN, this.ibanInput.value);
            } else {
                localStorage.removeItem(STORAGE_IBAN);
            }
        }

        // Regenerate QR code
        this.generateQRCode();
    }

    private handleCheckboxChange(): void {
        if (this.rememberCheckbox.checked) {
            // Save current values to localStorage
            if (this.nameInput.value) {
                localStorage.setItem(STORAGE_NAME, this.nameInput.value);
            }
            if (this.ibanInput.value) {
                localStorage.setItem(STORAGE_IBAN, this.ibanInput.value);
            }
        } else {
            // Remove from localStorage
            localStorage.removeItem(STORAGE_NAME);
            localStorage.removeItem(STORAGE_IBAN);
        }
    }

    private buildEPCString(): string | null {
        const name = this.nameInput.value.trim();
        const iban = this.ibanInput.value.trim().replace(/\s/g, '');
        const amount = this.amountInput.value.trim();
        const text = this.textInput.value.trim();

        // Validate required fields
        if (!name || !iban || !amount) {
            return null;
        }

        // Format amount with EUR prefix
        const formattedAmount = 'EUR' + parseFloat(amount).toFixed(2);

        // Build EPC string according to spec
        // Each line ends with LF (\n), except the last line
        const lines = [
            'BCD',           // Service Tag
            '002',           // Version
            '1',             // Character set (UTF-8)
            'INST',          // Identification
            '',              // BIC (empty)
            name,            // Beneficiary name
            iban,            // IBAN
            formattedAmount, // Amount with EUR prefix
            '',              // Purpose code (empty)
            '',              // Structured reference (empty)
            text,            // Unstructured remittance
            ''               // Beneficiary to originator info (empty)
        ];

        // Join with LF, all lines except last have LF
        return lines.slice(0, -1).join('\n') + '\n' + lines[lines.length - 1];
    }

    private generateQRCode(): void {
        try {
            const epcString = this.buildEPCString();
            
            if (!epcString) {
                // Clear canvas and disable share button if invalid
                const ctx = this.canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                }
                this.shareBtn.disabled = true;
                this.hideError();
                return;
            }

            // Generate QR code using the library
            const qr = qrcodegen.QrCode.encodeText(epcString, qrcodegen.QrCode.Ecc.MEDIUM);
            
            // Draw QR code on canvas
            this.drawQRCode(qr);
            
            // Enable share button
            this.shareBtn.disabled = false;
            this.hideError();
        } catch (error) {
            this.showError('Error generating QR code: ' + (error as Error).message);
            this.shareBtn.disabled = true;
        }
    }

    private drawQRCode(qr: qrcodegen.QrCode): void {
        const scale = 8; // Each module is 8x8 pixels
        const border = 4; // 4 modules border
        const size = qr.size;
        
        // Set canvas size
        const canvasSize = (size + border * 2) * scale;
        this.canvas.width = canvasSize;
        this.canvas.height = canvasSize;
        
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;
        
        // Fill background (white)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        
        // Draw QR code modules
        ctx.fillStyle = '#000000';
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (qr.getModule(x, y)) {
                    ctx.fillRect(
                        (x + border) * scale,
                        (y + border) * scale,
                        scale,
                        scale
                    );
                }
            }
        }
    }

    private async shareQRCode(): Promise<void> {
        try {
            // Convert canvas to blob
            const blob = await new Promise<Blob>((resolve, reject) => {
                this.canvas.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('Failed to create image'));
                }, 'image/png');
            });

            // Check if Web Share API is supported
            if (navigator.share && navigator.canShare) {
                const file = new File([blob], 'epc-qr-code.png', { type: 'image/png' });
                const shareData = {
                    files: [file],
                    title: 'EPC QR Code',
                    text: 'Payment QR Code'
                };

                if (navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                    return;
                }
            }

            // Fallback: replace canvas with image element for right-click save/share
            const url = URL.createObjectURL(blob);
            const img = document.createElement('img');
            img.src = url;
            img.id = 'qrcode';
            img.style.border = '8px solid #f5f5f5';
            img.style.borderRadius = '8px';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'inline-block';
            
            this.canvas.parentNode?.replaceChild(img, this.canvas);
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                this.showError('Failed to share: ' + (error as Error).message);
            }
        }
    }

    private showError(message: string): void {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.add('show');
    }

    private hideError(): void {
        this.errorMessage.classList.remove('show');
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new EPCQRGenerator());
} else {
    new EPCQRGenerator();
}
