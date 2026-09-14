import QRCode from 'qrcode';

export class QRCodeService {
  /**
   * Generates a Data URL (base64 PNG) pointing to the public feedback page.
   */
  public static async generateDataUrl(publicFeedbackUrl: string): Promise<string> {
    return await QRCode.toDataURL(publicFeedbackUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  }

  /**
   * Generates a raw PNG Buffer for download.
   */
  public static async generatePngBuffer(publicFeedbackUrl: string): Promise<Buffer> {
    return await QRCode.toBuffer(publicFeedbackUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 400
    });
  }
}
