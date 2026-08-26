import logger from '../utils/logger.js';
import { buildDatabaseContext } from './aiContextService.js';

/**
 * Robust, typo-tolerant intent classifier for user questions.
 */
function detectQueryIntent(q) {
  const norm = q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

  // 1. Expiry & Expiration Intent (matches expire, expiry, explire, end date, valid until, when did it, when does, etc.)
  if (
    /expir|explir|expi|valid|end\s*date|when\s*did|when\s*does|expiration|cancel|finish|terminate|how\s*long/i.test(norm)
  ) {
    return 'EXPIRY';
  }

  // 2. Available Plans Intent (matches availble, availab, available, what plans, what packages, packages, pricing, cost, rates, buy, choose, etc.)
  if (
    /avail|what\s*plan|what\s*pack|all\s*plan|all\s*pack|packages|pricing|cost|rates|offers|options|buy|choose|purchase/i.test(norm) ||
    (norm.includes('plan') && !norm.includes('my plan') && !norm.includes('my membership'))
  ) {
    return 'AVAILABLE_PLANS';
  }

  // 3. User Membership Summary Intent
  if (/my\s*plan|my\s*membership|current\s*plan|my\s*package|active\s*plan|membership/i.test(norm)) {
    return 'MY_MEMBERSHIP';
  }

  // 4. Attendance Intent
  if (/visit|attendance|check\s*in|checkin|entry|reception|how\s*many\s*times/i.test(norm)) {
    return 'ATTENDANCE';
  }

  // 5. Personal Training Intent
  if (/trainer|coach|pt|personal\s*train|session|booking|slot/i.test(norm)) {
    return 'PERSONAL_TRAINING';
  }

  // 6. Payments & Billing Intent
  if (/payment|pay|paid|bill|receipt|invoice|transaction|ref/i.test(norm)) {
    return 'PAYMENTS';
  }

  // 7. Body Measurements
  if (/weight|height|bmi|body|progress/i.test(norm)) {
    return 'BODY_STATS';
  }

  // 8. Admin / Staff Overview
  if (/active\s*member|revenue|gym\s*stat|facility\s*stat/i.test(norm)) {
    return 'ADMIN_STATS';
  }

  return 'UNKNOWN';
}

class AIService {
  constructor() {
    this.apiKey = process.env.AI_API_KEY || '';
    this.model = process.env.AI_MODEL || 'gemini-1.5-flash';
    this.baseURL = process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
  }

  /**
   * System Prompt with Gym & Security Guidelines
   */
  getSystemPrompt(dbContext) {
    return `You are FitBot, the official AI Assistant for TitanFit Pro Gym.

AUTHENTICATED USER DATABASE CONTEXT:
${JSON.stringify(dbContext, null, 2)}

INSTRUCTIONS:
1. Answer the user's question accurately using the REAL database data provided in the context above.
2. If the user asks about available plans, list all current gym packages, prices, and durations from availablePlans.
3. If the user asks when their membership expires or when it expired, quote the exact startDate, endDate/expiredAt, and status from membership.
4. SECURITY RULE: Only report information present in the authorized database context above. Never invent fake data or mention other members' private details.
5. Keep your responses concise, friendly, encouraging, and formatted nicely using markdown bullet points.`;
  }

  /**
   * Process a user chat message with database context
   */
  async processChatMessage(userId, role, userMessage, conversationHistory = []) {
    try {
      // 1. Fetch authorized Database Context for this authenticated user
      const dbContext = await buildDatabaseContext(userId, role, userMessage);

      // 2. Build full prompt
      const systemPrompt = this.getSystemPrompt(dbContext);

      // 3. Check if external AI API Key is configured
      if (this.apiKey) {
        return await this.callExternalAIAPI(systemPrompt, userMessage, conversationHistory);
      } else {
        // Fallback: Smart Database-Aware Engine (guarantees production compatibility out-of-the-box!)
        return this.generateSmartDatabaseResponse(userMessage, dbContext);
      }
    } catch (error) {
      logger.error(`[AIService] Error processing chat message: ${error.message}`);
      return "I'm having trouble retrieving AI responses right now. Please check your network connection or try again shortly.";
    }
  }

  /**
   * Call external AI provider (Gemini / OpenAI compatible API)
   */
  async callExternalAIAPI(systemPrompt, userMessage, history = []) {
    try {
      // Google Gemini API call structure
      if (this.baseURL.includes('googleapis.com')) {
        const url = `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question: ${userMessage}` }] },
            ],
          }),
        });

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }

      // OpenAI / Compatible endpoint structure
      const url = `${this.baseURL}/chat/completions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage },
          ],
        }),
      });

      const data = await response.json();
      return data?.choices?.[0]?.message?.content || "I couldn't process a response from the AI provider.";
    } catch (error) {
      logger.warn(`[AIService] External API call failed (${error.message}). Switching to database response fallback.`);
      const dbContext = await buildDatabaseContext(null, 'MEMBER', userMessage);
      return this.generateSmartDatabaseResponse(userMessage, dbContext);
    }
  }

  /**
   * Smart Database-Aware Engine
   * Direct, instantaneous answers using real database context when API key isn't provided.
   */
  generateSmartDatabaseResponse(msg, ctx) {
    const intent = detectQueryIntent(msg);
    const user = ctx.user || {};
    const mem = ctx.membership || {};
    const att = ctx.attendance || {};
    const pt = ctx.personalTraining || {};
    const pay = ctx.payments || {};
    const plans = ctx.availablePlans || [];

    // Intent: Expiry date / Expired / Valid until
    if (intent === 'EXPIRY') {
      if (mem.planName) {
        const isExpired = mem.status === 'EXPIRED' || (mem.daysRemaining !== undefined && mem.daysRemaining <= 0);
        if (isExpired) {
          return `### ⚠️ Membership Expiration Status\n\n- **Plan**: ${mem.planName}\n- **Price**: LKR ${(mem.price || 0).toLocaleString()}\n- **Status**: 🔴 **EXPIRED**\n- **Start Date**: ${mem.startDate || 'N/A'}\n- **Expired On**: **${mem.endDate || mem.expiredAt || 'N/A'}**\n\nYour membership has expired. Please renew your plan on the **Packages** page to regain facility entry & trainer access.`;
        }
        return `### 💳 Active Membership Expiry Info\n\n- **Plan**: ${mem.planName}\n- **Price**: LKR ${(mem.price || 0).toLocaleString()}\n- **Status**: 🟢 **ACTIVE**\n- **Start Date**: ${mem.startDate || 'N/A'}\n- **Expiry Date**: **${mem.endDate || 'Active Subscription'}**\n- **Days Remaining**: **${mem.daysRemaining ?? 'Active'} days**\n\n*Included Perks:* ${(mem.features || ['Gym Floor Access']).join(', ')}`;
      }
      return `### 💳 Membership Expiry Info\n\nYou currently do not have an active membership on file. Visit the **Packages** page to enroll in a new plan!`;
    }

    // Intent: Available Plans / Packages
    if (intent === 'AVAILABLE_PLANS') {
      if (plans.length > 0) {
        const planList = plans
          .map(
            (p) =>
              `• **${p.name}** — **LKR ${(p.price || 0).toLocaleString()}** (${p.duration || '1 Month'})\n  _${p.description || 'Full Gym Access'}_\n  ${
                p.isFamilyPackage ? '👨‍👩‍👧‍👦 *Family Package*' : ''
              }${p.hasPersonalTrainer ? ' 🏆 *Includes Personal Trainer*' : ''}`
          )
          .join('\n\n');
        return `### 💳 Available Gym Membership Plans\n\n${planList}\n\n*Visit the Packages page to select or upgrade your membership!*`;
      }
      return `### 💳 Available Gym Membership Plans\n\nWe offer **Basic**, **Standard**, **Premium**, and **Family** membership packages with flexible monthly and annual options. Browse the **Packages** page to view options!`;
    }

    // Intent: User Membership Summary
    if (intent === 'MY_MEMBERSHIP') {
      if (mem.planName) {
        return `### 💳 Your Membership Summary\n\n- **Plan**: ${mem.planName}\n- **Price**: LKR ${(mem.price || 0).toLocaleString()}\n- **Status**: ${mem.status === 'EXPIRED' ? '🔴 EXPIRED' : '🟢 ACTIVE'}\n- **Start Date**: ${mem.startDate || 'N/A'}\n- **Expiry Date**: **${mem.endDate || 'N/A'}**\n\n*Included Features:* ${(mem.features || ['Gym Floor Access', 'Locker Room']).join(', ')}`;
      }
      return `### 💳 Membership Status\n\nYou currently have no active membership. Browse our available packages to get started!`;
    }

    // Intent: Attendance & Check-ins
    if (intent === 'ATTENDANCE') {
      return `### 📍 Attendance Overview\n\n- **Visits This Month**: **${att.visitsThisMonth || 0} check-in${att.visitsThisMonth === 1 ? '' : 's'}**\n\n*Recent Check-ins:*\n${
        (att.recentVisits || []).map((v) => `• ${v.checkIn} (${v.method})`).join('\n') || '• No recent check-ins recorded.'
      }`;
    }

    // Intent: Body Measurements
    if (intent === 'BODY_STATS') {
      return `### 📈 Body Measurements & BMI\n\n- **Weight**: ${user.weight ? user.weight + ' kg' : 'Not logged'}\n- **Height**: ${user.height ? user.height + ' cm' : 'Not logged'}\n- **Calculated BMI**: ${user.bmi || 'Log weight & height in profile to compute'}`;
    }

    // Intent: Personal Trainer
    if (intent === 'PERSONAL_TRAINING') {
      return `### 🏆 Personal Training & 1-on-1 Sessions\n\n- **Total Sessions Scheduled**: ${pt.totalBooked || 0}\n\n*Upcoming Sessions:*\n${
        (pt.upcoming || []).map((s) => `• With **${s.trainer}** on ${s.date} at ${s.timeSlot} (${s.status})`).join('\n') || '• No upcoming trainer sessions scheduled.'
      }`;
    }

    // Intent: Payments & Receipts
    if (intent === 'PAYMENTS') {
      return `### 💰 Payment & Billing History\n\n${
        (pay.history || []).map((p) => `• **${p.currency} ${p.amount.toLocaleString()}** - ${p.description} (${p.status} on ${p.date})`).join('\n') || '• No payment records found.'
      }`;
    }

    // Intent: Admin Stats
    if (intent === 'ADMIN_STATS') {
      if (ctx.gymAdminStats) {
        return `### 📊 Gym Facility Overview\n\n- **Active Members**: ${ctx.gymAdminStats.totalActiveMembers}\n- **Total Revenue**: LKR ${ctx.gymAdminStats.totalRevenue.toLocaleString()}\n- **Today's Attendance**: ${ctx.gymAdminStats.todayAttendanceCount} check-ins`;
      }
    }

    // Default friendly greeting
    return `Hello ${user.name || 'Member'}! 👋 I am FitBot, your official Gym Assistant.\n\nI can answer questions about:\n• **Available Gym Plans & Pricing**\n• **Your Membership Expiry Date**\n• **Gym Attendance & Digital Pass**\n• **Personal Trainer Bookings**\n• **Payment History & Receipts**\n\nHow can I assist you today?`;
  }
}

export const aiService = new AIService();
export default aiService;
