import logger from '../utils/logger.js';
import { buildDatabaseContext } from './aiContextService.js';

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
2. If the user asks about their membership, attendance, workouts, progress, personal training, or payments, ALWAYS quote the exact numbers and details from the context.
3. SECURITY RULE: Only report information present in the authorized database context above. Never invent fake data or mention other members' private details.
4. Keep your responses concise, friendly, encouraging, and formatted nicely using markdown bullet points.
5. Provide practical fitness and nutrition guidance when asked, but clarify you are an AI assistant and not a medical doctor.`;
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
            ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
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
    const q = msg.toLowerCase();
    const user = ctx.user || {};
    const mem = ctx.membership || {};
    const att = ctx.attendance || {};
    const wo = ctx.workouts || {};
    const pt = ctx.personalTraining || {};
    const pay = ctx.payments || {};

    if (q.includes('membership') || q.includes('plan') || q.includes('expire')) {
      if (mem.planName) {
        return `### 💳 Your Active Membership\n\n- **Plan**: ${mem.planName}\n- **Price**: LKR ${(mem.price || 0).toLocaleString()}\n- **Status**: ${mem.status}\n- **Valid Until**: ${mem.endDate || 'Active'}\n\n*Features Included:* ${(mem.features || ['Gym Access', 'Locker']).join(', ')}`;
      }
      return `### 💳 Membership Status\n\nYou currently have no active membership. Browse our **Basic**, **Standard**, or **Premium** membership plans to get started!`;
    }

    if (q.includes('visit') || q.includes('attendance') || q.includes('check-in') || q.includes('checkin') || q.includes('how many times')) {
      return `### 📍 Attendance Overview\n\n- **Visits This Month**: **${att.visitsThisMonth || 0} times**\n\n*Recent Check-ins:*\n${
        (att.recentVisits || []).map(v => `• ${v.checkIn} (${v.method})`).join('\n') || '• No check-ins logged yet.'
      }`;
    }

    if (q.includes('workout') || q.includes('exercise') || q.includes('train') || q.includes('lift')) {
      return `### 🏋️ Your Workout History\n\n- **Total Sessions Logged**: ${wo.totalLogged || 0}\n\n*Recent Sessions:*\n${
        (wo.recent || []).map(w => `• **${w.exercise}** (${w.muscleGroup}) - ${w.durationMinutes} min, ${w.caloriesBurned} kcal on ${w.date}`).join('\n') || '• No recent workouts logged.'
      }`;
    }

    if (q.includes('weight') || q.includes('height') || q.includes('bmi') || q.includes('progress')) {
      return `### 📈 Body Measurements & BMI\n\n- **Weight**: ${user.weight ? user.weight + ' kg' : 'Not logged'}\n- **Height**: ${user.height ? user.height + ' cm' : 'Not logged'}\n- **Calculated BMI**: ${user.bmi || 'Log weight & height to compute'}`;
    }

    if (q.includes('pt') || q.includes('personal training') || q.includes('trainer') || q.includes('session')) {
      return `### 🏆 Personal Training\n\n- **Total Sessions Booked**: ${pt.totalBooked || 0}\n\n*Upcoming Sessions:*\n${
        (pt.upcoming || []).map(s => `• With **${s.trainer}** on ${s.date} at ${s.timeSlot} (${s.status})`).join('\n') || '• No upcoming PT sessions scheduled.'
      }`;
    }

    if (q.includes('payment') || q.includes('receipt') || q.includes('paid') || q.includes('invoice')) {
      return `### 💰 Payment History\n\n${
        (pay.history || []).map(p => `• **${p.currency} ${p.amount.toLocaleString()}** - ${p.description} (${p.status} on ${p.date})`).join('\n') || '• No payment history found.'
      }`;
    }

    if (q.includes('active members') || q.includes('revenue') || q.includes('gym stats')) {
      if (ctx.gymAdminStats) {
        return `### 📊 Gym System Overview\n\n- **Active Members**: ${ctx.gymAdminStats.totalActiveMembers}\n- **Total Revenue**: LKR ${ctx.gymAdminStats.totalRevenue.toLocaleString()}\n- **Today's Attendance**: ${ctx.gymAdminStats.todayAttendanceCount} check-ins`;
      }
    }

    // Default friendly response
    return `Hello ${user.name || 'Member'}! 👋 I am your GymFit Pro AI Assistant.\n\nI can answer any questions regarding your:\n• **Membership Plan & Expiry**\n• **Gym Attendance & Visits**\n• **Workout Logging & Exercises**\n• **Body Weight & BMI Progress**\n• **Personal Trainer Bookings**\n• **Payment History & Receipts**\n\nHow can I help you today?`;
  }
}

export const aiService = new AIService();
export default aiService;
