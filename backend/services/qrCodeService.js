import QRCode from 'qrcode';
import logger from '../utils/logger.js';

class QRCodeService {
  /**
   * Generate QR code data
   */
  async generateQRCode(data) {
    try {
      const qrCodeData = await QRCode.toDataURL(JSON.stringify(data));
      return qrCodeData;
    } catch (error) {
      logger.error(`QR code generation error: ${error.message}`);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code as PNG buffer
   */
  async generateQRCodeBuffer(data) {
    try {
      const qrCodeBuffer = await QRCode.toBuffer(JSON.stringify(data));
      return qrCodeBuffer;
    } catch (error) {
      logger.error(`QR code buffer generation error: ${error.message}`);
      throw new Error('Failed to generate QR code buffer');
    }
  }

  /**
   * Generate QR code as SVG string
   */
  async generateQRCodeSVG(data) {
    try {
      const qrCodeSVG = await QRCode.toString(JSON.stringify(data), { type: 'image/svg+xml' });
      return qrCodeSVG;
    } catch (error) {
      logger.error(`QR code SVG generation error: ${error.message}`);
      throw new Error('Failed to generate QR code SVG');
    }
  }

  /**
   * Create QR code for member check-in
   */
  createCheckInQRData(userId, email, firstName, lastName) {
    return {
      type: 'CHECK_IN',
      userId,
      email,
      firstName,
      lastName,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };
  }

  /**
   * Create QR code for membership card
   */
  createMembershipQRData(userId, memberId, membershipNumber) {
    return {
      type: 'MEMBERSHIP',
      userId,
      memberId,
      membershipNumber,
      generatedAt: new Date().toISOString(),
      version: '1.0',
    };
  }

  /**
   * Create QR code for class booking
   */
  createClassBookingQRData(userId, bookingId, classId) {
    return {
      type: 'CLASS_BOOKING',
      userId,
      bookingId,
      classId,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };
  }

  /**
   * Validate QR code data structure
   */
  validateQRData(qrData) {
    try {
      const parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
      return {
        isValid: true,
        data: parsed,
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid QR code data format',
      };
    }
  }
}

export const qrCodeService = new QRCodeService();
